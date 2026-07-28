/**
 * 🛡️ RBAC Middleware
 *
 * Middleware for protecting API routes with role-based access control.
 * Validates user permissions before allowing access to protected endpoints.
 */

import { createMiddleware } from "hono/factory";
import { eq, and, asc } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import {
  userTable,
  roleAssignmentTable,
  projectTable,
} from "../database/schema";
import { ROLE_HIERARCHY } from "../constants/rbac";
import type { UserRole, PermissionAction } from "../types/rbac";
import logger from "../utils/logger";
import { resolveRolePermissions } from "../roles/lib/resolve-role-permissions";
import { isSystemRoleId } from "../roles/lib/system-roles";
import { applyCustomPermissionOverride } from "./custom-permission-override";

/**
 * How the coarse (workspace-unscoped) permission gate combines a caller's
 * several active role assignments.
 *
 * - `"every"` (default): the caller must hold the permission under EVERY
 *   active assignment. Fail-closed. Use wherever this guard is the ONLY
 *   authorization on the route.
 *
 * - `"any"`: the caller must hold the permission under at least one active
 *   assignment. ONLY permissible on routes that go on to make a
 *   workspace-scoped check (checkWorkspacePermission / checkProjectPermission)
 *   against the workspace actually being acted on — there the coarse gate is
 *   a cheap pre-filter and the scoped check is the real decision.
 *
 * Both are order-independent, so both are deterministic; that is the property
 * the old `.limit(1)`-with-no-`orderBy` lookup lacked.
 *
 * Why `"any"` has to exist: `"every"` alone locks legitimate admins out. A
 * user who owns workspace B (self-assigned `workspace-manager` on creation)
 * and is later assigned `member` in workspace A no longer holds
 * `canManageRoles` under EVERY assignment — so an intersection-only gate would
 * deny them role management in their OWN workspace B, before the scoped check
 * that would have correctly allowed it ever ran. Verified against a real
 * database, and pinned by the tests in
 * __tests__/require-permission-determinism.integration.test.ts.
 */
export interface RequirePermissionOptions {
  scope?: "every" | "any";
}

/**
 * RBAC middleware factory - creates middleware that checks specific permissions
 */
