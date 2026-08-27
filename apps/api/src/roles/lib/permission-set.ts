/**
 * Pure helpers for moving between the two shapes a permission set takes:
 * the `string[]` stored in `roles.permissions`, and the
 * `Record<string, boolean>` that requirePermission checks against.
 */

import { ROLE_PERMISSIONS } from "../../constants/rbac";

/**
 * Every permission key the system defines.
 *
 * Deliberately the union across all roles, not the keys of the most privileged
 * one: workspace-manager is missing canViewAssignedTasks,
 * canUpdateAssignedTasks and canManageDepartment, which other roles define.
 * Taking any single role's keys would silently omit permissions.
 *
 * Lives here rather than in roles/index.ts because the custom-permission write
 * route validates against it too — a permission key that matches nothing is a
 * row no check will ever read, i.e. a grant that silently does nothing.
 */
export const ALL_PERMISSION_KEYS: string[] = [
  ...new Set(
    Object.values(ROLE_PERMISSIONS).flatMap((permissions) =>
      Object.keys(permissions as Record<string, boolean>),
    ),
  ),
].sort();

export function permissionsToRecord(list: string[]): Record<string, boolean> {
  const record: Record<string, boolean> = {};
  for (const permission of list) {
    record[permission] = true;
  }
  return record;
}

export function recordToPermissions(record: Record<string, boolean>): string[] {
  return Object.entries(record)
    .filter(([, granted]) => granted)
    .map(([permission]) => permission);
}

/**
 * The escalation guard: returns the requested permissions the actor does not
 * themselves hold. A non-empty result must be rejected, so that nobody can
 * create a role more powerful than they are.
 */
export function findExcessPermissions(
  requested: string[],
  actorPermissions: Record<string, boolean>,
): string[] {
  return requested.filter(
    (permission) => actorPermissions[permission] !== true,
  );
}
