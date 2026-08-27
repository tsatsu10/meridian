import { createFileRoute, Navigate } from "@tanstack/react-router";

/** Real role management lives at settings/roles-unified. */
export const Route = createFileRoute("/dashboard/admin/roles")({
  component: () => <Navigate to="/dashboard/settings/roles-unified" replace />,
});
