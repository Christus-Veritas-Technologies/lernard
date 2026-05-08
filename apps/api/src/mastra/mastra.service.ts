import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ChatMessageBlock,
  LessonContent,
  LessonRefCardProps,
  QuizQuestionType,
  QuizRefCardProps,
} from '@lernard/shared-types';
import { completeWithRetry } from '../common/utils/complete-with-retry';
import {
  ContentValidationError,
  assertLessonContentValid,
  assertQuizContentValid,
} from '../common/utils/validate-generated-content';
import {
  buildLessonUserPrompt,
  buildQuizUserPrompt,
  buildSystemPrompt,
} from './lernard-prompts';
import type { StudentContext } from './student-context.builder';

const SONNET_MODEL = 'claude-sonnet-4-5-20250929';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const LERNARD_OUTAGE_MESSAGE =
  "I'm having a moment — try again in a few seconds.";

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
  content:
    | string
    | ClaudeContentBlock[]
    | ClaudeAssistantContentBlock[]
    | ClaudeToolResultContent[];
}

type ClaudeAssistantContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'tool_use';
      id: string;
      name: string;
      input: Record<string, unknown>;
    };

type ClaudeToolResultContent = {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
};

interface GeneratedQuizQuestion {
  type: string;
  text: string;
  options?: string[];
  correctAnswer?: string;
  correctAnswers?: string[];
  explanation?: string;
}

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
          description:
            'The lesson topic, e.g. "Photosynthesis basics" or "Quadratic equations".',
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
  private readonly logger = new Logger(MastraService.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY') ?? '';
  }

  get devMode(): boolean {
    return !this.apiKey;
  }

  async generateLesson(input: {
    topic: string;
    depth: 'quick' | 'standard' | 'deep';
    subjectName?: string;
    studentContext: StudentContext;
  }): Promise<LessonContent> {
    if (this.devMode) {
      return buildFallbackLesson(input.topic, input.subjectName, input.depth);
    }

    const systemPrompt = buildSystemPrompt(input.studentContext, {
      kind: 'lesson',
      topic: input.topic,
      subjectName: input.subjectName,
      depth: input.depth,
    });
    const userPrompt = buildLessonUserPrompt(input.studentContext, {
      topic: input.topic,
      subjectName: input.subjectName,
      depth: input.depth,
    });

    const fallbackEstimatedMinutes = lessonMinutesForDepth(input.depth);

    return this.runWithRetry(async () => {
      const text = await this.completeText({
        model: SONNET_MODEL,
        maxTokens: lessonMaxTokens(input.depth),
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const parsed = parseLessonContentFromModelText(text);
      if (!parsed || !Array.isArray(parsed.sections)) {
        this.logger.warn(
          `[mastra.generateLesson] malformed_json_fallback topic="${input.topic}" depth=${input.depth} rawPreview="${truncateForLog(text.replace(/\s+/g, ' '), 600)}"`,
        );
        return buildFallbackLesson(input.topic, input.subjectName, input.depth);
      }

      assertLessonContentValid(parsed);

      return {
        lessonId: 'generated',
        topic: parsed.topic ?? input.topic,
        subjectName: parsed.subjectName ?? input.subjectName ?? 'General',
        depth: parsed.depth ?? input.depth,
        estimatedMinutes: parsed.estimatedMinutes ?? fallbackEstimatedMinutes,
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
                    typeof term.explanation === 'string'
                      ? term.explanation
                      : 'Definition unavailable.',
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
    studentContext: StudentContext;
  }): Promise<{
    topic: string;
    subjectName: string;
    mode: 'guide' | 'companion';
    questions: GeneratedQuizQuestion[];
  }> {
    if (this.devMode) {
      return {
        topic: input.topic,
        subjectName: input.subjectName ?? 'General',
        mode: input.mode,
        questions: buildFallbackQuizQuestions(input.topic, input.questionCount),
      };
    }

    const systemPrompt = buildSystemPrompt(input.studentContext, {
      kind: 'quiz',
      topic: input.topic,
      subjectName: input.subjectName,
      mode: input.mode,
      questionCount: input.questionCount,
    });
    const userPrompt = buildQuizUserPrompt(input.studentContext, {
      topic: input.topic,
      subjectName: input.subjectName,
      questionCount: input.questionCount,
      mode: input.mode,
    });

    return this.runWithRetry(async () => {
      const text = await this.completeText({
        model: SONNET_MODEL,
        maxTokens: quizMaxTokens(input.questionCount),
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const parsed = safeJsonParse<{ questions?: GeneratedQuizQuestion[] }>(
        text,
      );
      if (!parsed || !Array.isArray(parsed.questions)) {
        throw new ContentValidationError(
          'Quiz generation returned malformed JSON',
        );
      }

      const normalized = parsed.questions
        .map((question) => normalizeGeneratedQuestion(question))
        .filter(isUsableGeneratedQuestion);

      const seen = new Set<string>();
      const unique: GeneratedQuizQuestion[] = [];
      for (const question of normalized) {
        const key = `${question.type}|${normalizeQuestionKey(question.text)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(question);
      }

      if (unique.length < input.questionCount) {
        throw new ContentValidationError(
          `Quiz generation returned ${unique.length} usable questions, expected ${input.questionCount}`,
        );
      }

      const finalQuestions = unique.slice(0, input.questionCount);
      assertQuizContentValid({ questions: finalQuestions });

      return {
        topic: input.topic,
        subjectName: input.subjectName ?? 'General',
        mode: input.mode,
        questions: finalQuestions,
      };
    });
  }

  async *streamChat(input: {
    message: string;
    history: ClaudeMessage[];
    attachments?: Array<{
      kind: 'image' | 'pdf';
      mimeType: string;
      data: string;
      fileName: string;
    }>;
    toolExecutor?: ChatToolExecutor;
    studentContext: StudentContext;
  }): AsyncGenerator<ChatMessageBlock> {
    if (this.devMode) {
      const attachmentNudge = input.attachments?.length
        ? ` I can also see ${input.attachments.length} attachment${input.attachments.length === 1 ? '' : 's'} on this turn.`
        : '';

      yield {
        type: 'markdown',
        content: `I heard you, ${input.studentContext.name}: ${input.message}.${attachmentNudge} I can help break this down step by step.`,
      };
      return;
    }

    const systemPrompt = buildSystemPrompt(input.studentContext, {
      kind: 'chat',
    });

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
          systemPrompt,
          messages,
          tools,
        }),
      );

      const assistantBlocks = response.content ?? [];

      if (response.stop_reason === 'tool_use' && input.toolExecutor) {
        messages.push({ role: 'assistant', content: assistantBlocks });

        const toolResults: ClaudeToolResultContent[] = [];

        for (const block of assistantBlocks) {
          if (block.type !== 'tool_use') continue;

          try {
            if (block.name === 'create_lesson') {
              const args = block.input as {
                topic: string;
                depth?: 'quick' | 'standard' | 'deep';
                subject?: string;
              };
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
              const args = block.input as {
                topic: string;
                questionCount?: number;
                subject?: string;
              };
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
            const message =
              error instanceof Error ? error.message : 'Tool execution failed';
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
        .filter(
          (block): block is { type: 'text'; text: string } =>
            block.type === 'text',
        )
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

  async generateProgressSummary(input: {
    recentLessons: Array<{ topic: string; subjectName: string; confidenceRating: number | null }>;
    recentQuizzes: Array<{ topic: string; subjectName: string; score: number; totalQuestions: number }>;
    growthAreas: Array<{ topic: string; subjectName: string; score: number; flagCount: number }>;
    topSubjects: string[];
    streak: number;
    plan: string;
  }): Promise<import('@lernard/shared-types').ProgressSummary | null> {
    if (this.devMode) {
      return {
        strengthTopic: input.recentLessons[0]?.topic ?? null,
        strengthEvidence: 'Dev mode — no real evidence available.',
        gapTopic: input.growthAreas[0]?.topic ?? 'a topic',
        gapEvidence: `Score ${input.growthAreas[0]?.score ?? 0}%`,
        nextActionTopic: input.growthAreas[0]?.topic ?? input.recentLessons[0]?.topic ?? 'any topic',
        nextActionDepth: 'standard',
        nextActionSubject: input.growthAreas[0]?.subjectName ?? input.topSubjects[0] ?? 'General',
        summaryParagraph: 'Dev mode progress summary. Generate a lesson to get started.',
      };
    }

    const isExplorer = input.plan === 'explorer';
    const systemPrompt = isExplorer
      ? `You are Lernard's progress analyst. Return ONLY valid JSON with this shape:
{"gapTopic":"...","gapEvidence":"...","nextActionTopic":"...","nextActionDepth":"standard","nextActionSubject":"...","summaryParagraph":"..."}
Be specific. Name exact topics. Keep each field concise (1-2 sentences max for summaryParagraph).`
      : `You are Lernard's progress analyst. Return ONLY valid JSON with this shape:
{"strengthTopic":"...","strengthEvidence":"...","gapTopic":"...","gapEvidence":"...","nextActionTopic":"...","nextActionDepth":"standard","nextActionSubject":"...","summaryParagraph":"..."}
Be specific. Name exact topics. Keep summaryParagraph to 2-3 sentences covering strength, gap, and next step.`;

    const text = await completeWithRetry(() =>
      this.completeText({
        model: HAIKU_MODEL,
        maxTokens: 400,
        systemPrompt,
        messages: [
          {
            role: 'user',
            content: JSON.stringify({
              recentLessons: input.recentLessons,
              recentQuizzes: input.recentQuizzes,
              growthAreas: input.growthAreas,
              topSubjects: input.topSubjects,
              streak: input.streak,
            }),
          },
        ],
      }),
    );

    const parsed = safeJsonParse<Record<string, string>>(text);
    if (!parsed || !parsed.gapTopic || !parsed.nextActionTopic) {
      return null;
    }

    return {
      strengthTopic: parsed.strengthTopic ?? null,
      strengthEvidence: parsed.strengthEvidence ?? null,
      gapTopic: parsed.gapTopic,
      gapEvidence: parsed.gapEvidence ?? '',
      nextActionTopic: parsed.nextActionTopic,
      nextActionDepth: (parsed.nextActionDepth as 'quick' | 'standard' | 'deep') ?? 'standard',
      nextActionSubject: parsed.nextActionSubject ?? input.topSubjects[0] ?? 'General',
      summaryParagraph: parsed.summaryParagraph ?? '',
    };
  }

  async generateSlotContent(input: {
    slotType: string;
    context: Record<string, unknown>;
  }): Promise<{ title: string; description: string }> {
    if (this.devMode) {
      return {
        title: 'Keep going',
        description:
          'You are building momentum. One more focused session helps.',
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
            content: JSON.stringify({
              slotType: input.slotType,
              context: input.context,
            }),
          },
        ],
      }),
    );

    const parsed = safeJsonParse<{ title?: string; description?: string }>(
      text,
    );
    return {
      title: parsed?.title ?? 'Keep going',
      description:
        parsed?.description ??
        'A short focused session right now can move you forward.',
    };
  }

  private async runWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await completeWithRetry(operation, {
        maxAttempts: 3,
        baseDelayMs: 400,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : 'Unknown error';
      this.logger.error(`[mastra.retry] exhausted error="${message}"`);
      if (error instanceof ContentValidationError) {
        throw new InternalServerErrorException(LERNARD_OUTAGE_MESSAGE);
      }
      throw error;
    }
  }

  private async completeText(input: {
    model: string;
    maxTokens: number;
    systemPrompt: string;
    messages: ClaudeMessage[];
  }): Promise<string> {
    const startedAt = Date.now();
    this.logger.log(
      `[mastra.completeText] request_start model=${input.model} maxTokens=${input.maxTokens} messageCount=${input.messages.length}`,
    );

    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
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
    } catch (error) {
      const message =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : 'Unknown fetch error';
      this.logger.error(
        `[mastra.completeText] request_error model=${input.model} durationMs=${Date.now() - startedAt} error="${message}"`,
      );
      throw error;
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '<unavailable>');
      this.logger.error(
        `[mastra.completeText] request_failed model=${input.model} status=${response.status} statusText="${response.statusText}" durationMs=${Date.now() - startedAt} body="${truncateForLog(bodyText, 1200)}"`,
      );
      throw new InternalServerErrorException('Claude completion failed');
    }

    const json = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const text = json.content?.find((block) => block.type === 'text')?.text;
    if (!text) {
      this.logger.error(
        `[mastra.completeText] empty_text_response model=${input.model} durationMs=${Date.now() - startedAt}`,
      );
      throw new InternalServerErrorException(
        'Claude completion returned empty text',
      );
    }

    this.logger.log(
      `[mastra.completeText] request_success model=${input.model} durationMs=${Date.now() - startedAt} textChars=${text.length}`,
    );

    return text;
  }

  private async completeMessage(input: {
    model: string;
    maxTokens: number;
    systemPrompt: string;
    messages: ClaudeMessage[];
    tools?: typeof CHAT_TOOLS;
  }): Promise<{
    stop_reason?: string;
    content?: ClaudeAssistantContentBlock[];
  }> {
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

function lessonMaxTokens(depth: 'quick' | 'standard' | 'deep'): number {
  if (depth === 'deep') return 5000;
  if (depth === 'quick') return 2000;
  return 3500;
}

function quizMaxTokens(questionCount: number): number {
  if (questionCount >= 15) return 5000;
  if (questionCount >= 10) return 4000;
  return 2500;
}

function lessonMinutesForDepth(depth: 'quick' | 'standard' | 'deep'): number {
  if (depth === 'quick') return 8;
  if (depth === 'deep') return 20;
  return 12;
}

function buildChatUserMessage(
  message: string,
  attachments: Array<{
    kind: 'image' | 'pdf';
    mimeType: string;
    data: string;
    fileName: string;
  }>,
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
    estimatedMinutes: lessonMinutesForDepth(depth),
    sections: [
      {
        type: 'hook',
        heading: 'Why this matters',
        body: `Understanding ${topic} is a valuable skill that opens up new ways of thinking and solving problems. When you grasp the core ideas behind ${topic}, you gain the ability to connect concepts across different subjects and apply your knowledge in practical, real-world situations. Many learners find that mastering ${topic} builds confidence and makes related topics easier to approach.`,
        terms: [],
      },
      {
        type: 'concept',
        heading: `Core idea of ${topic}`,
        body: `${topic} can be understood by breaking it into smaller, manageable steps and recognising the patterns that appear throughout. The key is to focus on the underlying principles rather than trying to memorise every detail. Once you understand why things work the way they do in ${topic}, the specific facts and procedures start to make much more sense and become easier to remember.`,
        terms: [
          {
            term: topic,
            explanation: `${topic} is the central concept studied in this lesson. It refers to a body of ideas, methods, or principles that help explain a particular area of knowledge or skill.`,
          },
        ],
      },
      {
        type: 'examples',
        heading: 'Worked example',
        body: `Consider a simple, concrete case involving ${topic}. Start with a straightforward scenario: identify the key components, apply the relevant rule or method from step 1 through to the final answer, and check that the result makes sense. For instance, if ${topic} involves a process, trace through that process with specific values like 10, 25, or 100 to see the pattern in action. Practising with at least two or three examples like this will solidify your understanding.`,
        terms: [],
      },
      {
        type: 'recap',
        heading: 'Quick recap',
        body: `In this lesson you explored what ${topic} is and why it matters, identified the core principles that make it work, and saw how to apply those principles in a worked example. The most important takeaway is that ${topic} follows consistent patterns you can rely on. In your next session, try applying what you learned here to a new problem or a slightly different context to reinforce your understanding.`,
        terms: [],
      },
    ],
  };
}

function buildFallbackQuizQuestions(
  topic: string,
  questionCount: number,
): GeneratedQuizQuestion[] {
  const normalizedTopic = topic.trim() || 'this topic';

  return Array.from({ length: questionCount }, (_, index) => {
    const variant = index % 5;

    if (variant === 0) {
      return {
        type: 'multiple_choice',
        text: `Which of the following options gives the most accurate and complete summary of what ${normalizedTopic} is?`,
        options: [
          `${normalizedTopic} is a concept or process that can be understood step by step.`,
          `${normalizedTopic} is only a random guess with no pattern.`,
          `${normalizedTopic} cannot be explained or practiced.`,
          `${normalizedTopic} is unrelated to problem-solving or reasoning.`,
        ],
        correctAnswer: `${normalizedTopic} is a concept or process that can be understood step by step.`,
        explanation: `A strong summary of ${normalizedTopic} should explain that it can be learned, analyzed, and applied.`,
      };
    }

    if (variant === 1) {
      return {
        type: 'true_false',
        text: `True or false: learning ${normalizedTopic} usually becomes easier when you break it into smaller ideas and examples.`,
        correctAnswer: 'true',
        explanation: `Breaking ${normalizedTopic} into smaller parts is a reliable way to improve understanding.`,
      };
    }

    if (variant === 2) {
      return {
        type: 'multiple_select',
        text: `Which of the following actions would most help someone build a deeper understanding of ${normalizedTopic}?`,
        options: [
          `Define the key terms in ${normalizedTopic}`,
          `Work through a concrete example of ${normalizedTopic}`,
          `Ignore how the ideas in ${normalizedTopic} connect`,
          `Explain ${normalizedTopic} in your own words`,
        ],
        correctAnswers: [
          `Define the key terms in ${normalizedTopic}`,
          `Work through a concrete example of ${normalizedTopic}`,
          `Explain ${normalizedTopic} in your own words`,
        ],
        explanation: `Definitions, examples, and self-explanations strengthen understanding more than passive review.`,
      };
    }

    if (variant === 3) {
      return {
        type: 'fill_blank',
        text: `Fill in the blank: The subject this entire quiz has been designed to help you practise is _____.`,
        correctAnswer: normalizedTopic,
        explanation: `The blank should be filled with the topic the quiz is focused on.`,
      };
    }

    return {
      type: 'short_answer',
      text: `In one short phrase, what is the main idea you should be able to explain after studying ${normalizedTopic}?`,
      correctAnswer: normalizedTopic,
      explanation: `A concise answer should name the core topic being practised.`,
    };
  });
}

function normalizeGeneratedQuestion(
  question: GeneratedQuizQuestion,
): GeneratedQuizQuestion {
  return {
    type: normalizeQuestionType(question.type),
    text:
      typeof question.text === 'string'
        ? question.text.trim()
        : String(question.text ?? ''),
    options: Array.isArray(question.options)
      ? question.options
          .filter((option): option is string => typeof option === 'string')
          .map((option) => option.trim())
          .filter(Boolean)
      : undefined,
    correctAnswer:
      typeof question.correctAnswer === 'string'
        ? question.correctAnswer.trim()
        : undefined,
    correctAnswers: Array.isArray(question.correctAnswers)
      ? question.correctAnswers
          .filter((answer): answer is string => typeof answer === 'string')
          .map((answer) => answer.trim())
          .filter(Boolean)
      : undefined,
    explanation:
      typeof question.explanation === 'string'
        ? question.explanation.trim()
        : undefined,
  };
}

function isUsableGeneratedQuestion(question: GeneratedQuizQuestion): boolean {
  if (!question.text || isGenericQuestionText(question.text)) {
    return false;
  }

  switch (question.type) {
    case 'multiple_choice': {
      if (!hasDistinctOptions(question.options, 4)) {
        return false;
      }
      return Boolean(
        question.correctAnswer &&
        optionListIncludes(question.options, question.correctAnswer),
      );
    }
    case 'multiple_select': {
      if (
        !hasDistinctOptions(question.options, 4) ||
        !Array.isArray(question.correctAnswers) ||
        question.correctAnswers.length < 2
      ) {
        return false;
      }
      return question.correctAnswers.every((answer) =>
        optionListIncludes(question.options, answer),
      );
    }
    case 'true_false': {
      return (
        question.correctAnswer === 'true' || question.correctAnswer === 'false'
      );
    }
    case 'fill_blank':
    case 'short_answer':
    case 'ordering': {
      return Boolean(question.correctAnswer);
    }
    default:
      return false;
  }
}

function hasDistinctOptions(
  options: string[] | undefined,
  minCount: number,
): boolean {
  if (!Array.isArray(options) || options.length < minCount) {
    return false;
  }

  return (
    new Set(options.map((option) => option.trim().toLowerCase())).size ===
    options.length
  );
}

function optionListIncludes(
  options: string[] | undefined,
  candidate: string,
): boolean {
  if (!Array.isArray(options)) {
    return false;
  }

  const normalizedCandidate = candidate.trim().toLowerCase();
  return options.some(
    (option) => option.trim().toLowerCase() === normalizedCandidate,
  );
}

function isGenericQuestionText(text: string): boolean {
  const normalized = text.trim().toLowerCase();

  return (
    normalized.length < 12 ||
    normalized.startsWith('which statement best describes') ||
    normalized.startsWith('which option best describes') ||
    normalized.includes('definition a') ||
    normalized.includes('definition b') ||
    /^\d+\./.test(normalized)
  );
}

function normalizeQuestionKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeQuestionType(type: string | undefined): QuizQuestionType {
  switch (type) {
    case 'multiple_choice':
    case 'multiple_select':
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
  if (
    type === 'hook' ||
    type === 'concept' ||
    type === 'examples' ||
    type === 'recap'
  ) {
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

function parseLessonContentFromModelText(
  value: string,
): Partial<LessonContent> | null {
  const candidates = buildJsonCandidates(value);

  for (const candidate of candidates) {
    const parsed = safeJsonParse<Partial<LessonContent>>(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function buildJsonCandidates(value: string): string[] {
  const candidates: string[] = [];
  const trimmed = value.trim();

  if (trimmed) {
    candidates.push(trimmed);
  }

  const fencedMatches = [
    ...trimmed.matchAll(/```json\s*([\s\S]*?)```/gi),
    ...trimmed.matchAll(/```\s*([\s\S]*?)```/g),
  ];

  for (const match of fencedMatches) {
    const block = (match[1] ?? '').trim();
    if (block) {
      candidates.push(block);
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  return Array.from(new Set(candidates));
}

function truncateForLog(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
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
