export interface DateGroup<T extends { createdAt: string }> {
  title: string;
  notifications: T[];
}

/**
 * Notification groups are built by iterating a list where pinned items are
 * floated to the front regardless of date, so the plain-object insertion
 * order used to build groups doesn't reflect actual chronology (e.g. a
 * pinned older notification can push its date group ahead of a more recent
 * unpinned one). Re-sort the groups themselves by their most recent
 * notification so date headers always read newest-first.
 */
export function sortDateGroupsChronologically<T extends { createdAt: string }>(
  groups: DateGroup<T>[],
): DateGroup<T>[] {
  const latestTimestamp = (group: DateGroup<T>) =>
    Math.max(
      ...group.notifications.map((n) => new Date(n.createdAt).getTime()),
    );

  return [...groups].sort((a, b) => latestTimestamp(b) - latestTimestamp(a));
}
