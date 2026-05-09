import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  QuizDashboardStats,
  QuizDetailResponse,
  QuizHistoryResponse,
  QuizHistoryStatus,
  QuizStatusResponse,
  QuizCompletionResult,
  QuizContent,
  QuizRemediationContext,
  QuizQuestionReview,
  QuizQuestionType,
  StructuredPartEvaluation,
} from '@lernard/shared-types';
import type { User } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { MastraService } from '../../mastra/mastra.service';
import { StudentContextBuilder } from '../../mastra/student-context.builder';
import { validateGeneratedContent } from '../../common/utils/validate-generated-content';
import { R2Service } from '../../r2/r2.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  GenerateQuizDto,
  SubmitAnswerDto,
  AnswerPartDto,
  QuizHistoryQueryDto,
} from './dto/quizzes.dto';
import { deleteQuizUpload, readQuizUpload } from './quiz-uploads';

type LessonSectionForQuiz = {
  type: string;
  heading: string | null;
  body: string;
  terms: Array<{ term: string; explanation: string }>;
};

@Injectable()
export class QuizzesService {
  private readonly logger = new Logger(QuizzesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mastraService: MastraService,
    private readonly studentContextBuilder: StudentContextBuilder,
    private readonly r2: R2Service,
    private readonly notificationsService: NotificationsService,
  ) {}

  async generate(
    user: User,
    dto: GenerateQuizDto,
  ): Promise<{ quizId: string; status: string }> {
    if (!dto.topic && !dto.fromUploadId) {
      throw new BadRequestException('topic or fromUploadId is required');
    }

    const paperType: 'paper1' | 'paper2' = dto.paperType ?? 'paper2';
    // Question count constraints are based on question type.
    if (dto.questionType === 'multiple_choice') {
      const validCounts = [5, 10, 15, 20];
      if (!validCounts.includes(dto.questionCount)) {
        throw new BadRequestException(
          `Multiple Choice questionCount must be one of: ${validCounts.join(', ')}`,
        );
      }
    } else {
      const validCounts = [1, 3, 5];
      if (!validCounts.includes(dto.questionCount)) {
        throw new BadRequestException(
          `Structured Questions questionCount must be one of: ${validCounts.join(', ')}`,
        );
      }
    }

    const mode = normalizeMode(user.learningMode);
    const difficulty: 'foundation' | 'standard' | 'challenging' | 'extension' =
      dto.difficulty ?? 'standard';

    const jobId = uuidv4();
    const queuedQuiz = await (this.prisma as any).quiz.create({
      data: {
        userId: user.id,
        topic: dto.topic ?? 'Uploaded content',
        subjectName: dto.subject ?? 'General',
        totalQuestions: dto.questionCount,
        mode: user.learningMode,
        paperType: paperType.toUpperCase(),
        difficulty: difficulty.toUpperCase(),
        status: 'QUEUED',
        fromLessonId: dto.fromLessonId ?? null,
        fromConversationId: dto.fromConversationId ?? null,
        jobId,
      },
      select: { id: true },
    });

    void this.runQuizGenerationJob({
      quizId: queuedQuiz.id,
      userId: user.id,
      mode,
      dto,
      difficulty,
      jobId,
    });

    return { quizId: queuedQuiz.id, status: 'queued' };
  }

