import type { AgeGroup, LearningGoal, SessionDepth } from '../enums'

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
