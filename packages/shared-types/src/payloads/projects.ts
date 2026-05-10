export type ProjectLevel = 'grade7' | 'olevel' | 'alevel'

export type ProjectGenerationStatus = 'queued' | 'processing' | 'ready' | 'failed'

export interface ProjectTemplateStep {
  key: string
  title: string
  guidance: string
  required: boolean
}

export interface ProjectTemplateDefinition {
  id: string
  name: string
  subject: string
  level: ProjectLevel
  description: string
  totalMarks: number
  steps: ProjectTemplateStep[]
}

export interface ProjectDraftStudentInfo {
  fullName: string
  schoolName: string
  candidateNumber: string
  className: string
}

export interface ProjectDraftContext {
  community: string
  problemStatement: string
  availableResources: string
  preferredLanguage?: string
}

export interface ProjectDraft {
  draftId: string
  templateId: string
  subject: string
  level: ProjectLevel
  topicHint?: string
  studentInfo: ProjectDraftStudentInfo
  context: ProjectDraftContext
  updatedAt: string
  createdAt: string
}

export interface ProjectSection {
  key: string
  title: string
  body: string
}

export interface ProjectContent {
  projectId: string
  draftId: string | null
  templateId: string
  templateName: string
  title: string
  subject: string
  level: ProjectLevel
  totalMarks: number
  status: ProjectGenerationStatus
  failureReason: string | null
  sections: ProjectSection[]
  createdAt: string
  updatedAt: string
  readyAt: string | null
  pdfReadyAt: string | null
  pdfFileName: string | null
}

export interface ProjectSummaryItem {
  projectId: string
  title: string
  templateName: string
  subject: string
  level: ProjectLevel
  status: ProjectGenerationStatus
  createdAt: string
  updatedAt: string
  pdfReadyAt: string | null
}

export interface ProjectsContent {
  totalProjects: number
  readyProjects: number
  generatingProjects: number
  failedProjects: number
  draftsInProgress: number
  recentProjects: ProjectSummaryItem[]
  drafts: ProjectDraft[]
}

export interface ProjectStatusResponse {
  status: ProjectGenerationStatus
  failureReason: string | null
  pdfReady: boolean
}
