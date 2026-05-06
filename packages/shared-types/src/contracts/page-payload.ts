export type Permission =
  | 'can_start_lesson'
  | 'can_take_quiz'
  | 'can_edit_mode'
  | 'can_edit_child_settings'
  | 'can_view_child_progress'
  | 'can_change_companion_controls'
  | 'can_assign_topics'
  | 'can_view_class_progress'
  | 'can_export_reports'
  | 'can_manage_teachers'
  | 'can_manage_school_settings'
  | 'can_view_school_reports'

export interface ScopedPermission {
  action: Permission
  resourceId?: string
  resourceType?: 'child' | 'subject' | 'lesson'
}

export interface SlotAssignments {
  [slotName: string]: SlotContent | null
}

export interface SlotContent {
  type: string
  data: Record<string, unknown>
}

export interface PagePayload<T> {
  version: number
  content: T
  permissions: ScopedPermission[]
  slots: SlotAssignments
  permissionsTTL: number
  issuedAt: number
  forcePermissionsRefresh?: boolean
}
