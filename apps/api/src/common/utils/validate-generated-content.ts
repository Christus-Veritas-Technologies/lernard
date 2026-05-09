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

export function assertQuizContentValid(
  content: unknown,
  options?: {
    paperType?: 'paper1' | 'paper2';
    difficulty?: 'foundation' | 'standard' | 'challenging' | 'extension';
  },
): void {
  validateQuizContent(content);
  if (
    options?.paperType &&
    options?.difficulty &&
    isQuizPayload(content)
  ) {
    validateQuestionDistribution(content.questions, options.paperType, options.difficulty);
  }
}

export function validateQuestionDistributionExport(
  questions: GeneratedQuizQuestionLike[],
  paperType: 'paper1' | 'paper2',
  difficulty: 'foundation' | 'standard' | 'challenging' | 'extension',
): void {
  return validateQuestionDistribution(questions, paperType, difficulty);
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

    const key = text.toLowerCase().replace(/\s+/g, ' ');
    if (seenTexts.has(key)) {
      throw new ContentValidationError(
        'Generated quiz contains duplicate questions',
      );
    }
    seenTexts.add(key);

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
    if (!explanation) {
      throw new ContentValidationError(
        'Quiz questions require a non-empty explanation',
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

      return;
    case 'true_false':
      if (correctAnswer !== 'true' && correctAnswer !== 'false') {
        throw new ContentValidationError(
          'True/false questions require correctAnswer to be true or false',
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

function validateQuestionDistribution(
  questions: GeneratedQuizQuestionLike[],
  paperType: 'paper1' | 'paper2',
  difficulty: 'foundation' | 'standard' | 'challenging' | 'extension',
): void {
  if (paperType === 'paper2') {
    if (!questions.every((question) => question.type === 'structured')) {
      throw new ContentValidationError(
        'Paper 2 quizzes must contain only structured questions',
      );
    }
    return;
  }

  const totalQuestions = questions.length;
  const expectedByDifficulty: Record<
    'foundation' | 'standard' | 'challenging' | 'extension',
    Record<number, { multiple_choice: number; true_false: number; multiple_select: number }>
  > = {
    foundation: {
      5: { multiple_choice: 3, true_false: 1, multiple_select: 1 },
      10: { multiple_choice: 7, true_false: 2, multiple_select: 1 },
      15: { multiple_choice: 10, true_false: 3, multiple_select: 2 },
      20: { multiple_choice: 14, true_false: 4, multiple_select: 2 },
    },
    standard: {
      5: { multiple_choice: 3, true_false: 1, multiple_select: 1 },
      10: { multiple_choice: 6, true_false: 2, multiple_select: 2 },
      15: { multiple_choice: 9, true_false: 3, multiple_select: 3 },
      20: { multiple_choice: 12, true_false: 4, multiple_select: 4 },
    },
    challenging: {
      5: { multiple_choice: 2, true_false: 1, multiple_select: 2 },
      10: { multiple_choice: 5, true_false: 2, multiple_select: 3 },
      15: { multiple_choice: 7, true_false: 3, multiple_select: 5 },
      20: { multiple_choice: 10, true_false: 4, multiple_select: 6 },
    },
    extension: {
      5: { multiple_choice: 2, true_false: 1, multiple_select: 2 },
      10: { multiple_choice: 4, true_false: 2, multiple_select: 4 },
      15: { multiple_choice: 6, true_false: 3, multiple_select: 6 },
      20: { multiple_choice: 8, true_false: 4, multiple_select: 8 },
    },
  };

  const expected = expectedByDifficulty[difficulty][totalQuestions];
  if (!expected) {
    return;
  }

  const actual = {
    multiple_choice: 0,
    true_false: 0,
    multiple_select: 0,
  };

  for (const question of questions) {
    const type = typeof question.type === 'string' ? question.type : '';
    if (type === 'multiple_choice') actual.multiple_choice += 1;
    if (type === 'true_false') actual.true_false += 1;
    if (type === 'multiple_select') actual.multiple_select += 1;
  }

  const mismatches = Object.entries(expected).filter(
    ([type, expectedCount]) => actual[type as keyof typeof actual] !== expectedCount,
  );

  if (mismatches.length > 0) {
    const expectedSummary = `multiple_choice=${expected.multiple_choice}, true_false=${expected.true_false}, multiple_select=${expected.multiple_select}`;
    const actualSummary = `multiple_choice=${actual.multiple_choice}, true_false=${actual.true_false}, multiple_select=${actual.multiple_select}`;
    throw new ContentValidationError(
      `Paper 1 ${difficulty} distribution mismatch. Expected ${expectedSummary}; got ${actualSummary}`,
    );
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

