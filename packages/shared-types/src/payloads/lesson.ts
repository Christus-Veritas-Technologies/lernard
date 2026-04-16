import type { Lesson, LessonSection } from '../entities/lesson'

export interface LessonContent {
  lesson: Lesson
}

export interface PostLessonContent {
  lessonId: string
  topic: string
  subject: string
  summary: string[]
  xpEarned: number
}
