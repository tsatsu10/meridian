/**
 * 🛡️ Unified RBAC API Routes
 * 
 * Complete API for managing roles, assignments, permissions, and templates.
 * Replaces old /api/rbac and /api/settings/roles endpoints.
 * 
 * @phase Phase-2-Week-4
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { unifiedRoleService } from '../../services/rbac/unified-role-service';
import { permissionChecker } from '../../services/rbac/permission-checker';
import { roleAssignmentService } from '../../services/rbac/role-assignment-service';
import { requirePermission, requireWorkspacePermission } from '../../middlewares/rbac-unified';
import logger from '../../utils/logger';

const app = new Hono();

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  baseRoleId: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().optional(),
  workspaceId: z.string(),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
});

const assignRoleSchema = z.object({
  userId: z.string(),
  roleId: z.string(),
  workspaceId: z.string().optional(),
  projectIds: z.array(z.string()).optional(),
  departmentIds: z.array(z.string()).optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

const bulkAssignSchema = z.object({
  userIds: z.array(z.string()),
  roleId: z.string(),
  workspaceId: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const checkPermissionSchema = z.object({
  userId: z.string(),
  permission: z.string(),
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  departmentId: z.string().optional(),
});

const cloneRoleSchema = z.object({
  newName: z.string().min(1).max(100),
});

const createFromTemplateSchema = z.object({
  templateId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  workspaceId: z.string(),
});

// ==========================================
// ROLE MANAGEMENT
// ==========================================

/**
 * GET /api/roles
 * List all roles
 */
app.get('/', requirePermission('role.view'), async (c) => {
  try {
    const type = c.req.query('type') as 'system' | 'custom' | undefined;
    const workspaceId = c.req.query('workspaceId');
    const search = c.req.query('search');
    const isActive = c.req.query('isActive');
    
    const roles = await unifiedRoleService.listRoles({
      type,
      workspaceId,
      search,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
    
    return c.json({ roles });
    
  } catch (error) {
    logger.error('List roles failed', { error }, 'RBAC');
    return c.json({ error: 'Failed to list roles' }, 500);
  }
});

/**
 * GET /api/roles/:id
 * Get role by ID
 */
app.get('/:id', requirePermission('role.view'), async (c) => {
  try {
    const roleId = c.req.param('id');
    const role = await unifiedRoleService.getRole(roleId);
    
    if (!role) {
      return c.json({ error: 'Role not found' }, 404);
    }
    
    return c.json({ role });
    
  } catch (error) {
    logger.error('Get role failed', { error }, 'RBAC');
    return c.json({ error: 'Failed to get role' }, 500);
  }
});

/**
 * POST /api/roles
 * Create new role
 */
app.post('/', requirePermission('role.create'), zValidator('json', createRoleSchema), async (c) => {
  try {
    const userId = c.get('userId');
    const data = c.req.valid('json');
    
    const role = await unifiedRoleService.createRole({
      ...data,
      type: 'custom',
      createdBy: userId,
    });
    
    return c.json({ role }, 201);
    
  } catch (error) {
    logger.error('Create role failed', { error }, 'RBAC');
    return c.json({ error: (error as Error).message || 'Failed to create role' }, 500);
  }
});

/**
 * PUT /api/roles/:id
 * Update role
 */
app.put('/:id', requirePermission('role.edit'), zValidator('json', updateRoleSchema), async (c) => {
  try {
    const userId = c.get('userId');
    const roleId = c.req.param('id');
    const data = c.req.valid('json');
    
    const role = await unifiedRoleService.updateRole(roleId, data, userId);
    
    return c.json({ role });
    
  } catch (error) {
    logger.error('Update role failed', { error }, 'RBAC');
    return c.json({ error: (error as Error).message || 'Failed to update role' }, 500);
  }
});

/**
 * DELETE /api/roles/:id
 * Delete role
 */
app.delete('/:id', requirePermission('role.delete'), async (c) => {
  try {
    const userId = c.get('userId');
    const roleId = c.req.param('id');
    
    await unifiedRoleService.deleteRole(roleId, userId);
    
    return c.json({ message: 'Role deleted successfully' });
    
  } catch (error) {
    logger.error('Delete role failed', { error }, 'RBAC');
    return c.json({ error: (error as Error).message || 'Failed to delete role' }, 500);
  }
});

/**
 * POST /api/roles/:id/clone
 * Clone role
 */
app.post('/:id/clone', requirePermission('role.create'), zValidator('json', cloneRoleSchema), async (c) => {
  try {
    const userId = c.get('userId');
    const roleId = c.req.param('id');
    const { newName } = c.req.valid('json');
    
    const role = await unifiedRoleService.cloneRole(roleId, newName, userId);
    
    return c.json({ role }, 201);
    
  } catch (error) {
    logger.error('Clone role failed', { error }, 'RBAC');
    return c.json({ error: (error as Error).message || 'Failed to clone role' }, 500);
  }
});

/**
 * GET /api/roles/:id/usage
 * Get role usage statistics
 */
app.get('/:id/usage', requirePermission('role.view'), async (c) => {
  try {
    const roleId = c.req.param('id');
    const usage = await unifiedRoleService.getRoleUsage(roleId);
    
    return c.json({ usage });
    
  } catch (error) {
    logger.error('Get role usage failed', { error }, 'RBAC');
    return c.json({ error: 'Failed to get role usage' }, 500);
  }
});

/**
 * POST /api/roles/compare
 * Compare multiple roles
 */
app.post('/compare', requirePermission('role.view'), async (c) => {
  try {
    const { roleIds } = await c.req.json();
    
    if (!Array.isArray(roleIds) || roleIds.length < 2) {
      return c.json({ error: 'At least 2 role IDs required' }, 400);
    }
    
    const comparison = await unifiedRoleService.compareRoles(roleIds);
    
    return c.json({ comparison });
    
  } catch (error) {
    logger.error('Compare roles failed', { error }, 'RBAC');
    return c.json({ error: 'Failed to compare roles' }, 500);
  }
});

// ==========================================
// ROLE ASSIGNMENTS
// ==========================================

/**
 * GET /api/roles/assignments
 * List all role assignments
 */
app.get('/assignments', requirePermission('role.view'), async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const userId = c.req.query('userId');
    const roleId = c.req.query('roleId');
    
    let assignments;
    
    if (userId) {
      assignments = await roleAssignmentService.getUserRoles(userId, workspaceId);
    } else if (roleId) {
      const users = await roleAssignmentService.getRoleUsers(roleId, workspaceId);
      assignments = users;
    } else {
      return c.json({ error: 'userId or roleId required' }, 400);
    }
    
    return c.json({ assignments });
    
  } catch (error) {
    logger.error('List assignments failed', { error }, 'RBAC');
    return c.json({ error: 'Failed to list assignments' }, 500);
  }
});

