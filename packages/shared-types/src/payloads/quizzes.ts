export type QuizQuestionType =
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'ordering'
  | 'structured'

export type PaperType = 'paper1' | 'paper2'
export type QuizDifficulty = 'foundation' | 'standard' | 'challenging' | 'extension'
export type QuizHistoryStatus =
  | 'completed'
  | 'in_progress'
  | 'not_started'
  | 'queued'
  | 'failed'
export type QuizDetailMode = 'review' | 'continue' | 'start' | 'queued' | 'failed'

export interface QuizQuestion {
  type: QuizQuestionType
  text: string
  options?: string[]
  subtopic?: string
}

export interface QuizStructuredPart {
  label: string
  text: string
  command: string
  marks: number
  tier: 1 | 2 | 3 | 4
  answerType: 'short' | 'numeric' | 'written'
  markingPoints: string[]
  modelAnswer: string
  explanation?: string
}

export interface StructuredQuestion extends QuizQuestion {
  type: 'structured'
  parts: QuizStructuredPart[]
  totalMarks: number
}

export interface QuizContent {
  quizId: string
  topic: string
  subjectName: string
  mode: 'guide' | 'companion'
  paperType: PaperType
  difficulty: QuizDifficulty
  totalQuestions: number
  currentQuestionIndex: number
  question: QuizQuestion | StructuredQuestion
}

export interface StructuredPartEvaluation {
  partLabel: string
  marksEarned: number
  totalMarks: number
  feedback: string
  markingPoints: string[]
  modelAnswer: string
  allPartsSubmitted: boolean
  done: boolean
}

export interface QuizQuestionReview {
  text: string
  studentAnswer: string
  correctAnswer: string | null
  isCorrect: boolean
  explanation: string
  subtopic?: string
  evaluationResult?: 'correct' | 'partial' | 'incorrect'
  feedback?: string
}

export interface ShortAnswerEvaluation {
  result: 'correct' | 'partial' | 'incorrect'
  feedback: string
}

export interface QuizCompletionResult {
  score: number
  totalQuestions: number
  xpEarned: number
  shouldRevealAnswers: boolean
  debriefText: string
  topicBreakdown: {
    strong: string[]
    needsWork: string[]
    revisitSoon: string[]
  }
  questions: QuizQuestionReview[]
}

export interface QuizRemediationFailedQuestion {
  questionIndex: number
  questionText: string
  subtopic: string
  questionType: QuizQuestionType
  studentAnswer: string | string[]
  correctAnswer: string | string[]
  explanation: string
  marksAvailable: number
  marksEarned: number
}

export interface QuizRemediationPassedQuestion {
  questionIndex: number
  subtopic: string
  marksEarned: number
}

export interface QuizRemediationWeakSubtopic {
  name: string
  questionsAttempted: number
  questionsFailed: number
  misconception: string | null
}

export interface QuizRemediationMisconception {
  subtopic: string
  studentBelievedX: string
  correctAnswerIsY: string
  implication: string
}

export interface QuizRemediationContext {
  quizId: string
  topic: string
  subjectName: string
  score: number
  total: number
  percentageScore: number
  failedQuestions: QuizRemediationFailedQuestion[]
  passedQuestions: QuizRemediationPassedQuestion[]
  weakSubtopics: QuizRemediationWeakSubtopic[]
  misconceptions: QuizRemediationMisconception[]
  strongSubtopics: string[]
}

export interface QuizDashboardStats {
  quizzesThisMonth: number
  monthlyLimit: number | null
  averageScoreThisMonth: number | null
  quizzesInProgress: number
  growthAreasFlagged: number
  mostQuizzedSubject: { name: string; count: number } | null
  mostCommonDifficulty: QuizDifficulty | null
}

export interface QuizHistoryItem {
  quizId: string
  topic: string
  subjectName: string
  paperType: PaperType
  difficulty: QuizDifficulty
  status: QuizHistoryStatus
  score: number | null
  totalMarks: number | null
  questionsAnswered: number
  totalQuestions: number
  completedAt: string | null
  createdAt: string
  estimatedSecondsRemaining: number | null
}

export interface QuizHistoryResponse {
  quizzes: QuizHistoryItem[]
  nextCursor: string | null
  hasMore: boolean
  totalCount: number
}

export interface QuizStatusResponse {
  status: QuizHistoryStatus
  estimatedSecondsRemaining: number | null
}

export interface QuizDetailReviewPayload {
  mode: 'review'
  status: 'completed'
  quiz: QuizCompletionResult & {
    quizId: string
    topic: string
    subjectName: string
    paperType: PaperType
    difficulty: QuizDifficulty
    completedAt: string | null
  }
}

export interface QuizDetailContinuePayload {
  mode: 'continue'
  status: 'in_progress'
  quiz: QuizContent & {
    questionsAnswered: number
    answeredQuestionIndexes: number[]
  }
}

export interface QuizDetailStartPayload {
  mode: 'start'
  status: 'not_started'
  quiz: QuizContent & {
    estimatedMinutes: number
  }
}

export interface QuizDetailQueuedPayload {
  mode: 'queued'
  status: 'queued'
  quizId: string
  totalQuestions: number
  estimatedSecondsRemaining: number | null
}

export type QuizStreamEvent =
  | { type: 'question'; questionIndex: number; question: QuizQuestion | StructuredQuestion }
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface QuizDetailFailedPayload {
  mode: 'failed'
  status: 'failed'
  quizId: string
  failureReason: string | null
}

export type QuizDetailResponse =
  | QuizDetailReviewPayload
  | QuizDetailContinuePayload
  | QuizDetailStartPayload
  | QuizDetailQueuedPayload
  | QuizDetailFailedPayload
