/**
 * 🛡️ Unified Role Service
 * 
 * Core service for managing both system and custom roles.
 * Handles role CRUD operations, validation, and statistics.
 * 
 * @phase Phase-2-Week-4
 */

import { eq, and, or, desc, sql, count } from 'drizzle-orm';
import { getDatabase } from '../../database/connection';
import { roles, roleAssignments, roleTemplates, roleAuditLog } from '../../database/schema/rbac-unified';
import { users, projects, tasks } from '../../database/schema';
import { createId } from '@paralleldrive/cuid2';
import { getRolePermissions } from '../../constants/rbac';
import type { UserRole } from '../../types/rbac';
import logger from '../../utils/logger';

// ==========================================
// TYPES
// ==========================================

export interface CreateRoleInput {
  name: string;
  description?: string;
  type: 'system' | 'custom';
  permissions?: string[];
  baseRoleId?: string;
  color?: string;
  icon?: string;
  workspaceId?: string;
  createdBy: string;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissions?: string[];
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface RoleFilters {
  type?: 'system' | 'custom';
  workspaceId?: string;
  isActive?: boolean;
  search?: string;
}

export interface RoleWithStats {
  id: string;
  name: string;
  description: string | null;
  type: 'system' | 'custom';
  permissions: string[] | null;
  color: string;
  usersCount: number;
  lastUsedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

// ==========================================
// UNIFIED ROLE SERVICE
// ==========================================

export class UnifiedRoleService {
  private db = getDatabase();
  
  /**
   * Get role by ID
   */
  async getRole(roleId: string): Promise<RoleWithStats | null> {
    try {
      const role = await this.db
        .select()
        .from(roles)
        .where(eq(roles.id, roleId))
        .limit(1);
      
      if (!role.length) {
        return null;
      }
      
      return role[0] as RoleWithStats;
      
    } catch (error) {
      logger.error('Failed to get role', { error, roleId });
      throw error;
    }
  }
  
  /**
   * List all roles with optional filters
   */
  async listRoles(filters?: RoleFilters): Promise<RoleWithStats[]> {
    try {
      let query = this.db.select().from(roles);
      
      const conditions: any[] = [];
      
      if (filters?.type) {
        conditions.push(eq(roles.type, filters.type));
      }
      
      if (filters?.workspaceId) {
        conditions.push(
          or(
            eq(roles.workspaceId, filters.workspaceId),
            sql`${roles.workspaceId} IS NULL` // Include system roles
          )
        );
      }
      
      if (filters?.isActive !== undefined) {
        conditions.push(eq(roles.isActive, filters.isActive));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      let allRoles = await query.orderBy(
        roles.type, // System roles first
        desc(roles.usersCount), // Most used first
        roles.name
      );
      
      // Apply search filter in memory (more flexible)
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        allRoles = allRoles.filter(role =>
          role.name.toLowerCase().includes(searchLower) ||
          role.description?.toLowerCase().includes(searchLower)
        );
      }
      
      return allRoles as RoleWithStats[];
      
    } catch (error) {
      logger.error('Failed to list roles', { error, filters });
      throw error;
    }
  }
  
