import type { UserSettings } from '../entities/settings'

export interface SettingsContent {
  settings: UserSettings
  lockedSettings: string[]
}
