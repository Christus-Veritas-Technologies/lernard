export interface Lesson {
  id: string
  ownerId: string
  topic: string
  subject: string
  depth: 'quick' | 'standard' | 'deep'
  sections: LessonSection[]
  recap: string[]
  estimatedReadTime: number
  xpEarned: number
  completedAt: string | null
  confidenceRating: number | null
  createdAt: string
  deletedAt: string | null
}

export interface LessonSection {
  index: number
  type: 'hook' | 'concept' | 'example' | 'recap'
  title: string
  content: string
  sectionCheck: SectionCheckResult | null
}

export interface SectionCheckResult {
  sectionIndex: number
  response: 'got_it' | 'not_sure' | 'confused'
  timestamp: string
}
