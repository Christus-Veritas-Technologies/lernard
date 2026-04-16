import type { UserSubject } from '../entities/user'
import type { Lesson } from '../entities/lesson'

export interface HomeContent {
  greeting: string
  streak: number
  xpLevel: number
  lastLesson: Pick<Lesson, 'id' | 'topic' | 'subject'> | null
  dailyGoalProgress: number
  dailyGoalTarget: number
  subjects: UserSubject[]
  recentSessions: RecentSession[]
}

export interface RecentSession {
  id: string
  type: 'lesson' | 'quiz'
  topic: string
  subject: string
  createdAt: string
}
