import { z } from 'zod'

export const sendMessageSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(2000),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>
