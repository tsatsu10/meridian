/**
 * 📄 Role Details Page
 *
 * Detailed view of a role: its permissions, usage stats, and the clone/delete
 * actions the API actually supports.
 *
 * ⚠️ DELIBERATELY MISSING — three sections were removed from this page because
 * the endpoints they call have never existed on the server. Each one 404'd
 * silently behind a react-query error state, so the page looked functional
 * and did nothing. They are listed here (rather than left rendering) so that
 * whoever builds the backend knows exactly what to restore and from where:
 *
 *  1. Assigned-users tab — `@/components/rbac/assigned-users-list`
 *     needs:   GET    /api/roles/:id/assignments   (list users holding a role)
 *              DELETE /api/roles/assignments/:id   (revoke one assignment)
 *     note:    the component's old URL, GET /api/roles/assignments?roleId=,
 *              matched the `GET /:id` route with id "assignments" and 404'd.
 *              A restored route must not collide with `/:id` — register it as
 *              `/:id/assignments`, or before `/:id` as `/permissions/all` is.
 *  2. Assign-users modal — `@/components/rbac/assign-users-modal`
 *     needs:   POST   /api/roles/assign/bulk       (assign N users to a role)
 *     note:    single assignment already exists as POST /api/rbac/assign; a
 *              bulk route must apply that route's full guard set per user
 *              (workspace-scoped canManageRoles, the escalation ceiling, and
 *              the assignee-membership check).
 *  3. History tab — `@/components/rbac/role-history`
 *     needs:   GET    /api/roles/:id/history       (audit trail for a role)
 *     note:    rows are already written by roles/lib/audit.ts; only the read
 *              route is missing.
 *
 * The three component files are intentionally left in the tree: they are the
 * ready-made UI for those endpoints, and nothing else imports them.
 *
 * @phase Phase-3-Week-9
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useParams,
  useNavigate,
} from "@tanstack/react-router";
import { API_BASE_URL } from "@/constants/urls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Users,
  Shield,
  Edit,
  Copy,
  Trash2,
  Crown,
  Clock,
  Activity,
} from "lucide-react";
import { PermissionsList } from "@/components/rbac/permissions-list";
import useWorkspaceStore from "@/store/workspace";
import { toast } from "sonner";

// ==========================================
// TYPES
// ==========================================

interface Role {
  id: string;
  name: string;
  description: string | null;
  type: "system" | "custom";
  color: string;
  permissions: string[] | null;
  usersCount: number;
  lastUsedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

/** Body of GET /api/roles/:id/usage — returned unwrapped, not under `usage`. */
interface RoleUsage {
  usersCount: number;
  lastUsedAt: string | null;
}

// ==========================================
// MAIN COMPONENT
// ==========================================