export function requirePermission(
  permission: PermissionAction,
  options: RequirePermissionOptions = {},
) {
  const scope = options.scope ?? "every";
  return createMiddleware(async (c, next) => {
    try {
      const db = getDatabase();

      // Get settings dynamically to ensure fresh values
      const isDemoMode = process.env.DEMO_MODE === "true";
      const adminEmail = process.env.ADMIN_EMAIL || "admin@meridian.app";
      const userEmail = c.get("userEmail");

      logger.debug(
        `🔍 RBAC Check - Demo: ${isDemoMode}, User: ${userEmail}, Admin: ${adminEmail}`,
      );

      // In demo mode, bypass permission checks for admin user
      if (isDemoMode && userEmail === adminEmail) {
        logger.debug(
          `🔧 Demo mode: Bypassing permission check for ${permission}`,
        );
        await next();
        return;
      }

      if (!userEmail) {
        return c.json({ error: "Authentication required" }, 401);
      }

      // Get user ID from email
      const user = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, userEmail))
        .limit(1);

      const [currentUser] = user;
      if (!currentUser) {
        return c.json({ error: "User not found" }, 404);
      }

      const userId = currentUser.id;

      // Get ALL of the user's active role assignments, deterministically
      // ordered.
      //
      // 🚨 SECURITY: this was previously `.limit(1)` with no `orderBy`, which
      // sampled ONE arbitrary assignment. A user holding more than one active
      // assignment therefore got whichever row Postgres happened to return, so
      // their effective permissions could differ between two identical
      // requests — a nondeterministic authorization decision that no test can
      // reproduce on demand. It also handed out a privilege-escalation
      // primitive: creating a workspace self-assigns `workspace-manager`
      // (workspace/controllers/create-workspace.ts) *without* deactivating any
      // existing assignment, so any authenticated user could add a
      // high-privilege row and wait to win the lottery.
      const assignments = await db
        .select()
        .from(roleAssignmentTable)
        .where(
          and(
            eq(roleAssignmentTable.userId, userId),
            eq(roleAssignmentTable.isActive, true),
          ),
        )
        .orderBy(
          asc(roleAssignmentTable.assignedAt),
          asc(roleAssignmentTable.id),
        );

      // Built-in role names resolve from the ROLE_PERMISSIONS constant exactly
      // as before; anything else is looked up as a custom role id, scoped to
      // that assignment's OWN workspace. Unknown or revoked roles resolve to
      // {}, i.e. denied.
      const resolved = await Promise.all(
        assignments.map((assignment) =>
          resolveRolePermissions(
            assignment.role,
            assignment.workspaceId ?? null,
          ),
        ),
      );

      // This guard is deliberately workspace-UNSCOPED: it is a coarse
      // admission check, and scoping to the workspace actually being accessed
      // is the job of checkWorkspacePermission / checkProjectPermission.
      //
      // `every` (the default) intersects across assignments: order-independent,
      // therefore deterministic, and an additional assignment can only ever
      // shrink it — which is what closes the escalation described above.
      // `any` unions, which is equally deterministic but only safe where a
      // scoped check follows; see RequirePermissionOptions.
      //
      // A user with no active assignment is treated as `guest`, exactly as before.
      const hasBasePermission =
        assignments.length === 0
          ? (await resolveRolePermissions("guest", null))[permission] === true
          : scope === "any"
            ? resolved.some((permissions) => permissions[permission] === true)
            : resolved.every((permissions) => permissions[permission] === true);

      // Report the assignment that actually bound the decision. Under `every`
      // that is the first role LACKING the permission (the one the caller needs
      // to hear about); under `any` it is the first role granting it.
      // Deterministic in both directions.
      const bindingIndex = resolved.findIndex((permissions) =>
        scope === "any"
          ? permissions[permission] === true
          : permissions[permission] !== true,
      );
      const bindingAssignment =
        assignments[bindingIndex === -1 ? 0 : bindingIndex] ?? null;
      const userRole = (bindingAssignment?.role ?? "guest") as UserRole;

      // Custom per-user overrides. This gate has no workspace context, so it
      // sees UNSCOPED overrides only — passing no workspace here is what stops
      // an override created for one workspace from applying everywhere. See
      // custom-permission-override.ts.
      const finalPermission = await applyCustomPermissionOverride(
        userId,
        permission,
        hasBasePermission,
      );

      if (!finalPermission) {
        return c.json(
          {
            error: "Insufficient permissions",
            required: permission,
            role: userRole,
            message: `This action requires the '${permission}' permission`,
          },
          403,
        );
      }

      // Add permission context to request
      c.set("userRole", userRole);
      c.set("userId", userId);
      c.set("roleAssignment", bindingAssignment);

      await next();
    } catch (error) {
      logger.error("RBAC middleware error:", error);
      return c.json({ error: "Permission check failed" }, 500);
    }
  });
}

/**
 * Role-based middleware - requires user to have specific role or higher
 */
