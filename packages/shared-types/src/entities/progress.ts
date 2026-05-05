import type { StrengthLevel } from '../enums'

export interface SubjectProgress {
  subjectId: string
  subjectName: string
  strengthLevel: StrengthLevel
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
