import type { Plan } from '../enums'
import type { SubjectProgress } from '../entities/progress'

export interface PlanUsage {
  plan: Plan
  lessonsUsed: number
  lessonsLimit: number
  quizzesUsed: number
  quizzesLimit: number
  /** ISO timestamp of when the limit resets */
  resetAt: string
}

export interface ProgressSummary {
  /** Specific topic the student is strong at */
  strengthTopic: string | null
  strengthEvidence: string | null
  /** Specific topic that needs work */
  gapTopic: string
  gapEvidence: string
  /** Pre-filled params for the next lesson CTA */
  nextActionTopic: string
  nextActionDepth: 'quick' | 'standard' | 'deep'
  nextActionSubject: string
  /** Full natural-language summary paragraph */
  summaryParagraph: string
}

export interface GrowthAreaItem {
  subjectId: string
  subjectName: string
  topic: string
  score: number
  /** Human-readable reason this topic was flagged */
  flagReason: string
  /** How many times this topic has been flagged */
  flagCount: number
  lastAttemptedAt: string | null
}

export interface ProgressContent {
  streak: number
  xpLevel: number
  xpPoints: number
  subjects: SubjectProgress[]
  growthAreas: GrowthAreaItem[]
  planUsage: PlanUsage
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
  /** Lesson confidence rating 1–5 (lessons only) */
  confidenceRating?: number | null
  /** Quiz score (quizzes only) */
  score?: number | null
  /** Quiz total questions (quizzes only) */
  scoreOutOf?: number | null
}

export interface PaginatedHistoryResponse {
  sessions: HistorySessionItem[]
  nextCursor: string | null
  hasMore: boolean
  /** Whether history is capped at 30 days (Explorer plan) */
  historyCapDays: number | null
}

/** Structured 429 response body for plan limit errors */
export interface PlanLimitError {
  statusCode: 429
  error: 'plan_limit_reached'
  limitType: 'lessons_daily' | 'lessons_monthly' | 'quizzes_daily' | 'quizzes_monthly'
  plan: Plan
  used: number
  limit: number
  /** ISO timestamp of when the limit resets */
  resetAt: string
  hasTopUp: boolean
  topUpRemaining: number
  message: string
}