export function requireRole(requiredRole: UserRole, minimum = false) {
  return createMiddleware(async (c, next) => {
    try {
      const db = getDatabase();

      const isDemoMode = process.env.DEMO_MODE === "true";
      const adminEmail = process.env.ADMIN_EMAIL || "admin@meridian.app";
      const userEmail = c.get("userEmail");

      // In demo mode, bypass role checks for admin user
      if (isDemoMode && userEmail === adminEmail) {
        logger.debug(`🔧 Demo mode: Bypassing role check for ${requiredRole}`);
        await next();
        return;
      }

      if (!userEmail) {
        return c.json({ error: "Authentication required" }, 401);
      }

      // Get user ID and role assignment
      const user = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.email, userEmail))
        .limit(1);

      const [currentUser] = user;
      if (!currentUser) {
        return c.json({ error: "User not found" }, 404);
      }

      // Same fix as requirePermission above: select ALL active assignments in
      // a deterministic order rather than sampling one arbitrary row, then
      // bind the decision to the LEAST privileged of them. Picking the minimum
      // is what stops an extra high-privilege assignment (e.g. the
      // `workspace-manager` self-assigned by creating a workspace) from
      // raising the caller's effective role level.
      const assignments = await db
        .select()
        .from(roleAssignmentTable)
        .where(
          and(
            eq(roleAssignmentTable.userId, currentUser.id),
            eq(roleAssignmentTable.isActive, true),
          ),
        )
        .orderBy(
          asc(roleAssignmentTable.assignedAt),
          asc(roleAssignmentTable.id),
        );

      // Custom roles carry no rung on the built-in ladder, so ROLE_HIERARCHY
      // has no entry for them and they cannot be ranked here. Treating them as
      // level 0 is the fail-closed reading and is what happens below, but say
      // so rather than letting `?? 0` imply the role was simply the weakest:
      // a caller holding a powerful custom role is denied by this guard, and
      // that is a limitation of rank-based checks, not a judgement about the
      // role. Permission-based checks (requirePermission,
      // checkWorkspacePermission) resolve custom roles properly — prefer them.
      const unrankableRole = assignments.find(
        (assignment) =>
          ROLE_HIERARCHY[assignment.role as UserRole] === undefined,
      );
      if (unrankableRole) {
        logger.debug(
          `requireRole cannot rank custom role "${unrankableRole.role}" — denying. Use a permission-based guard instead.`,
        );
      }

      // Ties keep the earliest assignment, so the reported role is stable.
      const bindingAssignment =
        assignments.length === 0
          ? null
          : assignments.reduce((lowest, candidate) =>
              (ROLE_HIERARCHY[candidate.role as UserRole] ?? 0) <
              (ROLE_HIERARCHY[lowest.role as UserRole] ?? 0)
                ? candidate
                : lowest,
            );

      const userRole: UserRole =
        (bindingAssignment?.role as UserRole | undefined) ?? "guest";

      const userLevel = ROLE_HIERARCHY[userRole] || 0;
      const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;

      const hasAccess = minimum
        ? userLevel >= requiredLevel
        : userRole === requiredRole;

      if (!hasAccess) {
        return c.json(
          {
            error: "Insufficient role level",
            required: requiredRole,
            current: userRole,
            minimum: minimum,
            message: `This action requires ${minimum ? "minimum" : "exact"} role: ${requiredRole}`,
          },
          403,
        );
      }

      // Add role context to request
      c.set("userRole", userRole);
      c.set("userId", currentUser.id);
      c.set("roleAssignment", bindingAssignment);

      await next();
    } catch (error) {
      logger.error("Role middleware error:", error);
      return c.json({ error: "Role check failed" }, 500);
    }
  });
}

/**
 * Workspace-scoped permission middleware
 */
export interface WorkspacePermissionResult {
  allowed: boolean;
  status?: 401 | 403 | 404;
  body?: Record<string, unknown>;
  userId?: string;
  userRole?: UserRole;
  // Non-null only for project-scoped roles (project-manager/project-viewer)
  // that were assigned with a projectIds restriction: null/undefined means
  // "no restriction beyond workspace membership." Callers that operate on
  // MULTIPLE resources at once (bulk operations, search) — where per-resource
  // checkProjectPermission isn't practical — must apply this list themselves;
  // checkWorkspacePermission alone does not enforce it.
  restrictedToProjectIds?: string[] | null;
}

/**
 * Reusable workspace-permission check (the logic behind
 * requireWorkspacePermission), callable outside a route that carries
 * :workspaceId — e.g. after resolving a child resource (team, milestone,
 * note) to its workspace.
 */
