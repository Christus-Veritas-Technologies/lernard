import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { calculateStrengthLevel } from '@lernard/skill-map';
import type {
  AccountTypePayload,
  FirstLookQuestion,
  FirstLookResult,
  FirstLookSkipResponse,
  FirstLookStartResponse,
  FirstLookSubjectResult,
  ProfileSetupResponse,
  SubjectSelectionResponse,
} from '@lernard/shared-types';
import type { Prisma } from '@prisma/client';
import {
  toPrismaAgeGroup,
  toPrismaLearningGoal,
  toPrismaStrengthLevel,
} from '../../common/utils/shared-model-mappers';
import { PrismaService } from '../../prisma/prisma.service';
import { getStaticFirstLookQuestion } from './first-look-questions';
import type { FirstLookSubmitDto, ProfileSetupDto } from './dto/onboarding.dto';

const FIRST_LOOK_BASELINE_KEY = '__first_look__';
const MAX_FIRST_LOOK_SUBJECTS = 6;

type AccountType = 'student' | 'guardian';
type QuizDifficulty = 'beginner' | 'intermediate' | 'advanced';

interface UserSubjectRecord {
  subjectId: string;
  subject: {
    id: string;
    name: string;
  };
}

interface StoredFirstLookQuestion {
  index: number;
  subjectId: string;
  subject: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async setAccountType(
    userId: string,
    accountType: AccountType,
  ): Promise<AccountTypePayload> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        passwordHash: true,
      },
    });

    const txOps: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.user.update({
        where: { id: userId },
        data: {
          role: accountType === 'guardian' ? 'GUARDIAN' : 'STUDENT',
          ...(accountType === 'guardian' ? { onboardingComplete: true } : {}),
        },
      }),
    ];

    if (accountType === 'guardian') {
      txOps.push(
        this.prisma.guardian.upsert({
          where: { userId },
          update: { passwordHash: user.passwordHash ?? null },
          create: { userId, passwordHash: user.passwordHash ?? null },
        }),
      );
    } else {
      txOps.push(this.prisma.guardian.deleteMany({ where: { userId } }));
    }

    await this.prisma.$transaction(txOps);

    return { accountType };
  }

  async setupProfile(
    userId: string,
    dto: ProfileSetupDto,
  ): Promise<ProfileSetupResponse> {
    const subjectNames = normalizeSubjectNames(dto.subjects);
    const subjects = await this.ensureSubjects(subjectNames);
    const normalizedName = normalizeOptionalText(dto.name);
    const normalizedGrade = normalizeOptionalText(dto.grade ?? undefined);
    const normalizedTimezone = normalizeOptionalText(dto.timezone);

    if (!subjectNames.length) {
      throw new BadRequestException(
        'Select at least one subject to continue onboarding.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(normalizedName ? { name: normalizedName } : {}),
          ageGroup: toPrismaAgeGroup(dto.ageGroup),
          grade: normalizedGrade ?? null,
          learningGoal: dto.learningGoal
            ? toPrismaLearningGoal(dto.learningGoal)
            : null,
          timezone: normalizedTimezone,
          sessionLength: dto.preferredSessionLength ?? undefined,
          preferredDepth: dto.preferredDepth ?? undefined,
          dailyGoal: dto.dailyGoal ?? undefined,
          onboardingComplete: false,
        },
      }),
      this.prisma.userSubject.deleteMany({ where: { userId } }),
      ...(subjects.length
        ? [
            this.prisma.userSubject.createMany({
              data: subjects.map((subject, index) => ({
                userId,
                subjectId: subject.id,
                priorityIndex: index,
              })),
            }),
          ]
        : []),
    ]);

    const state = await this.getOnboardingState(userId);
    return {
      ...state,
      subjects: subjectNames,
    };
  }

  async setSubjects(
    userId: string,
    subjects: string[],
  ): Promise<SubjectSelectionResponse> {
    const subjectNames = normalizeSubjectNames(subjects);
    const resolvedSubjects = await this.ensureSubjects(subjectNames);
    if (!subjectNames.length) {
      throw new BadRequestException(
        'Select at least one subject to continue onboarding.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.userSubject.deleteMany({ where: { userId } }),
      ...(resolvedSubjects.length
        ? [
            this.prisma.userSubject.createMany({
              data: resolvedSubjects.map((subject, index) => ({
                userId,
                subjectId: subject.id,
                priorityIndex: index,
              })),
            }),
          ]
        : []),
    ]);

    const state = await this.getOnboardingState(userId);
    return {
      ...state,
      subjects: subjectNames,
    };
  }

  async startFirstLook(userId: string): Promise<FirstLookStartResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        ageGroup: true,
        firstLookComplete: true,
      },
    });

    if (user.firstLookComplete) {
      throw new BadRequestException(
        'First Look is already complete for this account.',
      );
    }

    const subjects = await this.getOnboardingSubjects(userId);
    if (!subjects.length) {
      throw new BadRequestException(
        'Select subjects before starting First Look.',
      );
    }

    const questions = this.generateFirstLookQuestions(subjects, user.ageGroup);

    return {
      questions: questions.map((q) => ({
        index: q.index,
        subject: q.subject,
        question: q.question,
        options: q.options,
      })),
    };
  }

  async submitFirstLook(
    userId: string,
    dto: FirstLookSubmitDto,
  ): Promise<FirstLookResult> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { ageGroup: true, firstLookComplete: true },
    });

    if (user.firstLookComplete) {
      throw new BadRequestException(
        'First Look is already complete for this account.',
      );
    }

    const subjects = await this.getOnboardingSubjects(userId);
    if (!subjects.length) {
      throw new NotFoundException('No active First Look assessment was found.');
    }

    const storedQuestions = this.generateFirstLookQuestions(
      subjects,
      user.ageGroup,
    );
    const answersByIndex = buildAnswerMap(dto.answers, storedQuestions.length);

    if (answersByIndex.size !== storedQuestions.length) {
      throw new BadRequestException(
        'Answer every First Look question before submitting.',
      );
    }

    const subjectResults = buildSubjectResults(storedQuestions, answersByIndex);
    const totalScore = subjectResults.reduce(
      (sum, result) => sum + result.score,
      0,
    );
    const existingProgress = await this.prisma.subjectProgress.findMany({
      where: {
        userId,
        subjectId: {
          in: subjectResults.map((result) => result.subjectId),
        },
      },
      select: {
        subjectId: true,
        topicScores: true,
      },
    });
    const existingProgressBySubjectId = new Map(
      existingProgress.map((record) => [
        record.subjectId,
        toTopicScores(record.topicScores),
      ]),
    );

    const upsertOps = subjectResults.map((result) => {
      const ratio =
        result.totalQuestions === 0
          ? 0.5
          : result.score / result.totalQuestions;
      const nextTopicScores = {
        ...existingProgressBySubjectId.get(result.subjectId),
        [FIRST_LOOK_BASELINE_KEY]: ratio,
      };
      return this.prisma.subjectProgress.upsert({
        where: { userId_subjectId: { userId, subjectId: result.subjectId } },
        update: {
          strengthLevel: toPrismaStrengthLevel(result.strengthLevel),
          topicScores: nextTopicScores as Prisma.InputJsonValue,
        },
        create: {
          userId,
          subjectId: result.subjectId,
          strengthLevel: toPrismaStrengthLevel(result.strengthLevel),
          topicScores: nextTopicScores as Prisma.InputJsonValue,
        },
      });
    });

    await this.prisma.$transaction([
      ...upsertOps,
      this.prisma.user.update({
        where: { id: userId },
        data: {
          firstLookComplete: true,
          onboardingComplete: true,
          lastActiveAt: new Date(),
        },
      }),
    ]);

    return {
      completed: true,
      onboardingComplete: true,
      firstLookComplete: true,
      score: totalScore,
      totalQuestions: storedQuestions.length,
      subjectResults,
    };
  }

  async skipFirstLook(userId: string): Promise<FirstLookSkipResponse> {
    const subjects = await this.getOnboardingSubjects(userId);
    if (!subjects.length) {
      throw new BadRequestException(
        'Select subjects before skipping First Look.',
      );
    }

    const existingProgress = await this.prisma.subjectProgress.findMany({
      where: {
        userId,
        subjectId: { in: subjects.map((subject) => subject.subject.id) },
      },
      select: {
        subjectId: true,
        topicScores: true,
      },
    });
    const existingProgressBySubjectId = new Map(
      existingProgress.map((record) => [
        record.subjectId,
        toTopicScores(record.topicScores),
      ]),
    );

    const skipUpsertOps = subjects.map((subject) => {
      const nextTopicScores = {
        ...existingProgressBySubjectId.get(subject.subject.id),
        [FIRST_LOOK_BASELINE_KEY]: 0.5,
      };
      return this.prisma.subjectProgress.upsert({
        where: {
          userId_subjectId: {
            userId,
            subjectId: subject.subject.id,
          },
        },
        update: {
          strengthLevel: 'DEVELOPING',
          topicScores: nextTopicScores as Prisma.InputJsonValue,
        },
        create: {
          userId,
          subjectId: subject.subject.id,
          strengthLevel: 'DEVELOPING',
          topicScores: nextTopicScores as Prisma.InputJsonValue,
        },
      });
    });

    await this.prisma.$transaction([
      ...skipUpsertOps,
      this.prisma.user.update({
        where: { id: userId },
        data: {
          firstLookComplete: true,
          onboardingComplete: true,
          lastActiveAt: new Date(),
        },
      }),
    ]);

    return {
      skipped: true,
      onboardingComplete: true,
      firstLookComplete: true,
    };
  }

  private async ensureSubjects(
    subjectNames: string[],
  ): Promise<Array<{ id: string; name: string }>> {
    if (!subjectNames.length) {
      return [];
    }

    await this.prisma.subject.createMany({
      data: subjectNames.map((name) => ({ name })),
      skipDuplicates: true,
    });

    const subjects = await this.prisma.subject.findMany({
      where: {
        name: {
          in: subjectNames,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const subjectByName = new Map(
      subjects.map((subject) => [subject.name, subject]),
    );
    const orderedSubjects = subjectNames
      .map((subjectName) => subjectByName.get(subjectName))
      .filter((subject): subject is { id: string; name: string } =>
        Boolean(subject),
      );

    if (orderedSubjects.length !== subjectNames.length) {
      throw new BadRequestException(
        'Unable to load one or more selected subjects.',
      );
    }

    return orderedSubjects;
  }

  private async getOnboardingState(
    userId: string,
  ): Promise<{ onboardingComplete: boolean; firstLookComplete: boolean }> {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        onboardingComplete: true,
        firstLookComplete: true,
      },
    });
  }

  private async getOnboardingSubjects(
    userId: string,
  ): Promise<UserSubjectRecord[]> {
    return this.prisma.userSubject.findMany({
      where: { userId },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { priorityIndex: 'asc' },
      take: MAX_FIRST_LOOK_SUBJECTS,
    });
  }

  private generateFirstLookQuestions(
    subjects: UserSubjectRecord[],
    ageGroup: PrismaAgeGroupValue | null,
  ): StoredFirstLookQuestion[] {
    const difficulty = toQuizDifficulty(ageGroup);
    return subjects.map((subject, index) => {
      const q = getStaticFirstLookQuestion(subject.subject.name, difficulty);
      return {
        index,
        subjectId: subject.subject.id,
        subject: subject.subject.name,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      };
    });
  }
}

