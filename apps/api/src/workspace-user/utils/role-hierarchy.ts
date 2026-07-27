import type { Context } from "hono";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceUserTable } from "../../database/schema";
import logger from "../../utils/logger";

// Mirrors the hierarchy already used by changeMemberRole/removeMember —
// higher number = more authority within a workspace.
export const ROLE_HIERARCHY: Record<string, number> = {
  guest: 1,
  member: 2,
  "project-viewer": 3,
  "team-lead": 4,
  "project-manager": 5,
  "department-head": 6,
  admin: 7,
  "workspace-manager": 8,
};

// Minimum hierarchy level required to manage other members' accounts
// (change role, remove, reset password) within a workspace.
export const MEMBER_MANAGEMENT_MIN_HIERARCHY = 7; // matches ROLE_HIERARCHY.admin

export interface CallerWorkspaceRole {
  userId: string;
  role: string;
  hierarchy: number;
}

/**
 * Resolve the calling user's role within a specific workspace, via
 * workspaceUserTable (the source of truth this router's other endpoints —
 * changeMemberRole, removeMember — already use for authorization).
 */
export async function getCallerWorkspaceRole(
  workspaceId: string,
  callerEmail: string,
): Promise<CallerWorkspaceRole | null> {
  const db = getDatabase();
  const [row] = await db
    .select({
      userId: workspaceUserTable.userId,
      role: workspaceUserTable.role,
    })
    .from(workspaceUserTable)
    .where(
      and(
        eq(workspaceUserTable.workspaceId, workspaceId),
        eq(workspaceUserTable.userEmail, callerEmail),
      ),
    )
    .limit(1);

  if (!row || !row.userId) return null;

  return {
    userId: row.userId,
    role: row.role ?? "guest",
    hierarchy: ROLE_HIERARCHY[row.role ?? "guest"] ?? 0,
  };
}

/**
 * Authorization gate for admin actions against another workspace member
 * (change role, remove, reset password): the caller must be an admin/manager
 * in this workspace AND outrank the target member's current role. Returns a
 * Response to short-circuit the request when denied, or null when allowed.
 */
export async function requireCanManageMember(
  c: Context,
  workspaceId: string,
  targetEmail: string,
): Promise<Response | null> {
  const currentUserEmail = c.get("userEmail");
  if (!currentUserEmail) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const caller = await getCallerWorkspaceRole(workspaceId, currentUserEmail);
  if (!caller || caller.hierarchy < MEMBER_MANAGEMENT_MIN_HIERARCHY) {
    logger.debug(
      `🚨 SECURITY: ${currentUserEmail} lacks permission to manage members in workspace ${workspaceId}`,
    );
    return c.json(
      { error: "You do not have permission to manage members in this workspace" },
      403,
    );
  }

  const target = await getCallerWorkspaceRole(workspaceId, targetEmail);
  // SECURITY: the target must actually be a member of THIS workspace. Without
  // this check, a target who isn't a member resolves to null and silently
  // skips the hierarchy comparison below — since reset-user-password updates
  // users.password by email with no workspace scoping of its own, that gap
  // would let any workspace admin reset the password of literally any user
  // in the system, as long as that user happens not to be in their workspace.
  if (!target) {
    return c.json(
      { error: "Target user is not a member of this workspace" },
      403,
    );
  }
  if (caller.hierarchy <= target.hierarchy) {
    return c.json(
      { error: "Cannot modify members with equal or higher role than yours" },
      403,
    );
  }

  return null;
}
