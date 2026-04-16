import type { Conversation, ChatMessage } from '../entities/chat'

export interface ChatContent {
  conversations: Conversation[]
}

export interface ConversationContent {
  conversation: Conversation
  messages: ChatMessage[]
  hasMore: boolean
}
