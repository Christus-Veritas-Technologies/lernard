import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ChatMessageBlock,
  LessonContent,
  QuizContent,
  QuizQuestion,
  QuizQuestionType,
} from '@lernard/shared-types';
import { completeWithRetry } from '../common/utils/complete-with-retry';

const SONNET_MODEL = 'claude-sonnet-4-5-20250929';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class MastraService {
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY') ?? '';
  }

  async generateLesson(input: {
    topic: string;
    depth: 'quick' | 'standard' | 'deep';
    subjectName?: string;
  }): Promise<LessonContent> {
    const fallback = buildFallbackLesson(input.topic, input.subjectName, input.depth);

    if (!this.apiKey) {
      return fallback;
    }

    return completeWithRetry(async () => {
      const prompt = [
        'Return JSON only with fields: topic, subjectName, depth, estimatedMinutes, sections.',
        'sections must be array of {type, heading, body, terms}.',
        'types allowed: hook, concept, examples, recap.',
        `Topic: ${input.topic}`,
        `Depth: ${input.depth}`,
        `Subject: ${input.subjectName ?? 'General'}`,
      ].join('\n');

      const text = await this.completeText({
        model: SONNET_MODEL,
        maxTokens: 1400,
        systemPrompt: 'You generate clear, accurate educational lesson JSON.',
        messages: [{ role: 'user', content: prompt }],
      });

      const parsed = safeJsonParse<Partial<LessonContent>>(text);
      if (!parsed || !Array.isArray(parsed.sections)) {
        return fallback;
      }

      return {
        lessonId: 'generated',
        topic: parsed.topic ?? input.topic,
        subjectName: parsed.subjectName ?? input.subjectName ?? 'General',
        depth: parsed.depth ?? input.depth,
        estimatedMinutes: parsed.estimatedMinutes ?? fallback.estimatedMinutes,
        sections: parsed.sections.map((section, index) => ({
          type: normalizeSectionType(section?.type, index),
          heading: section?.heading ?? null,
          body: section?.body ?? '',
          terms: Array.isArray(section?.terms)
            ? section.terms
                .filter((term) => term && typeof term.term === 'string')
                .map((term) => ({
                  term: term.term,
                  explanation:
                    typeof term.explanation === 'string' ? term.explanation : 'Definition unavailable.',
                }))
            : [],
        })),
      };
    });
  }

  async generateQuiz(input: {
    topic: string;
    questionCount: number;
    subjectName?: string;
    mode: 'guide' | 'companion';
  }): Promise<{ topic: string; subjectName: string; mode: 'guide' | 'companion'; questions: QuizQuestion[] }> {
    const fallbackQuestions = buildFallbackQuizQuestions(input.topic, input.questionCount);

    if (!this.apiKey) {
      return {
        topic: input.topic,
        subjectName: input.subjectName ?? 'General',
        mode: input.mode,
        questions: fallbackQuestions,
      };
    }

    return completeWithRetry(async () => {
      const prompt = [
        'Return JSON only with field questions.',
        'questions must be array of {type,text,options}.',
        'type one of: multiple_choice,true_false,fill_blank,short_answer,ordering.',
        `Topic: ${input.topic}`,
        `Question count: ${input.questionCount}`,
        `Subject: ${input.subjectName ?? 'General'}`,
      ].join('\n');

      const text = await this.completeText({
        model: SONNET_MODEL,
        maxTokens: 1200,
        systemPrompt: 'You generate quiz questions as strict JSON.',
        messages: [{ role: 'user', content: prompt }],
      });

      const parsed = safeJsonParse<{ questions?: QuizQuestion[] }>(text);
      const questions = Array.isArray(parsed?.questions)
        ? parsed.questions.slice(0, input.questionCount).map((q) => normalizeQuestion(q))
        : fallbackQuestions;

      return {
        topic: input.topic,
        subjectName: input.subjectName ?? 'General',
        mode: input.mode,
        questions,
      };
    });
  }

  async *streamChat(input: {
    message: string;
    history: ClaudeMessage[];
  }): AsyncGenerator<ChatMessageBlock> {
    if (!this.apiKey) {
      yield {
        type: 'text',
        content: `I heard you: ${input.message}. I can help break this down step by step.`,
      };
      return;
    }

    const messages: ClaudeMessage[] = [...input.history, { role: 'user' as const, content: input.message }];
    const text = await completeWithRetry(() =>
      this.completeText({
        model: SONNET_MODEL,
        maxTokens: 900,
        systemPrompt: 'You are Lernard. Respond with concise supportive teaching.',
        messages,
      }),
    );

    yield { type: 'text', content: text };
  }

  async generateSlotContent(input: {
    slotType: string;
    context: Record<string, unknown>;
  }): Promise<{ title: string; description: string }> {
    if (!this.apiKey) {
      return {
        title: 'Keep going',
        description: 'You are building momentum. One more focused session helps.',
      };
    }

    const text = await completeWithRetry(() =>
      this.completeText({
        model: HAIKU_MODEL,
        maxTokens: 220,
        systemPrompt:
          'Create one encouraging title and one sentence description in JSON: {"title":"...","description":"..."}.',
        messages: [
          {
            role: 'user',
            content: JSON.stringify({ slotType: input.slotType, context: input.context }),
          },
        ],
      }),
    );

    const parsed = safeJsonParse<{ title?: string; description?: string }>(text);
    return {
      title: parsed?.title ?? 'Keep going',
      description: parsed?.description ?? 'A short focused session right now can move you forward.',
    };
  }

  private async completeText(input: {
    model: string;
    maxTokens: number;
    systemPrompt: string;
    messages: ClaudeMessage[];
  }): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: input.model,
        max_tokens: input.maxTokens,
        system: input.systemPrompt,
        messages: input.messages,
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Claude completion failed');
    }

    const json = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const text = json.content?.find((block) => block.type === 'text')?.text;
    if (!text) {
      throw new InternalServerErrorException('Claude completion returned empty text');
    }

    return text;
  }
}