  /**
   * Create new role
   */
  async createRole(input: CreateRoleInput): Promise<RoleWithStats> {
    try {
      // Validate
      if (input.type === 'system') {
        throw new Error('Cannot create system roles - they are built-in');
      }
      
      if (!input.workspaceId) {
        throw new Error('Custom roles must be associated with a workspace');
      }
      
      // Check for duplicate name in workspace
      const existing = await this.db
        .select()
        .from(roles)
        .where(
          and(
            eq(roles.name, input.name),
            eq(roles.workspaceId, input.workspaceId),
            eq(roles.isActive, true)
          )
        );
      
      if (existing.length > 0) {
        throw new Error(`Role with name "${input.name}" already exists in this workspace`);
      }
      
      // Load base role permissions if specified
      let finalPermissions = input.permissions || [];
      if (input.baseRoleId) {
        const baseRole = await this.getRole(input.baseRoleId);
        if (baseRole) {
          if (baseRole.type === 'system') {
            // Load from constant
            const basePermissions = getRolePermissions(baseRole.id as UserRole);
            finalPermissions = [...Object.keys(basePermissions).filter(p => basePermissions[p]), ...finalPermissions];
          } else if (baseRole.permissions) {
            // Load from database
            finalPermissions = [...baseRole.permissions, ...finalPermissions];
          }
          // Remove duplicates
          finalPermissions = Array.from(new Set(finalPermissions));
        }
      }
      
      // Create role
      const newRole = {
        id: createId(),
        name: input.name,
        description: input.description || null,
        type: input.type,
        permissions: finalPermissions.length > 0 ? finalPermissions : null,
        baseRoleId: input.baseRoleId || null,
        color: input.color || '#10B981',
        icon: input.icon || null,
        workspaceId: input.workspaceId,
        createdBy: input.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        usersCount: 0,
        lastUsedAt: null,
        isActive: true,
        deletedAt: null,
        deletedBy: null,
      };
      
      await this.db.insert(roles).values(newRole);
      
      // Log creation
      await this.db.insert(roleAuditLog).values({
        id: createId(),
        action: 'role_created',
        roleId: newRole.id,
        userId: null,
        assignmentId: null,
        previousValue: null,
        newValue: newRole as any,
        reason: `Role created: ${input.name}`,
        changedBy: input.createdBy,
        workspaceId: input.workspaceId,
        ipAddress: null,
        userAgent: null,
        timestamp: new Date(),
      });
      
      logger.info('Role created', {
        roleId: newRole.id,
        name: newRole.name,
        type: newRole.type,
        createdBy: input.createdBy
      }, 'RBAC');
      
      return newRole as RoleWithStats;
      
    } catch (error) {
      logger.error('Failed to create role', { error, input }, 'RBAC');
      throw error;
    }
  }
  
  /**
   * Update existing role
   */
  async updateRole(roleId: string, input: UpdateRoleInput, updatedBy: string): Promise<RoleWithStats> {
    try {
      // Get existing role
      const existing = await this.getRole(roleId);
      if (!existing) {
        throw new Error(`Role ${roleId} not found`);
      }
      
      // Cannot update system roles
      if (existing.type === 'system') {
        throw new Error('Cannot update system roles - they are built-in');
      }
      
      // Update role
      const updates: any = {
        updatedAt: new Date(),
      };
      
      if (input.name) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.permissions) updates.permissions = input.permissions;
      if (input.color) updates.color = input.color;
      if (input.icon !== undefined) updates.icon = input.icon;
      if (input.isActive !== undefined) updates.isActive = input.isActive;
      
      await this.db
        .update(roles)
        .set(updates)
        .where(eq(roles.id, roleId));
      
      // Get updated role
      const updated = await this.getRole(roleId);
      
      // Log update
      await this.db.insert(roleAuditLog).values({
        id: createId(),
        action: 'role_updated',
        roleId: roleId,
        userId: null,
        assignmentId: null,
        previousValue: existing as any,
        newValue: updated as any,
        reason: `Role updated: ${updated?.name}`,
        changedBy: updatedBy,
        workspaceId: existing.workspaceId || null,
        ipAddress: null,
        userAgent: null,
        timestamp: new Date(),
      });
      
      logger.info('Role updated', {
        roleId,
        changes: Object.keys(updates),
        updatedBy
      }, 'RBAC');
      
      return updated!;
      
    } catch (error) {
      logger.error('Failed to update role', { error, roleId, input }, 'RBAC');
      throw error;
    }
  }
  
