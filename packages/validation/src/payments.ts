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

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>
