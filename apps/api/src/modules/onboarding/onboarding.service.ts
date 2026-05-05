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

  async setAccountType(userId: string, accountType: AccountType): Promise<AccountTypePayload> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        passwordHash: true,
      },
    });

    if (accountType === 'guardian' && !user.passwordHash) {
      throw new BadRequestException('Guardian accounts require a password-backed sign in.');
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: userId },
        data: {
          role: accountType === 'guardian' ? 'GUARDIAN' : 'STUDENT',
          // Guardians skip profile-setup and First Look — they're done after this step
          ...(accountType === 'guardian' ? { onboardingComplete: true } : {}),
        },
      });

      if (accountType === 'guardian') {
        await transaction.guardian.upsert({
          where: { userId },
          update: {},
          create: {
            userId,
            passwordHash: user.passwordHash!,
          },
        });

        return;
      }

      await transaction.guardian.deleteMany({ where: { userId } });
    });

    return { accountType };
  }

  async setupProfile(userId: string, dto: ProfileSetupDto): Promise<ProfileSetupResponse> {
    const subjectNames = normalizeSubjectNames(dto.subjects);
    if (!subjectNames.length) {
      throw new BadRequestException('Select at least one subject to continue onboarding.');
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: userId },
        data: {
          ...(dto.name ? { name: dto.name } : {}),
          ageGroup: toPrismaAgeGroup(dto.ageGroup),
          grade: dto.grade ?? null,
          learningGoal: dto.learningGoal ? toPrismaLearningGoal(dto.learningGoal) : null,
          timezone: dto.timezone ?? undefined,
          sessionLength: dto.preferredSessionLength ?? undefined,
          preferredDepth: dto.preferredDepth ?? undefined,
          dailyGoal: dto.dailyGoal ?? undefined,
          onboardingComplete: false,
        },
      });

      await this.replaceUserSubjects(transaction, userId, subjectNames);
    });

    const state = await this.getOnboardingState(userId);
    return {
      ...state,
      subjects: subjectNames,
    };
  }

  async setSubjects(userId: string, subjects: string[]): Promise<SubjectSelectionResponse> {
    const subjectNames = normalizeSubjectNames(subjects);
    if (!subjectNames.length) {
      throw new BadRequestException('Select at least one subject to continue onboarding.');
    }

    await this.prisma.$transaction(async (transaction) => {
      await this.replaceUserSubjects(transaction, userId, subjectNames);
    });

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
      throw new BadRequestException('First Look is already complete for this account.');
    }

    const subjects = await this.getOnboardingSubjects(userId);
    if (!subjects.length) {
      throw new BadRequestException('Select subjects before starting First Look.');
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

  async submitFirstLook(userId: string, dto: FirstLookSubmitDto): Promise<FirstLookResult> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { ageGroup: true, firstLookComplete: true },
    });

    if (user.firstLookComplete) {
      throw new BadRequestException('First Look is already complete for this account.');
    }

    const subjects = await this.getOnboardingSubjects(userId);
    if (!subjects.length) {
      throw new NotFoundException('No active First Look assessment was found.');
    }

    const storedQuestions = this.generateFirstLookQuestions(subjects, user.ageGroup);
    const answersByIndex = new Map(dto.answers.map((answer) => [answer.index, answer.answer]));

    if (answersByIndex.size !== storedQuestions.length) {
      throw new BadRequestException('Answer every First Look question before submitting.');
    }

    const subjectResults = buildSubjectResults(storedQuestions, answersByIndex);
    const totalScore = subjectResults.reduce((sum, result) => sum + result.score, 0);
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
      existingProgress.map((record) => [record.subjectId, toTopicScores(record.topicScores)]),
    );

    await this.prisma.$transaction(async (transaction) => {
      for (const result of subjectResults) {
        const ratio = result.totalQuestions === 0 ? 0.5 : result.score / result.totalQuestions;
        const nextTopicScores = {
          ...existingProgressBySubjectId.get(result.subjectId),
          [FIRST_LOOK_BASELINE_KEY]: ratio,
        };

        await transaction.subjectProgress.upsert({
          where: {
            userId_subjectId: {
              userId,
              subjectId: result.subjectId,
            },
          },
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
      }

      await transaction.user.update({
        where: { id: userId },
        data: {
          firstLookComplete: true,
          onboardingComplete: true,
          lastActiveAt: new Date(),
        },
      });
    });

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
      throw new BadRequestException('Select subjects before skipping First Look.');
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
      existingProgress.map((record) => [record.subjectId, toTopicScores(record.topicScores)]),
    );

    await this.prisma.$transaction(async (transaction) => {
      for (const subject of subjects) {
        const nextTopicScores = {
          ...existingProgressBySubjectId.get(subject.subject.id),
          [FIRST_LOOK_BASELINE_KEY]: 0.5,
        };

        await transaction.subjectProgress.upsert({
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
      }

      await transaction.user.update({
        where: { id: userId },
        data: {
          firstLookComplete: true,
          onboardingComplete: true,
          lastActiveAt: new Date(),
        },
      });
    });

    return {
      skipped: true,
      onboardingComplete: true,
      firstLookComplete: true,
    };
  }

  private async replaceUserSubjects(
    transaction: Prisma.TransactionClient,
    userId: string,
    subjectNames: string[],
  ): Promise<void> {
    const subjects = [] as Array<{ id: string; name: string }>;

    for (const subjectName of subjectNames) {
      const subject = await transaction.subject.upsert({
        where: { name: subjectName },
        update: {},
        create: { name: subjectName },
        select: {
          id: true,
          name: true,
        },
      });
      subjects.push(subject);
    }

    await transaction.userSubject.deleteMany({ where: { userId } });
    await transaction.userSubject.createMany({
      data: subjects.map((subject, index) => ({
        userId,
        subjectId: subject.id,
        priorityIndex: index,
      })),
    });
  }

  private async getOnboardingState(userId: string): Promise<{ onboardingComplete: boolean; firstLookComplete: boolean }> {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        onboardingComplete: true,
        firstLookComplete: true,
      },
    });
  }

  private async getOnboardingSubjects(userId: string): Promise<UserSubjectRecord[]> {
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

type PrismaAgeGroupValue = 'PRIMARY' | 'SECONDARY' | 'UNIVERSITY' | 'PROFESSIONAL';

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

function toQuizDifficulty(ageGroup: PrismaAgeGroupValue | null): QuizDifficulty {
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
      throw new BadRequestException(`Missing answer for First Look question ${question.index + 1}.`);
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