function buildAnswerMap(
  answers: FirstLookSubmitDto['answers'],
  totalQuestions: number,
): Map<number, string> {
  const map = new Map<number, string>();

  for (const answer of answers) {
    if (answer.index < 0 || answer.index >= totalQuestions) {
      throw new BadRequestException(`Invalid question index ${answer.index}.`);
    }

    if (map.has(answer.index)) {
      throw new BadRequestException(
        `Duplicate answer for question ${answer.index + 1}.`,
      );
    }

    const normalizedAnswer = answer.answer.trim();
    if (!normalizedAnswer) {
      throw new BadRequestException(
        `Answer for question ${answer.index + 1} cannot be empty.`,
      );
    }

    map.set(answer.index, normalizedAnswer);
  }

  return map;
}

function normalizeOptionalText(value?: string | null): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : undefined;
}

type PrismaAgeGroupValue =
  | 'PRIMARY'
  | 'SECONDARY'
  | 'UNIVERSITY'
  | 'PROFESSIONAL';

function normalizeSubjectNames(subjects: string[]): string[] {
  const deduped = new Map<string, string>();

  for (const subject of subjects) {
    const normalized = subject.trim().replace(/\s+/g, ' ');
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (!deduped.has(key)) {
      deduped.set(key, normalized);
    }
  }

  return Array.from(deduped.values());
}

