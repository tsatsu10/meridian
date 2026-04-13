import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { validateDashboardDataWithMetadata } from "@/schemas/dashboard";
import { ErrorRecovery } from "@/components/dashboard/error-recovery";
import { DashboardStatsLoading, ProjectListLoading } from "@/components/dashboard/loading-states";
import { logger } from "@/lib/logger";
import useWorkspaceStore from "@/store/workspace";
import { useDashboardData } from "@/hooks/queries/dashboard/use-dashboard-data";
import { useRiskMonitor } from "@/hooks/queries/risk/use-risk-detection";
import { useOptionalRBACAuth, type RBACAuthContextType } from "@/lib/permissions";
import { flattenTasksFromProjects } from "@/lib/dashboard/flatten-project-tasks";
import { useWorkspaceDashboardForOverview } from "@/hooks/dashboard/use-workspace-dashboard-for-overview";
import { useDashboardActivityFeed } from "@/hooks/dashboard/use-dashboard-activity-feed";
import { useDashboardOverviewRefresh } from "@/hooks/dashboard/use-dashboard-overview-refresh";
import { DashboardOverviewLoaded } from "@/components/dashboard/overview/dashboard-overview-loaded";

const LazyDashboardLayout = lazy(() => import("@/components/performance/lazy-dashboard-layout"));

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverviewPage,
});

const denyAllPermissions: RBACAuthContextType["hasPermission"] = () => false;

export function DashboardOverviewPage() {
  const { workspace } = useWorkspaceStore();
  const navigate = useNavigate();
  
  const rbacAuth = useOptionalRBACAuth();
  const hasPermission = rbacAuth?.hasPermission ?? denyAllPermissions;

  const { activeDashboard } = useWorkspaceDashboardForOverview();

  const { data: dashboardDataRaw, isLoading, error, refetch } = useDashboardData(undefined, {
    dashboardId: activeDashboard?.id,
    dashboardName: activeDashboard?.name ?? undefined,
  });

  const dashboardData = useMemo(() => {
    if (!dashboardDataRaw) return null;
    const validated = validateDashboardDataWithMetadata(dashboardDataRaw);
    if (validated._metadata.hasWarnings) {
      logger.warn("Dashboard data validation had issues", {
        metadata: validated._metadata,
      });
    }
    return validated;
  }, [dashboardDataRaw]);

  const allTasks = useMemo(() => {
    if (!dashboardData?.projects?.length) return [];
    return flattenTasksFromProjects(dashboardData.projects).slice(0, 2000);
  }, [dashboardData]);

  const riskData = useRiskMonitor(allTasks, dashboardData?.projects || [], {
    deferUntilIdle: true,
  });

  const activityFeedWindow = useDashboardActivityFeed(dashboardData?.activities);

  const [currentTime, setCurrentTime] = useState(new Date());

  const {
    handleRefresh,
    resetDashboardErrorState,
    softRefreshDashboard,
    isRefreshing,
    lastDataFetch,
    refreshCooldownSeconds,
  } = useDashboardOverviewRefresh(refetch);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  if (!workspace) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[50vh] p-6 bg-gray-50/50 dark:bg-gradient-dark">
        <div className="max-w-md rounded-xl border border-border/60 bg-card p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">No workspace selected</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a workspace to load your dashboard, or open workspace settings to create or join one.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard/settings/workspace">Workspace settings</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (rbacAuth?.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/50 dark:bg-gradient-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading permissions…</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-6 bg-gray-50/50 dark:bg-gradient-dark space-y-6">
        <DashboardStatsLoading />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ProjectListLoading />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <div className="h-64 bg-gray-200 dark:bg-muted rounded animate-pulse glass-card" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 bg-gray-50/50 dark:bg-gradient-dark">
        <ErrorRecovery
          error={error instanceof Error ? error : new Error(String(error))}
          resetError={resetDashboardErrorState}
          onRetry={handleRefresh}
          onRefreshPage={softRefreshDashboard}
          onNavigateHome={() => navigate({ to: "/dashboard" })}
          maxRetries={3}
          autoRetry={true}
          componentName="Dashboard"
        />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[50vh] p-6 bg-gray-50/50 dark:bg-gradient-dark">
        <div className="max-w-md rounded-xl border border-border/60 bg-card p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">Couldn&apos;t load dashboard data</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The overview didn&apos;t return usable data. This may be a temporary network issue or permissions
            mismatch. Try again, or refresh the page.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button type="button" variant="default" onClick={() => void refetch()}>
              Retry
            </Button>
            <Button type="button" variant="outline" onClick={() => void softRefreshDashboard()}>
              Invalidate cache
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const activeDashboardLabel = activeDashboard?.name
    ? `Workspace dashboard: ${activeDashboard.name}`
    : null;

  return (
    <Suspense
      fallback={
        <div className="flex-1 p-6 bg-gray-50/50 dark:bg-gradient-dark" aria-busy="true" aria-label="Loading dashboard layout">
        <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded glass-card" />
            ))}
          </div>
        </div>
      </div>
      }
    >
      <LazyDashboardLayout>
        <DashboardOverviewLoaded
          dashboardData={dashboardData}
          workspaceId={workspace.id}
          hasPermission={hasPermission}
          activityFeedWindow={activityFeedWindow}
          currentTime={currentTime}
          activeDashboardLabel={activeDashboardLabel}
          lastDataFetch={lastDataFetch}
          riskData={riskData}
          handleRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          refreshCooldownSeconds={refreshCooldownSeconds}
        />
      </LazyDashboardLayout>
    </Suspense>
  );
} 
