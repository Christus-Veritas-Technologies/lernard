import type { UserSubject } from '../entities/user'

export interface HomeContent {
  greeting: string
  streak: number
  xpLevel: number
  dailyGoalProgress: number
  dailyGoalTarget: number
  subjects: UserSubject[]
}
