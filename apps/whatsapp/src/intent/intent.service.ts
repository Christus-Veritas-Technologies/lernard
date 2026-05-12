import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { LernardIntent, ClassificationResult } from '@lernard/whatsapp-core';
import type { WhatsAppState } from '@lernard/whatsapp-core';

const CLASSIFIER_SYSTEM_PROMPT = `You are an intent classifier for Lernard, an AI learning app accessed via WhatsApp.
Given a student's WhatsApp message and their current state, classify their intent.

Return ONLY a JSON object with no markdown, no explanation:
{
  "intent": "<INTENT>",
  "topic": "<topic string or null>",
  "depth": "brief | standard | detailed",
  "answerText": "<verbatim answer text or null>"
}

Intent values (pick exactly one):
- CHAT — general conversation, questions, help
- START_LESSON — wants to learn a topic
- START_QUIZ — wants to be quizzed on a topic
- START_PROJECT — wants to create a project/assignment
- VIEW_PROGRESS — wants to see their progress or performance
- VIEW_PLAN — wants to see their current subscription plan
- UPGRADE_PLAN — wants to upgrade or pay for a plan
- MENU — wants to see the main menu / list of options
- CANCEL — wants to cancel the current action
- YES_CONFIRM — confirming yes to a yes/no prompt
- NO_CONFIRM — declining / saying no to a yes/no prompt
- ANSWER_SUBMISSION — submitting a quiz answer (A/B/C/D or typed answer)
- UNKNOWN — cannot determine intent

Rules:
- If the message is a single letter A, B, C, or D (case-insensitive), intent is ANSWER_SUBMISSION
- If the message contains "lesson on", "teach me", "explain", "what is" + a topic → START_LESSON
- If the message contains "quiz on", "test me on", "practice" + a topic → START_QUIZ
- "project" or "assignment" → START_PROJECT
- "progress", "how am I doing", "my scores" → VIEW_PROGRESS
- "my plan", "subscription", "what plan" → VIEW_PLAN
- "upgrade", "pay", "scholar", "household" → UPGRADE_PLAN
- "menu", "options", "what can you do" → MENU
- "cancel", "stop", "never mind", "quit" → CANCEL
- "yes", "yeah", "yep", "sure", "ok", "okay", "correct" (standalone) → YES_CONFIRM
- "no", "nope", "don't", "nah" (standalone) → NO_CONFIRM`;

@Injectable()
export class IntentService {
  private readonly logger = new Logger(IntentService.name);
  private readonly anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async classify(
    messageText: string,
    currentState: WhatsAppState,
  ): Promise<ClassificationResult> {
    // Fast keyword shortcuts to save API calls
    const trimmed = messageText.trim();
    const upper = trimmed.toUpperCase();

    // ─ Exact keyword shortcuts (no Haiku call needed) ──────────────────────
    if (upper === 'MENU' || upper === 'OPTIONS') return { intent: LernardIntent.MENU };
    if (upper === 'CANCEL' || upper === 'STOP' || upper === 'QUIT') return { intent: LernardIntent.CANCEL };
    if (/^[ABCD]$/.test(upper)) return { intent: LernardIntent.ANSWER_SUBMISSION, answer: upper };

    // Yes / No
    if (/^(YES|Y|YEAH|YEP|OK|OKAY|SURE)$/.test(upper)) return { intent: LernardIntent.YES_CONFIRM };
    if (/^(NO|N|NOPE|NAH|NAH)$/.test(upper)) return { intent: LernardIntent.NO_CONFIRM };

    // Plan / progress
    if (/^(PLAN|MY PLAN|SUBSCRIPTION|MY SUBSCRIPTION)$/.test(upper)) return { intent: LernardIntent.VIEW_PLAN };
    if (/^(PROGRESS|MY PROGRESS|STATS|MY STATS|HOW AM I DOING)$/.test(upper)) return { intent: LernardIntent.VIEW_PROGRESS };
    if (/^(UPGRADE|UPGRADE PLAN)$/.test(upper)) return { intent: LernardIntent.UPGRADE_PLAN };

    // Lesson / Quiz prefix shortcut — "LESSON <topic>" or "QUIZ <topic>"
    const lessonMatch = /^LESSON\s+(.+)$/.exec(upper);
    if (lessonMatch) {
      return {
        intent: LernardIntent.START_LESSON,
        topic: trimmed.slice(7).trim(),
        depth: 'standard',
      };
    }
    const quizMatch = /^QUIZ\s+(.+)$/.exec(upper);
    if (quizMatch) {
      return {
        intent: LernardIntent.START_QUIZ,
        topic: trimmed.slice(5).trim(),
        depth: 'standard',
      };
    }
    if (upper === 'PROJECT') return { intent: LernardIntent.START_PROJECT };

    // ─ Truncate before sending to Haiku ────────────────────────────────────
    const textForClassification = trimmed.length > 500 ? trimmed.slice(0, 500) : trimmed;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: CLASSIFIER_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Current state: ${currentState}\nMessage: ${textForClassification}`,
          },
        ],
      });

      const raw = (response.content[0] as { type: string; text: string }).text.trim();
      const parsed = JSON.parse(raw) as ClassificationResult;

      // Validate intent value
      if (!Object.values(LernardIntent).includes(parsed.intent)) {
        return { intent: LernardIntent.UNKNOWN };
      }

      return parsed;
    } catch (err) {
      this.logger.warn(`Intent classification failed: ${(err as Error).message}`);
      return { intent: LernardIntent.CHAT };
    }
  }
}
