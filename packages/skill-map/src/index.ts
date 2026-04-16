import { StrengthLevel } from '@lernard/shared-types'

export function calculateStrengthLevel(score: number): StrengthLevel {
  if (score >= 0.75) return StrengthLevel.STRONG
  if (score >= 0.45) return StrengthLevel.DEVELOPING
  return StrengthLevel.NEEDS_WORK
}

export function calculateTopicLevel(score: number): 'confident' | 'getting_there' | 'needs_work' {
  if (score >= 0.75) return 'confident'
  if (score >= 0.45) return 'getting_there'
  return 'needs_work'
}

export function decayBaselineWeight(sessionsCompleted: number): number {
  return Math.max(0, 1 - sessionsCompleted / 20)
}
