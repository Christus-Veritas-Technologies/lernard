import type { CompanionControls, GuardianProfileSettings, StudentProfileFields, UserSettings } from '../entities/settings'
import type { AuthUser } from './auth'

export interface SettingsViewerSummary extends Pick<AuthUser, 'id' | 'email' | 'name' | 'plan' | 'role'> {
  ageGroup: import('../enums').AgeGroup | null
  grade: string | null
  timezone: string
  learningGoal: import('../enums').LearningGoal | null
}

export interface GuardianViewerSummary extends Pick<AuthUser, 'id' | 'email' | 'name' | 'plan' | 'role'> {
  contactPreference: 'email' | 'push' | 'both'
  dashboardDefault: 'overview' | 'last_viewed' | 'most_recent'
  weeklyFamilySummary: boolean
  unsubscribeAll: boolean
}

export interface GuardianManagedChildSettings {
  studentId: string
  name: string
  email: string | null
  streak: number
  lastActiveAt: string | null
  settings: Pick<
    UserSettings,
    'learningMode' | 'appearance' | 'dailyGoal' | 'notificationsEnabled'
  >
  lockedSettings: string[]
  companionControls: CompanionControls | null
}

export interface StudentSettingsContent {
  roleView: 'student'
  viewer: SettingsViewerSummary
  settings: UserSettings
  lockedSettings: string[]
  guardianName: string | null
  guardianLinkedSince: string | null
}

export interface GuardianSettingsContent {
  roleView: 'guardian'
  viewer: GuardianViewerSummary
  children: GuardianManagedChildSettings[]
}

export type SettingsContent = StudentSettingsContent | GuardianSettingsContent

export type { StudentProfileFields, GuardianProfileSettings }
