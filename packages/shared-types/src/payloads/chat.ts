export interface ConversationListItem {
  id: string
  title: string
  lastMessage: string
  updatedAt: string
}

export interface QuizCardProps {
  title: string
  summary: string
  ctaLabel: string
  quizTopic?: string
}

export interface ConceptBreakdownProps {
  heading: string
  bullets: string[]
}

export interface ProgressNudgeProps {
  title: string
  description: string
}

export type ChatMessageBlock =
  | { type: 'text'; content: string }
  | { type: 'QuizCard'; props: QuizCardProps }
  | { type: 'ConceptBreakdown'; props: ConceptBreakdownProps }
  | { type: 'ProgressNudge'; props: ProgressNudgeProps }
