import type { Plan, PaymentSessionStatus } from '../enums'

export interface PaymentInitResponse {
  redirectUrl: string
  sessionId: string
  reference: string
}

export interface PaymentSessionResponse {
  sessionId: string
  status: PaymentSessionStatus
  plan: Plan
  amountUsd: number
  paidAt: string | null
  claimedAt: string | null
  validationErrors: string[]
  canClaim: boolean
}

export interface PaymentStatusResponse extends PaymentSessionResponse {}
