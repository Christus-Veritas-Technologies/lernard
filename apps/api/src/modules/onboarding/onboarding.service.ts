import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
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
import type { Prisma, Quiz } from '@prisma/client';
import { validateGeneratedContent } from '../../common/utils/validate-generated-content';
import {
  toPrismaAgeGroup,
  toPrismaLearningGoal,
  toPrismaStrengthLevel,
} from '../../common/utils/shared-model-mappers';
import { MastraService } from '../../mastra/mastra.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { FirstLookSubmitDto, ProfileSetupDto } from './dto/onboarding.dto';

const FIRST_LOOK_TOPIC = '__first_look__';
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

interface GeneratedQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly mastra: MastraService,
  ) {}

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
          name: dto.name,
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
      await this.clearPendingFirstLook(transaction, userId);
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
      await this.clearPendingFirstLook(transaction, userId);
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

    const existingQuiz = await this.findPendingFirstLookQuiz(userId);
    if (existingQuiz) {
      return {
        questions: this.toPublicFirstLookQuestions(existingQuiz.questions),
      };
    }

    const subjects = await this.getOnboardingSubjects(userId);
    if (!subjects.length) {
      throw new BadRequestException('Select subjects before starting First Look.');
    }

    const questions = await this.generateFirstLookQuestions(
      subjects,
      user.ageGroup,
      userId,
    );

    await this.prisma.quiz.create({
      data: {
        userId,
        topic: FIRST_LOOK_TOPIC,
        length: questions.length,
        idempotencyKey: `first-look:${userId}:${Date.now()}`,
        questions: questions as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      questions: this.toPublicFirstLookQuestions(questions),
    };
  }

  async submitFirstLook(userId: string, dto: FirstLookSubmitDto): Promise<FirstLookResult> {
    const quiz = await this.findPendingFirstLookQuiz(userId);
    if (!quiz) {
      throw new NotFoundException('No active First Look assessment was found.');
    }

    const storedQuestions = this.parseStoredFirstLookQuestions(quiz.questions);
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
      await transaction.quiz.update({
        where: { id: quiz.id },
        data: {
          answers: Object.fromEntries(answersByIndex),
          score: totalScore,
          completed: true,
          completedAt: new Date(),
        },
      });

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

      await transaction.quiz.updateMany({
        where: {
          userId,
          topic: FIRST_LOOK_TOPIC,
          completed: false,
          deletedAt: null,
        },
        data: {
          completed: true,
          completedAt: new Date(),
        },
      });

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

  private async clearPendingFirstLook(
    transaction: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    await transaction.quiz.deleteMany({
      where: {
        userId,
        topic: FIRST_LOOK_TOPIC,
        completed: false,
      },
    });
  }

  private async getOnboardingState(userId: string) {
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

  private async findPendingFirstLookQuiz(userId: string): Promise<Quiz | null> {
    return this.prisma.quiz.findFirst({
      where: {
        userId,
        topic: FIRST_LOOK_TOPIC,
        completed: false,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async generateFirstLookQuestions(
    subjects: UserSubjectRecord[],
    ageGroup: PrismaAgeGroupValue | null,
    userId: string,
  ): Promise<StoredFirstLookQuestion[]> {
    const difficulty = toQuizDifficulty(ageGroup);
    const questions = await Promise.all(
      subjects.map(async (subject, index) => {
        const rawQuiz = await this.mastra.generateQuiz({
          topic: `${subject.subject.name} fundamentals`,
          level: difficulty,
          questionCount: 1,
          studentId: userId,
        });
        const generatedQuestions = this.parseGeneratedQuiz(rawQuiz, subject.subject.name);
        await validateGeneratedContent(generatedQuestions, this.mastra);

        const [generatedQuestion] = generatedQuestions;
        return {
          index,
          subjectId: subject.subject.id,
          subject: subject.subject.name,
          question: generatedQuestion.question,
          options: generatedQuestion.options,
          correctAnswer: generatedQuestion.correctAnswer,
          explanation: generatedQuestion.explanation,
        } satisfies StoredFirstLookQuestion;
      }),
    );

    return questions;
  }

  private parseGeneratedQuiz(rawQuiz: string, subjectName: string): GeneratedQuizQuestion[] {
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawQuiz);
    } catch {
      throw new InternalServerErrorException(
        `First Look generation returned invalid JSON for ${subjectName}.`,
      );
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new InternalServerErrorException(
        `First Look generation returned no questions for ${subjectName}.`,
      );
    }

    return parsed.map((question, index) => validateGeneratedQuizQuestion(question, subjectName, index));
  }

  private toPublicFirstLookQuestions(questions: unknown): FirstLookQuestion[] {
    return this.parseStoredFirstLookQuestions(questions).map((question) => ({
      index: question.index,
      subject: question.subject,
      question: question.question,
      options: question.options,
    }));
  }

  private parseStoredFirstLookQuestions(questions: unknown): StoredFirstLookQuestion[] {
    if (!Array.isArray(questions)) {
      throw new InternalServerErrorException('Stored First Look questions are invalid.');
    }

    return questions.map((question, index) => validateStoredFirstLookQuestion(question, index));
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

function validateGeneratedQuizQuestion(
  question: unknown,
  subjectName: string,
  index: number,
): GeneratedQuizQuestion {
  if (!question || typeof question !== 'object') {
    throw new InternalServerErrorException(
      `Generated First Look question ${index + 1} for ${subjectName} is invalid.`,
    );
  }

  const candidate = question as Record<string, unknown>;
  const questionText = candidate.question;
  const options = candidate.options;
  const correctAnswer = candidate.correctAnswer;

  if (
    typeof questionText !== 'string' ||
    !Array.isArray(options) ||
    options.length < 2 ||
    options.some((option) => typeof option !== 'string') ||
    typeof correctAnswer !== 'number' ||
    !Number.isInteger(correctAnswer) ||
    correctAnswer < 0 ||
    correctAnswer >= options.length
  ) {
    throw new InternalServerErrorException(
      `Generated First Look question ${index + 1} for ${subjectName} is malformed.`,
    );
  }

  return {
    question: questionText,
    options,
    correctAnswer,
    explanation: typeof candidate.explanation === 'string' ? candidate.explanation : undefined,
  };
}

function validateStoredFirstLookQuestion(
  question: unknown,
  index: number,
): StoredFirstLookQuestion {
  if (!question || typeof question !== 'object') {
    throw new InternalServerErrorException(
      `Stored First Look question ${index + 1} is invalid.`,
    );
  }

  const candidate = question as Record<string, unknown>;
  const questionIndex = candidate.index;
  const subjectId = candidate.subjectId;
  const subject = candidate.subject;
  const questionText = candidate.question;
  const options = candidate.options;
  const correctAnswer = candidate.correctAnswer;

  if (
    typeof questionIndex !== 'number' ||
    !Number.isInteger(questionIndex) ||
    typeof subjectId !== 'string' ||
    typeof subject !== 'string' ||
    typeof questionText !== 'string' ||
    !Array.isArray(options) ||
    options.some((option) => typeof option !== 'string') ||
    typeof correctAnswer !== 'number' ||
    !Number.isInteger(correctAnswer) ||
    correctAnswer < 0 ||
    correctAnswer >= options.length
  ) {
    throw new InternalServerErrorException(
      `Stored First Look question ${index + 1} is malformed.`,
    );
  }

  return {
    index: questionIndex,
    subjectId,
    subject,
    question: questionText,
    options,
    correctAnswer,
    explanation: typeof candidate.explanation === 'string' ? candidate.explanation : undefined,
  };
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
