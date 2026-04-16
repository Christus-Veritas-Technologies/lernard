import type { QuestionType } from '../enums'

export interface Quiz {
  id: string
  ownerId: string
  topic: string
  subject: string
  questionCount: number
  questions: QuizQuestion[]
  score: QuizScore | null
  completedAt: string | null
  xpEarned: number
  createdAt: string
  deletedAt: string | null
  fromLessonId: string | null
  fromConversationId: string | null
}

export interface QuizQuestion {
  index: number
  type: QuestionType
  question: string
  options: string[] | null
  correctAnswer: string | undefined
  studentAnswer: string | null
  isCorrect: boolean | null
  feedback: string | null
}

export interface QuizScore {
  total: number
  correct: number
  strong: string[]
  needsWork: string[]
  revisitSoon: string[]
}
