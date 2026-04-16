import type { Role, Plan, LearningMode, AgeGroup, StrengthLevel, LearningGoal, SessionDepth, Appearance } from '../enums'

export interface User {
  id: string
  email: string | null
  name: string
  role: Role
  plan: Plan
  ageGroup: AgeGroup | null
  grade: string | null
  timezone: string
  learningMode: LearningMode
  preferredDepth: SessionDepth
  dailyGoal: number
  sessionCount: number
  streak: number
  xp: number
  createdAt: string
  updatedAt: string
  controlledBy: string | null
  lockedSettings: string[]
  onboardingComplete: boolean
  appearance: Appearance
}

export interface Student extends User {
  role: Role.STUDENT
  subjects: UserSubject[]
  learningGoal: LearningGoal | null
  preferredSessionLength: number | null
  billingAnchorDay: number | null
}

export interface Guardian extends User {
  role: Role.GUARDIAN
  children: GuardianChild[]
  guardianPasswordHash: string
}

export interface GuardianChild {
  studentId: string
  name: string
  linkedAt: string
}

export interface GuestUser extends User {
  role: Role.GUEST
  deviceId: string
  migrationId: string | null
}

export interface UserSubject {
  subjectId: string
  name: string
  priorityIndex: number
  strengthLevel: StrengthLevel
  lastActiveAt: string | null
}
