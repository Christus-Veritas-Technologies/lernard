// Enums
export {
  Role,
  Plan,
  LearningMode,
  AgeGroup,
  StrengthLevel,
  LearningGoal,
  SessionDepth,
  QuestionType,
  Appearance,
} from './enums'

// Entities
export type { User, Student, Guardian, GuestUser, GuardianChild, UserSubject } from './entities/user'
export type { Lesson, LessonSection, SectionCheckResult } from './entities/lesson'
export type { Quiz, QuizQuestion, QuizScore } from './entities/quiz'
export type { Conversation, ChatMessage, ChatSlotType } from './entities/chat'
export type { SubjectProgress, TopicStrength, SkillEntry, SessionRecord } from './entities/progress'
export type { UserSettings, CompanionControls } from './entities/settings'

// Contracts
export type {
  Permission,
  ScopedPermission,
  SlotAssignments,
  SlotContent,
  PagePayload,
} from './contracts/page-payload'

// Payloads
export type { HomeContent, RecentSession } from './payloads/home'
export type { LearnContent, LearnRecommendation, LearnDraft } from './payloads/learn'
export type { LessonContent, PostLessonContent } from './payloads/lesson'
export type { QuizContent, QuizResultsContent } from './payloads/quiz'
export type { ChatContent, ConversationContent } from './payloads/chat'
export type { ProgressContent, SubjectDetailContent, SessionHistoryContent } from './payloads/progress'
export type { SettingsContent } from './payloads/settings'
export type {
  GuardianDashboardContent,
  GuardianSummary,
  PendingInvite,
  GuardianChildOverview,
  ChildProfileContent,
  ChildCompanionContent,
} from './payloads/guardian'
export type { AuthResponse, AuthUser, RegisterPayload, LoginPayload } from './payloads/auth'
export type {
  AccountTypePayload,
  ProfileSetupPayload,
  FirstLookQuestion,
  FirstLookSubmission,
} from './payloads/onboarding'
