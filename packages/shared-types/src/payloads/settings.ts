import type { CompanionControls, UserSettings } from '../entities/settings'
import type { AuthUser } from './auth'

export interface SettingsViewerSummary extends Pick<AuthUser, 'id' | 'email' | 'name' | 'plan' | 'role'> {}

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
}

export interface GuardianSettingsContent {
  roleView: 'guardian'
  viewer: SettingsViewerSummary
  children: GuardianManagedChildSettings[]
}

export type SettingsContent = StudentSettingsContent | GuardianSettingsContent