function RoleDetailsPage() {
  const { roleId } = useParams({
    from: "/dashboard/settings/roles-unified/$roleId",
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { workspace } = useWorkspaceStore();
  const workspaceId = workspace?.id || "";
  // Cloning writes a new role into `workspaceId`, which POST /roles/:id/clone
  // requires (z.string().min(1)). Same guard the list page (roles-unified.tsx)
  // and role-modal.tsx already apply: a role write with a missing workspace is
  // security-relevant, so fail visibly before calling the API rather than let
  // it 400 with a raw server message.
  const hasWorkspace = Boolean(workspaceId);

  // Fetch role details
  const { data: role, isLoading } = useQuery({
    queryKey: ["role", roleId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch role");
      const data = await response.json();
      return data.role as Role;
    },
  });

  // Fetch role usage stats. These are the DERIVED counts (computed from live
  // role_assignment rows by getRoleUsage) — GET /roles/:id returns the
  // denormalised roles.users_count / roles.last_used_at columns instead,
  // which drift and are never written; list-roles.ts avoids them for the same
  // reason. The response body is the usage object itself, so unwrapping a
  // `.usage` property (as this did) yielded undefined every time.
  const { data: usage } = useQuery({
    queryKey: ["role-usage", roleId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/roles/${roleId}/usage`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch usage");
      return (await response.json()) as RoleUsage;
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete role");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Role deleted successfully");
      navigate({ to: "/dashboard/settings/roles-unified" });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Clone role mutation
  const cloneRoleMutation = useMutation({
    mutationFn: async (newName: string) => {
      // Defense in depth: handleClone already blocks this case and the Clone
      // button is disabled for it, but this guards any other call path.
      if (!hasWorkspace) {
        throw new Error("Select a workspace before cloning a role");
      }

      const response = await fetch(`${API_BASE_URL}/roles/${roleId}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        // The API's clone body is { name?, workspaceId } — workspaceId is
        // required (role mutations are workspace-scoped server-side) and the
        // field is `name`, not `newName`. Sending `{ newName }` alone failed
        // the zod validator outright (400) and, had it not, would have
        // dropped the name the user typed. Same fix already applied on the
        // list page in roles-unified.tsx.
        body: JSON.stringify({ name: newName, workspaceId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to clone role");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role cloned successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = () => {
    // TODO: Open edit modal
    toast.info("Edit functionality coming soon");
  };

  const handleDelete = () => {
    if (
      confirm(
        `Are you sure you want to delete "${role?.name}"? This cannot be undone.`,
      )
    ) {
      deleteRoleMutation.mutate();
    }
  };

  const handleClone = () => {
    if (!hasWorkspace) {
      toast.error("Select a workspace before cloning a role");
      return;
    }

    const newName = prompt(`Clone "${role?.name}" as:`, `${role?.name} (Copy)`);
    if (newName) {
      cloneRoleMutation.mutate(newName);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Role not found</h3>
          <Button
            onClick={() =>
              navigate({ to: "/dashboard/settings/roles-unified" })
            }
          >
            Back to Roles
          </Button>
        </div>
      </div>
    );
  }

  const isSystem = role.type === "system";

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate({ to: "/dashboard/settings/roles-unified" })}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Roles
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: role.color }}
            >
              {isSystem ? (
                <Crown className="h-6 w-6 text-white" />
              ) : (
                <Shield className="h-6 w-6 text-white" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold">{role.name}</h1>
                <Badge variant={isSystem ? "secondary" : "default"}>
                  {isSystem ? "System" : "Custom"}
                </Badge>
                {!role.isActive && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Inactive
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {role.description || "No description"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isSystem && (
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleClone}
              disabled={!hasWorkspace}
              title={
                hasWorkspace
                  ? undefined
                  : "Select a workspace before cloning a role"
              }
            >
              <Copy className="h-4 w-4 mr-2" />
              Clone
            </Button>

            {!isSystem && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteRoleMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assigned Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {usage?.usersCount ?? role.usersCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {role.permissions?.length || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {usage?.lastUsedAt ?? role.lastUsedAt
                  ? new Date(
                      (usage?.lastUsedAt ?? role.lastUsedAt) as string | Date,
                    ).toLocaleDateString()
                  : "Never"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {new Date(role.createdAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assigned Users ({role.usersCount})
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions ({role.permissions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <AssignedUsersList roleId={roleId} onAssignMore={handleAssignUsers} />
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <PermissionsList
            permissions={role.permissions || []}
            isSystem={isSystem}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <RoleHistory roleId={roleId} />
        </TabsContent>
      </Tabs>

      {/* Assign Users Modal */}
      <AssignUsersModal
        open={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        roleId={roleId}
        roleName={role.name}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["role", roleId] });
          queryClient.invalidateQueries({ queryKey: ["role-users", roleId] });
          setIsAssignModalOpen(false);
        }}
      />
    </div>
  );
}

export const Route = createFileRoute(
  "/dashboard/settings/roles-unified/$roleId",
)({
  component: RoleDetailsPage,
});
