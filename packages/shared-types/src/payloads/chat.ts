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

export type ChatAttachmentInput = UploadedChatAttachmentInput | LessonChatAttachmentInput

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

export type ChatAttachment = UploadedChatAttachment | LessonChatAttachment

export type ChatMessageBlock =
  | { type: 'text'; content: string }
  | { type: 'attachments'; items: ChatAttachment[] }
  | { type: 'QuizCard'; props: QuizCardProps }
  | { type: 'ConceptBreakdown'; props: ConceptBreakdownProps }
  | { type: 'ProgressNudge'; props: ProgressNudgeProps }
