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
export type { UserSettings, CompanionControls, StudentProfileFields, GuardianProfileSettings } from './entities/settings'

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
  GrowthAreaItem,
  PlanUsage,
  ProgressSummary,
  PlanLimitError,
} from './payloads/progress'
export type {
  SettingsContent,
  SettingsViewerSummary,
  GuardianViewerSummary,
  GuardianManagedChildSettings,
  StudentSettingsContent,
  GuardianSettingsContent,
} from './payloads/settings'
export type {
  LessonContent,
  LessonSection,
  LessonTermDefinition,
  PostLessonResult,
  LessonSectionType,
  SubjectIconKey,
} from './payloads/lessons'
export { SECTION_COLORS, getSubjectIcon } from './payloads/lessons'
export type { QuizQuestionType, QuizQuestion, QuizStructuredPart, StructuredQuestion, QuizContent, StructuredPartEvaluation, QuizQuestionReview, QuizCompletionResult, ShortAnswerEvaluation } from './payloads/quizzes'
export type {
  ConversationListItem,
  ChatAttachment,
  ChatAttachmentInput,
  ChatConversationDetail,
  ChatConversationMessage,
  ChatLessonAttachmentOption,
  ChatQuizAttachmentOption,
  ChatMessageBlock,
  ChatUploadKind,
  QuizCardProps,
  ConceptBreakdownProps,
  ProgressNudgeProps,
  LessonRefCardProps,
  QuizRefCardProps,
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
  AuthSessionExchangeResponse,
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
