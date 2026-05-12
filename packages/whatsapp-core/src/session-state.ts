/**
 * WhatsApp session state machine.
 *
 * Every WhatsApp phone number has exactly one session at any time.
 * States flow like this:
 *
 *   UNAUTHENTICATED
 *     └─ (user sends any message)           → AWAITING_EMAIL
 *
 *   AWAITING_EMAIL
 *     ├─ (email found in DB)                → AWAITING_OTP
 *     └─ (email NOT found in DB)            → AWAITING_SIGNUP_CONFIRM
 *
 *   AWAITING_SIGNUP_CONFIRM
 *     ├─ YES                                → AWAITING_OTP
 *     └─ NO                                 → UNAUTHENTICATED
 *
 *   AWAITING_OTP
 *     └─ (valid OTP entered)                → ONBOARDING_NAME  (new user)
 *                                           → IDLE             (returning user)
 *
 *   ONBOARDING_NAME
 *     └─ (name provided)                    → ONBOARDING_SUBJECTS
 *
 *   ONBOARDING_SUBJECTS
 *     └─ (subjects confirmed)               → IDLE
 *
 *   IDLE
 *     ├─ START_LESSON intent                → LESSON_GENERATING
 *     ├─ START_QUIZ intent                  → QUIZ_GENERATING
 *     ├─ START_PROJECT intent               → PROJECT_WIZARD
 *     └─ anything else                      → (chat flow, stays IDLE)
 *
 *   LESSON_GENERATING → LESSON_READING → IDLE
 *   QUIZ_GENERATING   → QUIZ_ACTIVE    → IDLE
 *   PROJECT_WIZARD    → PROJECT_GENERATING → IDLE
 */
export enum WhatsAppState {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  AWAITING_EMAIL = 'AWAITING_EMAIL',
  AWAITING_OTP = 'AWAITING_OTP',
  AWAITING_SIGNUP_CONFIRM = 'AWAITING_SIGNUP_CONFIRM',
  ONBOARDING_NAME = 'ONBOARDING_NAME',
  ONBOARDING_SUBJECTS = 'ONBOARDING_SUBJECTS',
  IDLE = 'IDLE',
  LESSON_GENERATING = 'LESSON_GENERATING',
  LESSON_READING = 'LESSON_READING',
  QUIZ_GENERATING = 'QUIZ_GENERATING',
  QUIZ_ACTIVE = 'QUIZ_ACTIVE',
  PROJECT_WIZARD = 'PROJECT_WIZARD',
  PROJECT_GENERATING = 'PROJECT_GENERATING',
}

// ─── State data shapes ───────────────────────────────────────────────────────
// The `stateData` JSON column stores whatever in-progress context each state
// needs.  Every shape is optional so callers don't need to cast aggressively.

export interface AuthStateData {
  pendingEmail?: string;
  /** true if this was a sign-up (no prior account) */
  isNewUser?: boolean;
}

export interface LessonStateData {
  lessonId?: string;
  topic?: string;
  idempotencyKey?: string;
  /** sections already sent (used during LESSON_READING) */
  sectionsSent?: number;
}

export interface QuizStateData {
  quizId?: string;
  topic?: string;
  idempotencyKey?: string;
  totalQuestions?: number;
  currentIndex?: number;
}

export interface ProjectWizardStateData {
  step?: number;
  subject?: string;
  level?: 'grade7' | 'olevel' | 'alevel';
  topicHint?: string;
  studentName?: string;
  schoolName?: string;
  className?: string;
  community?: string;
  problemStatement?: string;
  availableResources?: string;
  draftId?: string;
  projectId?: string;
  idempotencyKey?: string;
}

export interface ChatStateData {
  conversationId?: string;
}

export type WhatsAppStateData =
  | AuthStateData
  | LessonStateData
  | QuizStateData
  | ProjectWizardStateData
  | ChatStateData
  | Record<string, unknown>;
