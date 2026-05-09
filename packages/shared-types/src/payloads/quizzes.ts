export type QuizQuestionType =
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'ordering'
  | 'structured'

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
  tier: 'recall' | 'application' | 'analysis'
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
