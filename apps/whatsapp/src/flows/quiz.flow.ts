import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SessionsService, StoredSession } from '../sessions/sessions.service';
import { LernardApiService, PlanLimitError } from '../api/lernard-api.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { PlanLimitFlow } from './plan-limit.flow';
import { WhatsAppState } from '@lernard/whatsapp-core';
import {
  formatQuestion,
  formatAnswerFeedback,
  formatScore,
} from '@lernard/whatsapp-core';
import type { ClassificationResult } from '@lernard/whatsapp-core';
import {
  GENERATING_QUIZ_MESSAGE,
  GENERATION_FAILED_MESSAGE,
  GENERATION_TIMEOUT_MESSAGE,
} from '@lernard/whatsapp-core';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_RETRIES = 30;

interface GenerateQuizResponse {
  quizId: string;
  status: string;
}

interface QuizStatusResponse {
  status: 'generating' | 'ready' | 'failed';
  totalQuestions?: number;
}

interface QuizQuestion {
  id: string;
  text: string;
  options: { label: string; text: string }[];
  index: number;
}

interface QuizCurrentResponse {
  question: QuizQuestion | null;
  isComplete: boolean;
}

interface SubmitAnswerResponse {
  isCorrect: boolean;
  correctAnswer: string;
  explanation?: string;
  nextQuestion?: QuizQuestion | null;
  isComplete?: boolean;
  score?: number;
}

@Injectable()
export class QuizFlow {
  private readonly logger = new Logger(QuizFlow.name);

  constructor(
    private readonly sessions: SessionsService,
    private readonly api: LernardApiService,
    private readonly wa: WhatsAppService,
    private readonly planLimitFlow: PlanLimitFlow,
  ) {}

  async handle(
    session: StoredSession,
    classification: ClassificationResult,
  ): Promise<void> {
    const phone = session.phoneNumber;
    const topic = classification.topic ?? 'a general topic';

    await this.wa.sendText(phone, GENERATING_QUIZ_MESSAGE(topic));

    let generateRes: GenerateQuizResponse;
    try {
      generateRes = await this.api.call<GenerateQuizResponse>(
        phone,
        '/v1/quizzes/generate',
        {
          method: 'POST',
          body: JSON.stringify({
            topic,
            difficulty: 'standard',
            questionType: 'multiple_choice',
            idempotencyKey: uuidv4(),
          }),
        },
      );
    } catch (err) {
      if (err instanceof PlanLimitError) {
        await this.planLimitFlow.handle(session, err);
        return;
      }
      this.logger.error(`Quiz generation failed: ${(err as Error).message}`);
      await this.wa.sendText(phone, GENERATION_FAILED_MESSAGE);
      return;
    }

    const quizId = generateRes.quizId;

    // Poll for quiz ready
    let totalQuestions = 5;
    for (let attempt = 0; attempt < POLL_MAX_RETRIES; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      try {
        const status = await this.api.call<QuizStatusResponse>(
          phone,
          `/v1/quizzes/${quizId}`,
        );
        if (status.status === 'ready') {
          totalQuestions = status.totalQuestions ?? 5;
          break;
        }
        if (status.status === 'failed') {
          await this.wa.sendText(phone, GENERATION_FAILED_MESSAGE);
          await this.sessions.setState(phone, WhatsAppState.IDLE);
          return;
        }
      } catch (err) {
        if (err instanceof PlanLimitError) {
          await this.planLimitFlow.handle(session, err);
          return;
        }
        this.logger.warn(`Quiz poll error (attempt ${attempt + 1}): ${(err as Error).message}`);
      }

      if (attempt === POLL_MAX_RETRIES - 1) {
        await this.wa.sendText(phone, GENERATION_TIMEOUT_MESSAGE);
        await this.sessions.setState(phone, WhatsAppState.IDLE);
        return;
      }
    }

    // Get first question
    try {
      const current = await this.api.call<QuizCurrentResponse>(
        phone,
        `/v1/quizzes/${quizId}/current`,
      );
      if (!current.question) {
        await this.wa.sendText(phone, GENERATION_FAILED_MESSAGE);
        await this.sessions.setState(phone, WhatsAppState.IDLE);
        return;
      }
      await this.wa.sendText(
        phone,
        formatQuestion(current.question, 0, totalQuestions),
      );
      await this.sessions.setState(phone, WhatsAppState.QUIZ_ACTIVE, {
        quizId,
        totalQuestions,
        currentIndex: 0,
        topic,
      });
    } catch (err) {
      this.logger.error(`Failed to get first question: ${(err as Error).message}`);
      await this.wa.sendText(phone, GENERATION_FAILED_MESSAGE);
      await this.sessions.setState(phone, WhatsAppState.IDLE);
    }
  }

  async handleAnswer(
    session: StoredSession,
    messageText: string,
  ): Promise<void> {
    const phone = session.phoneNumber;
    const stateData = (session.stateData ?? {}) as Record<string, unknown>;
    const quizId = stateData['quizId'] as string;
    const totalQuestions = (stateData['totalQuestions'] as number) ?? 5;
    const currentIndex = (stateData['currentIndex'] as number) ?? 0;
    const topic = (stateData['topic'] as string) ?? '';

    if (!quizId) {
      await this.wa.sendText(phone, `Something went wrong. Starting over.`);
      await this.sessions.setState(phone, WhatsAppState.IDLE);
      return;
    }

    try {
      const result = await this.api.call<SubmitAnswerResponse>(
        phone,
        `/v1/quizzes/${quizId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({ answer: messageText.trim().toUpperCase() }),
        },
      );

      await this.wa.sendText(
        phone,
        formatAnswerFeedback(
          result.isCorrect,
          result.correctAnswer,
          result.explanation,
        ),
      );

      const nextIndex = currentIndex + 1;

      if (result.isComplete || !result.nextQuestion) {
        // Quiz finished
        const score = result.score ?? 0;
        const passThreshold = 60;
        await this.wa.sendText(
          phone,
          formatScore(score, totalQuestions, passThreshold),
        );
        await this.sessions.setState(phone, WhatsAppState.IDLE);
      } else {
        // More questions
        await this.wa.sendText(
          phone,
          formatQuestion(result.nextQuestion, nextIndex, totalQuestions),
        );
        await this.sessions.updateStateData(phone, { currentIndex: nextIndex });
      }
    } catch (err) {
      if (err instanceof PlanLimitError) {
        await this.planLimitFlow.handle(session, err);
        await this.sessions.setState(phone, WhatsAppState.IDLE);
        return;
      }
      this.logger.error(`Answer submission failed: ${(err as Error).message}`);
      await this.wa.sendText(
        phone,
        `Sorry, I couldn't process that answer. Please try again or type *CANCEL* to quit.`,
      );
    }
  }
}
