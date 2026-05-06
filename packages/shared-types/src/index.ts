// Enums
export {
  Role,
  Plan,
  LearningMode,
  AgeGroup,
  StrengthLevel,
  LearningGoal,
  SessionDepth,
  Appearance,
} from './enums'

// Entities
export type { User, Student, Guardian, GuestUser, GuardianChild, UserSubject } from './entities/user'
export type { SubjectProgress, TopicStrength, SkillEntry } from './entities/progress'
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
export type {
  HomeContent,
  StrengthBreakdown,
  TopicSummary,
  SubjectTopicBreakdown,
  DayActivity,
  RecentSession,
} from './payloads/home'
export type {
  ProgressContent,
  SubjectDetailContent,
  HistorySessionItem,
  PaginatedHistoryResponse,
} from './payloads/progress'
export type {
  SettingsContent,
  SettingsViewerSummary,
  GuardianManagedChildSettings,
  StudentSettingsContent,
  GuardianSettingsContent,
} from './payloads/settings'
export type { LessonContent, LessonSection, LessonTermDefinition, PostLessonResult } from './payloads/lessons'
export type { QuizQuestionType, QuizQuestion, QuizContent, QuizQuestionReview, QuizCompletionResult } from './payloads/quizzes'
export type {
  ConversationListItem,
  ChatAttachment,
  ChatAttachmentInput,
  ChatConversationDetail,
  ChatConversationMessage,
  ChatLessonAttachmentOption,
  ChatMessageBlock,
  ChatUploadKind,
  QuizCardProps,
  ConceptBreakdownProps,
  ProgressNudgeProps,
} from './payloads/chat'
export type {
  GuardianDashboardContent,
  GuardianSummary,
  PendingInvite,
  GuardianChildOverview,
  ChildProfileContent,
  ChildCompanionContent,
} from './payloads/guardian'
export type {
  AuthResponse,
  AuthUser,
  MagicLinkRequestPayload,
  MagicLinkVerifyPayload,
  MagicLinkRequestResponse,
  MagicLinkNativeVerifyResponse,
} from './payloads/auth'
export type {
  AccountTypePayload,
  ProfileSetupPayload,
  FirstLookQuestion,
  FirstLookSubmission,
  OnboardingProgress,
  SubjectSelectionResponse,
  ProfileSetupResponse,
  FirstLookStartResponse,
  FirstLookSubjectResult,
  FirstLookResult,
  FirstLookSkipResponse,
} from './payloads/onboarding'
