/**
 * Intent classification for incoming WhatsApp messages.
 *
 * The IntentService uses Claude Haiku to map any free-text user message
 * into one of these intents.  Unknown / ambiguous messages fall back to CHAT.
 */
export enum LernardIntent {
  /** General question / conversation — route to chat flow */
  CHAT = 'CHAT',
  /** "Teach me about X", "Lesson on X", "Explain X" */
  START_LESSON = 'START_LESSON',
  /** "Quiz me on X", "Test me", "Practice questions" */
  START_QUIZ = 'START_QUIZ',
  /** "Create a project", "I need a project on X" */
  START_PROJECT = 'START_PROJECT',
  /** "My progress", "How am I doing", "Stats" */
  VIEW_PROGRESS = 'VIEW_PROGRESS',
  /** "What plan am I on", "My subscription" */
  VIEW_PLAN = 'VIEW_PLAN',
  /** "Upgrade", "Get more lessons", "Buy a plan" */
  UPGRADE_PLAN = 'UPGRADE_PLAN',
  /** "Menu", "Help", "Options", "What can you do" */
  MENU = 'MENU',
  /** "Cancel", "Stop", "Never mind", "Quit" */
  CANCEL = 'CANCEL',
  /** "Yes", "Yeah", "Yep", "Sure", "Okay" */
  YES_CONFIRM = 'YES_CONFIRM',
  /** "No", "Nope", "Don't", "Nah" */
  NO_CONFIRM = 'NO_CONFIRM',
  /** A, B, C, D or any direct answer to a quiz question */
  ANSWER_SUBMISSION = 'ANSWER_SUBMISSION',
  /** Cannot be classified */
  UNKNOWN = 'UNKNOWN',
}

// ─── Intent payload types ────────────────────────────────────────────────────

export interface StartLessonPayload {
  intent: LernardIntent.START_LESSON;
  topic: string;
  subject?: string;
  depth?: 'quick' | 'standard' | 'deep';
}

export interface StartQuizPayload {
  intent: LernardIntent.START_QUIZ;
  topic: string;
  subject?: string;
  difficulty?: 'foundation' | 'standard' | 'challenging' | 'extension';
  questionCount?: number;
}

export interface StartProjectPayload {
  intent: LernardIntent.START_PROJECT;
  subject?: string;
  topicHint?: string;
  level?: 'grade7' | 'olevel' | 'alevel';
}

export interface AnswerPayload {
  intent: LernardIntent.ANSWER_SUBMISSION;
  answer: string;
}

export interface SimplePayload {
  intent: Exclude<
    LernardIntent,
    | LernardIntent.START_LESSON
    | LernardIntent.START_QUIZ
    | LernardIntent.START_PROJECT
    | LernardIntent.ANSWER_SUBMISSION
  >;
}

export type IntentPayload =
  | StartLessonPayload
  | StartQuizPayload
  | StartProjectPayload
  | AnswerPayload
  | SimplePayload;

/**
 * The JSON structure that Claude Haiku must return when classifying a message.
 * Haiku is prompted to return exactly this shape.
 */
export interface ClassificationResult {
  intent: LernardIntent;
  topic?: string;
  subject?: string;
  depth?: 'quick' | 'standard' | 'deep';
  difficulty?: 'foundation' | 'standard' | 'challenging' | 'extension';
  questionCount?: number;
  level?: 'grade7' | 'olevel' | 'alevel';
  answer?: string;
}
