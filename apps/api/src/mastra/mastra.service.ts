import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ChatMessageBlock,
  LessonContent,
  LessonRefCardProps,
  QuizContent,
  QuizQuestion,
  QuizQuestionType,
  QuizRefCardProps,
} from '@lernard/shared-types';
import { completeWithRetry } from '../common/utils/complete-with-retry';

const SONNET_MODEL = 'claude-sonnet-4-5-20250929';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

type ClaudeContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'image';
      source: { type: 'base64'; media_type: string; data: string };
    }
  | {
      type: 'document';
      source: { type: 'base64'; media_type: string; data: string };
    };

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContentBlock[] | ClaudeAssistantContentBlock[] | ClaudeToolResultContent[];
}

type ClaudeAssistantContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };

type ClaudeToolResultContent = {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
};

export interface ChatToolExecutor {
  createLesson(input: {
    topic: string;
    depth?: 'quick' | 'standard' | 'deep';
    subject?: string;
  }): Promise<LessonRefCardProps>;
  createQuiz(input: {
    topic: string;
    questionCount?: number;
    subject?: string;
  }): Promise<QuizRefCardProps>;
}

const CHAT_SYSTEM_PROMPT = [
  'You are Lernard, a focused study companion in a chat that lets students learn, practice, and ask questions.',
  'You can:',
  '- Explain concepts clearly with concrete examples.',
  '- Use the create_lesson tool when the user asks to be TAUGHT a topic from scratch — phrases like "teach me X", "give me a lesson on X", "help me learn X".',
  '- Use the create_quiz tool whenever the user wants to PRACTICE — phrases like "quiz me on X", "give me practice problems", "give me problems to solve", "let\'s practice X", "test me", "drill me on X", "I want to try some X problems", "exercises for X". When the user does not specify a count, generate 5 questions.',
  'Do NOT call tools for short clarifying questions or when the user only wants a quick conceptual explanation. NEVER inline practice problems as text in your reply — always route those through create_quiz so the user can answer them properly.',
  'After creating a lesson or quiz, briefly tell the user what you made and that they can start it from the card.',
  'Keep replies concise, warm, and focused on learning.',
].join('\n');

