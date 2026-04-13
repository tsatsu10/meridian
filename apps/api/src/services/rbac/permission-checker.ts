/**
 * 🔐 Unified Permission Checker
 * 
 * Core permission checking logic for both system and custom roles.
 * Handles role-based permissions, custom overrides, and contextual scoping.
 * 
 * @phase Phase-2-Week-4
 */

import { eq, and, or, sql } from 'drizzle-orm';
import { getDatabase } from '../../database/connection';
import { roles, roleAssignments, permissionOverrides } from '../../database/schema/rbac-unified';
import { getRolePermissions } from '../../constants/rbac';
import type { UserRole } from '../../types/rbac';
import logger from '../../utils/logger';

// ==========================================
// TYPES
// ==========================================

export interface PermissionContext {
  workspaceId?: string;
  projectId?: string;
  departmentId?: string;
  resourceType?: string;
  resourceId?: string;
}

export interface PermissionResult {
  allowed: boolean;
  reason: string;
  source: 'role' | 'override' | 'denied';
  roleId?: string;
  roleName?: string;
}

export interface UserPermissions {
  userId: string;
  roles: Array<{
    id: string;
    name: string;
    type: 'system' | 'custom';
    permissions: string[];
  }>;
  overrides: Array<{
    permission: string;
    granted: boolean;
    reason: string;
  }>;
  computedPermissions: Set<string>;
}

// ==========================================
// PERMISSION CHECKER
// ==========================================

export class PermissionChecker {
  private db = getDatabase();
  
  /**
   * Check if user has a specific permission
   * 
   * Resolution order:
   * 1. Check permission overrides (grants/revokes)
   * 2. Check role permissions (system + custom)
   * 3. Deny by default
   */
  async checkPermission(
    userId: string,
    permission: string,
    context?: PermissionContext
  ): Promise<PermissionResult> {
    try {
      // Step 1: Check for explicit permission overrides
      const override = await this.checkPermissionOverride(userId, permission, context);
      if (override !== null) {
        return {
          allowed: override.granted,
          reason: override.reason || (override.granted ? 'Explicitly granted' : 'Explicitly revoked'),
          source: 'override',
        };
      }
      
      // Step 2: Check role permissions
      const rolePermission = await this.checkRolePermission(userId, permission, context);
      if (rolePermission.allowed) {
        return rolePermission;
      }
      
      // Step 3: Deny by default
      return {
        allowed: false,
        reason: 'Permission not granted by any role',
        source: 'denied',
      };
      
    } catch (error) {
      logger.error('Permission check failed', {
        error,
        userId,
        permission,
        context
      }, 'RBAC');
      
      // Fail closed - deny on error
      return {
        allowed: false,
        reason: 'Permission check error',
        source: 'denied',
      };
    }
  }
  
  /**
   * Check permission overrides
   */
  private async checkPermissionOverride(
    userId: string,
    permission: string,
    context?: PermissionContext
  ): Promise<{ granted: boolean; reason: string } | null> {
    try {
      const conditions: any[] = [
        eq(permissionOverrides.userId, userId),
        eq(permissionOverrides.permission, permission),
        eq(permissionOverrides.isActive, true),
      ];
      
      // Add context filters
      if (context?.workspaceId) {
        conditions.push(
          or(
            eq(permissionOverrides.workspaceId, context.workspaceId),
            sql`${permissionOverrides.workspaceId} IS NULL`
          )
        );
      }
      
      if (context?.projectId) {
        conditions.push(
          or(
            eq(permissionOverrides.projectId, context.projectId),
            sql`${permissionOverrides.projectId} IS NULL`
          )
        );
      }
      
      if (context?.resourceType) {
        conditions.push(
          or(
            eq(permissionOverrides.resourceType, context.resourceType),
            sql`${permissionOverrides.resourceType} IS NULL`
          )
        );
      }
      
      // Check for expiration
      conditions.push(
        or(
          sql`${permissionOverrides.expiresAt} IS NULL`,
          sql`${permissionOverrides.expiresAt} > NOW()`
        )
      );
      
      const overrides = await this.db
        .select()
        .from(permissionOverrides)
        .where(and(...conditions))
        .orderBy(sql`${permissionOverrides.createdAt} DESC`)
        .limit(1);
      
      if (overrides.length > 0) {
        return {
          granted: overrides[0].granted,
          reason: overrides[0].reason || 'Permission override',
        };
      }
      
      return null;
      
    } catch (error) {
      logger.error('Permission override check failed', { error }, 'RBAC');
      return null;
    }
  }
  
