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
}

export interface RegisterPayload {
  email: string
  password: string
  name: string
  accountType: 'student' | 'guardian'
}

export interface LoginPayload {
  email: string
  password: string
}
