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
  // The caller's REAL workspace memberships, forwarded to getRoleUsage so
  // its tenant check (the same primitive getRole uses) is answered
  // honestly. Defaults to [] only so the built-in-role short-circuit above
  // can be exercised without a caller having to supply it — every real
  // (router) call site must pass the actual list; deriving it from the role
  // being deleted would make the check a tautology.
  memberWorkspaceIds: string[] = [],
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

  // Deleting an assigned role would silently strip its holders of all access.
  const usage = await getRoleUsage(id, memberWorkspaceIds);
  if (usage.usersCount > 0) {
    throw new HTTPException(400, {
      message: `Cannot delete: ${usage.usersCount} user(s) still have this role. Reassign them first.`,
    });
  }

  await db
    .update(roles)
    .set({ deletedAt: new Date(), deletedBy: actorUserId, isActive: false })
    .where(and(eq(roles.id, id), isNull(roles.deletedAt)));

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
