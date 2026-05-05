import type { SubjectProgress } from '../entities/progress'

export interface ProgressContent {
  streak: number
  xpLevel: number
  subjects: SubjectProgress[]
}

export interface SubjectDetailContent {
  subject: SubjectProgress
}
