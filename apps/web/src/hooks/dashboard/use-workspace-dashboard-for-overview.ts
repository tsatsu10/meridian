import { useDashboards } from "@/hooks/use-dashboards";

/**
 * Main `/dashboard` overview uses one dashboard record per workspace: the API default
 * (or first in the list). Custom analytics/widget builder routes are separate; this hook
 * only exposes the id/name needed for query keys and optional layout transforms.
 */
export function useWorkspaceDashboardForOverview() {
  const { activeDashboard, isLoading, error } = useDashboards();
  return { activeDashboard, isLoadingDashboards: isLoading, dashboardsError: error };
}