function buildFallbackLesson(
  topic: string,
  subjectName: string | undefined,
  depth: 'quick' | 'standard' | 'deep',
): LessonContent {
  return {
    lessonId: 'generated',
    topic,
    subjectName: subjectName ?? 'General',
    depth,
    estimatedMinutes: depth === 'quick' ? 8 : depth === 'deep' ? 20 : 12,
    sections: [
      {
        type: 'hook',
        heading: 'Why this matters',
        body: `Understanding ${topic} helps you connect ideas and solve real problems with confidence.`,
        terms: [],
      },
      {
        type: 'concept',
        heading: `Core idea of ${topic}`,
        body: `${topic} can be understood by breaking it into smaller steps and patterns you can reuse.`,
        terms: [{ term: topic, explanation: `${topic} is the key idea being studied in this lesson.` }],
      },
      {
        type: 'examples',
        heading: 'Worked example',
        body: `Apply the main rule for ${topic} in one short example, then try a similar one yourself.`,
        terms: [],
      },
      {
        type: 'recap',
        heading: 'Quick recap',
        body: `You learned what ${topic} is, why it matters, and how to apply it in a simple case.`,
        terms: [],
      },
    ],
  };
}

function buildFallbackQuizQuestions(topic: string, questionCount: number): QuizQuestion[] {
  return Array.from({ length: questionCount }, (_, index) => ({
    type: 'multiple_choice',
    text: `${index + 1}. Which statement best describes ${topic}?`,
    options: ['Definition A', 'Definition B', 'Definition C', 'Definition D'],
  }));
}

function normalizeQuestion(question: QuizQuestion): QuizQuestion {
  return {
    type: normalizeQuestionType(question.type),
    text: question.text,
    options: question.options,
  };
}

function normalizeQuestionType(type: QuizQuestionType | undefined): QuizQuestionType {
  switch (type) {
    case 'multiple_choice':
    case 'true_false':
    case 'fill_blank':
    case 'short_answer':
    case 'ordering':
      return type;
    default:
      return 'multiple_choice';
  }
}

function normalizeSectionType(
  type: unknown,
  index: number,
): 'hook' | 'concept' | 'examples' | 'recap' {
  if (type === 'hook' || type === 'concept' || type === 'examples' || type === 'recap') {
    return type;
  }

  if (index === 0) return 'hook';
  if (index === 1 || index === 2) return 'concept';
  if (index === 3) return 'examples';
  return 'recap';
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
