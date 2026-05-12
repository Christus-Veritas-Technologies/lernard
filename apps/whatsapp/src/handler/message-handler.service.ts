import { Injectable, Logger } from '@nestjs/common';
import type { Message } from 'whatsapp-web.js';
import { SessionsService } from '../sessions/sessions.service';
import { LernardApiService } from '../api/lernard-api.service';
import { IntentService } from '../intent/intent.service';
import { AuthFlow } from '../flows/auth.flow';
import { LessonFlow } from '../flows/lesson.flow';
import { QuizFlow } from '../flows/quiz.flow';
import { ProjectFlow } from '../flows/project.flow';
import { ChatFlow } from '../flows/chat.flow';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { WhatsAppState } from '@lernard/whatsapp-core';
import { LernardIntent } from '@lernard/whatsapp-core';
import { formatProgressSummary } from '@lernard/whatsapp-core';
import {
  MENU_MESSAGE,
  HELP_MESSAGE,
  CANCEL_MESSAGE,
  VIEW_PLAN_MESSAGE,
  PROGRESS_UNAVAILABLE_MESSAGE,
  APP_URL,
} from '@lernard/whatsapp-core';

const UNAUTHENTICATED_STATES = new Set<string>([
  WhatsAppState.UNAUTHENTICATED,
  WhatsAppState.AWAITING_EMAIL,
  WhatsAppState.AWAITING_OTP,
  WhatsAppState.AWAITING_SIGNUP_CONFIRM,
  WhatsAppState.ONBOARDING_NAME,
  WhatsAppState.ONBOARDING_SUBJECTS,
]);

interface PlanResponse {
  plan: string;
  displayName?: string;
}

interface ProgressResponse {
  totalLessons: number;
  totalQuizzes: number;
  averageScore: number;
  subjectBreakdown?: Array<{ subject: string; score: number }>;
}

@Injectable()
export class MessageHandlerService {
  private readonly logger = new Logger(MessageHandlerService.name);

  constructor(
    private readonly sessions: SessionsService,
    private readonly api: LernardApiService,
    private readonly intent: IntentService,
    private readonly authFlow: AuthFlow,
    private readonly lessonFlow: LessonFlow,
    private readonly quizFlow: QuizFlow,
    private readonly projectFlow: ProjectFlow,
    private readonly chatFlow: ChatFlow,
  ) {}

  async handle(msg: Message, wa: WhatsAppService): Promise<void> {
    // Ignore group messages, status updates, and messages from self
    if (msg.from.endsWith('@g.us')) return;
    if (msg.from === 'status@broadcast') return;
    if (msg.fromMe) return;

    const phone = msg.from;
    const body = msg.body?.trim() ?? '';

    if (!body) return;

    const session = await this.sessions.getOrCreate(phone);
    const upper = body.toUpperCase();

    // ── Global keywords (always win) ────────────────────────────────────────
    if (upper === 'MENU' || upper === 'OPTIONS') {
      await wa.sendText(phone, MENU_MESSAGE);
      return;
    }
    if (upper === 'HELP') {
      await wa.sendText(phone, HELP_MESSAGE);
      return;
    }
    if (upper === 'CANCEL' || upper === 'STOP' || upper === 'QUIT') {
      await wa.sendText(phone, CANCEL_MESSAGE);
      await this.sessions.setState(phone, WhatsAppState.IDLE);
      return;
    }

    // ── Auth states ──────────────────────────────────────────────────────────
    if (UNAUTHENTICATED_STATES.has(session.state)) {
      await this.authFlow.handle(session, body);
      return;
    }

    // ── Active states (take priority before intent classification) ───────────
    const state = session.state as WhatsAppState;

    if (state === WhatsAppState.QUIZ_ACTIVE) {
      await this.quizFlow.handleAnswer(session, body);
      return;
    }

    if (state === WhatsAppState.LESSON_GENERATING) {
      await wa.sendText(phone, `⏳ Still generating your lesson — please wait a moment...`);
      return;
    }

    if (
      state === WhatsAppState.PROJECT_WIZARD ||
      state === WhatsAppState.PROJECT_GENERATING
    ) {
      await this.projectFlow.handle(session, body);
      return;
    }

    // ── IDLE: classify intent ─────────────────────────────────────────────────
    if (state !== WhatsAppState.IDLE) {
      // Unknown state — reset to idle
      this.logger.warn(`Unknown state "${state}" for ${phone} — resetting to IDLE`);
      await this.sessions.setState(phone, WhatsAppState.IDLE);
    }

    const classification = await this.intent.classify(body, WhatsAppState.IDLE);
    const appUrl = process.env.APP_URL ?? APP_URL;

    switch (classification.intent) {
      case LernardIntent.START_LESSON:
        await this.lessonFlow.handle(session, classification);
        break;

      case LernardIntent.START_QUIZ:
        await this.quizFlow.handle(session, classification);
        break;

      case LernardIntent.START_PROJECT: {
        // Reset to IDLE so projectFlow knows it's a fresh start
        const freshSession = { ...session, state: WhatsAppState.IDLE };
        await this.projectFlow.handle(freshSession, body);
        break;
      }

      case LernardIntent.VIEW_PROGRESS:
        await this.sendProgress(phone, wa);
        break;

      case LernardIntent.VIEW_PLAN:
      case LernardIntent.UPGRADE_PLAN:
        await this.sendPlan(phone, wa, appUrl);
        break;

      case LernardIntent.MENU:
        await wa.sendText(phone, MENU_MESSAGE);
        break;

      case LernardIntent.CANCEL:
        await wa.sendText(phone, CANCEL_MESSAGE);
        break;

      case LernardIntent.CHAT:
      case LernardIntent.UNKNOWN:
      default:
        await this.chatFlow.handle(session, body);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async sendProgress(
    phone: string,
    wa: WhatsAppService,
  ): Promise<void> {
    try {
      const data = await this.api.call<ProgressResponse>(phone, '/v1/users/me/progress');
      await wa.sendText(
        phone,
        formatProgressSummary({
          totalLessons: data.totalLessons,
          totalQuizzes: data.totalQuizzes,
          averageScore: data.averageScore,
          subjectBreakdown: data.subjectBreakdown,
        }),
      );
    } catch {
      await wa.sendText(phone, PROGRESS_UNAVAILABLE_MESSAGE);
    }
  }

  private async sendPlan(
    phone: string,
    wa: WhatsAppService,
    appUrl: string,
  ): Promise<void> {
    try {
      const data = await this.api.call<PlanResponse>(phone, '/v1/users/me/plan');
      await wa.sendText(phone, VIEW_PLAN_MESSAGE(data.displayName ?? data.plan, appUrl));
    } catch {
      await wa.sendText(phone, VIEW_PLAN_MESSAGE('Explorer', appUrl));
    }
  }
}
