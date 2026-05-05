import type { SubjectProgress } from '../entities/progress'

export interface ProgressContent {
  streak: number
  xpLevel: number
  subjects: SubjectProgress[]
}

export interface SubjectDetailContent {
  subject: SubjectProgress
}

export interface HistorySessionItem {
  id: string
  type: 'lesson' | 'quiz'
  subjectName: string
  topic: string
  durationMinutes: number
  completedAt: string
}

export interface PaginatedHistoryResponse {
  sessions: HistorySessionItem[]
  nextCursor: string | null
  hasMore: boolean
}
