import { z } from 'zod'
import { Plan } from '@lernard/shared-types'

const PAID_PLANS = [
  Plan.STUDENT_SCHOLAR,
  Plan.STUDENT_PRO,
  Plan.GUARDIAN_FAMILY_STARTER,
  Plan.GUARDIAN_FAMILY_STANDARD,
  Plan.GUARDIAN_FAMILY_PREMIUM,
] as const

export const initiatePaymentSchema = z.object({
  plan: z.enum(PAID_PLANS as unknown as [string, ...string[]], {
    errorMap: () => ({ message: 'Invalid plan. Must be a paid plan tier.' }),
  }),
})

export const paymentSessionParamsSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
})

export const paymentReferenceParamsSchema = z.object({
  reference: z.string().min(1, 'reference is required'),
})

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>
export type PaymentSessionParamsInput = z.infer<typeof paymentSessionParamsSchema>
export type PaymentReferenceParamsInput = z.infer<typeof paymentReferenceParamsSchema>
