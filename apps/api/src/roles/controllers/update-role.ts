import { and, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { roles } from "../../database/schema/rbac-unified";
import { isSystemRoleId } from "../lib/system-roles";
import { findExcessPermissions } from "../lib/permission-set";
import { invalidateRoleCache } from "../lib/resolve-role-permissions";
import { recordRoleAudit } from "../lib/audit";
import type { RoleDto } from "./list-roles";

export type UpdateRoleInput = {
  name?: string;
  description?: string | null;
  color?: string;
  permissions?: string[];
  isActive?: boolean;
  actorUserId: string;
  actorPermissions: Record<string, boolean>;
  ipAddress?: string;
  userAgent?: string;
};

export async function updateRole(
  id: string,
  input: UpdateRoleInput,
): Promise<RoleDto> {
  if (isSystemRoleId(id)) {
    throw new HTTPException(400, {
      message: "Built-in roles cannot be modified",
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
    permissions: string[] | null;
  }[];

  if (!existing) {
    throw new HTTPException(404, { message: "Role not found" });
  }

  if (input.permissions) {
    const excess = findExcessPermissions(
      input.permissions,
      input.actorPermissions,
    );
    if (excess.length > 0) {
      throw new HTTPException(403, {
        message: `You cannot grant permissions you do not hold: ${excess.join(", ")}`,
      });
    }
  }

  const [updated] = await db
    .update(roles)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.permissions !== undefined
        ? { permissions: input.permissions }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedAt: new Date(),
    })
    .where(eq(roles.id, id))
    .returning();

  // Holders must pick the change up immediately, not after the TTL.
  invalidateRoleCache(id);

  await recordRoleAudit({
    action: "role_updated",
    roleId: id,
    changedBy: input.actorUserId,
    workspaceId: existing.workspaceId,
    previousValue: { permissions: existing.permissions },
    newValue: { permissions: input.permissions ?? existing.permissions },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return updated as unknown as RoleDto;
}
