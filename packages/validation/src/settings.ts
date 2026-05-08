import { z } from 'zod'

export const updateModeSchema = z.object({
  mode: z.enum(['guide', 'companion']),
})

export const updateCompanionControlsSchema = z.object({
  answerRevealTiming: z.enum(['after_quiz', 'immediate']),
  quizPassThreshold: z.number().min(0.5).max(1.0),
})

export const updateAppearanceSchema = z.object({
  appearance: z.enum(['light', 'dark', 'system']),
})

export const updateDailyGoalSchema = z.object({
  dailyGoal: z.number().int().min(1).max(10),
})

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-zA-Z\s\-]+$/).optional(),
  ageGroup: z.enum(['PRIMARY', 'SECONDARY', 'UNIVERSITY', 'PROFESSIONAL']).nullable().optional(),
  grade: z.string().max(20).nullable().optional(),
  timezone: z.string().max(60).optional(),
  learningGoal: z.enum(['EXAM_PREP', 'KEEP_UP', 'LEARN_NEW', 'FILL_GAPS']).nullable().optional(),
})

export const updateStudySchema = z.object({
  learningMode: z.enum(['guide', 'companion']).optional(),
  answerRevealTiming: z.enum(['after_quiz', 'immediate']).optional(),
  quizPassThreshold: z.number().min(0.5).max(1.0).optional(),
  sessionLength: z.number().int().min(5).max(120).optional(),
  preferredDepth: z.enum(['quick', 'standard', 'deep']).optional(),
  dailyGoal: z.number().int().min(1).max(10).optional(),
  supportLevel: z.enum(['minimal', 'moderate', 'full']).optional(),
})

export const updateNotificationsSchema = z.object({
  reminderEnabled: z.boolean().optional(),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  streakAlertEnabled: z.boolean().optional(),
  growthAreaNudgeEnabled: z.boolean().optional(),
  growthAreaNudgeFrequency: z.enum(['daily', 'weekly', 'in_app_only']).optional(),
  planLimitAlertEnabled: z.boolean().optional(),
  weeklyEmailEnabled: z.boolean().optional(),
})

export const unlinkGuardianSchema = z.object({
  studentPassword: z.string().min(1),
})

export const updateGuardianProfileSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-zA-Z\s\-]+$/).optional(),
  contactPreference: z.enum(['email', 'push', 'both']).optional(),
  dashboardDefault: z.enum(['overview', 'last_viewed', 'most_recent']).optional(),
})

export const updateGuardianNotificationsSchema = z.object({
  weeklyFamilySummary: z.boolean().optional(),
  unsubscribeAll: z.boolean().optional(),
  perChildAlerts: z.array(z.object({
    childId: z.string(),
    enabled: z.boolean(),
    frequency: z.enum(['every_session', 'daily_summary', 'weekly_summary']).optional(),
    streakAlert: z.boolean().optional(),
  })).optional(),
})

export type UpdateModeInput = z.infer<typeof updateModeSchema>
export type UpdateCompanionControlsInput = z.infer<typeof updateCompanionControlsSchema>
export type UpdateAppearanceInput = z.infer<typeof updateAppearanceSchema>
export type UpdateDailyGoalInput = z.infer<typeof updateDailyGoalSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UpdateStudyInput = z.infer<typeof updateStudySchema>
export type UpdateNotificationsInput = z.infer<typeof updateNotificationsSchema>
export type UnlinkGuardianInput = z.infer<typeof unlinkGuardianSchema>
export type UpdateGuardianProfileInput = z.infer<typeof updateGuardianProfileSchema>
export type UpdateGuardianNotificationsInput = z.infer<typeof updateGuardianNotificationsSchema>
