import { z } from 'zod'

export const generateQuizSchema = z.object({
  topic: z.string().min(1).max(300),
  subject: z.string().max(100).optional(),
  questionCount: z.number().int().min(5).max(15).default(10),
  idempotencyKey: z.string().uuid(),
  fromLessonId: z.string().optional(),
  fromConversationId: z.string().optional(),
})

export const submitAnswerSchema = z.object({
  questionIndex: z.number().int().min(0),
  answer: z.string().max(2000),
})

export type GenerateQuizInput = z.infer<typeof generateQuizSchema>
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>
