import type { QueryClient } from "@tanstack/react-query";

/** Invalidate React Query cache for `useDashboardData` (`["dashboard", workspaceId, …]`). */
export function invalidateDashboardQueriesForWorkspace(
  queryClient: QueryClient,
  workspaceId: string
): void {
  void queryClient.invalidateQueries({ queryKey: ["dashboard", workspaceId] });
}

/**
 * After project CRUD, keep `/dashboard` overview, projects hub, and workspace stats aligned.
 */
export function invalidateWorkspaceProjectSurface(
  queryClient: QueryClient,
  workspaceId: string
): void {
  invalidateDashboardQueriesForWorkspace(queryClient, workspaceId);
  void queryClient.invalidateQueries({ queryKey: ["projects-stats", workspaceId] });
  void queryClient.invalidateQueries({ queryKey: ["projects", workspaceId] });
}
