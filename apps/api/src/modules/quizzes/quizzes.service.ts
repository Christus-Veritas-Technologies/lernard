import { Injectable, NotFoundException } from '@nestjs/common';
import type { QuizCompletionResult, QuizContent, QuizQuestionReview } from '@lernard/shared-types';
import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MastraService } from '../../mastra/mastra.service';
import { validateGeneratedContent } from '../../common/utils/validate-generated-content';
import { GenerateQuizDto, SubmitAnswerDto } from './dto/quizzes.dto';

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mastraService: MastraService,
  ) {}

  async generate(user: User, dto: GenerateQuizDto): Promise<{ quizId: string; status: string }> {
    const generated = await this.mastraService.generateQuiz({
      topic: dto.topic,
      questionCount: dto.questionCount,
      subjectName: dto.subject,
      mode: normalizeMode(user.learningMode),
    });

    await validateGeneratedContent(generated, this.mastraService);

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

      // For multiple_select, store the array of correct answers as JSON
      const correctAnswer =
        question.type === 'multiple_select'
          ? JSON.stringify(question.correctAnswers ?? [])
          : (question.correctAnswer ?? question.options?.[0] ?? 'See explanation');

      await (this.prisma as any).quizQuestion.create({
        data: {
          quizId: quiz.id,
          questionIndex: i,
          type: toDbQuestionType(question.type),
          text: question.text,
          options: question.options ?? null,
          correctAnswer,
          explanation: question.explanation ?? 'Review this concept and compare your answer with the expected pattern.',
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

    const index = Math.min(Math.max(quiz.currentIndex, 0), Math.max(quiz.questions.length - 1, 0));
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
        options: Array.isArray(currentQuestion?.options) ? currentQuestion.options : undefined,
      },
    };
  }

  async answer(user: User, quizId: string, dto: SubmitAnswerDto): Promise<{ isCorrect: boolean; feedback: string; done: boolean }> {
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
    const isCorrect = checkAnswer(question.type, dto.answer, question.correctAnswer);

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
      feedback: isCorrect ? 'Nice work. That answer is correct.' : 'Not quite yet. Give it another look.',
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

    const answersByIndex = new Map<number, { answer: string; isCorrect: boolean }>(
      quiz.answers.map((a: { questionIndex: number; answer: string; isCorrect: boolean }) => [
        a.questionIndex,
        { answer: a.answer, isCorrect: a.isCorrect },
      ]),
    );

    const reviews: QuizQuestionReview[] = quiz.questions.map((question: any) => {
      const student = answersByIndex.get(question.questionIndex);
      return {
        text: question.text,
        studentAnswer: student?.answer ?? 'No answer',
        correctAnswer: question.correctAnswer,
        isCorrect: student?.isCorrect ?? false,
        explanation: question.explanation,
      };
    });

    const score = reviews.filter((entry) => entry.isCorrect).length;
    const shouldRevealAnswers = true;

    await (this.prisma as any).quiz.update({
      where: { id: quizId },
      data: {
        status: 'READY',
        score,
        completedAt: new Date(),
      },
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
        revisitSoon: score >= Math.ceil(quiz.totalQuestions / 2) ? [quiz.topic] : [],
      },
      questions: reviews.map((entry) => ({
        ...entry,
        correctAnswer: shouldRevealAnswers ? entry.correctAnswer : null,
      })),
    };
  }
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

function fromDbQuestionType(type: string): 'multiple_choice' | 'multiple_select' | 'true_false' | 'fill_blank' | 'short_answer' | 'ordering' {
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

function checkAnswer(dbQuestionType: string, studentAnswer: string, storedCorrect: string): boolean {
  if (dbQuestionType === 'MULTIPLE_SELECT') {
    try {
      const correct: string[] = JSON.parse(storedCorrect);
      const student: string[] = JSON.parse(studentAnswer);
      const sortedCorrect = [...correct].map((s) => s.trim().toLowerCase()).sort();
      const sortedStudent = [...student].map((s) => s.trim().toLowerCase()).sort();
      return JSON.stringify(sortedCorrect) === JSON.stringify(sortedStudent);
    } catch {
      return false;
    }
  }
  return studentAnswer.trim().toLowerCase() === storedCorrect.trim().toLowerCase();
}
