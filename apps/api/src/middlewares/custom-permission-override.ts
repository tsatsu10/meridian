/**
 * Custom per-user permission overrides.
 *
 * `custom_permissions` rows override the permission a caller's ROLE would give
 * them — `granted: true` adds one, `granted: false` takes one away. The table
 * carries `workspaceId`, `projectId` and `expiresAt` columns.
 *
 * 🚨 All three were ignored. The lookup filtered on `userId` + `permission`
 * only, so a single row granted (or revoked) a permission in EVERY workspace,
 * forever, regardless of the workspace it was created for or the expiry date
 * it was created with. And only `requirePermission` consulted the table at
 * all: `checkWorkspacePermission` and `checkProjectPermission` — the checks
 * that actually decide workspace and project access — never did, so an
 * override could not do the one thing it was for while it could do the one
 * thing it must not.
 *
 * This module is the single place that resolves an override, and every check
 * routes through it. The rules:
 *
 * - **Expiry is honoured.** A row with `expiresAt` in the past is ignored.
 * - **Scope must match.** A row applies only where it was scoped to apply:
 *   a project row only to that project, a workspace row only to that
 *   workspace, an unscoped row anywhere.
 * - **The coarse gate sees unscoped rows only.** `requirePermission` does not
 *   know the request's workspace, so it must not honour a workspace-scoped
 *   row — that is exactly how one workspace's override leaks into another.
 * - **Most recent applicable row wins**, preserving the previous tie-break.
 *
 * The table is empty in every environment today, so this is preventive: the
 * write path is hardened alongside it in rbac/index.ts.
 */

import { and, eq, gt, isNull, or } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { customPermissionTable } from "../database/schema";
import type { PermissionAction } from "../types/rbac";

export interface OverrideScope {
  /** The workspace being acted on, or null when the caller has no workspace context. */
  workspaceId?: string | null;
  /** The project being acted on, when there is one. */
  projectId?: string | null;
}

/**
 * Applies any custom override for `permission` on top of `roleGrants` (what
 * the caller's role already decided). Returns `roleGrants` unchanged when no
 * applicable override exists.
 */
export async function applyCustomPermissionOverride(
  userId: string,
  permission: PermissionAction,
  roleGrants: boolean,
  scope: OverrideScope = {},
): Promise<boolean> {
  const workspaceId = scope.workspaceId ?? null;
  const projectId = scope.projectId ?? null;

  const rows = await getDatabase()
    .select()
    .from(customPermissionTable)
    .where(
      and(
        eq(customPermissionTable.userId, userId),
        eq(customPermissionTable.permission, permission),
        // Unexpired only. A null expiresAt means "no expiry".
        or(
          isNull(customPermissionTable.expiresAt),
          gt(customPermissionTable.expiresAt, new Date()),
        ),
      ),
    );

  const applicable = rows.filter((row) => {
    // A project-scoped row applies only to that project.
    if (row.projectId) return row.projectId === projectId;
    // A workspace-scoped row applies only inside that workspace. When the
    // caller has no workspace context (the coarse gate) `workspaceId` is null
    // and this is correctly false — an unscoped check must never inherit a
    // scoped grant.
    if (row.workspaceId) return row.workspaceId === workspaceId;
    // Unscoped row: applies anywhere.
    return true;
  });

  if (applicable.length === 0) return roleGrants;

  const [latest] = applicable.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return latest ? latest.granted : roleGrants;
}
