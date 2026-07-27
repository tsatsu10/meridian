import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { roles } from "../../database/schema/rbac-unified";
import { findExcessPermissions } from "../lib/permission-set";
import { recordRoleAudit } from "../lib/audit";
import type { RoleDto } from "./list-roles";

export type CreateRoleInput = {
  name: string;
  description: string | null;
  color: string;
  permissions: string[];
  workspaceId: string;
  actorUserId: string;
  actorPermissions: Record<string, boolean>;
  baseRoleId?: string | null;
  ipAddress?: string;
  userAgent?: string;
};

export async function createRole(input: CreateRoleInput): Promise<RoleDto> {
  if (!input.workspaceId) {
    throw new HTTPException(400, {
      message: "Custom roles must belong to a workspace",
    });
  }

  // Escalation guard: you cannot mint a role more powerful than yourself.
  const excess = findExcessPermissions(
    input.permissions,
    input.actorPermissions,
  );
  if (excess.length > 0) {
    throw new HTTPException(403, {
      message: `You cannot grant permissions you do not hold: ${excess.join(", ")}`,
    });
  }

  const [created] = await getDatabase()
    .insert(roles)
    .values({
      name: input.name,
      description: input.description,
      type: "custom",
      permissions: input.permissions,
      workspaceId: input.workspaceId,
      color: input.color,
      baseRoleId: input.baseRoleId ?? null,
      createdBy: input.actorUserId,
      isActive: true,
    })
    .returning();

  if (!created) {
    throw new Error("createRole: insert returned no row");
  }

  await recordRoleAudit({
    action: "role_created",
    roleId: created.id,
    changedBy: input.actorUserId,
    workspaceId: input.workspaceId,
    newValue: { name: input.name, permissions: input.permissions },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return created as unknown as RoleDto;
}
