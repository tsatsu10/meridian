/**
 * Pure helpers for moving between the two shapes a permission set takes:
 * the `string[]` stored in `roles.permissions`, and the
 * `Record<string, boolean>` that requirePermission checks against.
 */

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
