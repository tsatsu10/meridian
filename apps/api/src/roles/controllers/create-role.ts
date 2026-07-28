import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { roles } from "../../database/schema/rbac-unified";
import { findExcessPermissions } from "../lib/permission-set";
import {
  hierarchyCeilingAllows,
  usesHierarchyCeiling,
} from "../lib/role-ceiling";
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
  /**
   * The actor's OWN role slug (or custom role id). Only used to pick which
   * escalation ceiling applies — see the guard below and
   * ../lib/role-ceiling.ts.
   */
  actorRole?: string | null;
  /**
   * Set by cloneRole to the id of the role being copied; always null for a
   * hand-authored create. Server-controlled: the POST / route body has no
   * such field, so a caller cannot claim a base role they didn't clone.
   */
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
  //
  // CLONING A BUILT-IN, as a built-in role yourself, is measured by
  // ROLE_HIERARCHY instead of by permission subset. The built-ins are an
  // ordered ladder, not a lattice — workspace-manager is the only role that
  // can reach this code path at all (it alone grants canManageRoles) yet it
  // does not hold contractor's canViewAssignedTasks/canUpdateAssignedTasks
  // or department-head's canManageDepartment, so a subset check makes those
  // two built-ins unclonable by anyone, contradicting cloneRole's own
  // contract ("cloning a system role is allowed"). Cloning a built-in at or
  // below your level grants nothing you could not already hand out by
  // assigning that same built-in directly, so the ladder is the honest
  // comparison. See ../lib/role-ceiling.ts for the full argument, including
  // why this must NOT be a blanket "the source is a system role" exemption.
  //
  // EVERY OTHER CASE — a hand-authored permission list (no baseRoleId), a
  // clone of a CUSTOM role, or an actor holding a custom role — keeps the
  // permission-subset ceiling unchanged. That is what stops a custom role
  // that happens to grant canManageRoles from minting a workspace-manager
  // equivalent.
  if (usesHierarchyCeiling(input.actorRole, input.baseRoleId)) {
    if (
      !hierarchyCeilingAllows(
        input.actorRole as string,
        input.baseRoleId as string,
      )
    ) {
      throw new HTTPException(403, {
        message: `You cannot clone a role above your own: ${input.baseRoleId}`,
      });
    }
  } else {
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
