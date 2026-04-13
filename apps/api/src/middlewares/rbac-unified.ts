/**
 * 🛡️ Unified RBAC Middleware
 * 
 * Middleware functions for protecting API routes with unified RBAC.
 * Uses the unified permission checker for both system and custom roles.
 * 
 * @phase Phase-2-Week-5
 */

import type { Context, Next } from 'hono';
import { permissionChecker } from '../services/rbac/permission-checker';
import logger from '../utils/logger';

// ==========================================
// CORE MIDDLEWARE
// ==========================================

/**
 * Require specific permission
 * 
 * Checks if the authenticated user has the specified permission.
 * Supports contextual scoping (workspace, project, department).
 * 
 * @example
 * app.delete('/api/projects/:id', requirePermission('project.delete'), deleteProject);
 */
export function requirePermission(permission: string) {
  return async (c: Context, next: Next) => {
    try {
      const userId = c.get('userId');
      
      if (!userId) {
        logger.warn('Permission check without authenticated user', { permission }, 'RBAC');
        return c.json({ error: 'Authentication required' }, 401);
      }
      
      // Build context from request
      const context = {
        workspaceId: c.req.param('workspaceId') || c.req.query('workspaceId'),
        projectId: c.req.param('projectId') || c.req.query('projectId'),
        departmentId: c.req.param('departmentId') || c.req.query('departmentId'),
      };
      
      // Check permission
      const result = await permissionChecker.checkPermission(
        userId,
        permission,
        context
      );
      
      if (!result.allowed) {
        logger.warn('Permission denied', {
          userId,
          permission,
          reason: result.reason,
          context
        }, 'RBAC');
        
        return c.json({
          error: 'Insufficient permissions',
          required: permission,
          reason: result.reason
        }, 403);
      }
      
      // Permission granted - continue
      logger.debug('Permission granted', {
        userId,
        permission,
        source: result.source,
        roleId: result.roleId
      }, 'RBAC');
      
      await next();
      
    } catch (error) {
      logger.error('Permission check error', { error, permission }, 'RBAC');
      return c.json({ error: 'Permission check failed' }, 500);
    }
  };
}

/**
 * Require specific role
 * 
 * Checks if the authenticated user has the specified role.
 * 
 * @example
 * app.post('/api/workspaces', requireRole('workspace-manager'), createWorkspace);
 */
export function requireRole(roleId: string) {
  return async (c: Context, next: Next) => {
    try {
      const userId = c.get('userId');
      
      if (!userId) {
        logger.warn('Role check without authenticated user', { roleId }, 'RBAC');
        return c.json({ error: 'Authentication required' }, 401);
      }
      
      // Build context
      const context = {
        workspaceId: c.req.param('workspaceId') || c.req.query('workspaceId'),
      };
      
      // Check role
      const hasRole = await permissionChecker.hasRole(userId, roleId, context);
      
      if (!hasRole) {
        logger.warn('Role denied', {
          userId,
          requiredRole: roleId,
          context
        }, 'RBAC');
        
        return c.json({
          error: 'Insufficient role',
          required: roleId
        }, 403);
      }
      
      logger.debug('Role check passed', {
        userId,
        roleId
      }, 'RBAC');
      
      await next();
      
    } catch (error) {
      logger.error('Role check error', { error, roleId }, 'RBAC');
      return c.json({ error: 'Role check failed' }, 500);
    }
  };
}

/**
 * Require ANY of the specified permissions
 * 
 * User needs at least one of the provided permissions.
 * 
 * @example
 * app.get('/api/projects/:id', requireAnyPermission(['project.view', 'project.edit']), getProject);
 */
export function requireAnyPermission(permissions: string[]) {
  return async (c: Context, next: Next) => {
    try {
      const userId = c.get('userId');
      
      if (!userId) {
        return c.json({ error: 'Authentication required' }, 401);
      }
      
      const context = {
        workspaceId: c.req.param('workspaceId') || c.req.query('workspaceId'),
        projectId: c.req.param('projectId') || c.req.query('projectId'),
      };
      
      const hasAny = await permissionChecker.hasAnyPermission(
        userId,
        permissions,
        context
      );
      
      if (!hasAny) {
        logger.warn('No matching permission', {
          userId,
          requiredPermissions: permissions
        }, 'RBAC');
        
        return c.json({
          error: 'Insufficient permissions',
          required: permissions
        }, 403);
      }
      
      await next();
      
    } catch (error) {
      logger.error('Any permission check error', { error, permissions }, 'RBAC');
      return c.json({ error: 'Permission check failed' }, 500);
    }
  };
}

/**
 * Require ALL of the specified permissions
 * 
 * User needs every one of the provided permissions.
 * 
 * @example
 * app.post('/api/projects/:id/archive', requireAllPermissions(['project.edit', 'project.archive']), archiveProject);
 */
