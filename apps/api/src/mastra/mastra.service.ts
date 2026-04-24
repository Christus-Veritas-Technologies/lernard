import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { completeWithRetry } from '../common/utils/complete-with-retry';

type LessonDepth = 'beginner' | 'intermediate' | 'advanced';

interface GenerateLessonInput {
  topic: string;
  depth: LessonDepth;
  studentId?: string;
  studentLevel?: number;
}

interface GenerateQuizInput {
  topic: string;
  level: LessonDepth;
  questionCount: number;
  studentId?: string;
}

interface GenerateSlotContentInput {
  slotType: string;
  context: Record<string, unknown>;
  studentId?: string;
}

interface ValidationResult {
  safe: boolean;
  reasons: string[];
}

@Injectable()
export class MastraService {
  private readonly logger = new Logger(MastraService.name);
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY is not set. Claude requests will fail until it is configured.');
    }

    this.client = new Anthropic({ apiKey: apiKey ?? '' });
  }

  async generateLesson(input: GenerateLessonInput): Promise<string> {
    return completeWithRetry(() => this.callSonnet(this.buildLessonPrompt(input)));
  }

  async generateQuiz(input: GenerateQuizInput): Promise<string> {
    return completeWithRetry(() => this.callSonnet(this.buildQuizPrompt(input)));
  }

  async generateSlotContent(input: GenerateSlotContentInput): Promise<string> {
    return completeWithRetry(() => this.callHaiku(this.buildSlotPrompt(input)));
  }

  async validate(content: unknown): Promise<ValidationResult> {
    const response = await completeWithRetry(() =>
      this.callHaiku(this.buildValidationPrompt(content)),
    );
    const normalized = response.trim().toUpperCase();
    const reason = this.extractValidationReason(response);

    return {
      safe: normalized.startsWith('VALID'),
      reasons: reason ? [reason] : [],
    };
  }

  private async callSonnet(prompt: string): Promise<string> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    return this.extractText(message.content);
  }

  private async callHaiku(prompt: string): Promise<string> {
    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    return this.extractText(message.content);
  }

  private extractText(content: Anthropic.Messages.Message['content']): string {
    const textBlock = content.find((block) => block.type === 'text');

    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Unexpected Claude response format');
    }

    return textBlock.text;
  }

  private extractValidationReason(response: string): string {
    const [, rawReason] = response.split(':', 2);
    return rawReason?.trim() ?? response.trim();
  }

  private buildLessonPrompt(input: GenerateLessonInput): string {
    return `You are Lernard's lesson generator.

Generate an engaging lesson on: ${input.topic}
Difficulty level: ${input.depth}
${input.studentLevel ? `Student proficiency: ${input.studentLevel}/100` : ''}

Format requirements:
- Clear learning objectives (2-3 goals)
- Concise explanation (150-300 words)
- Key concepts highlighted with **bold**
- 2-3 practical, relevant examples
- Summary with main takeaways

Keep the tone warm, precise, and encouraging.`;
  }

  private buildQuizPrompt(input: GenerateQuizInput): string {
    return `You are Lernard's quiz generator.

Generate exactly ${input.questionCount} quiz questions on: ${input.topic}
Difficulty: ${input.level}

Return ONLY valid JSON array (no markdown, no commentary) with this structure:
[
  {
    "id": "q1",
    "type": "multiple-choice",
    "question": "Clear, focused question",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Educational explanation of the correct answer"
  }
]

Rules:
- Use exactly 4 options for every question
- correctAnswer must be a 0-based index
- Explanations should teach, not just correct`;
  }

  private buildValidationPrompt(content: unknown): string {
    const serializedContent =
      typeof content === 'string' ? content : JSON.stringify(content, null, 2);

    return `Validate this Lernard AI output for educational safety and quality:

${serializedContent.slice(0, 1500)}

Check only for:
1. Factual accuracy
2. Appropriate difficulty
3. No harmful or inappropriate content
4. Clear, understandable wording

Respond with one line only:
VALID: <brief reason>
or
INVALID: <brief reason>`;
  }

  private buildSlotPrompt(input: GenerateSlotContentInput): string {
    return `Generate a brief ${input.slotType} slot for Lernard.
Context: ${JSON.stringify(input.context)}

Keep it:
- Under 100 characters
- Specific and actionable
- Encouraging without hype`;
  }
}