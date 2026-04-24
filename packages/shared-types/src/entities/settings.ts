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
  showCorrectAnswers: boolean
  allowHints: boolean
  allowSkip: boolean
  lockedByGuardian: boolean
  lastChangedAt: string
  lastChangedBy: string
}
