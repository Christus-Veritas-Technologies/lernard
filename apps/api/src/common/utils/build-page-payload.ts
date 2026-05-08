import type {
  PagePayload,
  ScopedPermission,
  SlotAssignments,
} from '@lernard/shared-types';

const DEFAULT_PAGE_PAYLOAD_VERSION = 1;
const DEFAULT_PERMISSIONS_TTL_SECONDS = 60;

export interface BuildPagePayloadOptions {
  version?: number;
  permissions?: ScopedPermission[];
  slots?: SlotAssignments;
  permissionsTTL?: number;
  issuedAt?: number;
  forcePermissionsRefresh?: boolean;
}

export function buildPagePayload<T>(
  content: T,
  options: BuildPagePayloadOptions = {},
): PagePayload<T> {
  return {
    version: options.version ?? DEFAULT_PAGE_PAYLOAD_VERSION,
    content,
    permissions: options.permissions ?? [],
    slots: options.slots ?? {},
    permissionsTTL: options.permissionsTTL ?? DEFAULT_PERMISSIONS_TTL_SECONDS,
    issuedAt: options.issuedAt ?? Date.now(),
    ...(options.forcePermissionsRefresh !== undefined
      ? { forcePermissionsRefresh: options.forcePermissionsRefresh }
      : {}),
  };
}

export function buildNullSlots(slotNames: readonly string[]): SlotAssignments {
  return slotNames.reduce<SlotAssignments>((assignments, slotName) => {
    assignments[slotName] = null;
    return assignments;
  }, {});
}
