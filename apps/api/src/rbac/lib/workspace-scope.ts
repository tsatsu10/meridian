/**
 * Workspace scoping helpers for the /api/rbac read surface.
 *
 * Most of the RBAC read routes answer an instance-wide question ("every role
 * assignment", "every department", "this user's whole audit trail") while the
 * product is multi-tenant. These helpers give those routes the set of
 * workspaces the caller is actually entitled to see, so the answer can be
 * narrowed to it.
 *
 * Both helpers return a plain array of workspace ids. An EMPTY array means
 * "nothing visible" and callers must treat it that way — never as "no filter".
 * `inArray(column, [])` is a hazard here: pass an empty list and some query
 * builders produce a predicate that matches nothing while others drop the
 * clause entirely, which would leak the whole table. Check for empty first and
 * return an empty result without querying. `visibleWorkspaceIdsOrNone` exists
 * to make that check impossible to forget.
 */

import { and, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import {
  roleAssignmentTable,
  userTable,
  workspaceUserTable,
} from "../../database/schema";
import { resolveRolePermissions } from "../../roles/lib/resolve-role-permissions";
import type { PermissionAction } from "../../types/rbac";

/**
 * Resolves a caller's user id from their email.
 *
 * The /api/rbac router does not run the middleware that populates
 * `c.get("userId")` on every route — only `userEmail` is reliably present — so
 * routes needing an id must resolve it themselves rather than reading a
 * context variable that may be undefined. An undefined id compared against a
 * `:userId` path parameter would silently make every "is this me?" check
 * false, which fails closed, but only by accident.
 */
export async function userIdForEmail(
  userEmail: string | undefined,
): Promise<string | null> {
  if (!userEmail) return null;
  const [row] = await getDatabase()
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, userEmail))
    .limit(1);
  return row?.id ?? null;
}

/**
 * Workspaces the caller belongs to, by membership. This is the widest scope
 * any read route should ever use — it says nothing about privilege, only that
 * the caller is inside the tenant boundary.
 */
export async function memberWorkspaceIds(
  userEmail: string | undefined,
): Promise<string[]> {
  if (!userEmail) return [];
  const rows = await getDatabase()
    .select({ workspaceId: workspaceUserTable.workspaceId })
    .from(workspaceUserTable)
    .where(eq(workspaceUserTable.userEmail, userEmail));
  return [...new Set(rows.map((row) => row.workspaceId))];
}

/**
 * Workspaces in which the caller holds an active role assignment that grants
 * `permission` — resolved per assignment against that assignment's OWN
 * workspace, so a custom role never leaks its permissions across the tenant
 * boundary.
 *
 * Use this (not membership) for anything administrative: role assignments,
 * audit trails, role history.
 */
export async function workspaceIdsGranting(
  userEmail: string | undefined,
  permission: PermissionAction,
): Promise<string[]> {
  if (!userEmail) return [];
  const db = getDatabase();

  const [currentUser] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, userEmail))
    .limit(1);
  if (!currentUser) return [];

  const assignments = await db
    .select()
    .from(roleAssignmentTable)
    .where(
      and(
        eq(roleAssignmentTable.userId, currentUser.id),
        eq(roleAssignmentTable.isActive, true),
      ),
    );

  const granted = await Promise.all(
    assignments.map(async (assignment) => {
      if (!assignment.workspaceId) return null;
      const permissions = await resolveRolePermissions(
        assignment.role,
        assignment.workspaceId,
      );
      return permissions[permission] === true ? assignment.workspaceId : null;
    }),
  );

  return [...new Set(granted.filter((id): id is string => id !== null))];
}

/**
 * Narrows a requested workspace to what the caller may see.
 *
 * - No `requested` workspace: the caller's full visible set.
 * - A `requested` workspace they may see: just that one.
 * - A `requested` workspace they may not see: EMPTY — the caller must return an
 *   empty result, not an unfiltered one.
 */
export function visibleWorkspaceIdsOrNone(
  visible: string[],
  requested: string | undefined,
): string[] {
  if (!requested) return visible;
  return visible.includes(requested) ? [requested] : [];
}
