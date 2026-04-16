import type { StrengthLevel } from '../enums'

export interface SubjectProgress {
  subjectId: string
  subjectName: string
  strengthLevel: StrengthLevel
  totalLessons: number
  totalQuizzes: number
  averageScore: number | null
  topics: TopicStrength[]
  lastActiveAt: string | null
}

export interface TopicStrength {
  topic: string
  level: 'confident' | 'getting_there' | 'needs_work'
  score: number
  lastTestedAt: string | null
}

export interface SkillEntry {
  topic: string
  subject: string
  score: number
  dataPoints: number
  lastUpdatedAt: string
}

export interface SessionRecord {
  id: string
  ownerId: string
  type: 'lesson' | 'quiz'
  subject: string
  topic: string
  duration: number
  xpEarned: number
  createdAt: string
  resourceId: string
}
