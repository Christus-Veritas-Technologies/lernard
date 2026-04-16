import { z } from 'zod'

export const inviteChildSchema = z.object({
  childEmail: z.string().email().max(254).optional(),
})

export const acceptInviteSchema = z.object({
  code: z.string().length(6),
})

export const updateChildCompanionControlsSchema = z.object({
  answerRevealTiming: z.enum(['immediate', 'after_quiz']),
  guardianPassword: z.string().min(1).max(128),
})

export type InviteChildInput = z.infer<typeof inviteChildSchema>
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>
export type UpdateChildCompanionControlsInput = z.infer<typeof updateChildCompanionControlsSchema>