/**
 * POST /api/roles/assign
 * Assign role to user
 */
app.post('/assign', requirePermission('role.assign'), zValidator('json', assignRoleSchema), async (c) => {
  try {
    const userId = c.get('userId');
    const data = c.req.valid('json');
    
    const assignment = await roleAssignmentService.assignRole({
      ...data,
      assignedBy: userId,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });
    
    return c.json({ assignment }, 201);
    
  } catch (error) {
    logger.error('Assign role failed', { error }, 'RBAC');
    return c.json({ error: (error as Error).message || 'Failed to assign role' }, 500);
  }
});

/**
 * POST /api/roles/assign/bulk
 * Bulk assign role to multiple users
 */
app.post('/assign/bulk', requirePermission('role.assign'), zValidator('json', bulkAssignSchema), async (c) => {
  try {
    const currentUserId = c.get('userId');
    const data = c.req.valid('json');
    
    const result = await roleAssignmentService.bulkAssignRole(
      data.userIds,
      data.roleId,
      currentUserId,
      {
        workspaceId: data.workspaceId,
        reason: data.reason,
        notes: data.notes,
      }
    );
    
    return c.json({ result });
    
  } catch (error) {
    logger.error('Bulk assign role failed', { error }, 'RBAC');
    return c.json({ error: 'Failed to bulk assign role' }, 500);
  }
});

/**
 * DELETE /api/roles/assignments/:id
 * Remove role assignment
 */
app.delete('/assignments/:id', requirePermission('role.assign'), async (c) => {
  try {
    const userId = c.get('userId');
    const assignmentId = c.req.param('id');
    const reason = c.req.query('reason');
    
    await roleAssignmentService.removeAssignment(assignmentId, userId, reason);
    
    return c.json({ message: 'Assignment removed successfully' });
    
  } catch (error) {
    logger.error('Remove assignment failed', { error }, 'RBAC');
    return c.json({ error: (error as Error).message || 'Failed to remove assignment' }, 500);
  }
});

/**
 * GET /api/roles/assignments/history/:userId
 * Get assignment history for user
 */
