import type { QueryClient } from "@tanstack/react-query";

/**
 * Every notification mutation needs to refresh both the sidebar bell's
 * `["notifications"]` query and the full notifications page's
 * `["notifications-infinite", includeArchived]` query. A plain
 * `invalidateQueries({ queryKey: ["notifications"] })` only matches the
 * former — react-query's key matching compares array elements exactly, and
 * "notifications-infinite" is a different string than "notifications", not
 * a prefix match — so the page list silently went stale until a manual
 * reload. Match by prefix instead so both (and any future variant) refresh.
 */
export function invalidateNotificationQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    predicate: (query) =>
      typeof query.queryKey[0] === "string" &&
      query.queryKey[0].startsWith("notifications"),
  });
}
