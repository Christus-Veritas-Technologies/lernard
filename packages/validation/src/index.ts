// Auth
export {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  guardianVerifyPasswordSchema,
} from './auth'
export type { RegisterInput, LoginInput, RefreshTokenInput } from './auth'

// Onboarding
export {
  accountTypeSchema,
  profileSetupSchema,
  firstLookSubmitSchema,
} from './onboarding'
export type { AccountTypeInput, ProfileSetupInput, FirstLookSubmitInput } from './onboarding'

// Lessons
export {
  generateLessonSchema,
  sectionCheckSchema,
  completeLessonSchema,
} from './lessons'
export type { GenerateLessonInput, SectionCheckInput, CompleteLessonInput } from './lessons'

// Quizzes
export {
  generateQuizSchema,
  submitAnswerSchema,
} from './quizzes'
export type { GenerateQuizInput, SubmitAnswerInput } from './quizzes'

// Chat
export { sendMessageSchema } from './chat'
export type { SendMessageInput } from './chat'
export * from './projects'

// Settings
export {
  updateModeSchema,
  updateCompanionControlsSchema,
  updateAppearanceSchema,
  updateDailyGoalSchema,
} from './settings'
export type {
  UpdateModeInput,
  UpdateCompanionControlsInput,
  UpdateAppearanceInput,
  UpdateDailyGoalInput,
} from './settings'

// Guardian
export {
  inviteChildSchema,
  acceptInviteSchema,
  updateChildCompanionControlsSchema,
} from './guardian'
export type { InviteChildInput, AcceptInviteInput, UpdateChildCompanionControlsInput } from './guardian'
