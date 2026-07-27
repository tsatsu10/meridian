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

  // System roles keep permissions in the constant, so read them from there.
  const permissions = isSystemRoleId(row.id)
    ? recordToPermissions(getRolePermissions(row.id as UserRole))
    : (row.permissions ?? []);

  return { ...row, permissions };
}