const CHAT_TOOLS = [
  {
    name: 'create_lesson',
    description:
      'Create a new Lernard lesson on a topic. Use only when the user explicitly asks to learn, study, or get a full lesson on something.',
    input_schema: {
      type: 'object' as const,
      properties: {
        topic: {
          type: 'string',
          description: 'The lesson topic, e.g. "Photosynthesis basics" or "Quadratic equations".',
        },
        depth: {
          type: 'string',
          enum: ['quick', 'standard', 'deep'],
          description: 'How deep the lesson should go. Default: standard.',
        },
        subject: {
          type: 'string',
          description: 'Optional subject/category, e.g. "Biology" or "Math".',
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'create_quiz',
    description:
      'Create a new quiz on a topic so the user can practice. Trigger this tool whenever the user wants to do problems or practice — examples: "quiz me on X", "give me practice problems", "let\'s practice X", "test me on X", "give me problems to solve", "I want to try some X problems", "drill me on X", "exercises for X". Do NOT call this for purely conceptual questions where the user only wants an explanation. Default questionCount is 5 unless the user names a number.',
    input_schema: {
      type: 'object' as const,
      properties: {
        topic: {
          type: 'string',
          description: 'The quiz topic.',
        },
        questionCount: {
          type: 'integer',
          minimum: 5,
          maximum: 15,
          description: 'Number of questions (5–15). Default: 5.',
        },
        subject: {
          type: 'string',
          description: 'Optional subject/category.',
        },
      },
      required: ['topic'],
    },
  },
];

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
    attachments?: Array<{ kind: 'image' | 'pdf'; mimeType: string; data: string; fileName: string }>;
    toolExecutor?: ChatToolExecutor;
  }): AsyncGenerator<ChatMessageBlock> {
    if (!this.apiKey) {
      const attachmentNudge = input.attachments?.length
        ? ` I can also see ${input.attachments.length} attachment${input.attachments.length === 1 ? '' : 's'} on this turn.`
        : '';

      yield {
        type: 'markdown',
        content: `I heard you: ${input.message}.${attachmentNudge} I can help break this down step by step.`,
      };
      return;
    }

    const messages: ClaudeMessage[] = [
      ...input.history,
      buildChatUserMessage(input.message, input.attachments ?? []),
    ];

    const tools = input.toolExecutor ? CHAT_TOOLS : undefined;

    for (let iteration = 0; iteration < 4; iteration++) {
      const response = await completeWithRetry(() =>
        this.completeMessage({
          model: SONNET_MODEL,
          maxTokens: 1200,
          systemPrompt: CHAT_SYSTEM_PROMPT,
          messages,
          tools,
        }),
      );

      const assistantBlocks = (response.content ?? []) as ClaudeAssistantContentBlock[];

      if (response.stop_reason === 'tool_use' && input.toolExecutor) {
        messages.push({ role: 'assistant', content: assistantBlocks });

        const toolResults: ClaudeToolResultContent[] = [];

        for (const block of assistantBlocks) {
          if (block.type !== 'tool_use') continue;

          try {
            if (block.name === 'create_lesson') {
              const args = block.input as { topic: string; depth?: 'quick' | 'standard' | 'deep'; subject?: string };
              const card = await input.toolExecutor.createLesson(args);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(card),
              });
              yield { type: 'LessonRefCard', props: card };
              continue;
            }

            if (block.name === 'create_quiz') {
              const args = block.input as { topic: string; questionCount?: number; subject?: string };
              const card = await input.toolExecutor.createQuiz(args);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(card),
              });
              yield { type: 'QuizRefCard', props: card };
              continue;
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: `Unknown tool: ${block.name}`,
              is_error: true,
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Tool execution failed';
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: message,
              is_error: true,
            });
          }
        }

        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      const finalText = assistantBlocks
        .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
        .map((block) => block.text)
        .join('\n\n')
        .trim();

      if (finalText) {
        for (const block of splitMarkdownAndCodeBlocks(finalText)) {
          yield block;
        }
      }
      return;
    }
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

  private async completeMessage(input: {
    model: string;
    maxTokens: number;
    systemPrompt: string;
    messages: ClaudeMessage[];
    tools?: typeof CHAT_TOOLS;
  }): Promise<{ stop_reason?: string; content?: ClaudeAssistantContentBlock[] }> {
    const body: Record<string, unknown> = {
      model: input.model,
      max_tokens: input.maxTokens,
      system: input.systemPrompt,
      messages: input.messages,
    };

    if (input.tools && input.tools.length > 0) {
      body.tools = input.tools;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Claude completion failed');
    }

    return (await response.json()) as {
      stop_reason?: string;
      content?: ClaudeAssistantContentBlock[];
    };
  }
}

function buildChatUserMessage(
  message: string,
  attachments: Array<{ kind: 'image' | 'pdf'; mimeType: string; data: string; fileName: string }>,
): ClaudeMessage {
  if (attachments.length === 0) {
    return {
      role: 'user',
      content: message,
    };
  }

  return {
    role: 'user',
    content: [
      { type: 'text', text: message },
      ...attachments.map((attachment) => {
        if (attachment.kind === 'pdf') {
          return {
            type: 'document' as const,
            source: {
              type: 'base64' as const,
              media_type: attachment.mimeType,
              data: attachment.data,
            },
          };
        }

        return {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: attachment.mimeType,
            data: attachment.data,
          },
        };
      }),
    ],
  };
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

function splitMarkdownAndCodeBlocks(content: string): ChatMessageBlock[] {
  const blocks: ChatMessageBlock[] = [];
  const codePattern = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match = codePattern.exec(content);

  while (match) {
    const markdownChunk = content.slice(lastIndex, match.index).trim();
    if (markdownChunk) {
      blocks.push({ type: 'markdown', content: markdownChunk });
    }

    const language = (match[1] ?? '').trim();
    const code = (match[2] ?? '').trim();
    if (code) {
      blocks.push({
        type: 'code',
        language: language || undefined,
        code,
      });
    }

    lastIndex = codePattern.lastIndex;
    match = codePattern.exec(content);
  }

  const trailingMarkdown = content.slice(lastIndex).trim();
  if (trailingMarkdown) {
    blocks.push({ type: 'markdown', content: trailingMarkdown });
  }

  if (!blocks.length) {
    return [{ type: 'markdown', content }];
  }

  return blocks;
}
