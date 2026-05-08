import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  QuizCompletionResult,
  QuizContent,
  QuizQuestionReview,
} from '@lernard/shared-types';
import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MastraService } from '../../mastra/mastra.service';
import { StudentContextBuilder } from '../../mastra/student-context.builder';
import { validateGeneratedContent } from '../../common/utils/validate-generated-content';
import { GenerateQuizDto, SubmitAnswerDto } from './dto/quizzes.dto';

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mastraService: MastraService,
    private readonly studentContextBuilder: StudentContextBuilder,
  ) {}

  async generate(
    user: User,
    dto: GenerateQuizDto,
  ): Promise<{ quizId: string; status: string }> {
    const studentContext = await this.studentContextBuilder.buildForUser(
      user.id,
    );
    const generated = await this.mastraService.generateQuiz({
      topic: dto.topic,
      questionCount: dto.questionCount,
      subjectName: dto.subject,
      mode: normalizeMode(user.learningMode),
      studentContext,
    });

    await validateGeneratedContent(generated, this.mastraService);

    if (generated.questions.length !== dto.questionCount) {
      throw new Error(
        `Quiz generation returned ${generated.questions.length} questions instead of ${dto.questionCount}.`,
      );
    }

    const quiz = await (this.prisma as any).quiz.create({
      data: {
        userId: user.id,
        topic: generated.topic,
        subjectName: generated.subjectName,
        totalQuestions: generated.questions.length,
        mode: user.learningMode,
        status: 'READY',
        fromLessonId: dto.fromLessonId ?? null,
        fromConversationId: dto.fromConversationId ?? null,
      },
    });

    for (let i = 0; i < generated.questions.length; i++) {
      const question = generated.questions[i];

      const correctAnswer = serializeCorrectAnswer(question);

      await (this.prisma as any).quizQuestion.create({
        data: {
          quizId: quiz.id,
          questionIndex: i,
          type: toDbQuestionType(question.type),
          text: question.text,
          options: question.options ?? null,
          correctAnswer,
          explanation:
            question.explanation ??
            'Review this concept and compare your answer with the expected pattern.',
        },
      });
    }

    return { quizId: quiz.id, status: 'ready' };
  }

  async getQuiz(user: User, quizId: string): Promise<QuizContent> {
    const quiz = await (this.prisma as any).quiz.findFirst({
      where: { id: quizId, userId: user.id },
      include: {
        questions: {
          where: { questionIndex: { gte: 0 } },
          orderBy: { questionIndex: 'asc' },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const index = Math.min(
      Math.max(quiz.currentIndex, 0),
      Math.max(quiz.questions.length - 1, 0),
    );
    const currentQuestion = quiz.questions[index];

    return {
      quizId: quiz.id,
      topic: quiz.topic,
      subjectName: quiz.subjectName ?? 'General',
      mode: normalizeMode(quiz.mode),
      totalQuestions: quiz.totalQuestions,
      currentQuestionIndex: index,
      question: {
        type: fromDbQuestionType(currentQuestion?.type),
        text: currentQuestion?.text ?? 'No question available',
        options: Array.isArray(currentQuestion?.options)
          ? currentQuestion.options
          : undefined,
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
      { answer: string; isCorrect: boolean }
    >(
      quiz.answers.map(
        (a: { questionIndex: number; answer: string; isCorrect: boolean }) => [
          a.questionIndex,
          { answer: a.answer, isCorrect: a.isCorrect },
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
        };
      },
    );

    const score = reviews.filter((entry) => entry.isCorrect).length;
    const shouldRevealAnswers = true;
    const weakTopics = reviews
      .filter((entry) => !entry.isCorrect)
      .map((entry) => summariseQuestionAsTopic(entry.text))
      .filter(Boolean)
      .slice(0, 5);

    await (this.prisma as any).quiz.update({
      where: { id: quizId },
      data: {
        status: 'READY',
        score,
        completedAt: new Date(),
        weakTopics,
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
      topicBreakdown: {
        strong: score > 0 ? [quiz.topic] : [],
        needsWork: score < quiz.totalQuestions ? [quiz.topic] : [],
        revisitSoon:
          score >= Math.ceil(quiz.totalQuestions / 2) ? [quiz.topic] : [],
      },
      questions: reviews.map((entry) => ({
        ...entry,
        correctAnswer: shouldRevealAnswers ? entry.correctAnswer : null,
      })),
    };
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

function summariseQuestionAsTopic(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const firstSentence = trimmed.split(/[.?!]/)[0] ?? trimmed;
  const words = firstSentence.split(' ').slice(0, 8).join(' ');
  return words.length > 80 ? `${words.slice(0, 77)}…` : words;
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
  | 'ordering' {
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
    case 'FILL_BLANK':
    case 'SHORT_ANSWER':
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
