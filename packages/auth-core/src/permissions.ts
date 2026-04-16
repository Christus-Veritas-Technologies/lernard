import type { ScopedPermission, Permission } from '@lernard/shared-types'

export function can(
  permissions: ScopedPermission[],
  action: Permission,
  resourceId?: string,
): boolean {
  return permissions.some(
    (p) =>
      p.action === action &&
      (resourceId === undefined || p.resourceId === resourceId),
  )
}
