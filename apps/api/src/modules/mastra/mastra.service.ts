import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

/**
 * AI service for Lernard using Anthropic Claude
 *
 * - Claude Sonnet 4.6 (claude-sonnet-4-5): lessons, quizzes, content generation
 * - Claude Haiku 4.5 (claude-haiku-4-5): validation, slot generation, lightweight tasks
 *
 * All Claude calls must go through completeWithRetry() wrapper in controllers/services.
 */
@Injectable()
export class MastraService {
  private readonly logger = new Logger(MastraService.name);
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not set - Claude calls will fail');
    }
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Generate lesson content using Claude Sonnet 4.6
   * Format: high-quality educational content tailored to student level
   */
  async generateLesson(input: {
    topic: string;
    depth: 'beginner' | 'intermediate' | 'advanced';
    studentId?: string;
    studentLevel?: number;
  }): Promise<string> {
    const prompt = this.buildLessonPrompt(input);
    return this.callSonnet(prompt);
  }

  /**
   * Generate quiz questions using Claude Sonnet 4.6
   * Format: JSON array of question objects with type, options, answer
   */
  async generateQuiz(input: {
    topic: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    questionCount: number;
    studentId?: string;
  }): Promise<string> {
    const prompt = this.buildQuizPrompt(input);
    return this.callSonnet(prompt);
  }

  /**
   * Validate generated content using Claude Haiku 4.5 (lightweight + fast)
   * Returns: boolean indicating if content passes validation
   */
  async validateContent(
    content: string,
    contentType: 'lesson' | 'quiz' | 'slot',
  ): Promise<{ valid: boolean; reason: string }> {
    const prompt = this.buildValidationPrompt(content, contentType);
    const response = await this.callHaiku(prompt);
    const valid =
      response.toUpperCase().includes('VALID') || response.toUpperCase().includes('PASS');
    return { valid, reason: response.substring(0, 200) };
  }

  /**
   * Generate UI slot content using Claude Haiku 4.5
   * For lightweight, contextual UI elements shown on pages
   */
  async generateSlotContent(input: {
    slotType: string;
    context: Record<string, any>;
    studentId?: string;
  }): Promise<string> {
    const prompt = this.buildSlotPrompt(input);
    return this.callHaiku(prompt);
  }

  /**
   * Internal: Call Claude Sonnet 4.6 (high quality)
   * Used for: lessons, quizzes, main content generation
   */
  private async callSonnet(prompt: string): Promise<string> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    if (message.content[0]?.type === 'text') {
      return message.content[0].text;
    }

    throw new Error('Unexpected Claude response format');
  }

  /**
   * Internal: Call Claude Haiku 4.5 (fast, cost-effective)
   * Used for: validation, slot content, lightweight tasks
   */
  private async callHaiku(prompt: string): Promise<string> {
    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    if (message.content[0]?.type === 'text') {
      return message.content[0].text;
    }

    throw new Error('Unexpected Claude response format');
  }

  private buildLessonPrompt(input: {
    topic: string;
    depth: 'beginner' | 'intermediate' | 'advanced';
    studentId?: string;
    studentLevel?: number;
  }): string {
    return `You are an expert educational tutor for Lernard, an adaptive learning app.

Generate an engaging, personalized lesson on: ${input.topic}
Difficulty level: ${input.depth}
${input.studentLevel ? `Student proficiency: ${input.studentLevel}/100` : ''}

Format requirements:
- Clear learning objectives (2-3 goals)
- Concise explanation (150-300 words)
- Key concepts highlighted with **bold**
- 2-3 practical, relevant examples
- Summary with main takeaways

Use encouragement, emphasize growth, and match the depth level exactly.
Keep language accessible, engaging, and free of jargon.`;
  }

  private buildQuizPrompt(input: {
    topic: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    questionCount: number;
    studentId?: string;
  }): string {
    return `You are an expert educational assessment designer.

Generate exactly ${input.questionCount} quiz questions on: ${input.topic}
Difficulty: ${input.level}

Return ONLY valid JSON array (no markdown, no explanation) with this exact structure:
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
- All arrays must have exactly 4 options
- correctAnswer is the 0-based index
- Test understanding and critical thinking, not memorization
- Explanations should teach, not just correct`;
  }

  private buildValidationPrompt(
    content: string,
    contentType: 'lesson' | 'quiz' | 'slot',
  ): string {
    return `Quickly validate this ${contentType} content for Lernard (an educational app):

${content.substring(0, 1000)}

Check ONLY for:
1. Factual accuracy
2. Appropriate difficulty
3. No harmful/inappropriate content
4. Clear and understandable

Respond with one line: "VALID: [brief reason]" or "INVALID: [brief reason]"`;
  }

  private buildSlotPrompt(input: {
    slotType: string;
    context: Record<string, any>;
  }): string {
    return `Generate a brief, encouraging ${input.slotType} message for a Lernard student.
Context: ${JSON.stringify(input.context)}

Keep it:
- Under 100 characters
- Actionable and specific
- Growth-focused and motivating
- Free of jargon`;
  }
}
