import type { GuardianChild } from '../entities/user'
import type { SubjectProgress, SessionRecord } from '../entities/progress'

export interface GuardianDashboardContent {
  children: GuardianChildOverview[]
}

export interface GuardianChildOverview {
  studentId: string
  name: string
  streak: number
  lastActiveAt: string | null
  subjects: { name: string; strengthLevel: string }[]
}

export interface ChildProfileContent {
  child: GuardianChildOverview
  progress: SubjectProgress[]
  recentSessions: SessionRecord[]
}
