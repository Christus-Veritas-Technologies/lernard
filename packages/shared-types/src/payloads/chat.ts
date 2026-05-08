export interface ConversationListItem {
  id: string
  title: string
  lastMessage: string
  updatedAt: string
}

export interface ChatConversationMessage {
  id: string
  role: 'user' | 'assistant'
  blocks: ChatMessageBlock[]
  createdAt: string
}

export interface ChatConversationDetail {
  conversationId: string
  title: string
  messages: ChatConversationMessage[]
}

export interface ChatLessonAttachmentOption {
  lessonId: string
  title: string
  subjectName: string
  updatedAt: string
}

export interface ChatQuizAttachmentOption {
  quizId: string
  title: string
  subjectName: string
  totalQuestions: number
  score?: number
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

export interface LessonRefCardProps {
  lessonId: string
  title: string
  subjectName?: string
  depth: 'quick' | 'standard' | 'deep'
  estimatedMinutes: number
}

export interface QuizRefCardProps {
  quizId: string
  title: string
  subjectName?: string
  totalQuestions: number
}

export type ChatUploadKind = 'image' | 'pdf'

export interface UploadedChatAttachmentInput {
  type: 'upload'
  uploadId: string
  kind: ChatUploadKind
  fileName: string
  mimeType: string
  size: number
}

export interface LessonChatAttachmentInput {
  type: 'lesson'
  lessonId: string
}

export interface QuizChatAttachmentInput {
  type: 'quiz'
  quizId: string
}

export type ChatAttachmentInput =
  | UploadedChatAttachmentInput
  | LessonChatAttachmentInput
  | QuizChatAttachmentInput

export interface UploadedChatAttachment {
  type: 'upload'
  uploadId: string
  kind: ChatUploadKind
  fileName: string
  mimeType: string
  size: number
}

export interface LessonChatAttachment {
  type: 'lesson'
  lessonId: string
  title: string
  subjectName?: string
}

export interface QuizChatAttachment {
  type: 'quiz'
  quizId: string
  title: string
  subjectName?: string
  totalQuestions: number
  score?: number
  weakTopics?: string[]
}

export type ChatAttachment =
  | UploadedChatAttachment
  | LessonChatAttachment
  | QuizChatAttachment

export type ChatMessageBlock =
  | { type: 'text'; content: string }
  | { type: 'markdown'; content: string }
  | { type: 'code'; code: string; language?: string; fileName?: string }
  | { type: 'attachments'; items: ChatAttachment[] }
  | { type: 'QuizCard'; props: QuizCardProps }
  | { type: 'ConceptBreakdown'; props: ConceptBreakdownProps }
  | { type: 'ProgressNudge'; props: ProgressNudgeProps }
  | { type: 'LessonRefCard'; props: LessonRefCardProps }
  | { type: 'QuizRefCard'; props: QuizRefCardProps }