app.get('/assignments/history/:userId', requirePermission('role.view'), async (c) => {
  try {
    const userId = c.req.param('userId');
    const limit = parseInt(c.req.query('limit') || '50');
    
    const history = await roleAssignmentService.getUserAssignmentHistory(userId, limit);
    
    return c.json({ history });
    
  } catch (error) {
    logger.error('Get assignment history failed', { error }, 'RBAC');
    return c.json({ error: 'Failed to get assignment history' }, 500);
  }
});

/**
 * GET /api/roles/:id/history
 * Get change history for a specific role
 */
app.get('/:id/history', requirePermission('role.view'), async (c) => {
  try {
    const roleId = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '50');
    
    // Import the role audit log table
    const { getDatabase } = await import('../../database/connection');
    const { roleAuditLog, users } = await import('../../database/schema/rbac-unified');
    const { eq, desc } = await import('drizzle-orm');
    
    const db = await getDatabase();
    
    // Get role history from audit log
    const history = await db
      .select({
        id: roleAuditLog.id,
        roleId: roleAuditLog.roleId,
        action: roleAuditLog.action,
        changes: roleAuditLog.changes,
        performedBy: roleAuditLog.performedBy,
        performedByName: users.name,
        performedByEmail: users.email,
        reason: roleAuditLog.reason,
        createdAt: roleAuditLog.createdAt,
      })
      .from(roleAuditLog)
      .leftJoin(users, eq(users.id, roleAuditLog.performedBy))
      .where(eq(roleAuditLog.roleId, roleId))
      .orderBy(desc(roleAuditLog.createdAt))
      .limit(limit);
    
    return c.json({ history });
    
  } catch (error) {
    logger.error('Get role history failed', { error, roleId: c.req.param('id') }, 'RBAC');
    return c.json({ error: 'Failed to get role history' }, 500);
  }
});

// ==========================================
// PERMISSION CHECKING
// ==========================================

/**
 * POST /api/roles/permissions/check
 * Check if user has permission
 */
app.post('/permissions/check', zValidator('json', checkPermissionSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    
    const result = await permissionChecker.checkPermission(
      data.userId,
      data.permission,
      {
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        departmentId: data.departmentId,
      }
    );
    
    return c.json({ result });
    
  } catch (error) {
    logger.error('Check permission failed', { error }, 'RBAC');
    return c.json({ error: 'Failed to check permission' }, 500);
  }
});

/**
 * GET /api/roles/permissions/user/:userId
 * Get all permissions for user
 */
app.get('/permissions/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const workspaceId = c.req.query('workspaceId');
    
    const permissions = await permissionChecker.getUserPermissions(
      userId,
      workspaceId ? { workspaceId } : undefined
    );
    
    return c.json({ permissions });
    
  } catch (error) {
    logger.error('Get user permissions failed', { error }, 'RBAC');
    return c.json({ error: 'Failed to get user permissions' }, 500);
  }
});

/**
 * GET /api/roles/permissions/all
 * Get all available permissions
 */
app.get('/permissions/all', requirePermission('role.view'), async (c) => {
  try {
    const permissions = unifiedRoleService.getAllPermissions();
    
    return c.json({ permissions });
    
  } catch (error) {
    logger.error('Get all permissions failed', { error }, 'RBAC');
    return c.json({ error: 'Failed to get permissions' }, 500);
  }
});

// ==========================================
// TEMPLATES
// ==========================================

/**
 * GET /api/roles/templates
 * List role templates
 */
app.get('/templates', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    
    // TODO: Implement template service
    // For now, return empty array
    return c.json({ templates: [] });
    
  } catch (error) {
    logger.error('List templates failed', { error }, 'RBAC');
    return c.json({ error: 'Failed to list templates' }, 500);
  }
});

/**
 * POST /api/roles/from-template
 * Create role from template
 */
app.post(
  '/from-template',
  requirePermission('role.create'),
  zValidator('json', createFromTemplateSchema),
  async (c) => {
    try {
      const userId = c.get('userId');
      const data = c.req.valid('json');
      
      const role = await unifiedRoleService.createFromTemplate(
        data.templateId,
        {
          name: data.name,
          description: data.description,
          permissions: data.permissions,
          workspaceId: data.workspaceId,
        },
        userId
      );
      
      return c.json({ role }, 201);
      
    } catch (error) {
      logger.error('Create from template failed', { error }, 'RBAC');
      return c.json({ error: (error as Error).message || 'Failed to create from template' }, 500);
    }
  }
);

// ==========================================
// EXPORTS
// ==========================================

export default app;