  /**
   * Check role-based permissions
   */
  private async checkRolePermission(
    userId: string,
    permission: string,
    context?: PermissionContext
  ): Promise<PermissionResult> {
    try {
      // Get user's role assignments
      const conditions: any[] = [
        eq(roleAssignments.userId, userId),
        eq(roleAssignments.isActive, true),
      ];
      
      // Add context filters
      if (context?.workspaceId) {
        conditions.push(
          or(
            eq(roleAssignments.workspaceId, context.workspaceId),
            sql`${roleAssignments.workspaceId} IS NULL`
          )
        );
      }
      
      if (context?.projectId) {
        conditions.push(
          or(
            sql`${roleAssignments.projectIds} IS NULL`,
            sql`${roleAssignments.projectIds}::jsonb @> ${JSON.stringify([context.projectId])}::jsonb`
          )
        );
      }
      
      if (context?.departmentId) {
        conditions.push(
          or(
            sql`${roleAssignments.departmentIds} IS NULL`,
            sql`${roleAssignments.departmentIds}::jsonb @> ${JSON.stringify([context.departmentId])}::jsonb`
          )
        );
      }
      
      // Check for expiration
      conditions.push(
        or(
          sql`${roleAssignments.expiresAt} IS NULL`,
          sql`${roleAssignments.expiresAt} > NOW()`
        )
      );
      
      const assignments = await this.db
        .select({
          roleId: roleAssignments.roleId,
          assignmentId: roleAssignments.id,
        })
        .from(roleAssignments)
        .where(and(...conditions));
      
      if (assignments.length === 0) {
        return {
          allowed: false,
          reason: 'No active role assignments found',
          source: 'denied',
        };
      }
      
      // Check each role for the permission
      for (const assignment of assignments) {
        const role = await this.db
          .select()
          .from(roles)
          .where(
            and(
              eq(roles.id, assignment.roleId),
              eq(roles.isActive, true)
            )
          )
          .limit(1);
        
        if (role.length === 0) continue;
        
        const userRole = role[0];
        const hasPermission = await this.roleHasPermission(userRole, permission);
        
        if (hasPermission) {
          return {
            allowed: true,
            reason: `Granted by role: ${userRole.name}`,
            source: 'role',
            roleId: userRole.id,
            roleName: userRole.name,
          };
        }
      }
      
      return {
        allowed: false,
        reason: 'Permission not found in any assigned roles',
        source: 'denied',
      };
      
    } catch (error) {
      logger.error('Role permission check failed', { error }, 'RBAC');
      return {
        allowed: false,
        reason: 'Permission check error',
        source: 'denied',
      };
    }
  }
  
  /**
   * Check if a role has a specific permission
   */
  private async roleHasPermission(
    role: any,
    permission: string
  ): Promise<boolean> {
    if (role.type === 'system') {
      // Load from constant
      const rolePerms = getRolePermissions(role.id as UserRole);
      return rolePerms[permission] === true;
    } else {
      // Load from database
      if (!role.permissions) return false;
      return (role.permissions as string[]).includes(permission);
    }
  }
  
  /**
   * Get all permissions for a user
   */
  async getUserPermissions(
    userId: string,
    context?: PermissionContext
  ): Promise<UserPermissions> {
    try {
      // Get user's role assignments
      const conditions: any[] = [
        eq(roleAssignments.userId, userId),
        eq(roleAssignments.isActive, true),
      ];
      
      // Add context filters
      if (context?.workspaceId) {
        conditions.push(
          or(
            eq(roleAssignments.workspaceId, context.workspaceId),
            sql`${roleAssignments.workspaceId} IS NULL`
          )
        );
      }
      
      const assignments = await this.db
        .select({
          roleId: roleAssignments.roleId,
        })
        .from(roleAssignments)
        .where(and(...conditions));
      
      // Get roles and their permissions
      const userRoles: UserPermissions['roles'] = [];
      const allPermissions = new Set<string>();
      
      for (const assignment of assignments) {
        const role = await this.db
          .select()
          .from(roles)
          .where(eq(roles.id, assignment.roleId))
          .limit(1);
        
        if (role.length === 0) continue;
        
        const userRole = role[0];
        let permissions: string[] = [];
        
        if (userRole.type === 'system') {
          const rolePerms = getRolePermissions(userRole.id as UserRole);
          permissions = Object.keys(rolePerms).filter(p => rolePerms[p]);
        } else if (userRole.permissions) {
          permissions = userRole.permissions as string[];
        }
        
        userRoles.push({
          id: userRole.id,
          name: userRole.name,
          type: userRole.type as 'system' | 'custom',
          permissions,
        });
        
        permissions.forEach(p => allPermissions.add(p));
      }
      
      // Get permission overrides
      const overrideConditions: any[] = [
        eq(permissionOverrides.userId, userId),
        eq(permissionOverrides.isActive, true),
      ];
      
      if (context?.workspaceId) {
        overrideConditions.push(
          or(
            eq(permissionOverrides.workspaceId, context.workspaceId),
            sql`${permissionOverrides.workspaceId} IS NULL`
          )
        );
      }
      
      const overrides = await this.db
        .select()
        .from(permissionOverrides)
        .where(and(...overrideConditions));
      
      const userOverrides = overrides.map(o => ({
        permission: o.permission,
        granted: o.granted,
        reason: o.reason || '',
      }));
      
      // Apply overrides to computed permissions
      overrides.forEach(override => {
        if (override.granted) {
          allPermissions.add(override.permission);
        } else {
          allPermissions.delete(override.permission);
        }
      });
      
      return {
        userId,
        roles: userRoles,
        overrides: userOverrides,
        computedPermissions: allPermissions,
      };
      
    } catch (error) {
      logger.error('Get user permissions failed', { error, userId }, 'RBAC');
      return {
        userId,
        roles: [],
        overrides: [],
        computedPermissions: new Set(),
      };
    }
  }
  
