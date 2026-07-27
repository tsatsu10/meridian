import { and, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { roleAssignmentTable } from "../../database/schema";
import { roles } from "../../database/schema/rbac-unified";
import { isSystemRoleId } from "../lib/system-roles";

export async function getRoleUsage(
  roleId: string,
  memberWorkspaceIds: string[],
): Promise<{
  usersCount: number;
  lastUsedAt: Date | null;
  assignments: { userId: string; assignedAt: Date | null }[];
}> {
  const db = getDatabase();

  const found = await db
    .select({ id: roles.id, workspaceId: roles.workspaceId })
    .from(roles)
    .where(and(eq(roles.id, roleId), isNull(roles.deletedAt)))
    .limit(1);

  const [role] = found;

  if (!role) {
    throw new HTTPException(404, { message: "Role not found" });
  }

  // Same tenant boundary as getRole: 404 rather than 403 so an out-of-workspace
  // caller cannot even confirm the role exists, let alone see its assignments
  // (which would otherwise leak another workspace's user ids).
  if (
    !isSystemRoleId(role.id) &&
    (!role.workspaceId || !memberWorkspaceIds.includes(role.workspaceId))
  ) {
    throw new HTTPException(404, { message: "Role not found" });
  }

  const rows = await db
    .select({
      userId: roleAssignmentTable.userId,
      assignedAt: roleAssignmentTable.assignedAt,
    })
    .from(roleAssignmentTable)
    .where(
      and(
        eq(roleAssignmentTable.role, roleId),
        eq(roleAssignmentTable.isActive, true),
      ),
    );

  let lastUsedAt: Date | null = null;
  for (const row of rows) {
    const at = row.assignedAt ? new Date(row.assignedAt) : null;
    if (at && (!lastUsedAt || at > lastUsedAt)) {
      lastUsedAt = at;
    }
  }

  return { usersCount: rows.length, lastUsedAt, assignments: rows };
}