export async function checkWorkspacePermission(
  userEmail: string | undefined,
  workspaceId: string,
  permission: PermissionAction,
): Promise<WorkspacePermissionResult> {
  const isDemoMode = process.env.DEMO_MODE === "true";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@meridian.app";
  if (isDemoMode && userEmail === adminEmail) {
    return { allowed: true };
  }

  if (!userEmail) {
    return {
      allowed: false,
      status: 401,
      body: { error: "Authentication and workspace context required" },
    };
  }

  const db = getDatabase();
  const [currentUser] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, userEmail))
    .limit(1);

  if (!currentUser) {
    return { allowed: false, status: 404, body: { error: "User not found" } };
  }

  // Get user's role assignment for this workspace
  const [workspaceAssignment] = await db
    .select()
    .from(roleAssignmentTable)
    .where(
      and(
        eq(roleAssignmentTable.userId, currentUser.id),
        eq(roleAssignmentTable.isActive, true),
        eq(roleAssignmentTable.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  // 🚨 SECURITY: If no workspace assignment exists, DENY ACCESS
  // Users can only access workspaces they own or were explicitly invited to
  if (!workspaceAssignment) {
    logger.debug(
      `🚨 SECURITY: User ${userEmail} has no authorized access to workspace ${workspaceId}`,
    );
    return {
      allowed: false,
      status: 403,
      body: {
        error: "Access denied - No workspace membership",
        workspaceId,
        message:
          "You do not have access to this workspace. Contact the workspace owner for an invitation.",
      },
    };
  }

  const userRole = workspaceAssignment.role as UserRole;
  // Same name-first resolution requirePermission uses. This assignment was
  // selected with eq(roleAssignmentTable.workspaceId, workspaceId), so the
  // workspace passed here is the one actually being authorised against.
  const rolePermissions = await resolveRolePermissions(
    workspaceAssignment.role,
    workspaceId,
  );

  // Custom overrides scoped to THIS workspace (plus unscoped ones). This check
  // previously ignored the table entirely, so an override could never do the
  // job it exists for while the unscoped coarse gate honoured it everywhere.
  const allowed = await applyCustomPermissionOverride(
    currentUser.id,
    permission,
    rolePermissions[permission] === true,
    { workspaceId },
  );

  if (!allowed) {
    return {
      allowed: false,
      status: 403,
      body: {
        error: "Insufficient permissions for this workspace",
        required: permission,
        role: userRole,
        workspaceId,
        message: `This action requires the '${permission}' permission in workspace '${workspaceId}'`,
      },
    };
  }

  let restrictedToProjectIds: string[] | null = null;
  // Built-in project roles keep their existing behaviour exactly. Custom
  // roles are additionally restricted whenever the assignment carries
  // projectIds — without this, a project-scoped custom role would silently
  // grant workspace-wide access.
  if (
    userRole === "project-manager" ||
    userRole === "project-viewer" ||
    !isSystemRoleId(userRole)
  ) {
    const projectIds: string[] = Array.isArray(workspaceAssignment.projectIds)
      ? (workspaceAssignment.projectIds as string[])
      : [];
    if (projectIds.length > 0) restrictedToProjectIds = projectIds;
  }

  return {
    allowed: true,
    userId: currentUser.id,
    userRole,
    restrictedToProjectIds,
  };
}

export function requireWorkspacePermission(
  permission: PermissionAction,
  workspaceIdParam = "workspaceId",
) {
  return createMiddleware(async (c, next) => {
    try {
      const workspaceId = c.req.param(workspaceIdParam);
      const userEmail = c.get("userEmail");

      if (!workspaceId) {
        return c.json(
          { error: "Authentication and workspace context required" },
          401,
        );
      }

      const result = await checkWorkspacePermission(
        userEmail,
        workspaceId,
        permission,
      );

      if (!result.allowed) {
        return c.json(
          result.body ?? { error: "Forbidden" },
          result.status ?? 403,
        );
      }

      // Add context to request
      if (result.userRole) c.set("userRole", result.userRole);
      if (result.userId) c.set("userId", result.userId);
      c.set("workspaceId", workspaceId);

      await next();
    } catch (error) {
      logger.error("Workspace permission middleware error:", error);
      return c.json({ error: "Workspace permission check failed" }, 500);
    }
  });
}

/**
 * Project-scoped permission middleware
 */
export function requireProjectPermission(
  permission: PermissionAction,
  projectIdParam = "projectId",
) {
  return createMiddleware(async (c, next) => {
    try {
      const projectId = c.req.param(projectIdParam);
      const userEmail = c.get("userEmail");

      if (!projectId) {
        return c.json(
          { error: "Authentication and project context required" },
          401,
        );
      }

      // Delegate to checkProjectPermission so both the middleware and the
      // "resolve a child resource, then check" call sites share one
      // workspace-scoped implementation instead of two that can drift apart.
      const result = await checkProjectPermission(
        userEmail,
        projectId,
        permission,
      );

      if (!result.allowed) {
        return c.json(
          result.body ?? { error: "Forbidden" },
          result.status ?? 403,
        );
      }

      // Add context to request
      if (result.userRole) c.set("userRole", result.userRole);
      if (result.userId) c.set("userId", result.userId);
      c.set("projectId", projectId);

      await next();
    } catch (error) {
      logger.error("Project permission middleware error:", error);
      return c.json({ error: "Project permission check failed" }, 500);
    }
  });
}

/**
 * Reusable project-permission check (the logic behind requireProjectPermission),
 * callable outside a route that carries :projectId — e.g. after resolving a
 * child resource (theme, task) to its project. Mirrors requireProjectPermission
 * AND includes the demo-mode admin bypass that the other guards have (note:
 * requireProjectPermission itself is missing that bypass).
 */
export interface ProjectPermissionResult {
  allowed: boolean;
  status?: 401 | 403 | 404;
  body?: Record<string, unknown>;
  userId?: string;
  userRole?: UserRole;
}

export async function checkProjectPermission(
  userEmail: string | undefined,
  projectId: string,
  permission: PermissionAction,
): Promise<ProjectPermissionResult> {
  const isDemoMode = process.env.DEMO_MODE === "true";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@meridian.app";
  if (isDemoMode && userEmail === adminEmail) {
    return { allowed: true };
  }

  if (!userEmail) {
    return {
      allowed: false,
      status: 401,
      body: { error: "Authentication required" },
    };
  }

  const db = getDatabase();
  const [currentUser] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, userEmail))
    .limit(1);

  if (!currentUser) {
    return { allowed: false, status: 404, body: { error: "User not found" } };
  }

  // SECURITY: resolve the project's owning workspace and require the role
  // assignment to be scoped to THAT workspace. Without this, "does the caller
  // have any active role assignment anywhere with this permission" would let
  // a role earned in one workspace authorize actions against a project in a
  // completely different workspace.
  const [project] = await db
    .select({ workspaceId: projectTable.workspaceId })
    .from(projectTable)
    .where(eq(projectTable.id, projectId))
    .limit(1);

  if (!project) {
    return {
      allowed: false,
      status: 404,
      body: { error: "Project not found" },
    };
  }

  const [assignment] = await db
    .select()
    .from(roleAssignmentTable)
    .where(
      and(
        eq(roleAssignmentTable.userId, currentUser.id),
        eq(roleAssignmentTable.isActive, true),
        eq(roleAssignmentTable.workspaceId, project.workspaceId),
      ),
    )
    .limit(1);

  if (!assignment) {
    return {
      allowed: false,
      status: 403,
      body: { error: "No active role assignment found in this workspace" },
    };
  }

  const userRole = assignment.role as UserRole;
  // The assignment was selected with
  // eq(roleAssignmentTable.workspaceId, project.workspaceId), so this is the
  // workspace that owns the project being authorised against.
  const rolePermissions = await resolveRolePermissions(
    assignment.role,
    project.workspaceId,
  );

  // Custom overrides scoped to this project, its workspace, or unscoped.
  const allowed = await applyCustomPermissionOverride(
    currentUser.id,
    permission,
    rolePermissions[permission] === true,
    { workspaceId: project.workspaceId, projectId },
  );

  if (!allowed) {
    return {
      allowed: false,
      status: 403,
      body: {
        error: "Insufficient permissions",
        required: permission,
        role: userRole,
        message: `This action requires the '${permission}' permission`,
      },
    };
  }

  // Project-scoped roles may only act on their assigned projects. Built-in
  // project roles keep their existing behaviour exactly; custom roles are
  // additionally restricted whenever the assignment carries projectIds — see
  // the matching comment in checkWorkspacePermission above.
  if (
    userRole === "project-manager" ||
    userRole === "project-viewer" ||
    !isSystemRoleId(userRole)
  ) {
    const projectIds: string[] = Array.isArray(assignment.projectIds)
      ? (assignment.projectIds as string[])
      : [];
    if (projectIds.length > 0 && !projectIds.includes(projectId)) {
      return {
        allowed: false,
        status: 403,
        body: {
          error: "No access to this project",
          role: userRole,
          projectId,
          message: `${userRole} can only access assigned projects`,
        },
      };
    }
  }

  return { allowed: true, userId: currentUser.id, userRole };
}

