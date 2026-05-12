import type { Plan } from '../enums'
import type { PaymentStatus } from '../enums'

export interface PaymentInitResponse {
  redirectUrl: string
  reference: string
}

export interface PaymentStatusResponse {
  status: PaymentStatus
  plan: Plan
  paidAt: string | null
}
