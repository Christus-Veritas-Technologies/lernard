export interface Conversation {
  id: string
  ownerId: string
  title: string | null
  lastMessageAt: string
  messageCount: number
  createdAt: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  slotType: ChatSlotType | null
  slotData: Record<string, unknown> | null
  createdAt: string
}

export type ChatSlotType =
  | 'text'
  | 'quiz_card'
  | 'concept_breakdown'
  | 'progress_nudge'
