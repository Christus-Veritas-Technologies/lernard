import type { UserSubject } from '../entities/user'

export interface HomeContent {
  greeting: string
  streak: number
  xpLevel: number
  dailyGoalProgress: number
  dailyGoalTarget: number
  subjects: UserSubject[]
  totalSessions: number
  passRate: number
  masteredTopicCount: number
  totalTopicCount: number
  strengthBreakdown: StrengthBreakdown
  topTopics: TopicSummary[]
  subjectTopics: SubjectTopicBreakdown[]
  recentActivity: DayActivity[]
  recentSessions: RecentSession[]
}

export interface DayActivity {
  day: string
  active: boolean
}

export interface StrengthBreakdown {
  strong: number
  developing: number
  needsWork: number
}

export interface TopicSummary {
  topic: string
  subjectName: string
  score: number
}

export interface SubjectTopicBreakdown {
  subjectId: string
  subjectName: string
  strongCount: number
  developingCount: number
  needsWorkCount: number
}

export interface RecentSession {
  id: string
  type: 'lesson' | 'quiz'
  topic: string
  subjectName: string
  completedAt: string
}
