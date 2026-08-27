import { and, eq, isNull, inArray, or } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { roles } from "../../database/schema/rbac-unified";
import { roleAssignmentTable } from "../../database/schema";

export type RoleDto = {
  id: string;
  name: string;
  description: string | null;
  type: "system" | "custom";
  color: string;
  usersCount: number;
  lastUsedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
};

type ListRolesOptions = {
  /** Workspaces the caller belongs to. Custom roles outside these are hidden. */
  memberWorkspaceIds: string[];
  type?: "all" | "system" | "custom";
  search?: string;
};

export async function listRoles(options: ListRolesOptions): Promise<RoleDto[]> {
  const db = getDatabase();

  // System roles are global and visible to everyone; custom roles are only
  // ever returned for workspaces the caller is a member of, so this endpoint
  // cannot be used to enumerate another tenant's roles.
  const visibility =
    options.memberWorkspaceIds.length > 0
      ? or(
          eq(roles.type, "system"),
          inArray(roles.workspaceId, options.memberWorkspaceIds),
        )
      : eq(roles.type, "system");

  const rows = await db
    .select()
    .from(roles)
    .where(and(isNull(roles.deletedAt), visibility));

  const assignments = await db
    .select({
      role: roleAssignmentTable.role,
      assignedAt: roleAssignmentTable.assignedAt,
    })
    .from(roleAssignmentTable)
    .where(eq(roleAssignmentTable.isActive, true));

  const usage = new Map<string, { count: number; lastUsedAt: Date | null }>();
  for (const assignment of assignments) {
    const current = usage.get(assignment.role) ?? {
      count: 0,
      lastUsedAt: null,
    };
    current.count += 1;
    const at = assignment.assignedAt ? new Date(assignment.assignedAt) : null;
    if (at && (!current.lastUsedAt || at > current.lastUsedAt)) {
      current.lastUsedAt = at;
    }
    usage.set(assignment.role, current);
  }

  const typed = rows as unknown as (RoleDto & { workspaceId: string | null })[];

  return typed
    .filter((row) => {
      if (options.type && options.type !== "all" && row.type !== options.type) {
        return false;
      }
      if (options.search) {
        return row.name.toLowerCase().includes(options.search.toLowerCase());
      }
      return true;
    })
    .map((row) => {
      const stats = usage.get(row.id);
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        color: row.color,
        // Derived, never the denormalised roles.users_count column, which drifts.
        usersCount: stats?.count ?? 0,
        lastUsedAt: stats?.lastUsedAt ?? null,
        isActive: row.isActive,
        createdAt: row.createdAt,
      };
    });
}
