import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  PagePayload,
  Quiz,
  QuizContent,
  QuizResultsContent,
  QuizScore,
  ScopedPermission,
} from '@lernard/shared-types';
import { buildNullSlots, buildPagePayload } from '../../common/utils/build-page-payload';
import { validateGeneratedContent } from '../../common/utils/validate-generated-content';
import { MastraService } from '../../mastra/mastra.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { GenerateQuizDto, SubmitAnswerDto } from './dto/quizzes.dto';

/** Shape stored in Quiz.questions JSON — includes correctAnswer (never sent to client). */
interface StoredQuestion {
  id: string;
  index: number;
  type: string;
  question: string;
  options: string[];
  correctAnswer: number; // 0-based index
  explanation: string;
}

/** Shape stored in Quiz.answers JSON — { [index: string]: string } */
type StoredAnswers = Record<string, string>;

function parseStoredQuestions(raw: unknown): StoredQuestion[] {
  const src = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!Array.isArray(src)) throw new Error('Quiz questions is not an array');
  return src.map((q: any, i: number) => ({
    id: q.id ?? `q${i}`,
    index: typeof q.index === 'number' ? q.index : i,
    type: q.type ?? 'multiple_choice',
    question: q.question ?? '',
    options: Array.isArray(q.options) ? q.options : [],
    correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
    explanation: q.explanation ?? '',
  }));
}

