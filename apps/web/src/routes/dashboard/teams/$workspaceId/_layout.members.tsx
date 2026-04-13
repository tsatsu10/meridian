import { createFileRoute, Navigate } from "@tanstack/react-router";

/**
 * Legacy URL: workspace-scoped members table. The main roster lives at `/dashboard/teams`
 * with the same data source; redirect keeps bookmarks working.
 */
export const Route = createFileRoute(
  "/dashboard/teams/$workspaceId/_layout/members",
)({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Navigate
      to="/dashboard/teams"
      search={{ tab: "members" }}
      replace
    />
  );
}
