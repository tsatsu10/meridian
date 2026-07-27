import { and, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { roles } from "../../database/schema/rbac-unified";
import { isSystemRoleId } from "../lib/system-roles";
import { invalidateRoleCache } from "../lib/resolve-role-permissions";
import { recordRoleAudit } from "../lib/audit";
import { getRoleUsage } from "./get-role-usage";

export async function deleteRole(
  id: string,
  actorUserId: string,
  meta: { ipAddress?: string; userAgent?: string } = {},
): Promise<{ success: true }> {
  if (isSystemRoleId(id)) {
    throw new HTTPException(400, {
      message: "Built-in roles cannot be deleted",
    });
  }

  const db = getDatabase();
  const found = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, id), isNull(roles.deletedAt)))
    .limit(1);

  const [existing] = found as unknown as {
    id: string;
    workspaceId: string | null;
  }[];
  if (!existing) {
    throw new HTTPException(404, { message: "Role not found" });
  }

  // getRoleUsage re-applies the same tenant boundary getRole does (404 if the
  // role's workspace isn't in the caller's membership list). The caller's
  // actual membership was already verified by the router before it reached
  // this function, and this select just re-confirmed the role's own
  // workspace, so satisfy getRoleUsage's check with that same workspace
  // rather than threading a second membership list all the way through.
  const usage = await getRoleUsage(
    id,
    existing.workspaceId ? [existing.workspaceId] : [],
  );

  // Deleting an assigned role would silently strip its holders of all access.
  if (usage.usersCount > 0) {
    throw new HTTPException(400, {
      message: `Cannot delete: ${usage.usersCount} user(s) still have this role. Reassign them first.`,
    });
  }

  await db
    .update(roles)
    .set({ deletedAt: new Date(), deletedBy: actorUserId, isActive: false })
    .where(eq(roles.id, id));

  invalidateRoleCache(id);

  await recordRoleAudit({
    action: "role_deleted",
    roleId: id,
    changedBy: actorUserId,
    workspaceId: existing.workspaceId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return { success: true };
}