function parseStoredAnswers(raw: unknown): StoredAnswers {
  if (!raw || typeof raw === 'string') {
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
  return raw as StoredAnswers;
}

function sanitizeQuestions(questions: StoredQuestion[], answers: StoredAnswers) {
  return questions.map((q) => {
    const studentAnswer = answers[String(q.index)] ?? null;
    const isCorrect = studentAnswer !== null ? String(q.correctAnswer) === studentAnswer : null;
    return {
      index: q.index,
      type: q.type === 'multiple-choice' ? 'multiple_choice' : q.type,
      question: q.question,
      options: q.options,
      correctAnswer: undefined,
      studentAnswer,
      isCorrect,
      feedback: null as string | null,
    };
  });
}

function buildQuizPermissions(): ScopedPermission[] {
  return ['can_start_lesson'] as unknown as ScopedPermission[];
}

function calculateQuizXp(correct: number, total: number): number {
  const pct = total > 0 ? correct / total : 0;
  return Math.round(10 + pct * 40); // 10 base, up to 50 for 100%
}

function toMastraLevel(depth: string): 'beginner' | 'intermediate' | 'advanced' {
  if (depth === 'quick') return 'beginner';
  if (depth === 'deep') return 'advanced';
  return 'intermediate';
}

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mastra: MastraService,
  ) {}

  async generate(userId: string, dto: GenerateQuizDto): Promise<Quiz> {
    const existing = await this.prisma.quiz.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      include: { subject: true },
    });
    if (existing) return this.mapQuiz(existing, false);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { preferredDepth: true },
    });

    const depth = user.preferredDepth ?? 'standard';
    const level = toMastraLevel(depth);

    const raw = await this.mastra.generateQuiz({
      topic: dto.topic,
      level,
      questionCount: 10,
      studentId: userId,
    });

    const parsedRaw = (() => {
      const cleaned = raw.replace(/```json\s*/i, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    })();

    await validateGeneratedContent(parsedRaw, this.mastra);

    const numbered = (Array.isArray(parsedRaw) ? parsedRaw : [parsedRaw]).map(
      (q: any, i: number) => ({ ...q, index: i }),
    );

    const quiz = await this.prisma.quiz.create({
      data: {
        userId,
        subjectId: dto.subjectId ?? null,
        topic: dto.topic,
        length: numbered.length,
        idempotencyKey: dto.idempotencyKey,
        questions: JSON.stringify(numbered),
      },
      include: { subject: true },
    });

    return this.mapQuiz(quiz, false);
  }

  async getById(userId: string, id: string): Promise<PagePayload<QuizContent>> {
    const quiz = await this.findQuiz(userId, id);
    return buildPagePayload<QuizContent>(
      { quiz: this.mapQuiz(quiz, false) },
      {
        permissions: buildQuizPermissions(),
        slots: buildNullSlots(['topic_insight']),
      },
    );
  }

  async submitAnswer(
    userId: string,
    id: string,
    dto: SubmitAnswerDto,
  ): Promise<{ questionId: string; isCorrect: boolean; feedback: string }> {
    const quiz = await this.findQuiz(userId, id);
    if (quiz.completed) throw new BadRequestException('Quiz is already completed.');

    const questions = parseStoredQuestions(quiz.questions);
    const question = questions.find((q) => q.id === dto.questionId || String(q.index) === dto.questionId);
    if (!question) throw new NotFoundException(`Question ${dto.questionId} not found.`);

    const isCorrect = String(question.correctAnswer) === dto.answer;
    const answers = parseStoredAnswers(quiz.answers);
    answers[String(question.index)] = dto.answer;

    await this.prisma.quiz.update({
      where: { id },
      data: { answers: JSON.stringify(answers) },
    });

    return { questionId: dto.questionId, isCorrect, feedback: question.explanation };
  }

  async complete(userId: string, id: string): Promise<QuizResultsContent> {
    const quiz = await this.findQuiz(userId, id);

    const questions = parseStoredQuestions(quiz.questions);
    const answers = parseStoredAnswers(quiz.answers);

    const results = questions.map((q) => {
      const studentAnswer = answers[String(q.index)] ?? null;
      const isCorrect = studentAnswer !== null && String(q.correctAnswer) === studentAnswer;
      return { topic: quiz.topic, isCorrect };
    });

    const correct = results.filter((r) => r.isCorrect).length;
    const total = questions.length;
    const xpEarned = calculateQuizXp(correct, total);
    const subjectName = (quiz as any).subject?.name ?? 'General';

    const score: QuizScore = {
      total,
      correct,
      strong: correct / total >= 0.8 ? [quiz.topic] : [],
      needsWork: correct / total < 0.5 ? [quiz.topic] : [],
      revisitSoon: correct / total >= 0.5 && correct / total < 0.8 ? [quiz.topic] : [],
    };

    if (!quiz.completed) {
      const now = new Date();
      await this.prisma.$transaction([
        this.prisma.quiz.update({
          where: { id },
          data: { completed: true, completedAt: now, score: correct },
        }),
        this.prisma.sessionRecord.create({
          data: {
            userId,
            type: 'QUIZ',
            quizId: id,
            subjectName,
            topic: quiz.topic,
            durationMs: 0,
          },
        }),
        this.prisma.user.update({
          where: { id: userId },
          data: { sessionCount: { increment: 1 } },
        }),
        ...(quiz.subjectId
          ? [
              this.prisma.subjectProgress.upsert({
                where: { userId_subjectId: { userId, subjectId: quiz.subjectId } },
                create: {
                  userId,
                  subjectId: quiz.subjectId,
                  topicScores: JSON.stringify({ [quiz.topic]: score.correct / score.total }),
                },
                update: {
                  topicScores: buildUpdatedTopicScores(
                    quiz.topic,
                    score.correct / score.total,
                    (quiz as any).subjectProgress?.topicScores,
                  ),
                },
              }),
            ]
          : []),
      ]);
    }

    return { quizId: id, topic: quiz.topic, subject: subjectName, score, xpEarned };
  }

  async getHistory(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ items: Quiz[]; cursor: string | null; hasMore: boolean }> {
    const take = limit + 1;
    const quizzes = await this.prisma.quiz.findMany({
      where: { userId, deletedAt: null },
      include: { subject: true },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = quizzes.length > limit;
    const items = quizzes.slice(0, limit).map((q) => this.mapQuiz(q, false));
    return { items, cursor: hasMore ? items[items.length - 1].id : null, hasMore };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async findQuiz(userId: string, id: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id, userId, deletedAt: null },
      include: { subject: true },
    });
    if (!quiz) throw new NotFoundException('Quiz not found.');
    return quiz;
  }

  private mapQuiz(quiz: any, withAnswers: boolean): Quiz {
    const questions = parseStoredQuestions(quiz.questions);
    const answers = withAnswers ? parseStoredAnswers(quiz.answers) : {};
    const sanitized = sanitizeQuestions(questions, answers);

    return {
      id: quiz.id,
      ownerId: quiz.userId,
      topic: quiz.topic,
      subject: quiz.subject?.name ?? 'General',
      questionCount: quiz.length,
      questions: sanitized,
      score: null,
      completedAt: quiz.completedAt?.toISOString() ?? null,
      xpEarned: 0,
      createdAt: quiz.createdAt.toISOString(),
      deletedAt: quiz.deletedAt?.toISOString() ?? null,
      fromLessonId: null,
      fromConversationId: null,
    };
  }
}

function buildUpdatedTopicScores(
  topic: string,
  score: number,
  existing?: unknown,
): string {
  let scores: Record<string, number> = {};
  if (existing) {
    try {
      scores = typeof existing === 'string' ? JSON.parse(existing) : (existing as Record<string, number>);
    } catch {
      scores = {};
    }
  }
  scores[topic] = score;
  return JSON.stringify(scores);
}

