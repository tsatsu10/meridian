import { createFileRoute, Navigate } from "@tanstack/react-router";

/** Role management UI is not implemented; avoid a broken placeholder route. */
export const Route = createFileRoute(
  "/dashboard/teams/$workspaceId/_layout/roles",
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <Navigate to="/dashboard/teams" replace />;
}
