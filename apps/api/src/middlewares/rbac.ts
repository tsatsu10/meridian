/**
 * 🛡️ RBAC Middleware
 *
 * Middleware for protecting API routes with role-based access control.
 * Validates user permissions before allowing access to protected endpoints.
 */

import { createMiddleware } from "hono/factory";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import {
  userTable,
  roleAssignmentTable,
  customPermissionTable,
  projectTable,
} from "../database/schema";
import { ROLE_HIERARCHY } from "../constants/rbac";
import type { UserRole, PermissionAction } from "../types/rbac";
import logger from "../utils/logger";
import { resolveRolePermissions } from "../roles/lib/resolve-role-permissions";
import { isSystemRoleId } from "../roles/lib/system-roles";

/**
 * RBAC middleware factory - creates middleware that checks specific permissions
 */
export function requirePermission(permission: PermissionAction) {
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

      // Get user's active role assignment
      const roleAssignment = await db
        .select()
        .from(roleAssignmentTable)
        .where(
          and(
            eq(roleAssignmentTable.userId, userId),
            eq(roleAssignmentTable.isActive, true),
          ),
        )
        .limit(1);

      const assignedRole = roleAssignment[0]?.role ?? "guest";
      const userRole = assignedRole as UserRole;

      // Built-in role names resolve from the ROLE_PERMISSIONS constant exactly
      // as before; anything else is looked up as a custom role id. Unknown or
      // revoked roles resolve to {}, i.e. denied.
      //
      // NOTE: the workspace passed here comes from an arbitrarily chosen
      // active assignment (.limit(1), no orderBy) and is NOT the workspace of
      // the request. It only asserts the custom role belongs to the same
      // workspace as that assignment. Route-level scoping is the job of
      // checkWorkspacePermission / checkProjectPermission, which select the
      // assignment for the workspace actually being accessed.
      const rolePermissions = await resolveRolePermissions(
        assignedRole,
        roleAssignment[0]?.workspaceId ?? null,
      );

      // Check if role has the required permission
      const hasBasePermission = rolePermissions[permission] || false;

      // Check for custom permission overrides
      const customPermissions = await db
        .select()
        .from(customPermissionTable)
        .where(
          and(
            eq(customPermissionTable.userId, userId),
            eq(customPermissionTable.permission, permission),
          ),
        );

      // Apply custom permission overrides (most recent takes precedence)
      let finalPermission = hasBasePermission;
      const latestCustom = customPermissions.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];
      if (latestCustom) {
        finalPermission = latestCustom.granted;
      }

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
      c.set("roleAssignment", roleAssignment[0] || null);

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

      const roleAssignment = await db
        .select()
        .from(roleAssignmentTable)
        .where(
          and(
            eq(roleAssignmentTable.userId, currentUser.id),
            eq(roleAssignmentTable.isActive, true),
          ),
        )
        .limit(1);

      const userRole: UserRole =
        (roleAssignment[0]?.role as UserRole | undefined) ?? "guest";

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
      c.set("roleAssignment", roleAssignment[0] || null);

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

  if (!rolePermissions[permission]) {
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

  if (!rolePermissions[permission]) {
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