  private async runQuizGenerationJob(input: {
    quizId: string;
    userId: string;
    mode: 'guide' | 'companion';
    dto: GenerateQuizDto;
    difficulty: 'foundation' | 'standard' | 'challenging' | 'extension';
    jobId: string;
  }): Promise<void> {
    try {
      const claimed = await (this.prisma as any).quiz.updateMany({
        where: {
          id: input.quizId,
          userId: input.userId,
          jobId: input.jobId,
          status: 'QUEUED',
        },
        data: { status: 'PROCESSING' },
      });
      if (claimed.count === 0) {
        this.logger.warn(
          `[quiz.generate] skipped stale job quizId=${input.quizId} userId=${input.userId} jobId=${input.jobId}`,
        );
        return;
      }

      const studentContext = await this.studentContextBuilder.buildForUser(
        input.userId,
      );

      let generated: {
        topic: string;
        subjectName: string;
        mode: 'guide' | 'companion';
        questions: Array<{
          type: string;
          text: string;
          options?: string[];
          correctAnswer?: string;
          correctAnswers?: string[];
          explanation?: string;
        }>;
      };

      const dto = input.dto;
      const generationPaperType: 'paper1' | 'paper2' =
        dto.questionType === 'structured' ? 'paper2' : 'paper1';

      if (dto.fromUploadId) {
        if (!dto.fromUploadKind) {
          throw new BadRequestException(
            'fromUploadKind is required when fromUploadId is provided',
          );
        }

        const upload = await readQuizUpload(this.r2, input.userId, dto.fromUploadId);
        if (!upload) {
          throw new BadRequestException(
            'Uploaded file not found or has expired. Please upload again.',
          );
        }

        generated = await this.mastraService.generateQuizFromFile({
          buffer: upload.buffer,
          kind: upload.kind,
          mimeType: upload.mimeType,
          questionCount: dto.questionCount,
          paperType: generationPaperType,
          questionType: dto.questionType,
          difficulty: input.difficulty,
          mode: input.mode,
          studentContext,
        });

        deleteQuizUpload(this.r2, input.userId, dto.fromUploadId).catch(() => {});
      } else {
        let lessonSections: LessonSectionForQuiz[] | undefined;
        let confidenceRating: number | null = null;

        if (dto.fromLessonId) {
          const lesson = await (this.prisma as any).lesson.findFirst({
            where: { id: dto.fromLessonId, userId: input.userId },
            select: { sections: true, confidenceRating: true },
          });
          if (lesson) {
            lessonSections = normalizeLessonSectionsForQuiz(
              lesson.sections as unknown,
            );
            confidenceRating = lesson.confidenceRating ?? null;
          }
        }

        generated = await this.mastraService.generateQuiz({
          topic: dto.topic!,
          paperType: generationPaperType,
          questionType: dto.questionType,
          questionCount: dto.questionCount,
          difficulty: input.difficulty,
          subjectName: dto.subject,
          mode: input.mode,
          studentContext,
          lessonSections,
          confidenceRating,
        });
        await validateGeneratedContent(generated, this.mastraService);
      }

      if (generated.questions.length !== dto.questionCount) {
        throw new Error(
          `Quiz generation returned ${generated.questions.length} questions instead of ${dto.questionCount}.`,
        );
      }

      if (!(await this.isActiveGenerationJob(input))) {
        this.logger.warn(
          `[quiz.generate] halted before persisting stale job quizId=${input.quizId} userId=${input.userId} jobId=${input.jobId}`,
        );
        return;
      }

      await (this.prisma as any).quizQuestion.deleteMany({
        where: { quizId: input.quizId },
      });

      const questionsToCreate = generated.questions.slice(0, dto.questionCount);
      for (let i = 0; i < questionsToCreate.length; i++) {
        if (!(await this.isActiveGenerationJob(input))) {
          this.logger.warn(
            `[quiz.generate] halted during persist stale job quizId=${input.quizId} userId=${input.userId} jobId=${input.jobId}`,
          );
          return;
        }

        const question = questionsToCreate[i];

        await (this.prisma as any).quizQuestion.create({
          data: {
            quizId: input.quizId,
            questionIndex: i,
            type: toDbQuestionType(question.type),
            text: question.text,
            options:
              question.type === 'structured'
                ? Array.isArray((question as any).parts)
                  ? (question as any).parts
                  : null
                : (question.options ?? null),
            correctAnswer:
              question.type === 'structured'
                ? 'structured'
                : serializeCorrectAnswer(question),
            explanation:
              question.explanation ??
              'Review this concept and compare your answer with the expected pattern.',
            subtopic: (question as any).subtopic ?? null,
          },
        });
      }

      const markedReady = await (this.prisma as any).quiz.updateMany({
        where: {
          id: input.quizId,
          userId: input.userId,
          jobId: input.jobId,
          status: 'PROCESSING',
        },
        data: {
          topic: generated.topic,
          subjectName: generated.subjectName,
          status: 'READY',
          readyAt: new Date(),
          failedAt: null,
          failureReason: null,
        },
      });
      if (markedReady.count === 0) {
        this.logger.warn(
          `[quiz.generate] skipped ready update for stale job quizId=${input.quizId} userId=${input.userId} jobId=${input.jobId}`,
        );
        return;
      }

      await this.notificationsService.sendToUser(input.userId, {
        type: 'quiz_ready',
        title: 'Quiz ready',
        body: `Your quiz on ${generated.topic} is ready.`,
        url: `/quiz/${input.quizId}`,
        quizId: input.quizId,
      });

      this.logger.log(
        `[quiz.generate] success quizId=${input.quizId} userId=${input.userId} jobId=${input.jobId}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
      this.logger.error(
        `[quiz.generate] failed quizId=${input.quizId} userId=${input.userId} jobId=${input.jobId} error="${message}"`,
        error instanceof Error ? error.stack : undefined,
      );

      const markedFailed = await (this.prisma as any).quiz.updateMany({
        where: {
          id: input.quizId,
          userId: input.userId,
          jobId: input.jobId,
          status: {
            in: ['QUEUED', 'PROCESSING'],
          },
        },
        data: { 
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: message.slice(0, 500),
        },
      });
      if (markedFailed.count === 0) {
        this.logger.warn(
          `[quiz.generate] skipped failed update for stale job quizId=${input.quizId} userId=${input.userId} jobId=${input.jobId}`,
        );
        return;
      }

      await this.notificationsService.sendToUser(input.userId, {
        type: 'quiz_failed',
        title: 'Quiz generation failed',
        body: 'Please retry generating your quiz.',
        url: '/quiz',
        quizId: input.quizId,
      });
    }
  }

  private async isActiveGenerationJob(input: {
    quizId: string;
    userId: string;
    jobId: string;
  }): Promise<boolean> {
    const quiz = await (this.prisma as any).quiz.findFirst({
      where: {
        id: input.quizId,
        userId: input.userId,
      },
      select: {
        jobId: true,
        status: true,
      },
    });

    return quiz?.jobId === input.jobId && quiz?.status === 'PROCESSING';
  }

  async getDashboardStats(user: User): Promise<QuizDashboardStats> {
    const { periodStart, periodEnd } = getBillingWindowBounds(
      user.billingAnchorDay ?? 1,
    );

    const completedThisMonth = await (this.prisma as any).quiz.findMany({
      where: {
        userId: user.id,
        status: 'READY',
        completedAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
      include: {
        answers: true,
        questions: {
          select: {
            type: true,
            options: true,
          },
        },
      },
    });

    const quizzesThisMonth = completedThisMonth.length;
    const monthlyLimit = getMonthlyQuizLimit(user.plan);

    const normalizedScores = completedThisMonth
      .map((quiz: any) => computeNormalizedScoreOutOfTen(quiz))
      .filter((score: number | null): score is number => score !== null);
    const averageScoreThisMonth =
      normalizedScores.length > 0
        ? Number(
            (
              normalizedScores.reduce((sum, value) => sum + value, 0)
              / normalizedScores.length
            ).toFixed(1),
          )
        : null;

    const readyQuizzes = await (this.prisma as any).quiz.findMany({
      where: {
        userId: user.id,
        status: 'READY',
      },
      include: {
        _count: {
          select: { answers: true },
        },
      },
    });

    const quizzesInProgress = readyQuizzes.filter((quiz: any) => {
      const answered = quiz._count?.answers ?? 0;
      return answered > 0 && answered < quiz.totalQuestions;
    }).length;

    const completedAllTime = await (this.prisma as any).quiz.findMany({
      where: {
        userId: user.id,
        status: 'READY',
        completedAt: { not: null },
      },
      select: {
        weakTopics: true,
        subjectName: true,
        difficulty: true,
      },
    });

    const distinctWeakTopics = new Set<string>();
    for (const quiz of completedAllTime) {
      if (!Array.isArray(quiz.weakTopics)) {
        continue;
      }
      for (const topic of quiz.weakTopics) {
        if (typeof topic === 'string' && topic.trim().length > 0) {
          distinctWeakTopics.add(topic.trim().toLowerCase());
        }
      }
    }
    const growthAreasFlagged = distinctWeakTopics.size;

    const subjectCounts = new Map<string, number>();
    for (const quiz of completedAllTime) {
      const name =
        typeof quiz.subjectName === 'string' && quiz.subjectName.trim().length > 0
          ? quiz.subjectName.trim()
          : 'General';
      subjectCounts.set(name, (subjectCounts.get(name) ?? 0) + 1);
    }

    const mostQuizzedSubject = Array.from(subjectCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }))[0] ?? null;

    const difficultyCounts = new Map<string, number>();
    for (const quiz of completedAllTime) {
      const difficulty = String(quiz.difficulty ?? 'STANDARD').toLowerCase();
      difficultyCounts.set(difficulty, (difficultyCounts.get(difficulty) ?? 0) + 1);
    }

    const mostCommonDifficulty = Array.from(difficultyCounts.entries())
      .sort(
        (a, b) =>
          b[1] - a[1]
          || difficultyWeight(b[0]) - difficultyWeight(a[0]),
      )
      .map(([difficulty]) => toSharedDifficulty(difficulty))[0] ?? null;

    return {
      quizzesThisMonth,
      monthlyLimit,
      averageScoreThisMonth,
      quizzesInProgress,
      growthAreasFlagged,
      mostQuizzedSubject,
      mostCommonDifficulty,
    };
  }

  async getHistory(
    user: User,
    query: QuizHistoryQueryDto,
  ): Promise<QuizHistoryResponse> {
    const limit = Math.min(query.limit ?? 10, 50);
    const cursor = parseHistoryCursor(query.cursor);

    const where = buildHistoryWhereClause(user.id, query);
    const allMatching = await (this.prisma as any).quiz.findMany({
      where,
      include: {
        answers: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const statusFiltered = allMatching.filter((quiz: any) => {
      const status = deriveQuizHistoryStatus(quiz);
      if (query.status && status !== query.status) {
        return false;
      }

      return true;
    });

    const paged = statusFiltered.filter((quiz: any) => {
      if (!cursor) {
        return true;
      }

      const createdAt = new Date(quiz.createdAt).getTime();
      if (createdAt < cursor.createdAtMs) {
        return true;
      }
      if (createdAt > cursor.createdAtMs) {
        return false;
      }

      return quiz.id < cursor.id;
    });

    const pageItems = paged.slice(0, limit);
    const hasMore = paged.length > limit;
    const nextCursor = hasMore
      ? buildHistoryCursor(pageItems[pageItems.length - 1])
      : null;

    const quizzes = await Promise.all(
      pageItems.map(async (quiz: any) => {
        const status = deriveQuizHistoryStatus(quiz);
        const paperType = toSharedPaperType(quiz.paperType);
        const difficulty = toSharedDifficulty(quiz.difficulty);

        let score: number | null = null;
        let totalMarks: number | null = null;

        if (status === 'completed') {
          if (paperType === 'paper2') {
            const quizWithQuestions = await (this.prisma as any).quiz.findUnique({
              where: { id: quiz.id },
              include: {
                questions: {
                  select: { options: true },
                },
                answers: {
                  select: { answer: true, isCorrect: true },
                },
              },
            });

            const marks = computePaper2Marks(quizWithQuestions);
            score = marks.marksEarned;
            totalMarks = marks.totalMarks;
          } else {
            score = typeof quiz.score === 'number' ? quiz.score : null;
            totalMarks = null;
          }
        }

        return {
          quizId: quiz.id,
          topic: quiz.topic,
          subjectName: quiz.subjectName ?? 'General',
          paperType,
          difficulty,
          status,
          score,
          totalMarks,
          questionsAnswered: quiz.answers.length,
          totalQuestions: quiz.totalQuestions,
          completedAt: quiz.completedAt ? new Date(quiz.completedAt).toISOString() : null,
          createdAt: new Date(quiz.createdAt).toISOString(),
          estimatedSecondsRemaining: estimateSecondsRemaining(quiz),
        };
      }),
    );

    return {
      quizzes,
      nextCursor,
      hasMore,
      totalCount: statusFiltered.length,
    };
  }

  async getQuizStatus(user: User, quizId: string): Promise<QuizStatusResponse> {
    const quiz = await (this.prisma as any).quiz.findFirst({
      where: { id: quizId, userId: user.id },
      include: {
        answers: {
          select: { id: true },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const status = deriveQuizHistoryStatus(quiz);
    return {
      status,
      estimatedSecondsRemaining: estimateSecondsRemaining(quiz),
    };
  }

  async getQuiz(
    user: User,
    quizId: string,
  ): Promise<QuizDetailResponse> {
    const quiz = await (this.prisma as any).quiz.findFirst({
      where: { id: quizId, userId: user.id },
      include: {
        questions: {
          where: { questionIndex: { gte: 0 } },
          orderBy: { questionIndex: 'asc' },
        },
        answers: {
          orderBy: { questionIndex: 'asc' },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.status === 'FAILED') {
      return {
        mode: 'failed',
        status: 'failed',
        quizId: quiz.id,
        failureReason: quiz.failureReason ?? null,
      };
    }

    if (quiz.status !== 'READY') {
      return {
        mode: 'queued',
        status: 'queued',
        quizId: quiz.id,
        estimatedSecondsRemaining: estimateSecondsRemaining(quiz),
      };
    }

    const index = Math.min(
      Math.max(quiz.currentIndex, 0),
      Math.max(Math.min(quiz.questions.length, quiz.totalQuestions) - 1, 0),
    );
    const currentQuestion = quiz.questions[index];

    const quizContent: QuizContent = {
      quizId: quiz.id,
      topic: quiz.topic,
      subjectName: quiz.subjectName ?? 'General',
      mode: normalizeMode(quiz.mode),
      paperType: toSharedPaperType(quiz.paperType),
      difficulty: toSharedDifficulty(quiz.difficulty),
      totalQuestions: quiz.totalQuestions,
      currentQuestionIndex: index,
      question: {
        type: fromDbQuestionType(currentQuestion?.type),
        text: currentQuestion?.text ?? 'No question available',
        // For structured questions: options JSON stores the parts array
        ...(fromDbQuestionType(currentQuestion?.type) === 'structured'
          ? {
              parts: Array.isArray(currentQuestion?.options) ? currentQuestion.options : [],
              totalMarks: (currentQuestion?.options as any)?.[0]?.marks
                ? (currentQuestion.options as any[]).reduce((sum: number, p: any) => sum + (p.marks ?? 0), 0)
                : 0,
            }
          : {
              options: Array.isArray(currentQuestion?.options)
                ? currentQuestion.options
                : undefined,
            }),
      },
    };

    const questionsAnswered = quiz.answers.length;
    const answeredQuestionIndexes = Array.from(
      new Set<number>(quiz.answers.map((answer: any) => answer.questionIndex)),
    ).sort((a, b) => a - b);

    if (quiz.completedAt) {
      const answersByIndex = new Map<number, any>(
        quiz.answers.map((answer: any) => [answer.questionIndex, answer]),
      );

      const storedQuestions = normalizeStoredReviewQuestions(quiz.reviewQuestions);
      const questions =
        storedQuestions.length > 0
          ? storedQuestions
          : quiz.questions.map((question: any) => {
              const student = answersByIndex.get(question.questionIndex);
              return {
                text: question.text,
                studentAnswer: formatStoredAnswerForReview(student?.answer),
                correctAnswer: question.correctAnswer,
                isCorrect: student?.isCorrect ?? false,
                explanation: question.explanation,
                subtopic: question.subtopic ?? undefined,
                evaluationResult:
                  (student?.evaluationResult as
                    | 'correct'
                    | 'partial'
                    | 'incorrect'
                    | undefined) ?? undefined,
                feedback: student?.feedback ?? undefined,
              };
            });

      const weakTopics = Array.isArray(quiz.weakTopics)
        ? quiz.weakTopics.filter((topic: unknown): topic is string => typeof topic === 'string')
        : [];
      const strongTopics = Array.isArray(quiz.strongTopics)
        ? quiz.strongTopics.filter((topic: unknown): topic is string => typeof topic === 'string')
        : [];
      const revisitSoonTopics = Array.isArray(quiz.revisitSoonTopics)
        ? quiz.revisitSoonTopics.filter((topic: unknown): topic is string => typeof topic === 'string')
        : [];

      const debriefText =
        typeof quiz.debriefText === 'string' && quiz.debriefText.trim().length > 0
          ? quiz.debriefText
          : 'Review your responses and focus on your growth areas.';

      const score =
        typeof quiz.score === 'number'
          ? quiz.score
          : questions.filter((entry) => entry.isCorrect).length;

      return {
        mode: 'review',
        status: 'completed',
        quiz: {
          quizId: quiz.id,
          topic: quiz.topic,
          subjectName: quiz.subjectName ?? 'General',
          paperType: toSharedPaperType(quiz.paperType),
          difficulty: toSharedDifficulty(quiz.difficulty),
          completedAt: new Date(quiz.completedAt).toISOString(),
          score,
          totalQuestions: quiz.totalQuestions,
          xpEarned: 10 + score,
          shouldRevealAnswers: true,
          debriefText,
          topicBreakdown: {
            strong: strongTopics,
            needsWork: weakTopics,
            revisitSoon: revisitSoonTopics,
          },
          questions,
        },
      };
    }

    if (questionsAnswered === 0) {
      return {
        mode: 'start',
        status: 'not_started',
        quiz: {
          ...quizContent,
          estimatedMinutes: estimateQuizMinutes(quiz),
        },
      };
    }

    return {
      mode: 'continue',
      status: 'in_progress',
      quiz: {
        ...quizContent,
        questionsAnswered,
        answeredQuestionIndexes,
      },
    };
  }

  async answer(
    user: User,
    quizId: string,
    dto: SubmitAnswerDto,
  ): Promise<{ isCorrect: boolean; feedback: string; done: boolean }> {
    const quiz = await (this.prisma as any).quiz.findFirst({
      where: { id: quizId, userId: user.id },
      include: {
        questions: {
          where: { questionIndex: dto.questionIndex },
          take: 1,
        },
      },
    });

    if (!quiz || !quiz.questions[0]) {
      throw new NotFoundException('Quiz question not found');
    }

    // Ensure the question index is within the allowed totalQuestions range
    if (dto.questionIndex >= quiz.totalQuestions) {
      throw new BadRequestException(`Question index ${dto.questionIndex} exceeds total questions ${quiz.totalQuestions}`);
    }

    const question = quiz.questions[0];
    const isCorrect = checkAnswer(
      question.type,
      dto.answer,
      question.correctAnswer,
    );

    await (this.prisma as any).quizAnswer.upsert({
      where: {
        quizId_questionIndex: {
          quizId,
          questionIndex: dto.questionIndex,
        },
      },
      update: {
        answer: dto.answer,
        isCorrect,
        submittedAt: new Date(),
      },
      create: {
        quizId,
        userId: user.id,
        questionIndex: dto.questionIndex,
        answer: dto.answer,
        isCorrect,
      },
    });

    const nextIndex = dto.questionIndex + 1;
    const done = nextIndex >= quiz.totalQuestions;

    await (this.prisma as any).quiz.update({
      where: { id: quizId },
      data: {
        currentIndex: done ? dto.questionIndex : nextIndex,
      },
    });

    return {
      isCorrect,
      done,
      feedback: isCorrect
        ? 'Nice work. That answer is correct.'
        : 'Not quite yet. Give it another look.',
    };
  }

  async evaluateShortAnswer(
    user: User,
    quizId: string,
    dto: { questionIndex: number; studentAnswer: string },
  ): Promise<{ result: 'correct' | 'partial' | 'incorrect'; feedback: string }> {
    const quiz = await (this.prisma as any).quiz.findFirst({
      where: { id: quizId, userId: user.id },
      include: {
        questions: {
          where: { questionIndex: dto.questionIndex },
          take: 1,
        },
      },
    });

    if (!quiz || !quiz.questions[0]) {
      throw new NotFoundException('Quiz question not found');
    }

    // Ensure the question index is within the allowed totalQuestions range
    if (dto.questionIndex >= quiz.totalQuestions) {
      throw new BadRequestException(`Question index ${dto.questionIndex} exceeds total questions ${quiz.totalQuestions}`);
    }

    const question = quiz.questions[0];
    if (question.type !== 'SHORT_ANSWER') {
      throw new BadRequestException('This endpoint is only for short_answer questions');
    }

    const studentContext = await this.studentContextBuilder.buildForUser(user.id);
    const evaluation = await this.mastraService.evaluateShortAnswer({
      questionText: question.text,
      modelAnswer: question.correctAnswer,
      studentAnswer: dto.studentAnswer,
      studentContext: {
        name: studentContext.name,
        grade: studentContext.grade,
        ageGroup: studentContext.ageGroup,
      },
    });

    const isCorrect = evaluation.result === 'correct';
    await (this.prisma as any).quizAnswer.upsert({
      where: { quizId_questionIndex: { quizId, questionIndex: dto.questionIndex } },
      update: {
        answer: dto.studentAnswer,
        isCorrect,
        evaluationResult: evaluation.result,
        feedback: evaluation.feedback,
        submittedAt: new Date(),
      },
      create: {
        quizId,
        userId: user.id,
        questionIndex: dto.questionIndex,
        answer: dto.studentAnswer,
        isCorrect,
        evaluationResult: evaluation.result,
        feedback: evaluation.feedback,
      },
    });

    return evaluation;
  }

  async answerPart(
    user: User,
    quizId: string,
    dto: AnswerPartDto,
  ): Promise<StructuredPartEvaluation> {
    const quiz = await (this.prisma as any).quiz.findFirst({
      where: { id: quizId, userId: user.id },
      include: {
        questions: {
          where: { questionIndex: dto.questionIndex },
          take: 1,
        },
      },
    });

    if (!quiz || !quiz.questions[0]) {
      throw new NotFoundException('Quiz question not found');
    }

    // Ensure the question index is within the allowed totalQuestions range
    if (dto.questionIndex >= quiz.totalQuestions) {
      throw new BadRequestException(`Question index ${dto.questionIndex} exceeds total questions ${quiz.totalQuestions}`);
    }

    const question = quiz.questions[0];
    if (question.type !== 'STRUCTURED') {
      throw new BadRequestException('This endpoint is only for structured questions');
    }

    // Parts are stored in the options JSON field
    const parts: Array<{
      label: string;
      text: string;
      command: string;
      marks: number;
      tier: string;
      answerType: string;
      markingPoints: string[];
      modelAnswer: string;
      explanation?: string;
    }> = Array.isArray(question.options) ? question.options as any[] : [];

    const part = parts.find((p) => p.label === dto.partLabel);
    if (!part) {
      throw new BadRequestException(`Part "${dto.partLabel}" not found in this question`);
    }

    const studentContext = await this.studentContextBuilder.buildForUser(user.id);
    const evaluation = await this.mastraService.evaluateStructuredPart({
      stem: question.text,
      partText: part.text,
      command: part.command,
      marks: part.marks,
      markingPoints: part.markingPoints ?? [],
      modelAnswer: part.modelAnswer,
      studentAnswer: dto.answer,
      studentContext: {
        name: studentContext.name,
        grade: studentContext.grade,
        ageGroup: studentContext.ageGroup,
      },
    });

    // Load existing QuizAnswer, merge in this sub-part's result
    const existingAnswer = await (this.prisma as any).quizAnswer.findUnique({
      where: { quizId_questionIndex: { quizId, questionIndex: dto.questionIndex } },
    });

    type PartAnswerMap = Record<string, {
      text: string;
      marksEarned: number;
      feedback: string;
      markingPoints: string[];
      modelAnswer: string;
    }>;

    let partAnswerMap: PartAnswerMap = {};
    if (existingAnswer?.answer) {
      try {
        partAnswerMap = JSON.parse(existingAnswer.answer) as PartAnswerMap;
      } catch {
        partAnswerMap = {};
      }
    }

    partAnswerMap[dto.partLabel] = {
      text: dto.answer,
      marksEarned: evaluation.marksEarned,
      feedback: evaluation.feedback,
      markingPoints: part.markingPoints,
      modelAnswer: part.modelAnswer,
    };

    const allPartsSubmitted = parts.every((p) => p.label in partAnswerMap);

    // Calculate aggregate isCorrect when all parts are submitted
    const totalMarks = parts.reduce((sum, p) => sum + p.marks, 0);
    const earnedMarks = Object.values(partAnswerMap).reduce(
      (sum, p) => sum + (p.marksEarned ?? 0),
      0,
    );
    const aggregateIsCorrect = allPartsSubmitted
      ? earnedMarks / totalMarks >= 0.5
      : false;

    const answerJson = JSON.stringify(partAnswerMap);

    await (this.prisma as any).quizAnswer.upsert({
      where: { quizId_questionIndex: { quizId, questionIndex: dto.questionIndex } },
      update: {
        answer: answerJson,
        isCorrect: allPartsSubmitted ? aggregateIsCorrect : (existingAnswer?.isCorrect ?? false),
        submittedAt: new Date(),
      },
      create: {
        quizId,
        userId: user.id,
        questionIndex: dto.questionIndex,
        answer: answerJson,
        isCorrect: false,
      },
    });

    // Advance currentIndex when all parts submitted
    let done = false;
    if (allPartsSubmitted) {
      const nextIndex = dto.questionIndex + 1;
      done = nextIndex >= quiz.totalQuestions;
      await (this.prisma as any).quiz.update({
        where: { id: quizId },
        data: { currentIndex: done ? dto.questionIndex : nextIndex },
      });
    }

    return {
      partLabel: dto.partLabel,
      marksEarned: evaluation.marksEarned,
      totalMarks: part.marks,
      feedback: evaluation.feedback,
      markingPoints: part.markingPoints,
      modelAnswer: part.modelAnswer,
      allPartsSubmitted,
      done,
    };
  }

  async complete(user: User, quizId: string): Promise<QuizCompletionResult> {
    const quiz = await (this.prisma as any).quiz.findFirst({
      where: { id: quizId, userId: user.id },
      include: {
        questions: { orderBy: { questionIndex: 'asc' } },
        answers: { orderBy: { questionIndex: 'asc' } },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const answersByIndex = new Map<
      number,
      { answer: string; isCorrect: boolean; evaluationResult?: string; feedback?: string }
    >(
      quiz.answers.map(
        (a: { questionIndex: number; answer: string; isCorrect: boolean; evaluationResult?: string; feedback?: string }) => [
          a.questionIndex,
          { answer: a.answer, isCorrect: a.isCorrect, evaluationResult: a.evaluationResult, feedback: a.feedback },
        ],
      ),
    );

    const reviews: QuizQuestionReview[] = quiz.questions.map(
      (question: any) => {
        const student = answersByIndex.get(question.questionIndex);
        return {
          text: question.text,
          studentAnswer: student?.answer ?? 'No answer',
          correctAnswer: question.correctAnswer,
          isCorrect: student?.isCorrect ?? false,
          explanation: question.explanation,
          subtopic: question.subtopic ?? undefined,
          evaluationResult: (student?.evaluationResult as 'correct' | 'partial' | 'incorrect' | undefined) ?? undefined,
          feedback: student?.feedback ?? undefined,
        };
      },
    );

    const score = reviews.filter((entry) => entry.isCorrect).length;
    const shouldRevealAnswers = true;
    const weakTopics = reviews
      .filter((entry) => !entry.isCorrect)
      .map((entry) => entry.subtopic ?? summariseQuestionAsTopic(entry.text))
      .filter(Boolean)
      .slice(0, 5);

    // Build topic breakdown from subtopics
    const subtopicResults = new Map<string, { correct: number; total: number }>();
    for (const review of reviews) {
      const sub = review.subtopic ?? quiz.topic;
      const entry = subtopicResults.get(sub) ?? { correct: 0, total: 0 };
      subtopicResults.set(sub, {
        correct: entry.correct + (review.isCorrect ? 1 : 0),
        total: entry.total + 1,
      });
    }
    const strong: string[] = [];
    const needsWork: string[] = [];
    const revisitSoon: string[] = [];
    for (const [sub, { correct, total }] of subtopicResults) {
      const ratio = correct / total;
      if (ratio >= 0.8) strong.push(sub);
      else if (ratio < 0.5) needsWork.push(sub);
      else revisitSoon.push(sub); 
    }

    const studentContext = await this.studentContextBuilder.buildForUser(user.id);
    const debriefText = await this.mastraService.generateQuizDebrief({
      topic: quiz.topic,
      studentName: studentContext.name,
      studentLevel: studentContext.grade ?? studentContext.ageGroup ?? 'student',
      score,
      total: quiz.totalQuestions,
      questions: reviews.map((r) => ({ text: r.text, isCorrect: r.isCorrect })),
    });

    await (this.prisma as any).quiz.update({
      where: { id: quizId },
      data: {
        status: 'READY',
        score,
        completedAt: new Date(),
        weakTopics,
        strongTopics: strong,
        revisitSoonTopics: revisitSoon,
        debriefText,
        reviewQuestions: reviews,
      },
    });

    await this.updateSubjectProgress({
      userId: user.id,
      subjectId: quiz.subjectId ?? null,
      topic: quiz.topic,
      score,
      total: quiz.totalQuestions,
    });

    await (this.prisma as any).user.update({
      where: { id: user.id },
      data: {
        sessionCount: { increment: 1 },
        lastActiveAt: new Date(),
      },
    });

    await (this.prisma as any).session.create({
      data: {
        userId: user.id,
        type: 'QUIZ',
        quizId,
        topic: quiz.topic,
        subjectName: quiz.subjectName ?? null,
        durationMinutes: Math.max(5, quiz.totalQuestions),
      },
    });

    return {
      score,
      totalQuestions: quiz.totalQuestions,
      xpEarned: 10 + score,
      shouldRevealAnswers,
      debriefText,
      topicBreakdown: { strong, needsWork, revisitSoon },
      questions: reviews.map((entry) => ({
        ...entry,
        correctAnswer: shouldRevealAnswers ? entry.correctAnswer : null,
      })),
    };
  }

  async getRemediationContext(
    user: User,
    quizId: string,
  ): Promise<QuizRemediationContext> {
    const quiz = await (this.prisma as any).quiz.findFirst({
      where: { id: quizId, userId: user.id },
      include: {
        questions: { orderBy: { questionIndex: 'asc' } },
        answers: { orderBy: { questionIndex: 'asc' } },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return buildQuizRemediationContext(quiz);
  }

  private async updateSubjectProgress(input: {
    userId: string;
    subjectId: string | null;
    topic: string;
    score: number;
    total: number;
  }): Promise<void> {
    if (!input.subjectId || input.total <= 0) return;

    const prisma = this.prisma as any;
    const ratio = Math.max(0, Math.min(1, input.score / input.total));

    const existing = await prisma.subjectProgress.findUnique({
      where: {
        userId_subjectId: { userId: input.userId, subjectId: input.subjectId },
      },
    });

    const previousScores =
      existing?.topicScores &&
      typeof existing.topicScores === 'object' &&
      !Array.isArray(existing.topicScores)
        ? (existing.topicScores as Record<string, number>)
        : {};
    const previousScore =
      typeof previousScores[input.topic] === 'number'
        ? previousScores[input.topic]
        : null;
    const blended =
      previousScore === null ? ratio : 0.7 * previousScore + 0.3 * ratio;

    const updatedScores = {
      ...previousScores,
      [input.topic]: Number(blended.toFixed(3)),
    };
    const strengthLevel = strengthFromScore(blended);

    await prisma.subjectProgress.upsert({
      where: {
        userId_subjectId: { userId: input.userId, subjectId: input.subjectId },
      },
      update: { topicScores: updatedScores, strengthLevel },
      create: {
        userId: input.userId,
        subjectId: input.subjectId,
        topicScores: updatedScores,
        strengthLevel,
      },
    });
  }
}

function normalizeLessonSectionsForQuiz(value: unknown): LessonSectionForQuiz[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((raw) => {
      const section = raw as {
        type?: unknown;
        heading?: unknown;
        body?: unknown;
        terms?: unknown;
      };

      const body = typeof section.body === 'string' ? section.body.trim() : '';
      if (!body) {
        return null;
      }

      const terms = Array.isArray(section.terms)
        ? section.terms
            .map((termRaw) => {
              const term = termRaw as { term?: unknown; explanation?: unknown };
              const termName = typeof term.term === 'string' ? term.term.trim() : '';
              if (!termName) {
                return null;
              }
              return {
                term: termName,
                explanation:
                  typeof term.explanation === 'string'
                    ? term.explanation.trim()
                    : '',
              };
            })
            .filter((term): term is { term: string; explanation: string } => Boolean(term))
        : [];

      return {
        type:
          typeof section.type === 'string' && section.type.trim().length > 0
            ? section.type.trim()
            : 'concept',
        heading:
          typeof section.heading === 'string' && section.heading.trim().length > 0
            ? section.heading.trim()
            : null,
        body,
        terms,
      };
    })
    .filter((section): section is LessonSectionForQuiz => Boolean(section));
}

function summariseQuestionAsTopic(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const firstSentence = trimmed.split(/[.?!]/)[0] ?? trimmed;
  const words = firstSentence.split(' ').slice(0, 8).join(' ');
  return words.length > 80 ? `${words.slice(0, 77)}…` : words;
}

function buildQuizRemediationContext(quiz: {
  id: string;
  topic: string;
  subjectName: string | null;
  score: number;
  totalQuestions: number;
  questions: Array<{
    questionIndex: number;
    type: string;
    text: string;
    correctAnswer: string;
    explanation: string;
    subtopic: string | null;
    options: unknown;
  }>;
  answers: Array<{
    questionIndex: number;
    answer: string;
    isCorrect: boolean;
  }>;
}): QuizRemediationContext {
  const answersByIndex = new Map(
    quiz.answers.map((entry) => [entry.questionIndex, entry]),
  );

  const failedQuestions: QuizRemediationContext['failedQuestions'] = [];
  const passedQuestions: QuizRemediationContext['passedQuestions'] = [];
  const misconceptions: QuizRemediationContext['misconceptions'] = [];

  const bySubtopic = new Map<
    string,
    { questionsAttempted: number; questionsFailed: number; misconception: string | null }
  >();

  for (const question of quiz.questions) {
    const questionType = fromDbQuestionType(question.type) as QuizQuestionType;
    const subtopic =
      question.subtopic?.trim() || summariseQuestionAsTopic(question.text) || quiz.topic;
    const answer = answersByIndex.get(question.questionIndex);
    const marksAvailable = marksAvailableForQuestion(question);
    const marksEarned = marksEarnedForQuestion(question, answer);
    const studentAnswer = parseStudentAnswerForContext(
      questionType,
      answer?.answer,
    );
    const correctAnswer = parseCorrectAnswerForContext(question, questionType);

    const aggregate = bySubtopic.get(subtopic) ?? {
      questionsAttempted: 0,
      questionsFailed: 0,
      misconception: null,
    };
    aggregate.questionsAttempted += 1;

    if (answer?.isCorrect) {
      passedQuestions.push({
        questionIndex: question.questionIndex + 1,
        subtopic,
        marksEarned,
      });
    } else {
      aggregate.questionsFailed += 1;

      failedQuestions.push({
        questionIndex: question.questionIndex + 1,
        questionText: question.text,
        subtopic,
        questionType,
        studentAnswer,
        correctAnswer,
        explanation: question.explanation,
        marksAvailable,
        marksEarned,
      });

      const misconception = buildMisconceptionText(studentAnswer, correctAnswer);
      if (!aggregate.misconception && misconception) {
        aggregate.misconception = misconception;
      }

      if (misconception) {
        misconceptions.push({
          subtopic,
          studentBelievedX: formatAnswerForMisconception(studentAnswer),
          correctAnswerIsY: formatAnswerForMisconception(correctAnswer),
          implication: `Their answer pattern suggests confusion in ${subtopic.toLowerCase()}.`,
        });
      }
    }

    bySubtopic.set(subtopic, aggregate);
  }

  const weakSubtopics = Array.from(bySubtopic.entries())
    .filter(([, value]) => value.questionsFailed > 0)
    .map(([name, value]) => ({
      name,
      questionsAttempted: value.questionsAttempted,
      questionsFailed: value.questionsFailed,
      misconception: value.misconception,
    }))
    .sort((a, b) => {
      if (b.questionsFailed !== a.questionsFailed) {
        return b.questionsFailed - a.questionsFailed;
      }
      if (b.questionsAttempted !== a.questionsAttempted) {
        return b.questionsAttempted - a.questionsAttempted;
      }
      return a.name.localeCompare(b.name);
    });

  const strongSubtopics = Array.from(bySubtopic.entries())
    .filter(([, value]) => value.questionsAttempted > 0 && value.questionsFailed === 0)
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b));

  const total = quiz.totalQuestions || quiz.questions.length;
  const score = typeof quiz.score === 'number' ? quiz.score : passedQuestions.length;
  const percentageScore = total > 0 ? Math.round((score / total) * 100) : 0;

  return {
    quizId: quiz.id,
    topic: quiz.topic,
    subjectName: quiz.subjectName ?? 'General',
    score,
    total,
    percentageScore,
    failedQuestions,
    passedQuestions,
    weakSubtopics,
    misconceptions,
    strongSubtopics,
  };
}

function marksAvailableForQuestion(question: {
  type: string;
  options: unknown;
}): number {
  if (question.type === 'STRUCTURED' && Array.isArray(question.options)) {
    const total = question.options.reduce((sum, part) => {
      const marks =
        part && typeof part === 'object' && 'marks' in (part as Record<string, unknown>)
          ? (part as { marks?: unknown }).marks
          : null;
      return sum + (typeof marks === 'number' && Number.isFinite(marks) ? marks : 0);
    }, 0);
    return total > 0 ? total : 1;
  }

  return 1;
}

function marksEarnedForQuestion(
  question: { type: string; options: unknown },
  answer:
    | {
        answer: string;
        isCorrect: boolean;
      }
    | undefined,
): number {
  const available = marksAvailableForQuestion(question);
  if (!answer) {
    return 0;
  }

  if (question.type === 'STRUCTURED') {
    try {
      const parsed = JSON.parse(answer.answer) as Record<
        string,
        { marksEarned?: unknown }
      >;
      const total = Object.values(parsed).reduce((sum, part) => {
        const marks = part?.marksEarned;
        return sum + (typeof marks === 'number' && Number.isFinite(marks) ? marks : 0);
      }, 0);
      if (total > 0) {
        return total;
      }
    } catch {
      // Fall through to boolean correctness fallback.
    }
  }

  return answer.isCorrect ? available : 0;
}

function parseStudentAnswerForContext(
  questionType: QuizQuestionType,
  rawAnswer: string | undefined,
): string | string[] {
  if (!rawAnswer || !rawAnswer.trim()) {
    return 'No answer';
  }

  if (questionType === 'multiple_select') {
    try {
      const parsed = JSON.parse(rawAnswer) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean);
      }
    } catch {
      return rawAnswer;
    }
  }

  if (questionType === 'structured') {
    try {
      const parsed = JSON.parse(rawAnswer) as Record<string, { text?: unknown }>;
      const lines = Object.entries(parsed)
        .map(([label, value]) => {
          const text = typeof value?.text === 'string' ? value.text.trim() : '';
          return text ? `${label}: ${text}` : null;
        })
        .filter((line): line is string => Boolean(line));
      return lines.length ? lines : rawAnswer;
    } catch {
      return rawAnswer;
    }
  }

  return rawAnswer;
}

function parseCorrectAnswerForContext(
  question: { type: string; correctAnswer: string; options: unknown },
  questionType: QuizQuestionType,
): string | string[] {
  if (questionType === 'multiple_select') {
    try {
      const parsed = JSON.parse(question.correctAnswer) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean);
      }
    } catch {
      return question.correctAnswer;
    }
  }

  if (questionType === 'structured' && Array.isArray(question.options)) {
    const modelAnswers = question.options
      .map((part) => {
        if (!part || typeof part !== 'object') {
          return null;
        }
        const partObj = part as { label?: unknown; modelAnswer?: unknown };
        const modelAnswer =
          typeof partObj.modelAnswer === 'string' ? partObj.modelAnswer.trim() : '';
        if (!modelAnswer) {
          return null;
        }
        const label = typeof partObj.label === 'string' ? partObj.label.trim() : '';
        return label ? `${label}: ${modelAnswer}` : modelAnswer;
      })
      .filter((value): value is string => Boolean(value));

    if (modelAnswers.length > 0) {
      return modelAnswers;
    }
  }

  return question.correctAnswer || 'No answer provided';
}

function buildMisconceptionText(
  studentAnswer: string | string[],
  correctAnswer: string | string[],
): string | null {
  const student = formatAnswerForMisconception(studentAnswer);
  const correct = formatAnswerForMisconception(correctAnswer);
  if (!student || student === 'No answer' || student === correct) {
    return null;
  }
  return `Answered "${student}" instead of "${correct}".`;
}

function formatAnswerForMisconception(answer: string | string[]): string {
  if (Array.isArray(answer)) {
    const clean = answer.map((value) => value.trim()).filter(Boolean);
    return clean.length ? clean.join(', ') : 'No answer';
  }
  const clean = answer.trim();
  return clean || 'No answer';
}

function strengthFromScore(
  ratio: number,
): 'STRONG' | 'DEVELOPING' | 'NEEDS_WORK' {
  if (ratio >= 0.8) return 'STRONG';
  if (ratio >= 0.5) return 'DEVELOPING';
  return 'NEEDS_WORK';
}

function normalizeMode(mode: string): 'guide' | 'companion' {
  return mode === 'COMPANION' ? 'companion' : 'guide';
}

function toDbQuestionType(type: string): string {
  switch (type) {
    case 'multiple_choice':
      return 'MULTIPLE_CHOICE';
    case 'multiple_select':
      return 'MULTIPLE_SELECT';
    case 'true_false':
      return 'TRUE_FALSE';
    case 'fill_blank':
      return 'FILL_BLANK';
    case 'short_answer':
      return 'SHORT_ANSWER';
    case 'ordering':
      return 'ORDERING';
    case 'structured':
      return 'STRUCTURED';
    default:
      return 'MULTIPLE_CHOICE';
  }
}

function fromDbQuestionType(
  type: string,
):
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'ordering'
  | 'structured' {
  switch (type) {
    case 'MULTIPLE_SELECT':
      return 'multiple_select';
    case 'TRUE_FALSE':
      return 'true_false';
    case 'FILL_BLANK':
      return 'fill_blank';
    case 'SHORT_ANSWER':
      return 'short_answer';
    case 'ORDERING':
      return 'ordering';
    case 'STRUCTURED':
      return 'structured';
    default:
      return 'multiple_choice';
  }
}

function checkAnswer(
  dbQuestionType: string,
  studentAnswer: string,
  storedCorrect: string,
): boolean {
  switch (dbQuestionType) {
    case 'MULTIPLE_SELECT':
      return compareMultipleSelectAnswers(studentAnswer, storedCorrect);
    case 'TRUE_FALSE': {
      const normalizedStudentAnswer = normalizeFreeTextAnswer(studentAnswer);
      if (
        normalizedStudentAnswer !== 'true' &&
        normalizedStudentAnswer !== 'false'
      ) {
        return false;
      }
      return normalizedStudentAnswer === normalizeFreeTextAnswer(storedCorrect);
    }
    case 'SHORT_ANSWER':
      // Short answers are evaluated via POST /:quizId/evaluate-short-answer (AI grading).
      // answer() just stores the response; isCorrect defaults false until evaluation updates it.
      return false;
    case 'STRUCTURED':
      // Structured questions are evaluated per-sub-part via POST /:quizId/answer-part.
      // This endpoint should not be called for STRUCTURED questions.
      return false;
    case 'FILL_BLANK':
    case 'ORDERING':
      return compareAcceptedAnswers(studentAnswer, storedCorrect);
    case 'MULTIPLE_CHOICE':
    default:
      return (
        normalizeFreeTextAnswer(studentAnswer) ===
        normalizeFreeTextAnswer(storedCorrect)
      );
  }
}

function serializeCorrectAnswer(question: {
  type: string;
  correctAnswer?: string;
  correctAnswers?: string[];
}): string {
  if (question.type === 'multiple_select') {
    return JSON.stringify(
      (question.correctAnswers ?? []).map((answer) => answer.trim()),
    );
  }

  return question.correctAnswer?.trim() ?? '';
}

function compareMultipleSelectAnswers(
  studentAnswer: string,
  storedCorrect: string,
): boolean {
  try {
    const correct: string[] = JSON.parse(storedCorrect);
    const student: string[] = JSON.parse(studentAnswer);
    const sortedCorrect = [...correct].map(normalizeFreeTextAnswer).sort();
    const sortedStudent = [...student].map(normalizeFreeTextAnswer).sort();
    return JSON.stringify(sortedCorrect) === JSON.stringify(sortedStudent);
  } catch {
    return false;
  }
}

function compareAcceptedAnswers(
  studentAnswer: string,
  storedCorrect: string,
): boolean {
  const normalizedStudent = normalizeFreeTextAnswer(studentAnswer);
  if (!normalizedStudent) {
    return false;
  }

  const acceptedAnswers = storedCorrect
    .split(/\||\n|;/)
    .map(normalizeFreeTextAnswer)
    .filter(Boolean);
  if (acceptedAnswers.length === 0) {
    return false;
  }

  return acceptedAnswers.some(
    (acceptedAnswer) => normalizedStudent === acceptedAnswer,
  );
}

function normalizeFreeTextAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '');
}

function deriveQuizHistoryStatus(quiz: {
  status: string;
  completedAt: Date | string | null;
  totalQuestions: number;
  answers?: Array<unknown>;
}): QuizHistoryStatus {
  if (quiz.status === 'FAILED') {
    return 'failed';
  }

  if (quiz.status !== 'READY') {
    return 'queued';
  }

  const answersCount = quiz.answers?.length ?? 0;
  if (quiz.completedAt) {
    return 'completed';
  }
  if (answersCount === 0) {
    return 'not_started';
  }
  if (answersCount < quiz.totalQuestions) {
    return 'in_progress';
  }
  return 'completed';
}

function estimateSecondsRemaining(quiz: {
  status: string;
  paperType?: string | null;
  totalQuestions: number;
  createdAt: Date | string;
}): number | null {
  if (quiz.status === 'READY' || quiz.status === 'FAILED') {
    return null;
  }

  const isPaper2 = String(quiz.paperType ?? '').toUpperCase() === 'PAPER2';
  const estimateTotalSeconds = isPaper2
    ? Math.max(45, quiz.totalQuestions * 35)
    : Math.max(20, quiz.totalQuestions * 12);
  const elapsed = Math.floor(
    (Date.now() - new Date(quiz.createdAt).getTime()) / 1000,
  );
  return Math.max(5, estimateTotalSeconds - Math.max(0, elapsed));
}

function estimateQuizMinutes(quiz: {
  paperType?: string | null;
  totalQuestions: number;
}): number {
  const paperType = toSharedPaperType(quiz.paperType);
  if (paperType === 'paper2') {
    return Math.max(15, quiz.totalQuestions * 20);
  }
  return Math.max(5, quiz.totalQuestions * 2);
}

function formatStoredAnswerForReview(value: string | null | undefined): string {
  if (!value || value.trim().length === 0) {
    return 'No answer';
  }

  try {
    const parsed = JSON.parse(value) as Record<string, { text?: unknown }>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return value;
    }

    const formatted = Object.entries(parsed)
      .map(([partLabel, partValue]) => {
        const text =
          partValue && typeof partValue === 'object' && 'text' in partValue
            ? String(partValue.text ?? '').trim()
            : '';
        if (!text) {
          return null;
        }
        return `${partLabel}: ${text}`;
      })
      .filter((entry): entry is string => Boolean(entry));

    return formatted.length > 0 ? formatted.join(' | ') : value;
  } catch {
    return value;
  }
}

function normalizeStoredReviewQuestions(value: unknown): QuizQuestionReview[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: QuizQuestionReview[] = value
    .map((raw) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return null;
      }

      const item = raw as Record<string, unknown>;
      const text = typeof item.text === 'string' ? item.text.trim() : '';
      if (!text) {
        return null;
      }

      const evaluationResult =
        item.evaluationResult === 'correct'
        || item.evaluationResult === 'partial'
        || item.evaluationResult === 'incorrect'
          ? (item.evaluationResult as 'correct' | 'partial' | 'incorrect')
          : undefined;

      return {
        text,
        studentAnswer:
          typeof item.studentAnswer === 'string' && item.studentAnswer.trim().length > 0
            ? item.studentAnswer
            : 'No answer',
        correctAnswer:
          typeof item.correctAnswer === 'string' && item.correctAnswer.trim().length > 0
            ? item.correctAnswer
            : null,
        isCorrect: item.isCorrect === true,
        explanation:
          typeof item.explanation === 'string' && item.explanation.trim().length > 0
            ? item.explanation
            : 'No explanation available.',
        subtopic:
          typeof item.subtopic === 'string' && item.subtopic.trim().length > 0
            ? item.subtopic
            : undefined,
        evaluationResult,
        feedback:
          typeof item.feedback === 'string' && item.feedback.trim().length > 0
            ? item.feedback
            : undefined,
      };
    })
    .filter((item): item is QuizQuestionReview => item !== null);

  return normalized;
}

function parseHistoryCursor(
  rawCursor: string | undefined,
): { createdAtMs: number; id: string } | null {
  if (!rawCursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(rawCursor, 'base64').toString('utf8'),
    ) as { createdAt: string; id: string };
    const createdAtMs = new Date(parsed.createdAt).getTime();
    if (!Number.isFinite(createdAtMs) || typeof parsed.id !== 'string') {
      return null;
    }

    return { createdAtMs, id: parsed.id };
  } catch {
    return null;
  }
}

function buildHistoryCursor(quiz: { createdAt: Date | string; id: string }): string {
  const payload = {
    createdAt: new Date(quiz.createdAt).toISOString(),
    id: quiz.id,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

function buildHistoryWhereClause(userId: string, query: QuizHistoryQueryDto): Record<string, unknown> {
  const where: Record<string, unknown> = { userId };

  if (query.subject) {
    where.subjectName = query.subject;
  }

  if (query.difficulty) {
    where.difficulty = query.difficulty.toUpperCase();
  }

  if (query.paper) {
    where.paperType = query.paper.toUpperCase();
  }

  return where;
}

function toSharedPaperType(value: string | null | undefined): 'paper1' | 'paper2' {
  return String(value ?? '').toUpperCase() === 'PAPER2' ? 'paper2' : 'paper1';
}

function toSharedDifficulty(
  value: string | null | undefined,
): 'foundation' | 'standard' | 'challenging' | 'extension' {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'foundation') return 'foundation';
  if (normalized === 'challenging') return 'challenging';
  if (normalized === 'extension') return 'extension';
  return 'standard';
}

function computePaper2Marks(quiz: any): { marksEarned: number; totalMarks: number } {
  if (!quiz) {
    return { marksEarned: 0, totalMarks: 0 };
  }

  let totalMarks = 0;
  for (const question of quiz.questions ?? []) {
    if (!Array.isArray(question.options)) {
      continue;
    }
    for (const part of question.options) {
      const marks =
        part && typeof part === 'object' && 'marks' in part
          ? (part as { marks?: unknown }).marks
          : null;
      if (typeof marks === 'number' && Number.isFinite(marks)) {
        totalMarks += marks;
      }
    }
  }

  let marksEarned = 0;
  for (const answer of quiz.answers ?? []) {
    try {
      const parsed = JSON.parse(answer.answer) as Record<string, { marksEarned?: unknown }>;
      for (const value of Object.values(parsed)) {
        if (typeof value?.marksEarned === 'number' && Number.isFinite(value.marksEarned)) {
          marksEarned += value.marksEarned;
        }
      }
    } catch {
      if (answer.isCorrect) {
        marksEarned += 1;
      }
    }
  }

  return { marksEarned, totalMarks };
}

function computeNormalizedScoreOutOfTen(quiz: any): number | null {
  const paperType = toSharedPaperType(quiz.paperType);

  if (paperType === 'paper1') {
    if (typeof quiz.score !== 'number' || !quiz.totalQuestions) {
      return null;
    }
    return (quiz.score / Math.max(quiz.totalQuestions, 1)) * 10;
  }

  const marks = computePaper2Marks(quiz);
  if (marks.totalMarks <= 0) {
    return null;
  }

  return (marks.marksEarned / marks.totalMarks) * 10;
}

function getMonthlyQuizLimit(plan: string): number | null {
  const normalized = plan.toUpperCase();
  if (normalized === 'SCHOLAR') return 80;
  if (normalized === 'HOUSEHOLD') return 100;
  if (normalized === 'CAMPUS') return 200;
  return null;
}

function difficultyWeight(value: string): number {
  switch (value.toLowerCase()) {
    case 'extension':
      return 4;
    case 'challenging':
      return 3;
    case 'standard':
      return 2;
    case 'foundation':
      return 1;
    default:
      return 0;
  }
}

function getBillingWindowBounds(anchorDay: number): { periodStart: Date; periodEnd: Date } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  let startYear = year;
  let startMonth = month;

  if (day < anchorDay) {
    startMonth -= 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear -= 1;
    }
  }

  const periodStart = new Date(Date.UTC(startYear, startMonth, anchorDay, 0, 0, 0, 0));
  let endYear = startYear;
  let endMonth = startMonth + 1;
  if (endMonth > 11) {
    endMonth = 0;
    endYear += 1;
  }

  const periodEnd = new Date(Date.UTC(endYear, endMonth, anchorDay, 0, 0, 0, 0));
  return { periodStart, periodEnd };
}
