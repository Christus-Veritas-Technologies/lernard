import { z } from 'zod'

export const updateModeSchema = z.object({
  mode: z.enum(['guide', 'companion']),
})

export const updateCompanionControlsSchema = z.object({
  showCorrectAnswers: z.boolean(),
  allowHints: z.boolean(),
  allowSkip: z.boolean(),
})

export const updateAppearanceSchema = z.object({
  appearance: z.enum(['light', 'dark', 'system']),
})

export const updateDailyGoalSchema = z.object({
  dailyGoal: z.number().int().min(1).max(10),
})

export type UpdateModeInput = z.infer<typeof updateModeSchema>
export type UpdateCompanionControlsInput = z.infer<typeof updateCompanionControlsSchema>
export type UpdateAppearanceInput = z.infer<typeof updateAppearanceSchema>
export type UpdateDailyGoalInput = z.infer<typeof updateDailyGoalSchema>
