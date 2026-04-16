import type { SlotAssignments, SlotContent } from '@lernard/shared-types'

export type { SlotAssignments, SlotContent }

export type HomeSlotName = 'urgent_action' | 'streak_nudge' | 'primary_cta'
export type LessonSlotName = 'confidence_check' | 'worked_example'
export type QuizSlotName = 'hint_card' | 'concept_recap'
export type ProgressSlotName = 'lernard_summary_card' | 'growth_area_nudge'

export function getSlot(slots: SlotAssignments, name: string): SlotContent | null {
  return slots[name] ?? null
}

export function isSlotType(slot: SlotContent | null, type: string): boolean {
  return slot !== null && slot.type === type
}