  /**
   * Delete role (soft delete)
   */
  async deleteRole(roleId: string, deletedBy: string): Promise<void> {
    try {
      // Get existing role
      const existing = await this.getRole(roleId);
      if (!existing) {
        throw new Error(`Role ${roleId} not found`);
      }
      
      // Cannot delete system roles
      if (existing.type === 'system') {
        throw new Error('Cannot delete system roles - they are built-in');
      }
      
      // Check if role is in use
      const assignments = await this.db
        .select()
        .from(roleAssignments)
        .where(
          and(
            eq(roleAssignments.roleId, roleId),
            eq(roleAssignments.isActive, true)
          )
        );
      
      if (assignments.length > 0) {
        throw new Error(
          `Cannot delete role - it is assigned to ${assignments.length} user(s). ` +
          `Remove all assignments first.`
        );
      }
      
      // Soft delete
      await this.db
        .update(roles)
        .set({
          isActive: false,
          deletedAt: new Date(),
          deletedBy: deletedBy,
          updatedAt: new Date(),
        })
        .where(eq(roles.id, roleId));
      
      // Log deletion
      await this.db.insert(roleAuditLog).values({
        id: createId(),
        action: 'role_deleted',
        roleId: roleId,
        userId: null,
        assignmentId: null,
        previousValue: existing as any,
        newValue: null,
        reason: `Role deleted: ${existing.name}`,
        changedBy: deletedBy,
        workspaceId: existing.workspaceId || null,
        ipAddress: null,
        userAgent: null,
        timestamp: new Date(),
      });
      
      logger.info('Role deleted', {
        roleId,
        name: existing.name,
        deletedBy
      }, 'RBAC');
      
    } catch (error) {
      logger.error('Failed to delete role', { error, roleId }, 'RBAC');
      throw error;
    }
  }
  
  /**
   * Clone role
   */
  async cloneRole(roleId: string, newName: string, createdBy: string): Promise<RoleWithStats> {
    try {
      const source = await this.getRole(roleId);
      if (!source) {
        throw new Error(`Source role ${roleId} not found`);
      }
      
      // Get permissions
      let permissions: string[] = [];
      if (source.type === 'system') {
        const rolePerms = getRolePermissions(source.id as UserRole);
        permissions = Object.keys(rolePerms).filter(p => rolePerms[p]);
      } else if (source.permissions) {
        permissions = source.permissions;
      }
      
      // Create new role
      return await this.createRole({
        name: newName,
        description: source.description || undefined,
        type: 'custom',
        permissions,
        baseRoleId: roleId,
        color: source.color,
        icon: source.icon || undefined,
        workspaceId: source.workspaceId || undefined,
        createdBy,
      });
      
    } catch (error) {
      logger.error('Failed to clone role', { error, roleId, newName }, 'RBAC');
      throw error;
    }
  }
  
  /**
   * Get role usage statistics
   */
  async getRoleUsage(roleId: string): Promise<{
    usersCount: number;
    users: Array<{ id: string; name: string; email: string; assignedAt: Date }>;
    projectsCount: number;
    tasksCreated: number;
    lastUsedAt: Date | null;
  }> {
    try {
      // Get assigned users
      // Get active role assignments with user details
      const assignmentsWithUsers = await this.db
        .select({
          userId: roleAssignments.userId,
          assignedAt: roleAssignments.assignedAt,
          userName: users.name,
          userEmail: users.email,
          userAvatar: users.avatar,
        })
        .from(roleAssignments)
        .innerJoin(users, eq(users.id, roleAssignments.userId))
        .where(
          and(
            eq(roleAssignments.roleId, roleId),
            eq(roleAssignments.isActive, true)
          )
        );
      
      // Get project count for users with this role
      const projectCounts = await this.db
        .select({
          count: count(projects.id)
        })
        .from(projects)
        .innerJoin(roleAssignments, and(
          eq(projects.ownerId, roleAssignments.userId),
          eq(roleAssignments.roleId, roleId),
          eq(roleAssignments.isActive, true)
        ));
      
      const projectsCount = projectCounts[0]?.count || 0;
      
      // Get task count created by users with this role
      const taskCounts = await this.db
        .select({
          count: count(tasks.id)
        })
        .from(tasks)
        .innerJoin(roleAssignments, and(
          eq(tasks.assigneeId, roleAssignments.userId),
          eq(roleAssignments.roleId, roleId),
          eq(roleAssignments.isActive, true)
        ));
      
      const tasksCreated = taskCounts[0]?.count || 0;
      
      // Get most recent assignment date as lastUsedAt
      const mostRecentAssignment = assignmentsWithUsers.sort((a, b) => 
        new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
      )[0];
      
      return {
        usersCount: assignmentsWithUsers.length,
        users: assignmentsWithUsers.map(assignment => ({
          id: assignment.userId,
          name: assignment.userName,
          email: assignment.userEmail,
          avatar: assignment.userAvatar || undefined,
          assignedAt: assignment.assignedAt,
        })),
        projectsCount: Number(projectsCount),
        tasksCreated: Number(tasksCreated),
        lastUsedAt: mostRecentAssignment?.assignedAt || null,
      };
      
    } catch (error) {
      logger.error('Failed to get role usage', { error, roleId }, 'RBAC');
      throw error;
    }
  }
  
