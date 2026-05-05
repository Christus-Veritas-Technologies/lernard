import { z } from 'zod'

export const accountTypeSchema = z.object({
  accountType: z.enum(['student', 'guardian']),
})

export const profileSetupSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  ageGroup: z.enum(['primary', 'secondary', 'university', 'professional']),
  grade: z.string().trim().max(20).nullable(),
  subjects: z.array(z.string().max(100)).min(1).max(10),
  learningGoal: z.enum(['exam_prep', 'keep_up', 'learn_new', 'fill_gaps']),
  preferredSessionLength: z.number().min(5).max(120),
  preferredDepth: z.enum(['quick', 'standard', 'deep']),
  dailyGoal: z.number().min(1).max(10),
  timezone: z.string().trim().min(1).max(100).optional(),
})

export const firstLookSubmitSchema = z.object({
  answers: z.array(
    z.object({
      index: z.number().int().min(0),
      answer: z.string().max(500),
    })
  ).min(1).max(50),
})

export type AccountTypeInput = z.infer<typeof accountTypeSchema>
export type ProfileSetupInput = z.infer<typeof profileSetupSchema>
export type FirstLookSubmitInput = z.infer<typeof firstLookSubmitSchema>
