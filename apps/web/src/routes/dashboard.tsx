// @epic-1.1-rbac: Main dashboard layout optimized for Magic UI Dock Navigation
// @persona-sarah: PM needs clean layout with dock navigation access
// @persona-jennifer: Exec needs streamlined interface with dock controls
// @persona-david: Team lead needs efficient navigation between dock items
// @persona-mike: Dev needs minimal interference with dock system
// @persona-lisa: Designer needs clean workspace with dock navigation

import { Sidebar } from "@/components/common/sidebar";
import { SystemAlert } from "@/components/system-alert";
import PageTitle from "@/components/page-title";
import EmptyWorkspaceState from "@/components/workspace/empty-state";
import SelectWorkspaceState from "@/components/workspace/select-workspace-state";
import { isProductionMode } from "@/constants/urls";
import useGetWorkspaces from "@/hooks/queries/workspace/use-get-workspaces";
import useWorkspaceStore from "@/store/workspace";
import { DashboardErrorBoundary } from "@/components/error-boundary/error-boundary";
import {
  Outlet,
  createFileRoute,
  redirect,
  useRouterState,
} from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  component: DashboardIndexRouteComponent,
});

function DashboardIndexRouteComponent() {
  const { workspace } = useWorkspaceStore();
  const { data: workspaces } = useGetWorkspaces();
  const location = useRouterState({ select: (s) => s.location.pathname });

  const hasNoWorkspacesAndNoSelectedWorkspace =
    workspaces?.length === 0 && !workspace;

  const isOnWorkspaceRoute = location === "/dashboard";

  return (
    <DashboardErrorBoundary>
      <div className="flex h-screen overflow-hidden">
        <PageTitle title="Dashboard" hideAppName={!workspace?.name} />
        
        {/* Sidebar - Collapsible for responsive design */}
        <Sidebar />
        
        {/* Main Content Area - Optimized for Dock Navigation */}
        <main className="flex-1 overflow-auto scroll-smooth flex flex-col">
          {/* Show production welcome alert for new users */}
          {!workspace && workspaces && workspaces.length === 0 && (
            <SystemAlert
              type="info"
              title="Welcome to Meridian"
              message="Create your first workspace to get started with project management."
              dismissible={true}
            />
          )}
          
          {/* Conditional workspace states */}
          {isOnWorkspaceRoute && (
            <>
              {hasNoWorkspacesAndNoSelectedWorkspace && <EmptyWorkspaceState />}
              {!workspace && workspaces && workspaces.length > 0 && (
                <SelectWorkspaceState />
              )}
            </>
          )}
          
          {/* Dynamic content with dock navigation support */}
          <div className="flex-1">
            <Outlet />
          </div>
        </main>
      </div>
    </DashboardErrorBoundary>
  );
}
