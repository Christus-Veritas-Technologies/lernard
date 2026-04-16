import type { SubjectProgress, SessionRecord } from '../entities/progress'

export interface ProgressContent {
  streak: number
  xpLevel: number
  totalLessons: number
  totalQuizzes: number
  averageSessionLength: number
  subjects: SubjectProgress[]
}

export interface SubjectDetailContent {
  subject: SubjectProgress
}

export interface SessionHistoryContent {
  sessions: SessionRecord[]
  cursor: string | null
  hasMore: boolean
}