export function requireAllPermissions(permissions: string[]) {
  return async (c: Context, next: Next) => {
    try {
      const userId = c.get('userId');
      
      if (!userId) {
        return c.json({ error: 'Authentication required' }, 401);
      }
      
      const context = {
        workspaceId: c.req.param('workspaceId') || c.req.query('workspaceId'),
        projectId: c.req.param('projectId') || c.req.query('projectId'),
      };
      
      const hasAll = await permissionChecker.hasAllPermissions(
        userId,
        permissions,
        context
      );
      
      if (!hasAll) {
        logger.warn('Missing required permissions', {
          userId,
          requiredPermissions: permissions
        }, 'RBAC');
        
        return c.json({
          error: 'Insufficient permissions',
          required: permissions
        }, 403);
      }
      
      await next();
      
    } catch (error) {
      logger.error('All permissions check error', { error, permissions }, 'RBAC');
      return c.json({ error: 'Permission check failed' }, 500);
    }
  };
}

// ==========================================
// WORKSPACE-SCOPED MIDDLEWARE
// ==========================================

/**
 * Require workspace permission
 * 
 * Ensures user has permission within the specified workspace context.
 * Workspace ID is extracted from route params or query.
 * 
 * @example
 * app.get('/api/workspaces/:workspaceId/settings', requireWorkspacePermission('workspace.settings'), getSettings);
 */
export function requireWorkspacePermission(
  permission: string,
  workspaceIdParam: string = 'workspaceId'
) {
  return async (c: Context, next: Next) => {
    try {
      const userId = c.get('userId');
      const workspaceId = c.req.param(workspaceIdParam) || c.req.query(workspaceIdParam);
      
      if (!userId) {
        return c.json({ error: 'Authentication required' }, 401);
      }
      
      if (!workspaceId) {
        return c.json({ error: 'Workspace ID required' }, 400);
      }
      
      const result = await permissionChecker.checkPermission(
        userId,
        permission,
        { workspaceId }
      );
      
      if (!result.allowed) {
        logger.warn('Workspace permission denied', {
          userId,
          workspaceId,
          permission,
          reason: result.reason
        }, 'RBAC');
        
        return c.json({
          error: 'Insufficient workspace permissions',
          required: permission
        }, 403);
      }
      
      await next();
      
    } catch (error) {
      logger.error('Workspace permission check error', { error, permission }, 'RBAC');
      return c.json({ error: 'Permission check failed' }, 500);
    }
  };
}

/**
 * Require project permission
 * 
 * Ensures user has permission within the specified project context.
 * Project ID is extracted from route params or query.
 * 
 * @example
 * app.delete('/api/projects/:projectId/tasks/:taskId', requireProjectPermission('task.delete'), deleteTask);
 */
export function requireProjectPermission(
  permission: string,
  projectIdParam: string = 'projectId'
) {
  return async (c: Context, next: Next) => {
    try {
      const userId = c.get('userId');
      const projectId = c.req.param(projectIdParam) || c.req.query(projectIdParam);
      
      if (!userId) {
        return c.json({ error: 'Authentication required' }, 401);
      }
      
      if (!projectId) {
        return c.json({ error: 'Project ID required' }, 400);
      }
      
      const result = await permissionChecker.checkPermission(
        userId,
        permission,
        { projectId }
      );
      
      if (!result.allowed) {
        logger.warn('Project permission denied', {
          userId,
          projectId,
          permission,
          reason: result.reason
        }, 'RBAC');
        
        return c.json({
          error: 'Insufficient project permissions',
          required: permission
        }, 403);
      }
      
      await next();
      
    } catch (error) {
      logger.error('Project permission check error', { error, permission }, 'RBAC');
      return c.json({ error: 'Permission check failed' }, 500);
    }
  };
}

// ==========================================
// CONVENIENCE MIDDLEWARE
// ==========================================

/**
 * Require workspace manager role
 */
export const requireWorkspaceManager = requireRole('workspace-manager');

/**
 * Require admin permissions
 */
export const requireAdmin = requireAnyPermission([
  'user.manage',
  'workspace.manage',
  'settings.manage'
]);

/**
 * Require project manager permissions
 */
export const requireProjectManager = requirePermission('project.manage');

/**
 * Require team lead permissions
 */
export const requireTeamLead = requireRole('team-lead');

/**
 * Can view workspace
 */
export const canViewWorkspace = requirePermission('workspace.view');

/**
 * Can manage users
 */
export const canManageUsers = requirePermission('user.manage');

/**
 * Can manage projects
 */
export const canManageProjects = requirePermission('project.manage');

/**
 * Can manage tasks
 */
export const canManageTasks = requirePermission('task.manage');

/**
 * Can view reports
 */
export const canViewReports = requirePermission('report.view');

/**
 * Can manage files
 */
export const canManageFiles = requirePermission('file.manage');

// ==========================================
// EXPORTS
// ==========================================

export default {
  // Core
  requirePermission,
  requireRole,
  requireAnyPermission,
  requireAllPermissions,
  
  // Scoped
  requireWorkspacePermission,
  requireProjectPermission,
  
  // Convenience
  requireWorkspaceManager,
  requireAdmin,
  requireProjectManager,
  requireTeamLead,
  canViewWorkspace,
  canManageUsers,
  canManageProjects,
  canManageTasks,
  canViewReports,
  canManageFiles,
};


