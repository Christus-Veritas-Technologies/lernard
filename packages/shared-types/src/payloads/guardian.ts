import type { CompanionControls } from '../entities/settings'
import type { SubjectProgress } from '../entities/progress'

export interface GuardianDashboardContent {
  summary: GuardianSummary
  children: GuardianChildOverview[]
  pendingInvites: PendingInvite[]
}

export interface GuardianSummary {
  childrenCount: number
  activeThisWeek: number
  pendingInvites: number
  averageStreak: number
}

export interface PendingInvite {
  id: string
  childEmail: string | null
  code: string
  sentAt: string
  status: string
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
}

export interface ChildCompanionContent {
  child: Pick<GuardianChildOverview, 'studentId' | 'name'>
  controls: CompanionControls
}
