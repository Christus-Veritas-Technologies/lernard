import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ChatMessageBlock,
  LessonContent,
  LessonRemediationContextInput,
  LessonRefCardProps,
  LessonRetryContextInput,
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
  buildQuizGenerationSystemPrompt,
  buildQuizUserPrompt,
  buildSystemPrompt,
} from './lernard-prompts';
import type { StudentContext } from './student-context.builder';

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
  subtopic?: string;
  // Structured questions
  parts?: unknown[];
  totalMarks?: number;
}

interface LessonSectionInput {
  type: string;
  heading: string | null;
  body: string;
  terms: Array<{ term: string; explanation: string }>;
}

interface RefinedQuizPrompt {
  finalPrompt: string;
  mustCover: string[];
}

interface QuizOutputPayload {
  topic?: string;
  subjectName?: string;
  questions?: GeneratedQuizQuestion[];
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
    remediationContext?: LessonRemediationContextInput;
    retryContext?: LessonRetryContextInput;
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
      remediationContext: input.remediationContext,
      retryContext: input.retryContext,
    });

    const fallbackEstimatedMinutes = lessonMinutesForDepth(input.depth);

    return this.runWithRetry(
      async () => {
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

        try {
          assertLessonContentValid(parsed);
        } catch (validationError) {
          const hook = parsed.sections?.find((s) => s?.type === 'hook') ?? parsed.sections?.[0];
          const hookBody = typeof hook?.body === 'string' ? hook.body : '(no body)';
          this.logger.error(
            `[mastra.generateLesson] validation_failed topic="${input.topic}" depth=${input.depth} error="${validationError instanceof Error ? validationError.message : String(validationError)}" hookBodyPreview="${truncateForLog(hookBody, 400)}"`,
          );
          throw validationError;
        }

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
      },
      () => buildFallbackLesson(input.topic, input.subjectName, input.depth),
    );
  }

  async generateLessonFromFile(input: {
    buffer: Buffer;
    kind: 'image' | 'pdf';
    mimeType: string;
    depth: 'quick' | 'standard' | 'deep';
    studentContext: StudentContext;
    subjectName?: string;
  }): Promise<LessonContent> {
    if (this.devMode) {
      return buildFallbackLesson('Uploaded content', input.subjectName, input.depth);
    }

    const systemPrompt = buildSystemPrompt(input.studentContext, {
      kind: 'lesson',
      topic: 'the attached file content',
      subjectName: input.subjectName,
      depth: input.depth,
    });

    const fileBlock: ClaudeContentBlock =
      input.kind === 'pdf'
        ? {
            type: 'document',
            source: {
              type: 'base64',
              media_type: input.mimeType,
              data: input.buffer.toString('base64'),
            },
          }
        : {
            type: 'image',
            source: {
              type: 'base64',
              media_type: input.mimeType,
              data: input.buffer.toString('base64'),
            },
          };

    const styleAwareLessonPrompt = buildLessonUserPrompt(input.studentContext, {
      topic: 'the attached file content',
      subjectName: input.subjectName,
      depth: input.depth,
    });

    const textBlock: ClaudeContentBlock = {
      type: 'text',
      text: [
        `Generate a ${input.depth} lesson based on the attached ${input.kind === 'pdf' ? 'document' : 'image'}.`,
        `Use the attached ${input.kind === 'pdf' ? 'document' : 'image'} as the source of truth for lesson content.`,
        'Infer a concise topic name and subject from the file content.',
        'Return only valid JSON in this exact shape:',
        '{"topic":"<short topic>","subjectName":"<subject>","depth":"quick|standard|deep","estimatedMinutes":number,"sections":[{"type":"hook|concept|examples|recap","heading":string|null,"body":string,"terms":[{"term":string,"explanation":string}]}]}',
        'Do not include markdown fences or extra prose.',
        '',
        'Apply these lesson-quality and format rules exactly:',
        styleAwareLessonPrompt,
      ].join('\n'),
    };

    const fallbackEstimatedMinutes = lessonMinutesForDepth(input.depth);

    return this.runWithRetry(
      async () => {
        const text = await this.completeText({
          model: SONNET_MODEL,
          maxTokens: lessonMaxTokens(input.depth),
          systemPrompt,
          messages: [{ role: 'user', content: [fileBlock, textBlock] }],
        });

        const parsed = parseLessonContentFromModelText(text);
        if (!parsed || !Array.isArray(parsed.sections)) {
          this.logger.warn(
            `[mastra.generateLessonFromFile] malformed_json_fallback depth=${input.depth} rawPreview="${truncateForLog(text.replace(/\s+/g, ' '), 600)}"`,
          );
          return buildFallbackLesson('Uploaded content', input.subjectName, input.depth);
        }

        try {
          assertLessonContentValid(parsed);
        } catch (validationError) {
          const hook = parsed.sections?.find((s) => s?.type === 'hook') ?? parsed.sections?.[0];
          const hookBody = typeof hook?.body === 'string' ? hook.body : '(no body)';
          this.logger.error(
            `[mastra.generateLessonFromFile] validation_failed depth=${input.depth} error="${validationError instanceof Error ? validationError.message : String(validationError)}" hookBodyPreview="${truncateForLog(hookBody, 400)}"`,
          );
          throw validationError;
        }

        return {
          lessonId: 'generated',
          topic: parsed.topic ?? 'Uploaded content',
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
      },
      () => buildFallbackLesson('Uploaded content', input.subjectName, input.depth),
    );
  }

  async generateLessonStreaming(input: {
    topic: string;
    depth: 'quick' | 'standard' | 'deep';
    subjectName?: string;
    studentContext: StudentContext;
    remediationContext?: LessonRemediationContextInput;
    retryContext?: LessonRetryContextInput;
    onSection: (section: LessonContent['sections'][number], index: number) => Promise<void>;
  }): Promise<LessonContent> {
    if (this.devMode) {
      const fallback = buildFallbackLesson(input.topic, input.subjectName, input.depth);
      for (let i = 0; i < fallback.sections.length; i++) {
        await input.onSection(fallback.sections[i]!, i);
      }
      return fallback;
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
      remediationContext: input.remediationContext,
      retryContext: input.retryContext,
    });

    const fallbackEstimatedMinutes = lessonMinutesForDepth(input.depth);

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
          model: SONNET_MODEL,
          max_tokens: lessonMaxTokens(input.depth),
          stream: true,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown fetch error';
      this.logger.error(`[mastra.generateLessonStreaming] fetch_error topic="${input.topic}" error="${message}"`);
      return buildFallbackLesson(input.topic, input.subjectName, input.depth);
    }

    if (!response.ok || !response.body) {
      const bodyText = await response.text().catch(() => '<unavailable>');
      this.logger.error(
        `[mastra.generateLessonStreaming] request_failed status=${response.status} body="${truncateForLog(bodyText, 400)}"`,
      );
      return buildFallbackLesson(input.topic, input.subjectName, input.depth);
    }

    let accumulatedText = '';
    const extractor = new LessonSectionExtractor();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let partialLine = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        partialLine += chunk;
        const lines = partialLine.split('\n');
        partialLine = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const event = JSON.parse(jsonStr) as {
              type: string;
              delta?: { type: string; text: string };
            };

            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              const textChunk = event.delta.text;
              accumulatedText += textChunk;

              const newSections = extractor.feed(textChunk);
              for (const { index, json } of newSections) {
                const parsed = safeJsonParse<{
                  type?: unknown;
                  heading?: unknown;
                  body?: unknown;
                  terms?: unknown;
                }>(json);
                if (!parsed) continue;
                const normalized: LessonContent['sections'][number] = {
                  type: normalizeSectionType(parsed.type, index),
                  heading: typeof parsed.heading === 'string' ? parsed.heading : null,
                  body: typeof parsed.body === 'string' ? parsed.body : '',
                  terms: Array.isArray(parsed.terms)
                    ? parsed.terms
                        .filter((t) => t && typeof (t as any).term === 'string')
                        .map((t) => ({
                          term: (t as any).term as string,
                          explanation:
                            typeof (t as any).explanation === 'string'
                              ? ((t as any).explanation as string)
                              : 'Definition unavailable.',
                        }))
                    : [],
                };
                await input.onSection(normalized, index);
              }
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Parse and return the final complete result
    const parsed = parseLessonContentFromModelText(accumulatedText);
    if (!parsed || !Array.isArray(parsed.sections)) {
      this.logger.warn(
        `[mastra.generateLessonStreaming] malformed_json_fallback topic="${input.topic}" depth=${input.depth} rawPreview="${truncateForLog(accumulatedText.replace(/\s+/g, ' '), 400)}"`,
      );
      return buildFallbackLesson(input.topic, input.subjectName, input.depth);
    }

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
  }

  async generateQuiz(input: {
    topic: string;
    questionCount: number;
    subjectName?: string;
    mode: 'guide' | 'companion';
    paperType: 'paper1' | 'paper2';
    questionType: 'multiple_choice' | 'structured';
    difficulty: 'foundation' | 'standard' | 'challenging' | 'extension';
    studentContext: StudentContext;
    lessonSections?: LessonSectionInput[];
    confidenceRating?: number | null;
    avoidQuestions?: string[];
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

    const systemPrompt = buildQuizGenerationSystemPrompt(input.studentContext);

    const userPrompt = buildQuizUserPrompt(input.studentContext, {
      topic: input.topic,
      subjectName: input.subjectName,
      questionCount: input.questionCount,
      mode: input.mode,
      paperType: input.paperType,
      difficulty: input.difficulty,
      questionType: input.questionType,
      lessonSections: input.lessonSections,
      confidenceRating: input.confidenceRating,
    });
    const refinedPrompt = await this.buildLessonAwareQuizPrompt(
      input,
      userPrompt,
    );

    const finalPrompt =
      input.avoidQuestions && input.avoidQuestions.length > 0
        ? `${refinedPrompt}\n\nIMPORTANT: You have already generated the following questions in a previous batch. You MUST generate ${input.questionCount} completely different questions that do not overlap with or resemble these:\n${input.avoidQuestions.map((t, i) => `${i + 1}. "${t}"`).join('\n')}`
        : refinedPrompt;

    return this.runWithRetry(async () => {
      let maxTokens = quizMaxTokens(
        input.questionCount,
        input.paperType,
        input.difficulty,
      );
      let parsed: QuizOutputPayload | null = null;
      let lastRawOutput = '';
      const attemptRawOutputs: string[] = [];

      for (let attempt = 1; attempt <= 3; attempt++) {
        const structured = await this.completeStructuredQuizPayload({
          model: SONNET_MODEL,
          maxTokens,
          systemPrompt,
          messages: [{ role: 'user', content: finalPrompt }],
          includeTopicAndSubject: false,
          contextTag: 'generateQuiz',
        });

        lastRawOutput = structured.rawOutput;
        attemptRawOutputs.push(
          `attempt=${attempt} raw=${structured.rawOutput}`,
        );
        const parseResult = structured.payload;

        this.logger.log(
          `[mastra.generateQuiz] attempt=${attempt} maxTokens=${maxTokens} parsed=${Array.isArray(parseResult?.questions) ? 'yes' : 'no'} rawChars=${structured.rawOutput.length}`,
        );

        if (Array.isArray(parseResult?.questions)) {
          parsed = parseResult;
          break;
        }

        if (attempt === 3) {
          this.logRawAiOutputsOnError(
            'mastra.generateQuiz.parse_failed_after_retries',
            attemptRawOutputs,
          );
          throw new ContentValidationError(
            'Quiz generation returned malformed structured output after retries',
          );
        }

        maxTokens = Math.min(Math.round(maxTokens * 1.6), 28000);
      }

      if (!parsed || !Array.isArray(parsed.questions)) {
        this.logRawAiOutputsOnError(
          'mastra.generateQuiz.parse_failed_after_retries',
          attemptRawOutputs,
        );
        this.logger.error(
          `[mastra.generateQuiz] parse_failed_after_retries rawChars=${lastRawOutput.length}`,
        );
        throw new ContentValidationError(
          'Quiz generation returned malformed structured output',
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

      const completed = await this.supplementMissingQuestions({
        contextTag: 'generateQuiz',
        systemPrompt,
        baseUserContent: finalPrompt,
        targetCount: input.questionCount,
        existingQuestions: unique,
        baseMaxTokens: maxTokens,
      });

      if (completed.length < input.questionCount) {
        this.logRawAiOutputsOnError(
          'mastra.generateQuiz.insufficient_usable_questions',
          attemptRawOutputs,
        );
        throw new ContentValidationError(
          `Quiz generation returned ${completed.length} usable questions, expected ${input.questionCount}`,
        );
      }

      const finalQuestions = completed.slice(0, input.questionCount);
      try {
        assertQuizContentValid(
          { questions: finalQuestions },
          {
            paperType: input.paperType,
            difficulty: input.difficulty,
          },
        );
      } catch (error) {
        this.logRawAiOutputsOnError(
          'mastra.generateQuiz.validation_failed',
          attemptRawOutputs,
        );
        throw error;
      }

      return {
        topic: input.topic,
        subjectName: input.subjectName ?? 'General',
        mode: input.mode,
        questions: finalQuestions,
      };
    });
  }

  private async buildLessonAwareQuizPrompt(
    input: {
      topic: string;
      questionCount: number;
      subjectName?: string;
      mode: 'guide' | 'companion';
      paperType: 'paper1' | 'paper2';
      difficulty: 'foundation' | 'standard' | 'challenging' | 'extension';
      studentContext: StudentContext;
      lessonSections?: LessonSectionInput[];
      confidenceRating?: number | null;
    },
    defaultPrompt: string,
  ): Promise<string> {
    if (!input.lessonSections || input.lessonSections.length === 0) {
      return defaultPrompt;
    }

    const serializedSections = serializeLessonSections(input.lessonSections);

    this.logger.log(
      `[mastra.quizRefiner] start topic="${input.topic}" difficulty=${input.difficulty} paperType=${input.paperType} sectionCount=${input.lessonSections.length} sectionChars=${serializedSections.length}`,
    );

    try {
      const refined = await completeWithRetry(async () => {
        const text = await this.completeText({
          model: HAIKU_MODEL,
          maxTokens: 1800,
          systemPrompt:
            'You rewrite quiz prompts for grounding and quality. Return ONLY valid JSON.',
          messages: [
            {
              role: 'user',
              content: [
                'You are an expert quiz prompt engineer for Lernard.',
                'Rewrite the draft prompt so questions are highly specific to the lesson and still satisfy all output constraints.',
                '',
                'Hard requirements for your rewritten prompt:',
                '- Preserve all JSON output constraints and format rules from the draft prompt.',
                '- Preserve question count, paper type, difficulty, and distribution constraints.',
                '- Enforce specificity: each question text must be at least 15 words.',
                '- Anchor questions to concrete lesson facts, terms, examples, and mechanisms.',
                '- Keep the prompt actionable and concise.',
                '',
                'Return ONLY valid JSON in this shape:',
                '{"finalPrompt":"...","mustCover":["...","..."]}',
                '',
                'Include 6 to 12 mustCover items listing concrete facts/terms from the lesson that the quiz must test.',
                '',
                `Topic: ${input.topic}`,
                `Subject: ${input.subjectName ?? 'General'}`,
                `Mode: ${input.mode}`,
                `Paper Type: ${input.paperType === 'paper1' ? 'Paper 1 (Multiple Choice)' : 'Paper 2 (Structured)'}`,
                `Difficulty: ${input.difficulty}`,
                `Question count: ${input.questionCount}`,
                `Confidence rating: ${input.confidenceRating ?? 'unknown'}`,
                '',
                'Full lesson content:',
                serializedSections,
                '',
                'Draft prompt to refine:',
                defaultPrompt,
              ].join('\n'),
            },
          ],
        });

        const parsed = safeJsonParse<RefinedQuizPrompt>(text);
        if (!parsed || typeof parsed.finalPrompt !== 'string') {
          throw new ContentValidationError(
            'Quiz prompt refiner returned malformed JSON',
          );
        }

        const finalPrompt = parsed.finalPrompt.trim();
        if (finalPrompt.length < 200) {
          throw new ContentValidationError(
            'Quiz prompt refiner returned an unusably short prompt',
          );
        }

        const mustCover = Array.isArray(parsed.mustCover)
          ? parsed.mustCover
              .filter((item): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter(Boolean)
              .slice(0, 12)
          : [];

        return { finalPrompt, mustCover };
      });

      const checklist = refined.mustCover.length
        ? [
            '',
            'Lesson grounding checklist (must cover):',
            ...refined.mustCover.map((item, index) => `${index + 1}. ${item}`),
          ].join('\n')
        : '';

      const promptWithChecklist = `${refined.finalPrompt}${checklist}`;
      this.logger.log(
        `[mastra.quizRefiner] success topic="${input.topic}" promptChars=${promptWithChecklist.length} mustCoverCount=${refined.mustCover.length}`,
      );
      return promptWithChecklist;
    } catch (error) {
      const message =
        error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      this.logger.warn(
        `[mastra.quizRefiner] fallback_to_default topic="${input.topic}" error="${message}"`,
      );
      return defaultPrompt;
    }
  }

  private async supplementMissingQuestions(input: {
    contextTag: string;
    systemPrompt: string;
    baseUserContent: string | ClaudeContentBlock[];
    targetCount: number;
    existingQuestions: GeneratedQuizQuestion[];
    baseMaxTokens: number;
  }): Promise<GeneratedQuizQuestion[]> {
    if (input.existingQuestions.length >= input.targetCount) {
      return input.existingQuestions;
    }

    const missingCount = Math.max(input.targetCount - input.existingQuestions.length, 0);
    if (missingCount === 0) {
      return input.existingQuestions;
    }

    const existingKeys = new Set(
      input.existingQuestions.map(
        (question) => `${question.type}|${normalizeQuestionKey(question.text)}`,
      ),
    );

    const supplementInstruction = [
      `The previous output produced ${input.existingQuestions.length}/${input.targetCount} usable questions.`,
      `Generate exactly ${missingCount} ADDITIONAL questions to fill the gap.`,
      'Do not repeat or paraphrase existing questions.',
      'Return ONLY valid JSON with this shape: {"questions":[...]}',
      'Existing questions to avoid:',
      ...input.existingQuestions.map((question, index) => `${index + 1}. [${question.type}] ${question.text}`),
    ].join('\n');

    const supplementMessage: ClaudeMessage = {
      role: 'user',
      content: Array.isArray(input.baseUserContent)
        ? [
            ...input.baseUserContent,
            {
              type: 'text',
              text: supplementInstruction,
            },
          ]
        : [input.baseUserContent, supplementInstruction].join('\n\n'),
    };

    const structuredSupplement = await this.completeStructuredQuizPayload({
      model: SONNET_MODEL,
      maxTokens: Math.min(Math.round(input.baseMaxTokens * 1.2), 28000),
      systemPrompt: input.systemPrompt,
      messages: [supplementMessage],
      includeTopicAndSubject: false,
      contextTag: `${input.contextTag}.supplement`,
    });

    const parsed = structuredSupplement.payload;
    const supplementalQuestions = Array.isArray(parsed?.questions)
      ? parsed.questions
          .map((question) => normalizeGeneratedQuestion(question))
          .filter(isUsableGeneratedQuestion)
      : [];

    if (supplementalQuestions.length === 0) {
      this.logRawAiOutputsOnError(
        `mastra.${input.contextTag}.supplement_no_usable_questions`,
        [structuredSupplement.rawOutput],
      );
    }

    const merged = [...input.existingQuestions];
    for (const question of supplementalQuestions) {
      if (merged.length >= input.targetCount) break;
      const key = `${question.type}|${normalizeQuestionKey(question.text)}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      merged.push(question);
    }

    // Ensure we never return more than targetCount
    const result = merged.slice(0, input.targetCount);

    this.logger.log(
      `[mastra.${input.contextTag}] supplement missing=${missingCount} supplementalUsable=${supplementalQuestions.length} merged=${merged.length} final=${result.length}/${input.targetCount}`,
    );

    return result;
  }

  async generateQuizFromFile(input: {
    buffer: Buffer;
    kind: 'image' | 'pdf';
    mimeType: string;
    questionCount: number;
    mode: 'guide' | 'companion';
    paperType: 'paper1' | 'paper2';
    questionType: 'multiple_choice' | 'structured';
    difficulty: 'foundation' | 'standard' | 'challenging' | 'extension';
    studentContext: StudentContext;
  }): Promise<{
    topic: string;
    subjectName: string;
    mode: 'guide' | 'companion';
    questions: GeneratedQuizQuestion[];
  }> {
    if (this.devMode) {
      return {
        topic: 'Uploaded content',
        subjectName: 'General',
        mode: input.mode,
        questions: buildFallbackQuizQuestions('the uploaded content', input.questionCount),
      };
    }

    const systemPrompt = buildQuizGenerationSystemPrompt(input.studentContext);

    const fileBlock: ClaudeContentBlock =
      input.kind === 'pdf'
        ? {
            type: 'document',
            source: {
              type: 'base64',
              media_type: input.mimeType,
              data: input.buffer.toString('base64'),
            },
          }
        : {
            type: 'image',
            source: {
              type: 'base64',
              media_type: input.mimeType,
              data: input.buffer.toString('base64'),
            },
          };

    const styleAwareQuizPrompt = buildQuizUserPrompt(input.studentContext, {
      topic: 'the attached file content',
      subjectName: 'General',
      questionCount: input.questionCount,
      mode: input.mode,
      paperType: input.paperType,
      difficulty: input.difficulty,
      questionType: input.questionType,
    });

    const textBlock: ClaudeContentBlock = {
      type: 'text',
      text: [
        `Generate exactly ${input.questionCount} quiz questions based on the content of this ${input.kind === 'pdf' ? 'document' : 'image'}.`,
        `Use the attached ${input.kind === 'pdf' ? 'document' : 'image'} as the source of truth for question content.`,
        'Infer a concise topic name and subject from the file content itself.',
        'Return only valid JSON in this exact shape:',
        '{"topic":"<short topic name>","subjectName":"<subject>","questions":[...]}',
        'Do not include markdown fences or extra prose.',
        '',
        'Apply these quiz-quality and format rules exactly:',
        styleAwareQuizPrompt,
      ].join('\n'),
    };

    return this.runWithRetry(async () => {
      let maxTokens = quizMaxTokens(
        input.questionCount,
        input.paperType,
        input.difficulty,
      );
      let parsed: QuizOutputPayload | null = null;
      let lastRawOutput = '';
      const attemptRawOutputs: string[] = [];

      for (let attempt = 1; attempt <= 3; attempt++) {
        const structured = await this.completeStructuredQuizPayload({
          model: SONNET_MODEL,
          maxTokens,
          systemPrompt,
          messages: [{ role: 'user', content: [fileBlock, textBlock] }],
          includeTopicAndSubject: true,
          contextTag: 'generateQuizFromFile',
        });

        lastRawOutput = structured.rawOutput;
        attemptRawOutputs.push(
          `attempt=${attempt} raw=${structured.rawOutput}`,
        );
        const parseResult = structured.payload;

        this.logger.log(
          `[mastra.generateQuizFromFile] attempt=${attempt} maxTokens=${maxTokens} parsed=${Array.isArray(parseResult?.questions) ? 'yes' : 'no'} rawChars=${structured.rawOutput.length}`,
        );

        if (Array.isArray(parseResult?.questions)) {
          parsed = parseResult;
          break;
        }

        if (attempt === 3) {
          this.logRawAiOutputsOnError(
            'mastra.generateQuizFromFile.parse_failed_after_retries',
            attemptRawOutputs,
          );
          throw new ContentValidationError(
            'Quiz-from-file generation returned malformed structured output after retries',
          );
        }

        maxTokens = Math.min(Math.round(maxTokens * 1.6), 28000);
      }

      if (!parsed || !Array.isArray(parsed.questions)) {
        this.logRawAiOutputsOnError(
          'mastra.generateQuizFromFile.parse_failed_after_retries',
          attemptRawOutputs,
        );
        this.logger.error(
          `[mastra.generateQuizFromFile] parse_failed_after_retries rawChars=${lastRawOutput.length}`,
        );
        throw new ContentValidationError(
          'Quiz-from-file generation returned malformed structured output',
        );
      }

      const normalized = parsed.questions
        .map((q) => normalizeGeneratedQuestion(q))
        .filter(isUsableGeneratedQuestion);

      const seen = new Set<string>();
      const unique: GeneratedQuizQuestion[] = [];
      for (const question of normalized) {
        const key = `${question.type}|${normalizeQuestionKey(question.text)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(question);
      }

      const completed = await this.supplementMissingQuestions({
        contextTag: 'generateQuizFromFile',
        systemPrompt,
        baseUserContent: [fileBlock, textBlock],
        targetCount: input.questionCount,
        existingQuestions: unique,
        baseMaxTokens: maxTokens,
      });

      if (completed.length < input.questionCount) {
        this.logRawAiOutputsOnError(
          'mastra.generateQuizFromFile.insufficient_usable_questions',
          attemptRawOutputs,
        );
        throw new ContentValidationError(
          `Quiz-from-file returned ${completed.length} usable questions, expected ${input.questionCount}`,
        );
      }

      const finalQuestions = completed.slice(0, input.questionCount);
      try {
        assertQuizContentValid(
          { questions: finalQuestions },
          {
            paperType: input.paperType,
            difficulty: input.difficulty,
          },
        );
      } catch (error) {
        this.logRawAiOutputsOnError(
          'mastra.generateQuizFromFile.validation_failed',
          attemptRawOutputs,
        );
        throw error;
      }

      return {
        topic: parsed.topic ?? 'Uploaded content',
        subjectName: parsed.subjectName ?? 'General',
        mode: input.mode,
        questions: finalQuestions,
      };
    });
  }

  async evaluateShortAnswer(input: {
    questionText: string;
    modelAnswer: string;
    studentAnswer: string;
    studentContext: Pick<StudentContext, 'name' | 'grade' | 'ageGroup'>;
  }): Promise<{ result: 'correct' | 'partial' | 'incorrect'; feedback: string }> {
    const level = input.studentContext.grade ?? input.studentContext.ageGroup ?? 'student';
    const userMessage = [
      `Question: ${input.questionText}`,
      `Model answer: ${input.modelAnswer}`,
      `Student's answer: ${input.studentAnswer}`,
      `Student level: ${level}`,
      '',
      'Evaluate on a 3-point scale:',
      '- "correct": Student demonstrated understanding of the core concept. Minor wording differences are fine.',
      '- "partial": Student got part of it right but missed a key element.',
      '- "incorrect": Student\'s answer is wrong or does not address the question.',
      '',
      'Return ONLY valid JSON:',
      '{"result":"correct"|"partial"|"incorrect","feedback":"one sentence telling the student specifically what they got right or what they missed"}',
    ].join('\n');

    try {
      const text = await this.completeText({
        model: HAIKU_MODEL,
        maxTokens: 300,
        systemPrompt: 'You evaluate student answers concisely. Return ONLY valid JSON.',
        messages: [{ role: 'user', content: userMessage }],
      });
      const parsed = safeJsonParse<{ result?: string; feedback?: string }>(text);
      const result = parsed?.result;
      if (result === 'correct' || result === 'partial' || result === 'incorrect') {
        return { result, feedback: parsed?.feedback ?? '' };
      }
    } catch {
      // fall through to default
    }
    return {
      result: 'incorrect',
      feedback: 'Unable to evaluate — please compare your answer with the model answer.',
    };
  }

  async evaluateStructuredPart(input: {
    stem: string;
    partText: string;
    command: string;
    marks: number;
    markingPoints: string[];
    modelAnswer: string;
    studentAnswer: string;
    studentContext: Pick<StudentContext, 'name' | 'grade' | 'ageGroup'>;
  }): Promise<{ marksEarned: number; feedback: string }> {
    const level = input.studentContext.grade ?? input.studentContext.ageGroup ?? 'student';
    const userMessage = [
      `You are a ZIMSEC examiner marking a structured question sub-part.`,
      ``,
      `Context (stem): ${input.stem}`,
      `Sub-question: ${input.partText}`,
      `Command word: ${input.command}`,
      `Available marks: ${input.marks}`,
      ``,
      `Marking scheme:`,
      input.markingPoints.map((mp, i) => `  ${i + 1}. ${mp}`).join('\n'),
      ``,
      `Model answer: ${input.modelAnswer}`,
      ``,
      `Student answer: ${input.studentAnswer}`,
      `Student level: ${level}`,
      ``,
      `Award marks strictly according to the marking scheme.`,
      `Each marking point is worth one mark. Award partial credit for partially correct answers.`,
      `Maximum marks to award: ${input.marks}`,
      ``,
      `Return ONLY valid JSON:`,
      `{"marksEarned":<integer 0–${input.marks}>,"feedback":"one sentence telling the student specifically what they earned or missed — reference the marking scheme"}`,
    ].join('\n');

    try {
      const text = await this.completeText({
        model: HAIKU_MODEL,
        maxTokens: 300,
        systemPrompt: 'You are a ZIMSEC examiner. Award marks accurately from marking schemes. Return ONLY valid JSON.',
        messages: [{ role: 'user', content: userMessage }],
      });
      const parsed = safeJsonParse<{ marksEarned?: number; feedback?: string }>(text);
      if (typeof parsed?.marksEarned === 'number') {
        const marksEarned = Math.min(
          Math.max(Math.round(parsed.marksEarned), 0),
          input.marks,
        );
        return { marksEarned, feedback: parsed?.feedback ?? '' };
      }
    } catch {
      // fall through to default
    }
    return {
      marksEarned: 0,
      feedback: 'Unable to evaluate — please compare your answer with the model answer.',
    };
  }

  async generateQuizDebrief(input: {
    topic: string;
    studentName: string;
    studentLevel: string;
    score: number;
    total: number;
    questions: Array<{ text: string; isCorrect: boolean }>;
  }): Promise<string> {
    const wrongQuestions = input.questions.filter((q) => !q.isCorrect);
    const userMessage = [
      `Student: ${input.studentName} (${input.studentLevel})`,
      `Quiz topic: ${input.topic}`,
      `Score: ${input.score}/${input.total}`,
      wrongQuestions.length > 0
        ? `Questions answered incorrectly:\n${wrongQuestions.map((q) => `- ${q.text}`).join('\n')}`
        : 'All questions answered correctly.',
      '',
      `Write one sentence in Lernard's voice (warm, direct, personal) summarising this result.`,
      `Start with "You scored ${input.score}/${input.total} on ${input.topic}." then add one specific observation.`,
      `Return ONLY the sentence — no JSON, no quotes.`,
    ].join('\n');

    try {
      const text = await this.completeText({
        model: HAIKU_MODEL,
        maxTokens: 120,
        systemPrompt:
          'You are Lernard, a personal AI tutor. Write brief, warm, specific feedback for students. Never use generic praise.',
        messages: [{ role: 'user', content: userMessage }],
      });
      const trimmed = text.trim();
      if (trimmed.length > 20) return trimmed;
    } catch {
      // fall through to default
    }
    return `You scored ${input.score}/${input.total} on ${input.topic}.`;
  }

  async reexplainLessonSection(input: {
    topic: string;
    subjectName: string;
    depth: 'quick' | 'standard' | 'deep';
    sectionType: 'hook' | 'concept' | 'examples' | 'recap';
    sectionHeading: string | null;
    originalBody: string;
    studentContext: StudentContext;
  }): Promise<string> {
    if (this.devMode) {
      return [
        `Another way to approach **${input.topic}** is to start from a concrete scenario and build upward from there.`,
        '',
        '1. Identify the key objects and values involved.',
        '2. Describe how each value changes from one step to the next.',
        '3. Check the result against a quick reality check so it makes intuitive sense.',
        '',
        'If this clicks better, keep this sequence as your default method and apply it to one fresh example.',
      ].join('\n');
    }

    const systemPrompt = buildSystemPrompt(input.studentContext, {
      kind: 'lesson',
      topic: input.topic,
      subjectName: input.subjectName,
      depth: input.depth,
    });

    const userPrompt = [
      `Rewrite one lesson section for ${input.studentContext.name} using a different teaching approach.`,
      `Topic: ${input.topic}`,
      `Subject: ${input.subjectName}`,
      `Section type: ${input.sectionType}`,
      `Current heading: ${input.sectionHeading ?? '(none)'}`,
      '',
      'Original section body:',
      input.originalBody,
      '',
      'Requirements:',
      '- Keep the same underlying concept, but use a different analogy, example, and explanation path.',
      '- Write in markdown only (no JSON).',
      '- Use short paragraphs and concrete detail specific to the topic.',
      '- Use bullet points or numbered steps when structure helps.',
      '- For code snippets, always use fenced code blocks with language names.',
      '- Do not mention that this is a rewrite or alternative.',
      '',
      'Return only the new section body markdown text.',
    ].join('\n');

    return this.runWithRetry(async () => {
      const text = await this.completeText({
        model: SONNET_MODEL,
        maxTokens: 1600,
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const body = text.trim();
      if (!body) {
        throw new ContentValidationError('Reexplain returned empty text');
      }

      return body;
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

  async generateProjectContent(input: {
    studentInfo: {
      fullName: string;
      schoolName: string;
      candidateNumber: string;
      centreNumber: string;
    };
    subject: string;
    level: 'grade7' | 'olevel' | 'alevel';
    layoutSections: Array<{ key: string; title: string }>;
    languageProfile: {
      audienceLabel: string;
      vocabularyGuidance: string;
      sentenceGuidance: string;
      explanationDepth: string;
      examplesGuidance: string;
    };
  }): Promise<{ title: string; totalMarks: number; sections: Array<{ key: string; title: string; body: string }> }> {
    const levelLabel =
      input.level === 'grade7' ? 'Grade 7' :
      input.level === 'olevel' ? 'O Level' : 'A Level';

    const marksGuidance =
      input.level === 'grade7' ? '25–40' :
      input.level === 'olevel' ? '45–70' : '80–120';

    const sectionsSpec = input.layoutSections
      .map((s, i) => `${i + 1}. key: "${s.key}" | title: "${s.title}"`)
      .join('\n');

    const systemPrompt = `You are Lernard, an expert educational assistant generating ZIMSEC-aligned coursework projects for Zimbabwean students.
You write content appropriate for the student's academic level and grounded in Zimbabwe's educational, cultural, and environmental context.
Always return valid JSON only — no markdown, no extra text.`;

    const userPrompt = `Generate a complete ZIMSEC ${levelLabel} project for the following student:

Student name: ${input.studentInfo.fullName}
School: ${input.studentInfo.schoolName}
Candidate number: ${input.studentInfo.candidateNumber}
Centre number: ${input.studentInfo.centreNumber}
Subject: ${input.subject}
Level: ${levelLabel}

Language requirements:
- Write for a ${input.languageProfile.audienceLabel}
- Vocabulary: ${input.languageProfile.vocabularyGuidance}
- Sentences: ${input.languageProfile.sentenceGuidance}
- Depth: ${input.languageProfile.explanationDepth}
- Examples: ${input.languageProfile.examplesGuidance}

The project must use EXACTLY these sections in this order:
${sectionsSpec}

Return a JSON object with this exact structure:
{
  "title": "A descriptive project title that reflects the subject and level (max 120 characters)",
  "totalMarks": <a whole number between ${marksGuidance}>,
  "sections": [
    { "key": "<section key>", "title": "<section title>", "body": "<full section content, well-developed and appropriate for ${levelLabel} ZIMSEC assessment>" },
    ...
  ]
}

Requirements:
- The title must name the subject area and be academically appropriate
- Each section body must be substantive, complete, and appropriate for ZIMSEC ${levelLabel} assessment
- Ground all content in Zimbabwe's educational context — reference local communities, environments, and practices where relevant
- Do not include any marks allocation, assessment criteria, or instructions inside section bodies
- Return ONLY valid JSON — no markdown, no extra commentary`;

    return completeWithRetry(async () => {
      const text = await this.completeText({
        model: SONNET_MODEL,
        maxTokens: 4096,
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const parsed = safeJsonParse<{
        title?: string;
        totalMarks?: number;
        sections?: Array<{ key?: string; title?: string; body?: string }>;
      }>(text);

      if (!parsed || typeof parsed.title !== 'string' || !Array.isArray(parsed.sections)) {
        this.logger.warn(
          `[mastra.generateProjectContent] malformed JSON subject="${input.subject}" level="${input.level}" preview="${truncateForLog(text.replace(/\s+/g, ' '), 400)}"`,
        );
        throw new Error('Project generation returned malformed JSON');
      }

      const sections = parsed.sections
        .filter((s) => typeof s.key === 'string' && typeof s.title === 'string' && typeof s.body === 'string')
        .map((s) => ({ key: String(s.key), title: String(s.title), body: String(s.body) }));

      if (sections.length !== input.layoutSections.length) {
        throw new Error(
          `Project section count mismatch: expected ${input.layoutSections.length}, got ${sections.length}`,
        );
      }

      for (let i = 0; i < input.layoutSections.length; i++) {
        if (sections[i]!.key !== input.layoutSections[i]!.key) {
          throw new Error(
            `Project section key mismatch at index ${i}: expected "${input.layoutSections[i]!.key}", got "${sections[i]!.key}"`,
          );
        }
      }

      const totalMarks =
        typeof parsed.totalMarks === 'number' && Number.isFinite(parsed.totalMarks)
          ? Math.round(parsed.totalMarks)
          : input.level === 'grade7' ? 30 : input.level === 'olevel' ? 55 : 100;

      return {
        title: parsed.title.trim().slice(0, 200),
        totalMarks,
        sections,
      };
    }, {
      maxAttempts: 3,
      baseDelayMs: 500,
    });
  }

  private async runWithRetry<T>(
    operation: () => Promise<T>,
    fallback?: () => T,
  ): Promise<T> {
    try {
      return await completeWithRetry(operation, {
        maxAttempts: 3,
        baseDelayMs: 400,
        shouldRetry: (error) => !(error instanceof ContentValidationError),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : 'Unknown error';
      this.logger.error(`[mastra.retry] exhausted error="${message}"`);
      if (error instanceof ContentValidationError && fallback) {
        this.logger.warn(`[mastra.retry] using fallback due to validation error`);
        return fallback();
      }
      if (error instanceof ContentValidationError) {
        throw error;
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

  private async completeStructuredQuizPayload(input: {
    model: string;
    maxTokens: number;
    systemPrompt: string;
    messages: ClaudeMessage[];
    includeTopicAndSubject: boolean;
    contextTag: string;
  }): Promise<{ payload: QuizOutputPayload | null; rawOutput: string }> {
    const toolName = input.includeTopicAndSubject
      ? 'return_quiz_payload_with_topic'
      : 'return_quiz_payload';

    const questionItemSchema = {
      type: 'object' as const,
      additionalProperties: false,
      required: ['type', 'text', 'explanation'],
      properties: {
        type: {
          type: 'string' as const,
          enum: [
            'multiple_choice',
            'multiple_select',
            'true_false',
            'fill_blank',
            'short_answer',
            'ordering',
            'structured',
          ],
        },
        text: { type: 'string' as const },
        options: { type: 'array' as const, items: { type: 'string' as const } },
        correctAnswer: {
          oneOf: [
            { type: 'string' as const },
            { type: 'boolean' as const },
          ],
        },
        correctAnswers: {
          type: 'array' as const,
          items: {
            oneOf: [{ type: 'string' as const }, { type: 'boolean' as const }],
          },
        },
        explanation: { type: 'string' as const },
        subtopic: { type: 'string' as const },
        parts: { type: 'array' as const, items: { type: 'object' as const } },
        totalMarks: { type: 'number' as const },
      },
    };

    const toolSchema = input.includeTopicAndSubject
      ? {
          type: 'object' as const,
          additionalProperties: false,
          required: ['topic', 'subjectName', 'questions'],
          properties: {
            topic: { type: 'string' as const },
            subjectName: { type: 'string' as const },
            questions: { type: 'array' as const, items: questionItemSchema },
          },
        }
      : {
          type: 'object' as const,
          additionalProperties: false,
          required: ['questions'],
          properties: {
            questions: { type: 'array' as const, items: questionItemSchema },
          },
        };

    const startedAt = Date.now();
    this.logger.log(
      `[mastra.completeStructuredQuizPayload] request_start context=${input.contextTag} model=${input.model} maxTokens=${input.maxTokens} messageCount=${input.messages.length}`,
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
          tools: [
            {
              name: toolName,
              description:
                'Return the quiz payload in exact structured form. Do not use free text.',
              input_schema: toolSchema,
            },
          ],
          tool_choice: { type: 'tool', name: toolName },
        }),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : 'Unknown fetch error';
      this.logger.error(
        `[mastra.completeStructuredQuizPayload] request_error context=${input.contextTag} model=${input.model} durationMs=${Date.now() - startedAt} error="${message}"`,
      );
      throw error;
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '<unavailable>');
      this.logger.error(
        `[mastra.completeStructuredQuizPayload] request_failed context=${input.contextTag} model=${input.model} status=${response.status} statusText="${response.statusText}" durationMs=${Date.now() - startedAt} body="${truncateForLog(bodyText, 3000)}"`,
      );
      throw new InternalServerErrorException('Claude structured completion failed');
    }

    const json = (await response.json()) as {
      content?: Array<
        | { type: 'text'; text?: string }
        | {
            type: 'tool_use';
            id: string;
            name: string;
            input?: Record<string, unknown>;
          }
      >;
    };

    const rawOutput = JSON.stringify(json.content ?? []);
    const toolUse = json.content?.find(
      (
        block,
      ): block is {
        type: 'tool_use';
        id: string;
        name: string;
        input?: Record<string, unknown>;
      } => block.type === 'tool_use' && block.name === toolName,
    );

    this.logger.log(
      `[mastra.completeStructuredQuizPayload] request_success context=${input.contextTag} model=${input.model} durationMs=${Date.now() - startedAt} rawChars=${rawOutput.length}`,
    );

    if (!toolUse || !toolUse.input || typeof toolUse.input !== 'object') {
      this.logRawAiOutputsOnError(
        `mastra.completeStructuredQuizPayload.${input.contextTag}.missing_tool_use`,
        [rawOutput],
      );
      return { payload: null, rawOutput };
    }

    return {
      payload: toolUse.input as unknown as QuizOutputPayload,
      rawOutput,
    };
  }

  private logRawAiOutputsOnError(contextTag: string, outputs: string[]): void {
    if (!outputs.length) {
      this.logger.error(`[${contextTag}] raw_ai_output=<none>`);
      return;
    }

    outputs.forEach((output, index) => {
      const safeOutput = output && output.trim() ? output : '<empty>';
      const chunkSize = 3500;
      if (safeOutput.length <= chunkSize) {
        this.logger.error(
          `[${contextTag}] raw_ai_output[${index + 1}][chunk=1/1]="${safeOutput}"`,
        );
        return;
      }

      const chunkCount = Math.ceil(safeOutput.length / chunkSize);
      for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = start + chunkSize;
        const chunk = safeOutput.slice(start, end);
        this.logger.error(
          `[${contextTag}] raw_ai_output[${index + 1}][chunk=${chunkIndex + 1}/${chunkCount}]="${chunk}"`,
        );
      }
    });
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

function quizMaxTokens(
  questionCount: number,
  paperType: 'paper1' | 'paper2',
  _difficulty: 'foundation' | 'standard' | 'challenging' | 'extension',
): number {
  if (paperType === 'paper2') {
    // Paper 2 generates structured questions with marking schemes and explanations — more tokens than Paper 1.
    if (questionCount >= 5) return 20000;
    return 14000;
  }
  // Paper 1: Multiple choice is more efficient.
  if (questionCount >= 15) return 10000;
  if (questionCount >= 10) return 7000;
  return 4500;
}

function stripJsonFences(text: string): string {
  const t = text.trim();
  // Strip ```json ... ``` or ``` ... ``` wrappers that Claude sometimes adds
  const fenced = t.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  if (fenced) {
    return (fenced[1] ?? '').trim();
  }
  // Fallback: extract outermost { ... } in case of leading/trailing prose
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first > 0 && last > first) {
    return t.slice(first, last + 1);
  }
  return t;
}

function isResponseTruncated(text: string): boolean {
  const t = stripJsonFences(text).trim();
  return !t.endsWith('}') && !t.endsWith(']');
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
        body: `When ${topic} clicks, everyday tasks become easier because you can explain what is happening instead of guessing. This matters in school, in exams, and in practical work where decisions depend on clear reasoning. By the end of this lesson, you should be able to describe ${topic} in plain language, spot it in a real scenario, and apply it step by step with confidence.`,
        terms: [],
      },
      {
        type: 'concept',
        heading: `Core idea of ${topic}`,
        body: `A **${topic}** model explains a specific mechanism, not a vague idea.

Every strong explanation includes:
- **Definition**: what ${topic} means in this subject.
- **Mechanism**: what changes first, what changes next, and why.
- **Constraint**: when the rule no longer applies.

### Practical reading strategy
1. Identify the main variables or entities.
2. Track how one variable affects another.
3. Test the result against one concrete scenario with real values.

Use this sequence each time and your answers stay precise, testable, and easier to revise later.`,
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
        body: `**Step 1 — Define values**
Use explicit values so each operation can be checked.

\`\`\`text
inputA = 10
inputB = 25
inputC = 100
\`\`\`

**Step 2 — Apply the rule for ${topic}**
Run the core transformation in order, without skipping intermediate states.

\`\`\`text
intermediate = rule(inputA, inputB)
finalResult = combine(intermediate, inputC)
\`\`\`

**Step 3 — Validate the result**
Check whether the final value matches the expected direction and scale. If it does not, inspect each intermediate step and verify units, assumptions, and signs.`,
        terms: [],
      },
      {
        type: 'recap',
        heading: 'Quick recap',
        body: `- ${topic} has a clear definition, a mechanism, and a limit where the rule stops working.
- You can solve ${topic} questions by identifying variables, applying the rule in sequence, and validating the output.
- Concrete values (like 10, 25, and 100) make each step auditable and easier to debug.
- Intermediate states are essential evidence; skipping them increases mistakes and weakens explanations.
- A strong final answer states both the result and the reason the result is logically consistent with the model.`,
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
  const raw = question as unknown as Record<string, unknown>;
  const rawType = pickString(raw, ['type', 'question_type']);
  const rawText = pickString(raw, ['text', 'question_text']);
  const rawSubtopic = pickString(raw, ['subtopic']);
  const rawExplanation = pickString(raw, ['explanation']);

  const rawOptions = pickStringArray(raw, ['options']);
  const rawCorrectAnswerValue = pickUnknown(raw, [
    'correctAnswer',
    'correct_answer',
    'sample_answer',
  ]);
  const rawCorrectAnswersValue = pickUnknown(raw, [
    'correctAnswers',
    'correct_answers',
    'acceptable_answers',
  ]);

  const normalizedCorrectAnswer = normalizeScalarAnswer(rawCorrectAnswerValue);
  const normalizedCorrectAnswers = normalizeArrayAnswers(rawCorrectAnswersValue);

  return {
    type: normalizeQuestionType(rawType ?? question.type),
    text: rawText ?? String(question.text ?? ''),
    options: rawOptions,
    correctAnswer: normalizedCorrectAnswer,
    correctAnswers: normalizedCorrectAnswers,
    explanation: rawExplanation,
    subtopic: rawSubtopic,
    // Preserve parts for structured questions
    ...(normalizeQuestionType(rawType ?? question.type) === 'structured' &&
    Array.isArray(raw['parts'])
      ? {
          parts: raw['parts'] as unknown[],
          totalMarks:
            typeof raw['totalMarks'] === 'number'
              ? raw['totalMarks']
              : typeof question.totalMarks === 'number'
                ? question.totalMarks
                : 0,
          correctAnswer: 'structured',
        }
      : {}),
  };
}

function pickUnknown(
  source: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    if (key in source) return source[key];
  }
  return undefined;
}

function pickString(
  source: Record<string, unknown>,
  keys: string[],
): string | undefined {
  const value = pickUnknown(source, keys);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function pickStringArray(
  source: Record<string, unknown>,
  keys: string[],
): string[] | undefined {
  const value = pickUnknown(source, keys);
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((item) => normalizeScalarAnswer(item))
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return normalized.length ? normalized : undefined;
}

function normalizeScalarAnswer(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function normalizeArrayAnswers(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((item) => normalizeScalarAnswer(item))
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return normalized.length ? normalized : undefined;
}

function isUsableGeneratedQuestion(question: GeneratedQuizQuestion): boolean {
  if (!question.text) {
    return false;
  }

  if (!question.explanation) {
    return false;
  }

  switch (question.type) {
    case 'multiple_choice': {
      if (!hasDistinctOptions(question.options, 4)) {
        return false;
      }
      if (allOptionsSharePrefix(question.options)) {
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
      if (allOptionsSharePrefix(question.options)) {
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
    case 'structured': {
      // Validation is handled by assertQuizContentValid — basic usability check here
      return Boolean(question.text) && Array.isArray(question.parts) && (question.parts as unknown[]).length > 0;
    }
    default:
      return false;
  }
}

function allOptionsSharePrefix(options: string[] | undefined): boolean {
  if (!Array.isArray(options) || options.length < 2) return false;
  const firstThreeWords = (s: string) =>
    s.trim().toLowerCase().split(/\s+/).slice(0, 3).join(' ');
  const prefix = firstThreeWords(options[0]);
  return options.every((o) => firstThreeWords(o) === prefix);
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

function normalizeQuestionKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function serializeLessonSections(sections: LessonSectionInput[]): string {
  return sections
    .map((section, index) => {
      const headingLine = section.heading ? `Heading: ${section.heading}` : null;
      const termsLine = section.terms.length > 0
        ? `Terms: ${section.terms.map((term) => `${term.term}: ${term.explanation}`).join('; ')}`
        : null;

      return [
        `Section ${index + 1}`,
        `Type: ${section.type}`,
        headingLine,
        'Body:',
        section.body,
        termsLine,
      ]
        .filter((line): line is string => Boolean(line))
        .join('\n');
    })
    .join('\n\n');
}

function normalizeQuestionType(type: string | undefined): QuizQuestionType {
  switch (type) {
    case 'multiple_choice':
    case 'multiple_select':
    case 'true_false':
    case 'fill_blank':
    case 'short_answer':
    case 'ordering':
    case 'structured':
      return type;
    default:
      return 'multiple_choice';
  }
}

class LessonSectionExtractor {
  private buffer = '';
  private inSections = false;
  private scanPos = 0;
  private depth = 0;
  private objStart = -1;
  private emittedCount = 0;
  private inString = false;
  private escape = false;

  feed(chunk: string): Array<{ index: number; json: string }> {
    this.buffer += chunk;
    const results: Array<{ index: number; json: string }> = [];

    if (!this.inSections) {
      // Support both '"sections":[' and '"sections": ['
      for (const needle of ['"sections":[', '"sections": [']) {
        const idx = this.buffer.indexOf(needle);
        if (idx >= 0) {
          this.inSections = true;
          this.scanPos = idx + needle.length;
          break;
        }
      }
      if (!this.inSections) return results;
    }

    for (let i = this.scanPos; i < this.buffer.length; i++) {
      const c = this.buffer[i]!;

      if (this.escape) {
        this.escape = false;
        continue;
      }

      if (c === '\\' && this.inString) {
        this.escape = true;
        continue;
      }

      if (c === '"') {
        this.inString = !this.inString;
        continue;
      }

      if (this.inString) continue;

      if (c === '{') {
        if (this.depth === 0) {
          this.objStart = i;
        }
        this.depth++;
      } else if (c === '}') {
        this.depth--;
        if (this.depth === 0 && this.objStart >= 0) {
          results.push({
            index: this.emittedCount++,
            json: this.buffer.slice(this.objStart, i + 1),
          });
          this.objStart = -1;
        }
      }
    }

    this.scanPos = this.buffer.length;
    return results;
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
    return JSON.parse(stripJsonFences(value)) as T;
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

function parseQuizPayloadFromModelText(
  value: string,
): { topic?: string; subjectName?: string; questions?: GeneratedQuizQuestion[] } | null {
  const candidates = buildJsonCandidates(value);

  for (const candidate of candidates) {
    const parsed = safeJsonParse<{
      topic?: string;
      subjectName?: string;
      questions?: GeneratedQuizQuestion[];
    }>(candidate);

    if (parsed && Array.isArray(parsed.questions)) {
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
