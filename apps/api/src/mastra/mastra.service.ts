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

  async generateQuiz(input: {
    topic: string;
    questionCount: number;
    subjectName?: string;
    mode: 'guide' | 'companion';
    style?: 'standard' | 'zimsec';
    studentContext: StudentContext;
    lessonSections?: LessonSectionInput[];
    confidenceRating?: number | null;
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
      style: input.style,
      lessonSections: input.lessonSections,
      confidenceRating: input.confidenceRating,
    });

    return this.runWithRetry(async () => {
      let maxTokens = quizMaxTokens(input.questionCount, input.style);
      let text = '';

      for (let attempt = 1; attempt <= 3; attempt++) {
        text = await this.completeText({
          model: SONNET_MODEL,
          maxTokens,
          systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        });

        text = stripJsonFences(text);

        if (!isResponseTruncated(text)) {
          break;
        }

        if (attempt === 3) {
          throw new ContentValidationError(
            'Quiz response was truncated — retry',
          );
        }

        maxTokens = Math.min(Math.round(maxTokens * 1.6), 28000);
      }

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

  async generateQuizFromFile(input: {
    buffer: Buffer;
    kind: 'image' | 'pdf';
    mimeType: string;
    questionCount: number;
    mode: 'guide' | 'companion';
    style?: 'standard' | 'zimsec';
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

    const systemPrompt = buildSystemPrompt(input.studentContext, {
      kind: 'quiz',
      topic: 'the provided content',
      mode: input.mode,
      questionCount: input.questionCount,
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

    const textBlock: ClaudeContentBlock = {
      type: 'text',
      text: [
        `Generate exactly ${input.questionCount} quiz questions based on the content of this ${input.kind === 'pdf' ? 'document' : 'image'}.`,
        'Also determine a concise topic name and subject area from the content.',
        'Return only valid JSON in this exact shape:',
        '{"topic":"<short topic name>","subjectName":"<subject>","questions":[...]}',
        'Questions must follow the same format as a standard Lernard quiz.',
      ].join('\n'),
    };

    return this.runWithRetry(async () => {
      let maxTokens = quizMaxTokens(input.questionCount, input.style);
      let text = '';

      for (let attempt = 1; attempt <= 3; attempt++) {
        text = await this.completeText({
          model: SONNET_MODEL,
          maxTokens,
          systemPrompt,
          messages: [{ role: 'user', content: [fileBlock, textBlock] }],
        });

        text = stripJsonFences(text);

        if (!isResponseTruncated(text)) {
          break;
        }

        if (attempt === 3) {
          throw new ContentValidationError(
            'Quiz-from-file response was truncated — retry',
          );
        }

        maxTokens = Math.min(Math.round(maxTokens * 1.6), 28000);
      }

      const parsed = safeJsonParse<{
        topic?: string;
        subjectName?: string;
        questions?: GeneratedQuizQuestion[];
      }>(text);
      if (!parsed || !Array.isArray(parsed.questions)) {
        throw new ContentValidationError(
          'Quiz-from-file generation returned malformed JSON',
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

      if (unique.length < input.questionCount) {
        throw new ContentValidationError(
          `Quiz-from-file returned ${unique.length} usable questions, expected ${input.questionCount}`,
        );
      }

      const finalQuestions = unique.slice(0, input.questionCount);
      assertQuizContentValid({ questions: finalQuestions });

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

  private async runWithRetry<T>(
    operation: () => Promise<T>,
    fallback?: () => T,
  ): Promise<T> {
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
      if (error instanceof ContentValidationError && fallback) {
        this.logger.warn(`[mastra.retry] using fallback due to validation error`);
        return fallback();
      }
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

function quizMaxTokens(questionCount: number, style?: 'standard' | 'zimsec'): number {
  if (style === 'zimsec') {
    // ZIMSEC generates 2–5 structured questions, each with 3–6 sub-parts, marking points,
    // model answers, and explanations — far more tokens than standard questions.
    if (questionCount >= 5) return 20000;
    return 14000;
  }
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
  const t = text.trim();
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
    subtopic:
      typeof question.subtopic === 'string'
        ? question.subtopic.trim()
        : undefined,
    // Preserve parts for structured questions
    ...(question.type === 'structured' && Array.isArray(question.parts)
      ? { parts: question.parts, totalMarks: question.totalMarks ?? 0, correctAnswer: 'structured' }
      : {}),
  };
}

function isUsableGeneratedQuestion(question: GeneratedQuizQuestion): boolean {
  if (!question.text || isGenericQuestionText(question.text)) {
    return false;
  }

  if (!question.explanation || countWords(question.explanation) < 10) {
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

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
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

const HARD_REJECT_PATTERNS = [
  /which\s+(statement|option)\s+(best\s+)?describes/i,
  /gives\s+the\s+(clearest|most\s+accurate|best)\s+summary/i,
  /becomes\s+easier\s+when\s+you\s+break\s+it\s+into/i,
  /helping\s+you\s+practi[cs]e\s+___/i,
  /can\s+be\s+understood\s+step\s+by\s+step/i,
  /is\s+(only\s+)?a\s+random\s+guess/i,
  /cannot\s+be\s+explained\s+or\s+practi[cs]ed/i,
  /is\s+unrelated\s+to\s+problem.solving/i,
];

function isGenericQuestionText(text: string): boolean {
  const normalized = text.trim().toLowerCase();

  if (normalized.length < 12) return true;
  if (countWords(normalized) < 6) return true;
  if (/^\d+\./.test(normalized)) return true;
  if (normalized.includes('definition a') || normalized.includes('definition b')) return true;

  return HARD_REJECT_PATTERNS.some((pattern) => pattern.test(text));
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
    case 'structured':
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
