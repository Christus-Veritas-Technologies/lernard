import { BadRequestException } from '@nestjs/common';
import type { MastraService } from '../../mastra/mastra.service';

export class ContentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentValidationError';
  }
}

interface GeneratedQuizQuestionLike {
  type?: unknown;
  text?: unknown;
  options?: unknown;
  correctAnswer?: unknown;
  correctAnswers?: unknown;
  explanation?: unknown;
  parts?: unknown;
  totalMarks?: unknown;
}

interface GeneratedLessonSectionLike {
  type?: unknown;
  heading?: unknown;
  body?: unknown;
}

interface GeneratedLessonLike {
  topic?: unknown;
  sections?: unknown;
}

const MIN_LESSON_BODY_WORDS = 60;
const MIN_QUIZ_QUESTION_WORDS = 15;
const PLACEHOLDER_PATTERN =
  /^which\s+(statement|option)\s+(best\s+)?describes/i;

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

export async function validateGeneratedContent(
  content: unknown,
  _mastraService: MastraService,
): Promise<void> {
  if (content === null || content === undefined) {
    throw new BadRequestException('Generated content is empty');
  }

  if (typeof content === 'string' && content.trim().length === 0) {
    throw new BadRequestException('Generated content is blank');
  }

  if (typeof content === 'object') {
    const serialized = JSON.stringify(content);
    if (serialized === '{}' || serialized === '[]') {
      throw new BadRequestException('Generated content is incomplete');
    }

    try {
      validateQuizContent(content);
      validateLessonContent(content);
    } catch (error) {
      if (error instanceof ContentValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}

export function assertQuizContentValid(content: unknown): void {
  validateQuizContent(content);
}

export function assertLessonContentValid(content: unknown): void {
  validateLessonContent(content);
}

function validateQuizContent(content: unknown): void {
  if (!isQuizPayload(content)) {
    return;
  }

  if (content.questions.length === 0) {
    throw new ContentValidationError('Generated quiz is missing questions');
  }

  const seenTexts = new Set<string>();

  for (const question of content.questions) {
    const text = typeof question.text === 'string' ? question.text.trim() : '';
    if (!text) {
      throw new ContentValidationError(
        'Generated quiz contains a blank question',
      );
    }

    const isStructured = typeof question.type === 'string' && question.type === 'structured';

    if (!isStructured && countWords(text) < MIN_QUIZ_QUESTION_WORDS) {
      throw new ContentValidationError(
        `Generated quiz question is too short (under ${MIN_QUIZ_QUESTION_WORDS} words): ${truncate(text)}`,
      );
    }

    if (PLACEHOLDER_PATTERN.test(text) || HARD_REJECT_PATTERNS.some((p) => p.test(text))) {
      throw new ContentValidationError(
        `Generated quiz question uses a placeholder pattern: ${truncate(text)}`,
      );
    }

    const key = text.toLowerCase().replace(/\s+/g, ' ');
    if (seenTexts.has(key)) {
      throw new ContentValidationError(
        'Generated quiz contains duplicate questions',
      );
    }
    seenTexts.add(key);

    if (isPlaceholderQuestion(text, question.options)) {
      throw new ContentValidationError(
        'Generated quiz contains placeholder questions',
      );
    }

    validateQuestionStructure(question);
  }
}

function validateLessonContent(content: unknown): void {
  if (!isLessonPayload(content)) return;

  const sections = content.sections.filter(
    isObject,
  ) as GeneratedLessonSectionLike[];
  if (sections.length < 4) {
    throw new ContentValidationError(
      'Generated lesson must contain at least 4 sections',
    );
  }

  const topic = typeof content.topic === 'string' ? content.topic.trim() : '';

  for (const section of sections) {
    const body = typeof section.body === 'string' ? section.body.trim() : '';
    if (!body) {
      throw new ContentValidationError(
        'Generated lesson contains a blank section',
      );
    }

    if (countWords(body) < MIN_LESSON_BODY_WORDS) {
      throw new ContentValidationError(
        `Generated lesson section is too short (under ${MIN_LESSON_BODY_WORDS} words)`,
      );
    }

    if (isMetaSentence(body)) {
      throw new ContentValidationError(
        'Generated lesson section reads like a meta-description rather than real content',
      );
    }
  }

  const hook = sections.find((s) => s.type === 'hook') ?? sections[0];
  const hookBody = typeof hook?.body === 'string' ? hook.body : '';
  if (topic && !hookBody.toLowerCase().includes(topic.toLowerCase())) {
    throw new ContentValidationError(
      'Generated lesson hook does not mention the topic by name',
    );
  }

  const examples = sections.find((s) => s.type === 'examples');
  if (examples) {
    const examplesBody = typeof examples.body === 'string' ? examples.body : '';
    if (!hasConcreteExampleSignal(examplesBody)) {
      throw new ContentValidationError(
        'Generated lesson examples section lacks concrete detail (no numbers or specific names)',
      );
    }
  }
}

function validateQuestionStructure(question: GeneratedQuizQuestionLike): void {
  const type = typeof question.type === 'string' ? question.type : '';
  const options = Array.isArray(question.options)
    ? question.options
        .filter((option): option is string => typeof option === 'string')
        .map((option) => option.trim())
        .filter(Boolean)
    : [];
  const correctAnswer =
    typeof question.correctAnswer === 'string'
      ? question.correctAnswer.trim()
      : '';
  const correctAnswers = Array.isArray(question.correctAnswers)
    ? question.correctAnswers
        .filter((answer): answer is string => typeof answer === 'string')
        .map((answer) => answer.trim())
        .filter(Boolean)
    : [];
  const explanation =
    typeof question.explanation === 'string' ? question.explanation.trim() : '';

  if (type !== 'structured') {
    if (!explanation || countWords(explanation) < 10) {
      throw new ContentValidationError(
        'Quiz questions require explanations with at least 10 words',
      );
    }

    if (!hasExplanationJustificationSignal(explanation)) {
      throw new ContentValidationError(
        'Quiz explanations must clearly justify why the answer is correct',
      );
    }
  }

  switch (type) {
    case 'multiple_choice':
      if (
        options.length !== 4 ||
        new Set(options.map((option) => option.toLowerCase())).size !== 4
      ) {
        throw new ContentValidationError(
          'Multiple choice questions require 4 distinct options',
        );
      }
      if (
        !correctAnswer ||
        !options.some(
          (option) => option.toLowerCase() === correctAnswer.toLowerCase(),
        )
      ) {
        throw new ContentValidationError(
          'Multiple choice questions require a correct answer from the options',
        );
      }

      const mcCorrectMentioned = explanation
        .toLowerCase()
        .includes(correctAnswer.toLowerCase());
      const mcDistractors = options.filter(
        (option) => option.toLowerCase() !== correctAnswer.toLowerCase(),
      );
      const mcDistractorMentioned = mcDistractors.some((option) =>
        explanation.toLowerCase().includes(option.toLowerCase()),
      );
      if (!mcCorrectMentioned || !mcDistractorMentioned) {
        throw new ContentValidationError(
          'Multiple choice explanations must mention the correct option and at least one incorrect option',
        );
      }
      return;
    case 'multiple_select':
      if (
        options.length < 4 ||
        new Set(options.map((option) => option.toLowerCase())).size !==
          options.length
      ) {
        throw new ContentValidationError(
          'Multiple select questions require distinct options',
        );
      }
      if (
        correctAnswers.length < 2 ||
        !correctAnswers.every((answer) =>
          options.some(
            (option) => option.toLowerCase() === answer.toLowerCase(),
          ),
        )
      ) {
        throw new ContentValidationError(
          'Multiple select questions require 2 or more correct answers from the options',
        );
      }

      const msMentioned = correctAnswers.filter((answer) =>
        explanation.toLowerCase().includes(answer.toLowerCase()),
      ).length;
      if (msMentioned < Math.min(2, correctAnswers.length)) {
        throw new ContentValidationError(
          'Multiple select explanations must reference at least two correct answers',
        );
      }
      return;
    case 'true_false':
      if (correctAnswer !== 'true' && correctAnswer !== 'false') {
        throw new ContentValidationError(
          'True/false questions require correctAnswer to be true or false',
        );
      }

      if (!explanation.toLowerCase().includes(correctAnswer)) {
        throw new ContentValidationError(
          'True/false explanations must explicitly state why the statement is true or false',
        );
      }
      return;
    case 'fill_blank':
    case 'short_answer':
    case 'ordering':
      if (!correctAnswer) {
        throw new ContentValidationError(
          'Free-response questions require a correct answer',
        );
      }
      return;
    case 'structured': {
      const parts = Array.isArray((question as { parts?: unknown }).parts)
        ? (question as { parts: unknown[] }).parts
        : null;
      if (!parts || parts.length === 0) {
        throw new ContentValidationError(
          'Structured questions require at least one part',
        );
      }
      for (const part of parts) {
        if (!isObject(part)) {
          throw new ContentValidationError(
            'Structured question part must be an object',
          );
        }
        const p = part as Record<string, unknown>;
        if (!p['label'] || typeof p['label'] !== 'string') {
          throw new ContentValidationError(
            'Structured question part is missing a label',
          );
        }
        if (!p['text'] || typeof p['text'] !== 'string' || !String(p['text']).trim()) {
          throw new ContentValidationError(
            `Structured question part "${p['label']}" has blank text`,
          );
        }
        if (typeof p['marks'] !== 'number' || p['marks'] <= 0) {
          throw new ContentValidationError(
            `Structured question part "${p['label']}" has invalid marks`,
          );
        }
        const mp = Array.isArray(p['markingPoints']) ? p['markingPoints'] : [];
        if (mp.length === 0) {
          throw new ContentValidationError(
            `Structured question part "${p['label']}" is missing marking points`,
          );
        }
        if (!p['modelAnswer'] || typeof p['modelAnswer'] !== 'string' || !String(p['modelAnswer']).trim()) {
          throw new ContentValidationError(
            `Structured question part "${p['label']}" is missing a model answer`,
          );
        }
      }
      const totalMarks = (question as { totalMarks?: unknown }).totalMarks;
      if (typeof totalMarks !== 'number' || totalMarks <= 0) {
        throw new ContentValidationError(
          'Structured questions require a positive totalMarks value',
        );
      }
      return;
    }
    default:
      throw new ContentValidationError(
        'Generated quiz contains an unsupported question type',
      );
  }
}

function isPlaceholderQuestion(text: string, options: unknown): boolean {
  const normalizedText = text.trim().toLowerCase();
  const normalizedOptions = Array.isArray(options)
    ? options
        .filter((option): option is string => typeof option === 'string')
        .map((option) => option.trim().toLowerCase())
    : [];

  return (
    normalizedText.startsWith('which statement best describes') ||
    /^\d+\./.test(normalizedText) ||
    normalizedOptions.join('|') ===
      'definition a|definition b|definition c|definition d'
  );
}

function isMetaSentence(body: string): boolean {
  const lower = body.trim().toLowerCase();
  return (
    lower.startsWith('this section will') ||
    lower.startsWith('in this section we will') ||
    /\bcan be (understood|broken down) by breaking (it|them) into smaller (steps|ideas|patterns)\b/.test(
      lower,
    )
  );
}

function hasConcreteExampleSignal(body: string): boolean {
  if (/\d/.test(body)) return true;
  // Look for a capitalised proper-noun-like token of at least 3 characters,
  // ignoring sentence starts. Two or more of these strongly suggests a real scenario.
  const properNouns = body.match(/(?<![.!?]\s)\b[A-Z][a-zA-Z]{2,}\b/g) ?? [];
  return properNouns.length >= 2;
}

function isQuizPayload(
  content: unknown,
): content is { questions: GeneratedQuizQuestionLike[] } {
  return Boolean(
    content &&
    typeof content === 'object' &&
    'questions' in content &&
    Array.isArray((content as { questions?: unknown }).questions),
  );
}

function isLessonPayload(
  content: unknown,
): content is GeneratedLessonLike & { sections: unknown[] } {
  return Boolean(
    content &&
    typeof content === 'object' &&
    'sections' in content &&
    Array.isArray((content as { sections?: unknown }).sections),
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasExplanationJustificationSignal(text: string): boolean {
  return /\b(because|therefore|which means|so that|this is why|since|due to|as a result|allows|prevents|causes|ensures|keeps|leads to|results in)\b/i.test(
    text,
  );
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function truncate(text: string): string {
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}
