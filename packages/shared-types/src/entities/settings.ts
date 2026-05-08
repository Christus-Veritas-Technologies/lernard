import type { LearningMode, Appearance, SessionDepth } from '../enums'

export interface UserSettings {
  learningMode: LearningMode
  appearance: Appearance
  preferredDepth: SessionDepth
  dailyGoal: number
  preferredSessionLength: number | null
  notificationsEnabled: boolean
  companionControls: CompanionControls | null
}

export interface CompanionControls {
  answerRevealTiming: 'after_quiz' | 'immediate'
  quizPassThreshold: number
  lockedByGuardian: boolean
  lastChangedAt: string
  lastChangedBy: string
}
