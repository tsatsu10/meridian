/**
 * workspace_members has no unique constraint on (workspace_id, user_id), so duplicate
 * rows can exist. Collapse to one row per person for API responses.
 */

type ComparableMembership = {
  status: string | null;
  joinedAt: Date | null;
};

function preferMembershipRow<T extends ComparableMembership>(a: T, b: T): T {
  const activeRank = (s: string | null) => (s === "active" ? 1 : 0);
  if (activeRank(a.status) !== activeRank(b.status)) {
    return activeRank(a.status) > activeRank(b.status) ? a : b;
  }
  const ta = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
  const tb = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
  return tb >= ta ? b : a;
}

/**
 * Dedupe get-workspace-users rows after duplicate memberships or flaky joins.
 * Key by normalized email first — not `id || email`: if one row has user id from the join
 * and another duplicate has id null (join miss / email casing), `id` vs `email` would split
 * into two map keys for the same person.
 */
export function dedupeWorkspaceUserListRows<
  T extends { id: string | null; email: string } & ComparableMembership,
>(rows: T[]): T[] {
  const map = new Map<string, T>();
  for (const row of rows) {
    const emailKey = row.email.trim().toLowerCase();
    const key = emailKey || row.id?.trim() || "";
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      continue;
    }
    const a = existing;
    const b = row;
    const aHasId = Boolean(a.id?.trim());
    const bHasId = Boolean(b.id?.trim());
    if (aHasId !== bHasId) {
      map.set(key, aHasId ? a : b);
      continue;
    }
    map.set(key, preferMembershipRow(existing, row));
  }
  return [...map.values()];
}

/** Dedupe rows that only have userEmail as stable user key (e.g. active workspace users). */
export function dedupeByUserEmail<T extends { userEmail: string }>(rows: T[]): T[] {
  const map = new Map<string, T>();
  for (const row of rows) {
    const key = row.userEmail.trim().toLowerCase();
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, row);
    }
  }
  return [...map.values()];
}
