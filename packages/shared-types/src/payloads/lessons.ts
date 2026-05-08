export type LessonSectionType = 'hook' | 'concept' | 'examples' | 'recap'

export type SubjectIconKey =
  | 'code'
  | 'calculator'
  | 'flask'
  | 'globe'
  | 'book_text'
  | 'trending_up'
  | 'languages'
  | 'music'
  | 'palette'
  | 'lightbulb'

export const SECTION_COLORS: Record<
  LessonSectionType,
  { border: string; bg: string; text: string }
> = {
  hook: { border: '#F59E0B', bg: '#FFFBEB', text: '#92400E' },
  concept: { border: '#4F46E5', bg: '#F0F1FF', text: '#3730A3' },
  examples: { border: '#10B981', bg: '#F0FDF4', text: '#065F46' },
  recap: { border: '#7C3AED', bg: '#FAF5FF', text: '#5B21B6' },
}

export function getSubjectIcon(subjectName: string): SubjectIconKey {
  const name = subjectName.toLowerCase()

  if (
    name.includes('computer') ||
    name.includes('programming') ||
    name.includes('code')
  ) {
    return 'code'
  }
  if (
    name.includes('math') ||
    name.includes('algebra') ||
    name.includes('calculus')
  ) {
    return 'calculator'
  }
  if (
    name.includes('physics') ||
    name.includes('chemistry') ||
    name.includes('biology') ||
    name.includes('science')
  ) {
    return 'flask'
  }
  if (
    name.includes('history') ||
    name.includes('geography') ||
    name.includes('social')
  ) {
    return 'globe'
  }
  if (
    name.includes('english') ||
    name.includes('language') ||
    name.includes('literature')
  ) {
    return 'book_text'
  }
  if (
    name.includes('business') ||
    name.includes('commerce') ||
    name.includes('economics')
  ) {
    return 'trending_up'
  }
  if (
    name.includes('french') ||
    name.includes('spanish') ||
    name.includes('portuguese')
  ) {
    return 'languages'
  }
  if (name.includes('music')) {
    return 'music'
  }
  if (name.includes('art') || name.includes('design')) {
    return 'palette'
  }

  return 'lightbulb'
}

export interface LessonSection {
  type: LessonSectionType
  heading: string | null
  body: string
  terms: LessonTermDefinition[]
}

export interface LessonTermDefinition {
  term: string
  explanation: string
}

export interface LessonContent {
  lessonId: string
  topic: string
  subjectName: string
  depth: 'quick' | 'standard' | 'deep'
  estimatedMinutes: number
  sections: LessonSection[]
}

export interface PostLessonResult {
  lessonId: string
  xpEarned: number
  recapBullets: string[]
}
