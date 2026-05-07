import { BadRequestException } from '@nestjs/common';
import type { MastraService } from '../../mastra/mastra.service';

interface GeneratedQuizQuestionLike {
  type?: unknown;
  text?: unknown;
  options?: unknown;
  correctAnswer?: unknown;
  correctAnswers?: unknown;
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

    validateQuizContent(content);
  }
}

function validateQuizContent(content: unknown): void {
  if (!isQuizPayload(content)) {
    return;
  }

  if (content.questions.length === 0) {
    throw new BadRequestException('Generated quiz is missing questions');
  }

  const seenTexts = new Set<string>();

  for (const question of content.questions) {
    const text = typeof question.text === 'string' ? question.text.trim() : '';
    if (!text) {
      throw new BadRequestException('Generated quiz contains a blank question');
    }

    const key = text.toLowerCase().replace(/\s+/g, ' ');
    if (seenTexts.has(key)) {
      throw new BadRequestException('Generated quiz contains duplicate questions');
    }
    seenTexts.add(key);

    if (isPlaceholderQuestion(text, question.options)) {
      throw new BadRequestException('Generated quiz contains placeholder questions');
    }

    validateQuestionStructure(question);
  }
}

function validateQuestionStructure(question: GeneratedQuizQuestionLike): void {
  const type = typeof question.type === 'string' ? question.type : '';
  const options = Array.isArray(question.options)
    ? question.options.filter((option): option is string => typeof option === 'string').map((option) => option.trim()).filter(Boolean)
    : [];
  const correctAnswer = typeof question.correctAnswer === 'string' ? question.correctAnswer.trim() : '';
  const correctAnswers = Array.isArray(question.correctAnswers)
    ? question.correctAnswers.filter((answer): answer is string => typeof answer === 'string').map((answer) => answer.trim()).filter(Boolean)
    : [];

  switch (type) {
    case 'multiple_choice':
      if (options.length !== 4 || new Set(options.map((option) => option.toLowerCase())).size !== 4) {
        throw new BadRequestException('Multiple choice questions require 4 distinct options');
      }
      if (!correctAnswer || !options.some((option) => option.toLowerCase() === correctAnswer.toLowerCase())) {
        throw new BadRequestException('Multiple choice questions require a correct answer from the options');
      }
      return;
    case 'multiple_select':
      if (options.length < 4 || new Set(options.map((option) => option.toLowerCase())).size !== options.length) {
        throw new BadRequestException('Multiple select questions require distinct options');
      }
      if (correctAnswers.length < 2 || !correctAnswers.every((answer) => options.some((option) => option.toLowerCase() === answer.toLowerCase()))) {
        throw new BadRequestException('Multiple select questions require 2 or more correct answers from the options');
      }
      return;
    case 'true_false':
      if (correctAnswer !== 'true' && correctAnswer !== 'false') {
        throw new BadRequestException('True/false questions require correctAnswer to be true or false');
      }
      return;
    case 'fill_blank':
    case 'short_answer':
    case 'ordering':
      if (!correctAnswer) {
        throw new BadRequestException('Free-response questions require a correct answer');
      }
      return;
    default:
      throw new BadRequestException('Generated quiz contains an unsupported question type');
  }
}

function isPlaceholderQuestion(text: string, options: unknown): boolean {
  const normalizedText = text.trim().toLowerCase();
  const normalizedOptions = Array.isArray(options)
    ? options.filter((option): option is string => typeof option === 'string').map((option) => option.trim().toLowerCase())
    : [];

  return normalizedText.startsWith('which statement best describes')
    || /^\d+\./.test(normalizedText)
    || normalizedOptions.join('|') === 'definition a|definition b|definition c|definition d';
}

function isQuizPayload(content: unknown): content is { questions: GeneratedQuizQuestionLike[] } {
  return Boolean(
    content
    && typeof content === 'object'
    && 'questions' in content
    && Array.isArray((content as { questions?: unknown }).questions),
  );
}
