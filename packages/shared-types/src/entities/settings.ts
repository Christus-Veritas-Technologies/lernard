import type { LearningMode, Appearance, SessionDepth, AgeGroup, LearningGoal } from '../enums'

export interface UserSettings {
  learningMode: LearningMode
  appearance: Appearance
  preferredDepth: SessionDepth
  dailyGoal: number
  preferredSessionLength: number | null
  notificationsEnabled: boolean
  companionControls: CompanionControls | null
  supportLevel: 'minimal' | 'moderate' | 'full'
  textSize: 'small' | 'medium' | 'large' | 'xl'
  reducedMotion: boolean
  reminderEnabled: boolean
  reminderTime: string
  streakAlertEnabled: boolean
  growthAreaNudgeEnabled: boolean
  growthAreaNudgeFrequency: 'daily' | 'weekly' | 'in_app_only'
  planLimitAlertEnabled: boolean
  weeklyEmailEnabled: boolean
}

export interface CompanionControls {
  answerRevealTiming: 'after_quiz' | 'immediate'
  quizPassThreshold: number
  lockedByGuardian: boolean
  lastChangedAt: string
  lastChangedBy: string
}

export interface StudentProfileFields {
  ageGroup: AgeGroup | null
  grade: string | null
  timezone: string
  learningGoal: LearningGoal | null
}

export interface GuardianProfileSettings {
  contactPreference: 'email' | 'push' | 'both'
  dashboardDefault: 'overview' | 'last_viewed' | 'most_recent'
}
