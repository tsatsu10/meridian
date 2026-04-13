/**
 * 🛡️ RBAC Middleware
 * 
 * Middleware for protecting API routes with role-based access control.
 * Validates user permissions before allowing access to protected endpoints.
 */

import { createMiddleware } from "hono/factory";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { userTable, roleAssignmentTable, customPermissionTable } from "../database/schema";
import { ROLE_PERMISSIONS, getRolePermissions, ROLE_HIERARCHY } from "../constants/rbac";
import type { UserRole, PermissionAction } from "../types/rbac";
import { getHighestRole } from "../constants/rbac";
import { appSettings } from "../config/settings";
import logger from '../utils/logger';

/**
 * RBAC middleware factory - creates middleware that checks specific permissions
 */
export function requirePermission(permission: PermissionAction) {
  return createMiddleware(async (c, next) => {
    try {
      const db = getDatabase();
      
      // Get settings dynamically to ensure fresh values
      const isDemoMode = process.env.DEMO_MODE === 'true';
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@meridian.app';
      const userEmail = c.get("userEmail");

      logger.debug(`🔍 RBAC Check - Demo: ${isDemoMode}, User: ${userEmail}, Admin: ${adminEmail}`);

      // In demo mode, bypass permission checks for admin user
      if (isDemoMode && userEmail === adminEmail) {
        logger.debug(`🔧 Demo mode: Bypassing permission check for ${permission}`);
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
      
      if (!user.length) {
        return c.json({ error: "User not found" }, 404);
      }
      
      const userId = user[0].id;
      
      // Get user's active role assignment
      const roleAssignment = await db
        .select()
        .from(roleAssignmentTable)
        .where(
          and(
            eq(roleAssignmentTable.userId, userId),
            eq(roleAssignmentTable.isActive, true)
          )
        )
        .limit(1);
      
      const userRole: UserRole = roleAssignment.length ? roleAssignment[0].role as UserRole : "guest";
      
      // Get base permissions for the role
      const rolePermissions = getRolePermissions(userRole);
      
      // Check if role has the required permission
      const hasBasePermission = rolePermissions[permission] || false;
      
      // Check for custom permission overrides
      const customPermissions = await db
        .select()
        .from(customPermissionTable)
        .where(
          and(
            eq(customPermissionTable.userId, userId),
            eq(customPermissionTable.permission, permission)
          )
        );
      
      // Apply custom permission overrides (most recent takes precedence)
      let finalPermission = hasBasePermission;
      if (customPermissions.length > 0) {
        const latestCustom = customPermissions.sort((a, b) => 
          new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        )[0];
        finalPermission = latestCustom.granted;
      }
      
      if (!finalPermission) {
        return c.json({ 
          error: "Insufficient permissions",
          required: permission,
          role: userRole,
          message: `This action requires the '${permission}' permission`
        }, 403);
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
      
      const isDemoMode = process.env.DEMO_MODE === 'true';
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@meridian.app';
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
      
      if (!user.length) {
        return c.json({ error: "User not found" }, 404);
      }
      
      const roleAssignment = await db
        .select()
        .from(roleAssignmentTable)
        .where(
          and(
            eq(roleAssignmentTable.userId, user[0].id),
            eq(roleAssignmentTable.isActive, true)
          )
        )
        .limit(1);
      
      const userRole: UserRole = roleAssignment.length ? roleAssignment[0].role as UserRole : "guest";
      
      const userLevel = ROLE_HIERARCHY[userRole] || 0;
      const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
      
      const hasAccess = minimum ? userLevel >= requiredLevel : userRole === requiredRole;
      
      if (!hasAccess) {
        return c.json({ 
          error: "Insufficient role level",
          required: requiredRole,
          current: userRole,
          minimum: minimum,
          message: `This action requires ${minimum ? 'minimum' : 'exact'} role: ${requiredRole}`
        }, 403);
      }
      
      // Add role context to request
      c.set("userRole", userRole);
      c.set("userId", user[0].id);
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
export function requireWorkspacePermission(permission: PermissionAction, workspaceIdParam = "workspaceId") {
  return createMiddleware(async (c, next) => {
    try {
      const db = getDatabase();
      
      const isDemoMode = process.env.DEMO_MODE === 'true';
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@meridian.app';
      const workspaceId = c.req.param(workspaceIdParam);
      const userEmail = c.get("userEmail");

      // In demo mode, bypass workspace permission checks for admin user
      if (isDemoMode && userEmail === adminEmail) {
        logger.debug(`🔧 Demo mode: Bypassing workspace permission check for ${permission}`);
        await next();
        return;
      }

      if (!userEmail || !workspaceId) {
        return c.json({ error: "Authentication and workspace context required" }, 401);
      }
      
      // Get user ID and role assignment
      const user = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.email, userEmail))
        .limit(1);
      
      if (!user.length) {
        return c.json({ error: "User not found" }, 404);
      }
      
      // Get user's role assignment for this workspace
      let roleAssignment = await db
        .select()
        .from(roleAssignmentTable)
        .where(
          and(
            eq(roleAssignmentTable.userId, user[0].id),
            eq(roleAssignmentTable.isActive, true),
            eq(roleAssignmentTable.workspaceId, workspaceId)
          )
        )
        .limit(1);
      
      // 🚨 SECURITY: If no workspace assignment exists, DENY ACCESS
      // Users can only access workspaces they own or were explicitly invited to
      if (!roleAssignment.length) {
        logger.debug(`🚨 SECURITY: User ${userEmail} has no authorized access to workspace ${workspaceId}`);
        return c.json({ 
          error: "Access denied - No workspace membership",
          workspaceId: workspaceId,
          message: "You do not have access to this workspace. Contact the workspace owner for an invitation." 
        }, 403);
      }
      
      const userRole: UserRole = roleAssignment[0].role as UserRole;
      
      // Check if user has the required permission
      const rolePermissions = getRolePermissions(userRole);
      const hasPermission = rolePermissions[permission] || false;
      
      if (!hasPermission) {
        return c.json({ 
          error: "Insufficient permissions for this workspace",
          required: permission,
          role: userRole,
          workspaceId: workspaceId,
          message: `This action requires the '${permission}' permission in workspace '${workspaceId}'`
        }, 403);
      }
      
      // Add context to request
      c.set("userRole", userRole);
      c.set("userId", user[0].id);
      c.set("roleAssignment", roleAssignment[0]);
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
export function requireProjectPermission(permission: PermissionAction, projectIdParam = "projectId") {
  return createMiddleware(async (c, next) => {
    try {
      const db = getDatabase();
      
      const projectId = c.req.param(projectIdParam);
      const userEmail = c.get("userEmail");
      
      if (!userEmail || !projectId) {
        return c.json({ error: "Authentication and project context required" }, 401);
      }
      
      // Get user ID
      const user = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.email, userEmail))
        .limit(1);
      
      if (!user.length) {
        return c.json({ error: "User not found" }, 404);
      }
      
      // Get user's role assignment
      const roleAssignment = await db
        .select()
        .from(roleAssignmentTable)
        .where(
          and(
            eq(roleAssignmentTable.userId, user[0].id),
            eq(roleAssignmentTable.isActive, true)
          )
        )
        .limit(1);
      
      if (!roleAssignment.length) {
        return c.json({ 
          error: "No active role assignment found" 
        }, 403);
      }
      
      const userRole: UserRole = roleAssignment[0].role as UserRole;
      
      // Check if user has the required permission
      const rolePermissions = getRolePermissions(userRole);
      const hasPermission = rolePermissions[permission] || false;
      
      if (!hasPermission) {
        return c.json({ 
          error: "Insufficient permissions",
          required: permission,
          role: userRole,
          message: `This action requires the '${permission}' permission`
        }, 403);
      }
      
      // For project-scoped roles, check if they have access to this specific project
      if (userRole === "project-manager" || userRole === "project-viewer") {
        const projectIds = roleAssignment[0].projectIds ? 
          JSON.parse(roleAssignment[0].projectIds || '[]') : [];
        
        if (projectIds.length > 0 && !projectIds.includes(projectId)) {
          return c.json({ 
            error: "No access to this project",
            role: userRole,
            projectId: projectId,
            assignedProjects: projectIds,
            message: `${userRole} can only access assigned projects`
          }, 403);
        }
      }
      
      // Add context to request
      c.set("userRole", userRole);
      c.set("userId", user[0].id);
      c.set("roleAssignment", roleAssignment[0]);
      c.set("projectId", projectId);
      
      await next();
    } catch (error) {
      logger.error("Project permission middleware error:", error);
      return c.json({ error: "Project permission check failed" }, 500);
    }
  });
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
export const canManageProjectSettings = requirePermission("canManageProjectSettings");
export const canManageProjectTeam = requirePermission("canManageProjectTeam");
export const canManageProjectBudget = requirePermission("canManageProjectBudget");
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
