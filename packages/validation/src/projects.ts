import { z } from 'zod'

const levelSchema = z.enum(['grade7', 'olevel', 'alevel'])

export const projectStudentInfoSchema = z.object({
  fullName: z.string().min(1).max(80),
  schoolName: z.string().min(1).max(120),
  candidateNumber: z.string().min(1).max(32),
  className: z.string().min(1).max(40),
})

export const projectContextSchema = z.object({
  community: z.string().min(1).max(120),
  problemStatement: z.string().min(1).max(300),
  availableResources: z.string().min(1).max(300),
  preferredLanguage: z.string().max(40).optional(),
})

export const createProjectDraftSchema = z.object({
  templateId: z.string().min(1).max(64),
  subject: z.string().min(1).max(100),
  level: levelSchema,
  topicHint: z.string().max(200).optional(),
  studentInfo: projectStudentInfoSchema,
  context: projectContextSchema,
})

export const updateProjectDraftSchema = createProjectDraftSchema.partial()

export const generateProjectSchema = z.object({
  draftId: z.string().min(1).max(64),
  idempotencyKey: z.string().uuid(),
})

export type CreateProjectDraftInput = z.infer<typeof createProjectDraftSchema>
export type UpdateProjectDraftInput = z.infer<typeof updateProjectDraftSchema>
export type GenerateProjectInput = z.infer<typeof generateProjectSchema>
