import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(50),
  accountType: z.enum(['student', 'guardian']),
})

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
})

export const guardianVerifyPasswordSchema = z.object({
  password: z.string().min(1).max(128),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
