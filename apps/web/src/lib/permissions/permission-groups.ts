/**
 * Groups permission keys by their verb so the role editor can render
 * collapsible sections. The codebase has 157 permission keys, which is
 * unusable as a single flat checkbox list.
 */
const KNOWN_VERBS = [
  "Access",
  "Approve",
  "Archive",
  "Assign",
  "Create",
  "Delete",
  "Edit",
  "Export",
  "Import",
  "Invite",
  "Manage",
  "Update",
  "View",
];

export function groupPermissions(
  keys: string[],
): { group: string; permissions: string[] }[] {
  const groups = new Map<string, string[]>();

  for (const key of keys) {
    const verb = KNOWN_VERBS.find((candidate) =>
      key.startsWith(`can${candidate}`),
    );
    const group = verb ?? "Other";
    const bucket = groups.get(group) ?? [];
    bucket.push(key);
    groups.set(group, bucket);
  }

  return [...groups.entries()]
    .map(([group, permissions]) => ({ group, permissions: permissions.sort() }))
    .sort((a, b) => a.group.localeCompare(b.group));
}
