import type { SessionDepth } from '../enums'
import type { UserSubject } from '../entities/user'

export interface LearnContent {
  recommendations: LearnRecommendation[]
  drafts: LearnDraft[]
  subjects: Pick<UserSubject, 'subjectId' | 'name'>[]
  preferredDepth: SessionDepth
  preferredSessionLength: number | null
  focusTopic: string | null
}

export interface LearnRecommendation {
  topic: string
  subject: string
  reason: string
  depth: SessionDepth
  estimatedMinutes: number
}

export interface LearnDraft {
  id: string
  topic: string
  subject: string
  status: string
  nextStep: string
}