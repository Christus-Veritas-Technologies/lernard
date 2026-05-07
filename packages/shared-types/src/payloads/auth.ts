import type { Role, Plan } from '../enums'

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface AuthUser {
  id: string
  email: string | null
  name: string
  role: Role
  plan: Plan
  onboardingComplete: boolean
  firstLookComplete: boolean
  profilePictureUrl: string | null
}

export interface MagicLinkRequestPayload {
  email: string
  platform?: 'web' | 'native'
}

export interface MagicLinkVerifyPayload {
  token?: string
  email?: string
  otp?: string
}

export interface MagicLinkRequestResponse {
  message: string
}

export interface MagicLinkNativeVerifyResponse {
  sessionCode: string
}
