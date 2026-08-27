import { and, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { roles } from "../../database/schema/rbac-unified";
import { getRolePermissions } from "../../constants/rbac";
import type { UserRole } from "../../types/rbac";
import { isSystemRoleId } from "../lib/system-roles";
import { recordToPermissions } from "../lib/permission-set";
import type { RoleDto } from "./list-roles";

export async function getRole(
  id: string,
  memberWorkspaceIds: string[],
): Promise<RoleDto & { permissions: string[]; workspaceId: string | null }> {
  const db = getDatabase();
  const found = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, id), isNull(roles.deletedAt)))
    .limit(1);

  const [row] = found as unknown as (RoleDto & {
    permissions: string[] | null;
    workspaceId: string | null;
  })[];

  if (!row) {
    throw new HTTPException(404, { message: "Role not found" });
  }

  // Tenant boundary: a custom role belonging to a workspace the caller is
  // not a member of must read as if it doesn't exist. 404, not 403 — a 403
  // would confirm the role exists to someone who has no business knowing
  // that. System roles are global and stay readable by anyone.
  if (
    !isSystemRoleId(row.id) &&
    (!row.workspaceId || !memberWorkspaceIds.includes(row.workspaceId))
  ) {
    throw new HTTPException(404, { message: "Role not found" });
  }

  // System roles keep permissions in the constant, so read them from there.
  const permissions = isSystemRoleId(row.id)
    ? recordToPermissions(getRolePermissions(row.id as UserRole))
    : (row.permissions ?? []);

  return { ...row, permissions };
}
