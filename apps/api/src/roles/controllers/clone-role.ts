import { getRole } from "./get-role";
import { createRole } from "./create-role";
import type { RoleDto } from "./list-roles";

export type CloneRoleInput = {
  name?: string;
  workspaceId: string;
  actorUserId: string;
  actorPermissions: Record<string, boolean>;
  /**
   * The actor's own role slug (or custom role id). Forwarded to createRole,
   * which uses it together with `baseRoleId` to decide whether the
   * hierarchy or the permission-subset ceiling applies — see
   * ../lib/role-ceiling.ts.
   */
  actorRole?: string | null;
  /**
   * Workspaces the caller belongs to. Forwarded to getRole so the same
   * tenant boundary applies to the clone source as to a direct read: a
   * custom role in a workspace the caller isn't a member of reads as 404,
   * exactly as GET /:id would.
   */
  memberWorkspaceIds: string[];
  ipAddress?: string;
  userAgent?: string;
};

/**
 * Cloning a system role is allowed — the copy is always a custom role, so this
 * is how an admin starts from a built-in and narrows it.
 */
export async function cloneRole(
  sourceId: string,
  input: CloneRoleInput,
): Promise<RoleDto> {
  const source = await getRole(sourceId, input.memberWorkspaceIds);

  return createRole({
    name: input.name ?? `${source.name} (copy)`,
    description: source.description,
    color: source.color,
    permissions: source.permissions,
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    actorPermissions: input.actorPermissions,
    actorRole: input.actorRole ?? null,
    baseRoleId: source.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
}