function toQuizDifficulty(
  ageGroup: PrismaAgeGroupValue | null,
): QuizDifficulty {
  switch (ageGroup) {
    case 'UNIVERSITY':
    case 'PROFESSIONAL':
      return 'advanced';
    case 'SECONDARY':
      return 'intermediate';
    case 'PRIMARY':
    default:
      return 'beginner';
  }
}

function buildSubjectResults(
  questions: StoredFirstLookQuestion[],
  answersByIndex: Map<number, string>,
): FirstLookSubjectResult[] {
  const grouped = new Map<
    string,
    {
      subjectId: string;
      subject: string;
      score: number;
      totalQuestions: number;
    }
  >();

  for (const question of questions) {
    const submittedAnswer = answersByIndex.get(question.index);
    if (typeof submittedAnswer !== 'string') {
      throw new BadRequestException(
        `Missing answer for First Look question ${question.index + 1}.`,
      );
    }

    const bucket = grouped.get(question.subjectId) ?? {
      subjectId: question.subjectId,
      subject: question.subject,
      score: 0,
      totalQuestions: 0,
    };
    bucket.totalQuestions += 1;

    const correctOption = question.options[question.correctAnswer];
    if (submittedAnswer.trim() === correctOption.trim()) {
      bucket.score += 1;
    }

    grouped.set(question.subjectId, bucket);
  }

  return Array.from(grouped.values()).map((result) => ({
    ...result,
    strengthLevel: calculateStrengthLevel(
      result.totalQuestions === 0 ? 0.5 : result.score / result.totalQuestions,
    ),
  }));
}

function toTopicScores(value: Prisma.JsonValue): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, score]) => typeof score === 'number'),
  ) as Record<string, number>;
}