  /**
   * Create role from template
   */
  async createFromTemplate(
    templateId: string,
    customizations: Partial<CreateRoleInput>,
    createdBy: string
  ): Promise<RoleWithStats> {
    try {
      // Get template
      const template = await this.db
        .select()
        .from(roleTemplates)
        .where(eq(roleTemplates.id, templateId))
        .limit(1);
      
      if (!template.length) {
        throw new Error(`Template ${templateId} not found`);
      }
      
      const tmpl = template[0];
      
      // Merge template with customizations
      const roleData: CreateRoleInput = {
        name: customizations.name || tmpl.name,
        description: customizations.description || tmpl.description || undefined,
        type: 'custom',
        permissions: customizations.permissions || (tmpl.permissions as string[]),
        color: customizations.color || tmpl.color,
        icon: customizations.icon || tmpl.icon || undefined,
        workspaceId: customizations.workspaceId!,
        createdBy,
      };
      
      // Create role
      const newRole = await this.createRole(roleData);
      
      // Increment template usage count
      await this.db
        .update(roleTemplates)
        .set({
          usageCount: sql`${roleTemplates.usageCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(roleTemplates.id, templateId));
      
      logger.info('Role created from template', {
        templateId,
        roleId: newRole.id,
        createdBy
      }, 'RBAC');
      
      return newRole;
      
    } catch (error) {
      logger.error('Failed to create role from template', { error, templateId }, 'RBAC');
      throw error;
    }
  }
  
  /**
   * Get all available permissions
   */
  getAllPermissions(): string[] {
    // This would return all possible permissions in the system
    // For now, return a combined list from system roles
    const allPerms = new Set<string>();
    
    const systemRoles: UserRole[] = [
      'workspace-manager',
      'department-head',
      'workspace-viewer',
      'project-manager',
      'project-viewer',
      'team-lead',
      'member',
      'client',
      'contractor',
      'stakeholder',
      'guest',
    ];
    
    systemRoles.forEach(role => {
      const perms = getRolePermissions(role);
      Object.keys(perms).forEach(p => allPerms.add(p));
    });
    
    return Array.from(allPerms).sort();
  }
  
  /**
   * Compare multiple roles
   */
  async compareRoles(roleIds: string[]): Promise<{
    roles: RoleWithStats[];
    permissionMatrix: Record<string, Record<string, boolean>>;
  }> {
    try {
      // Get all roles
      const allRoles = await Promise.all(
        roleIds.map(id => this.getRole(id))
      );
      
      const validRoles = allRoles.filter(r => r !== null) as RoleWithStats[];
      
      // Get all permissions
      const allPermissions = this.getAllPermissions();
      
      // Build permission matrix
      const permissionMatrix: Record<string, Record<string, boolean>> = {};
      
      for (const permission of allPermissions) {
        permissionMatrix[permission] = {};
        
        for (const role of validRoles) {
          let hasPermission = false;
          
          if (role.type === 'system') {
            const rolePerms = getRolePermissions(role.id as UserRole);
            hasPermission = rolePerms[permission] || false;
          } else if (role.permissions) {
            hasPermission = role.permissions.includes(permission);
          }
          
          permissionMatrix[permission][role.id] = hasPermission;
        }
      }
      
      return {
        roles: validRoles,
        permissionMatrix,
      };
      
    } catch (error) {
      logger.error('Failed to compare roles', { error, roleIds }, 'RBAC');
      throw error;
    }
  }
}

// Export singleton instance
export const unifiedRoleService = new UnifiedRoleService();
export default unifiedRoleService;


