import type { Quiz, QuizScore } from '../entities/quiz'

export interface QuizContent {
  quiz: Quiz
}

export interface QuizResultsContent {
  quizId: string
  topic: string
  subject: string
  score: QuizScore
  xpEarned: number
}