/**
 * Admin-only middleware - shortcut for workspace manager access
 */
export const requireAdmin = requireRole("workspace-manager", true);

/**
 * Manager-level middleware - workspace manager or department head
 */
export const requireManager = requireRole("department-head", true);

/**
 * Team lead or higher middleware
 */
export const requireTeamLead = requireRole("team-lead", true);

/**
 * Basic member access middleware
 */
export const requireMember = requireRole("member", true);

// ===== PERMISSION-SPECIFIC MIDDLEWARE =====

export const canManageWorkspace = requirePermission("canManageWorkspace");
export const canViewWorkspace = requirePermission("canViewWorkspace");
export const canCreateProjects = requirePermission("canCreateProjects");
export const canEditProjects = requirePermission("canEditProjects");
export const canDeleteProjects = requirePermission("canDeleteProjects");
export const canArchiveProjects = requirePermission("canArchiveProjects");
export const canCloneProjects = requirePermission("canCloneProjects");
export const canManageProjectSettings = requirePermission(
  "canManageProjectSettings",
);
export const canManageProjectTeam = requirePermission("canManageProjectTeam");
export const canManageProjectBudget = requirePermission(
  "canManageProjectBudget",
);
export const canCreateTasks = requirePermission("canCreateTasks");
export const canEditTasks = requirePermission("canEditTasks");
export const canAssignTasks = requirePermission("canAssignTasks");
export const canCreateSubtasks = requirePermission("canCreateSubtasks"); // Team Lead special power
export const canEditSubtasks = requirePermission("canEditSubtasks"); // Team Lead special power
export const canDeleteSubtasks = requirePermission("canDeleteSubtasks"); // Team Lead special power
export const canManageTeam = requirePermission("canCreateTeams");
export const canInviteUsers = requirePermission("canInviteUsers");
export const canManageRoles = requirePermission("canManageRoles");

export default {
  requirePermission,
  requireRole,
  requireWorkspacePermission,
  requireProjectPermission,
  requireAdmin,
  requireManager,
  requireTeamLead,
  requireMember,
  canManageWorkspace,
  canViewWorkspace,
  canCreateProjects,
  canEditProjects,
  canDeleteProjects,
  canArchiveProjects,
  canCloneProjects,
  canManageProjectSettings,
  canManageProjectTeam,
  canManageProjectBudget,
  canCreateTasks,
  canEditTasks,
  canAssignTasks,
  canCreateSubtasks,
  canEditSubtasks,
  canDeleteSubtasks,
  canManageTeam,
  canInviteUsers,
  canManageRoles,
};
