import { Injectable, Logger } from '@nestjs/common';
import { SessionsService, StoredSession } from '../sessions/sessions.service';
import { LernardApiService, PlanLimitError } from '../api/lernard-api.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { PlanLimitFlow } from './plan-limit.flow';
import { WhatsAppState } from '@lernard/whatsapp-core';
import { ROUTES } from '@lernard/routes';
import { stripMarkdown } from '@lernard/whatsapp-core';

interface ChatResponse {
  conversationId?: string;
  message?: string;
  content?: Array<{
    type: string;
    text?: string;
    topic?: string;
    lessonId?: string;
    quizId?: string;
  }>;
}

@Injectable()
export class ChatFlow {
  private readonly logger = new Logger(ChatFlow.name);

  constructor(
    private readonly sessions: SessionsService,
    private readonly api: LernardApiService,
    private readonly wa: WhatsAppService,
    private readonly planLimitFlow: PlanLimitFlow,
  ) {}

  async handle(session: StoredSession, messageText: string): Promise<void> {
    const phone = session.phoneNumber;
    const stateData = (session.stateData ?? {}) as Record<string, unknown>;
    const conversationId = (stateData['conversationId'] as string) ?? undefined;

    await this.wa.sendTyping(phone);

    try {
      // Cap message length — server limit is 2000, but keep WhatsApp messages concise
      const cappedMessage = messageText.length > 1000 ? messageText.slice(0, 1000) : messageText;

      const response = await this.api.call<ChatResponse>(phone, ROUTES.CHAT.MESSAGE, {
        method: 'POST',
        body: JSON.stringify({
          message: cappedMessage,
          ...(conversationId ? { conversationId } : {}),
        }),
      });

      // Save conversation ID for continuity
      if (response.conversationId && response.conversationId !== conversationId) {
        await this.sessions.updateStateData(phone, {
          conversationId: response.conversationId,
        });
      }

      // Handle structured content blocks
      if (response.content && Array.isArray(response.content)) {
        for (const block of response.content) {
          if (block.type === 'text' && block.text) {
            await this.wa.sendText(phone, stripMarkdown(block.text));
          } else if (block.type === 'LessonRefCard' && block.topic) {
            await this.wa.sendText(
              phone,
              `📖 Lesson ready: *${block.topic}*\nReply *LESSON ${block.topic}* to start it.`,
            );
          } else if (block.type === 'QuizRefCard' && block.topic) {
            await this.wa.sendText(
              phone,
              `📝 Quiz ready: *${block.topic}*\nReply *QUIZ ${block.topic}* to start it.`,
            );
          }
        }
        return;
      }

      // Fallback: plain message field
      if (response.message) {
        await this.wa.sendText(phone, stripMarkdown(response.message));
      }
    } catch (err) {
      if (err instanceof PlanLimitError) {
        await this.planLimitFlow.handle(session, err);
        return;
      }
      this.logger.error(`Chat request failed: ${(err as Error).message}`);
      await this.wa.sendText(
        phone,
        `Sorry, I couldn't process that. Please try again or type *MENU* for options.`,
      );
    }
  }
}