  /**
   * Check multiple permissions at once
   */
  async checkPermissions(
    userId: string,
    permissions: string[],
    context?: PermissionContext
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    // Get all user permissions once
    const userPerms = await this.getUserPermissions(userId, context);
    
    // Check each permission
    for (const permission of permissions) {
      // First check overrides
      const override = userPerms.overrides.find(o => o.permission === permission);
      if (override) {
        results[permission] = override.granted;
        continue;
      }
      
      // Then check computed permissions
      results[permission] = userPerms.computedPermissions.has(permission);
    }
    
    return results;
  }
  
  /**
   * Check if user has ANY of the specified permissions
   */
  async hasAnyPermission(
    userId: string,
    permissions: string[],
    context?: PermissionContext
  ): Promise<boolean> {
    const results = await this.checkPermissions(userId, permissions, context);
    return Object.values(results).some(allowed => allowed);
  }
  
  /**
   * Check if user has ALL of the specified permissions
   */
  async hasAllPermissions(
    userId: string,
    permissions: string[],
    context?: PermissionContext
  ): Promise<boolean> {
    const results = await this.checkPermissions(userId, permissions, context);
    return Object.values(results).every(allowed => allowed);
  }
  
  /**
   * Check if user has a specific role
   */
  async hasRole(
    userId: string,
    roleId: string,
    context?: PermissionContext
  ): Promise<boolean> {
    try {
      const conditions: any[] = [
        eq(roleAssignments.userId, userId),
        eq(roleAssignments.roleId, roleId),
        eq(roleAssignments.isActive, true),
      ];
      
      if (context?.workspaceId) {
        conditions.push(
          or(
            eq(roleAssignments.workspaceId, context.workspaceId),
            sql`${roleAssignments.workspaceId} IS NULL`
          )
        );
      }
      
      const assignment = await this.db
        .select()
        .from(roleAssignments)
        .where(and(...conditions))
        .limit(1);
      
      return assignment.length > 0;
      
    } catch (error) {
      logger.error('Has role check failed', { error, userId, roleId }, 'RBAC');
      return false;
    }
  }
  
  /**
   * Get user's highest priority role
   */
  async getUserPrimaryRole(
    userId: string,
    context?: PermissionContext
  ): Promise<{ id: string; name: string; type: 'system' | 'custom' } | null> {
    try {
      const userPerms = await this.getUserPermissions(userId, context);
      
      if (userPerms.roles.length === 0) {
        return null;
      }
      
      // Priority order for system roles
      const systemRolePriority: Record<string, number> = {
        'workspace-manager': 1,
        'department-head': 2,
        'project-manager': 3,
        'team-lead': 4,
        'member': 5,
        'contractor': 6,
        'client': 7,
        'stakeholder': 8,
        'workspace-viewer': 9,
        'project-viewer': 10,
        'guest': 11,
      };
      
      // Sort roles by priority
      const sortedRoles = [...userPerms.roles].sort((a, b) => {
        if (a.type === 'system' && b.type === 'system') {
          return (systemRolePriority[a.id] || 999) - (systemRolePriority[b.id] || 999);
        }
        if (a.type === 'system') return -1;
        if (b.type === 'system') return 1;
        return 0;
      });
      
      const primaryRole = sortedRoles[0];
      return {
        id: primaryRole.id,
        name: primaryRole.name,
        type: primaryRole.type,
      };
      
    } catch (error) {
      logger.error('Get primary role failed', { error, userId }, 'RBAC');
      return null;
    }
  }
}

// Export singleton instance
export const permissionChecker = new PermissionChecker();
export default permissionChecker;


