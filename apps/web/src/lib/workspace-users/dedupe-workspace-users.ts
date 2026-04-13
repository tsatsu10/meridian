/**
 * Collapse duplicate workspace roster rows (same email) from API or cache.
 * Mirrors API dedupe: email-normalized key; prefer rows with `id`, then active, then joinedAt.
 */
export function dedupeWorkspaceUsersForList<
  T extends {
    id?: string | null;
    email?: string | null;
    userEmail?: string | null;
    status?: string | null;
    joinedAt?: string | Date | null;
  },
>(rows: T[]): T[] {
  const map = new Map<string, T>();
  for (const row of rows) {
    const raw = (row.email ?? row.userEmail ?? "").trim().toLowerCase();
    const key = raw || (typeof row.id === "string" ? row.id.trim() : "") || "";
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      continue;
    }
    const a = existing;
    const b = row;
    const aHasId = Boolean(
      typeof a.id === "string" && a.id.trim().length > 0,
    );
    const bHasId = Boolean(
      typeof b.id === "string" && b.id.trim().length > 0,
    );
    if (aHasId !== bHasId) {
      map.set(key, aHasId ? a : b);
      continue;
    }
    const activeRank = (s: string | null | undefined) =>
      s === "active" ? 1 : 0;
    const sa = activeRank(a.status ?? null);
    const sb = activeRank(b.status ?? null);
    if (sa !== sb) {
      map.set(key, sa > sb ? a : b);
      continue;
    }
    const ta = a.joinedAt ? new Date(a.joinedAt as string | Date).getTime() : 0;
    const tb = b.joinedAt ? new Date(b.joinedAt as string | Date).getTime() : 0;
    map.set(key, tb >= ta ? b : a);
  }
  return [...map.values()];
}
