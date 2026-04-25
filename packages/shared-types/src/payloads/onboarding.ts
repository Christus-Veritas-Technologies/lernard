import type { AgeGroup, LearningGoal, SessionDepth, StrengthLevel } from '../enums'

export interface AccountTypePayload {
  accountType: 'student' | 'guardian'
}

export interface ProfileSetupPayload {
  name: string
  ageGroup: AgeGroup
  grade: string | null
  subjects: string[]
  learningGoal: LearningGoal
  preferredSessionLength: number
  preferredDepth: SessionDepth
  dailyGoal: number
}

export interface FirstLookQuestion {
  index: number
  subject: string
  question: string
  options: string[]
}

export interface FirstLookSubmission {
  answers: { index: number; answer: string }[]
}

export interface OnboardingProgress {
  onboardingComplete: boolean
  firstLookComplete: boolean
}

export interface SubjectSelectionResponse extends OnboardingProgress {
  subjects: string[]
}

export interface ProfileSetupResponse extends OnboardingProgress {
  subjects: string[]
}

export interface FirstLookStartResponse {
  questions: FirstLookQuestion[]
}

export interface FirstLookSubjectResult {
  subjectId: string
  subject: string
  score: number
  totalQuestions: number
  strengthLevel: StrengthLevel
}

export interface FirstLookResult extends OnboardingProgress {
  completed: true
  score: number
  totalQuestions: number
  subjectResults: FirstLookSubjectResult[]
}

export interface FirstLookSkipResponse extends OnboardingProgress {
  skipped: true
}
