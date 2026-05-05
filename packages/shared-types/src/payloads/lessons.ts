export interface LessonSection {
  type: 'hook' | 'concept' | 'examples' | 'recap'
  heading: string | null
  body: string
  terms: LessonTermDefinition[]
}

export interface LessonTermDefinition {
  term: string
  explanation: string
}

export interface LessonContent {
  lessonId: string
  topic: string
  subjectName: string
  depth: 'quick' | 'standard' | 'deep'
  estimatedMinutes: number
  sections: LessonSection[]
}

export interface PostLessonResult {
  lessonId: string
  xpEarned: number
  recapBullets: string[]
}
