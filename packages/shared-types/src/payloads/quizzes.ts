export type QuizQuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'ordering'

export interface QuizQuestion {
  type: QuizQuestionType
  text: string
  options?: string[]
}

export interface QuizContent {
  quizId: string
  topic: string
  subjectName: string
  mode: 'guide' | 'companion'
  totalQuestions: number
  currentQuestionIndex: number
  question: QuizQuestion
}

export interface QuizQuestionReview {
  text: string
  studentAnswer: string
  correctAnswer: string | null
  isCorrect: boolean
  explanation: string
}

export interface QuizCompletionResult {
  score: number
  totalQuestions: number
  xpEarned: number
  shouldRevealAnswers: boolean
  topicBreakdown: {
    strong: string[]
    needsWork: string[]
    revisitSoon: string[]
  }
  questions: QuizQuestionReview[]
}
