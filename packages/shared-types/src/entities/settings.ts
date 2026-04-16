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
  answerRevealTiming: 'immediate' | 'after_quiz'
  lockedByGuardian: boolean
  lastChangedAt: string
  lastChangedBy: string
}
