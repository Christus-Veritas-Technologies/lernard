import { z } from 'zod'

export const generateLessonSchema = z.object({
  topic: z.string().min(1).max(300),
  subject: z.string().max(100).optional(),
  depth: z.enum(['quick', 'standard', 'deep']).default('standard'),
  idempotencyKey: z.string().uuid(),
})

export const sectionCheckSchema = z.object({
  sectionIndex: z.number().int().min(0),
  response: z.enum(['got_it', 'not_sure', 'confused']),
})

export const completeLessonSchema = z.object({
  confidenceRating: z.number().int().min(1).max(5),
})

export type GenerateLessonInput = z.infer<typeof generateLessonSchema>
export type SectionCheckInput = z.infer<typeof sectionCheckSchema>
export type CompleteLessonInput = z.infer<typeof completeLessonSchema>
