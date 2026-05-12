import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SessionsService, StoredSession } from '../sessions/sessions.service';
import { LernardApiService, PlanLimitError } from '../api/lernard-api.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { PlanLimitFlow } from './plan-limit.flow';
import { WhatsAppState } from '@lernard/whatsapp-core';
import { ROUTES } from '@lernard/routes';
import { formatLesson } from '@lernard/whatsapp-core';
import type { ClassificationResult } from '@lernard/whatsapp-core';
import {
  GENERATING_LESSON_MESSAGE,
  GENERATION_FAILED_MESSAGE,
  GENERATION_TIMEOUT_MESSAGE,
} from '@lernard/whatsapp-core';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_RETRIES = 30;

interface GenerateLessonResponse {
  lessonId: string;
  status: string;
}

interface LessonStatusResponse {
  status: 'generating' | 'ready' | 'failed';
  content?: {
    topic: string;
    subjectName?: string;
    estimatedMinutes?: number;
    depth?: string;
    sections: Array<{
      type: string;
      heading: string | null;
      body: string;
      terms?: Array<{ term: string; explanation: string }>;
    }>;
  };
}

@Injectable()
export class LessonFlow {
  private readonly logger = new Logger(LessonFlow.name);

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
    const depth = classification.depth ?? 'standard';

    await this.wa.sendTyping(phone);
    await this.wa.sendText(phone, GENERATING_LESSON_MESSAGE(topic));

    let generateRes: GenerateLessonResponse;
    try {
      generateRes = await this.api.call<GenerateLessonResponse>(
        phone,
        ROUTES.LESSONS.GENERATE,
        {
          method: 'POST',
          body: JSON.stringify({
            topic,
            depth,
            idempotencyKey: uuidv4(),
          }),
        },
      );
    } catch (err) {
      if (err instanceof PlanLimitError) {
        await this.planLimitFlow.handle(session, err);
        return;
      }
      this.logger.error(`Lesson generation failed: ${(err as Error).message}`);
      await this.wa.sendText(phone, GENERATION_FAILED_MESSAGE);
      return;
    }

    const lessonId = generateRes.lessonId;
    await this.sessions.setState(phone, WhatsAppState.LESSON_GENERATING, {
      lessonId,
      topic,
    });

    // Poll for completion
    for (let attempt = 0; attempt < POLL_MAX_RETRIES; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      // Check if user cancelled while we were waiting
      const currentSession = await this.sessions.getOrCreate(phone);
      const currentData = (currentSession.stateData ?? {}) as Record<string, unknown>;
      if (currentData['cancelled'] === true) {
        this.logger.log(`Lesson generation cancelled by user for ${phone}`);
        await this.sessions.setState(phone, WhatsAppState.IDLE);
        return;
      }

      try {
        const status = await this.api.call<LessonStatusResponse>(
          phone,
          ROUTES.LESSONS.GET(lessonId),
        );

        if (status.status === 'ready' && status.content) {
          const messages = formatLesson(status.content);
          await this.wa.sendSequential(phone, messages, 500);
          await this.sessions.setState(phone, WhatsAppState.IDLE);
          return;
        }

        if (status.status === 'failed') {
          await this.wa.sendText(phone, GENERATION_FAILED_MESSAGE);
          await this.sessions.setState(phone, WhatsAppState.IDLE);
          return;
        }
        // else: still generating, keep polling
      } catch (err) {
        if (err instanceof PlanLimitError) {
          await this.planLimitFlow.handle(session, err);
          await this.sessions.setState(phone, WhatsAppState.IDLE);
          return;
        }
        this.logger.warn(`Lesson poll error (attempt ${attempt + 1}): ${(err as Error).message}`);
      }
    }

    // Timeout
    await this.wa.sendText(phone, GENERATION_TIMEOUT_MESSAGE);
    await this.sessions.setState(phone, WhatsAppState.IDLE);
  }
}
