/**
 * 👥 Role Assignment Service
 * 
 * Manages role assignments to users with contextual scoping.
 * Handles assignment creation, removal, and history tracking.
 * 
 * @phase Phase-2-Week-4
 */

import { eq, and, or, sql, desc } from 'drizzle-orm';
import { getDatabase } from '../../database/connection';
import { roleAssignments, roles, roleAuditLog } from '../../database/schema/rbac-unified';
import { createId } from '@paralleldrive/cuid2';
import logger from '../../utils/logger';

// ==========================================
// TYPES
// ==========================================

export interface AssignRoleInput {
  userId: string;
  roleId: string;
  workspaceId?: string;
  projectIds?: string[];
  departmentIds?: string[];
  assignedBy: string;
  reason?: string;
  notes?: string;
  expiresAt?: Date;
}

export interface RoleAssignmentWithRole {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  roleType: 'system' | 'custom';
  roleColor: string;
  workspaceId: string | null;
  projectIds: string[] | null;
  departmentIds: string[] | null;
  assignedBy: string;
  assignedAt: Date;
  expiresAt: Date | null;
  reason: string | null;
  notes: string | null;
  isActive: boolean;
}

// ==========================================
// ROLE ASSIGNMENT SERVICE
// ==========================================

export class RoleAssignmentService {
  private db = getDatabase();
  
  /**
   * Assign a role to a user
   */
  async assignRole(input: AssignRoleInput): Promise<RoleAssignmentWithRole> {
    try {
      // Validate role exists
      const role = await this.db
        .select()
        .from(roles)
        .where(eq(roles.id, input.roleId))
        .limit(1);
      
      if (!role.length) {
        throw new Error(`Role ${input.roleId} not found`);
      }
      
      const targetRole = role[0];
      
      // Check if assignment already exists
      const existing = await this.db
        .select()
        .from(roleAssignments)
        .where(
          and(
            eq(roleAssignments.userId, input.userId),
            eq(roleAssignments.roleId, input.roleId),
            eq(roleAssignments.isActive, true),
            input.workspaceId 
              ? eq(roleAssignments.workspaceId, input.workspaceId)
              : sql`${roleAssignments.workspaceId} IS NULL`
          )
        );
      
      if (existing.length > 0) {
        throw new Error(
          `User already has role ${targetRole.name} in this context`
        );
      }
      
      // Create assignment
      const assignment = {
        id: createId(),
        userId: input.userId,
        roleId: input.roleId,
        workspaceId: input.workspaceId || null,
        projectIds: input.projectIds || null,
        departmentIds: input.departmentIds || null,
        assignedBy: input.assignedBy,
        assignedAt: new Date(),
        expiresAt: input.expiresAt || null,
        reason: input.reason || null,
        notes: input.notes || null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await this.db.insert(roleAssignments).values(assignment);
      
      // Log assignment
      await this.db.insert(roleAuditLog).values({
        id: createId(),
        action: 'role_assigned',
        roleId: input.roleId,
        userId: input.userId,
        assignmentId: assignment.id,
        previousValue: null,
        newValue: assignment as any,
        reason: input.reason || `Role ${targetRole.name} assigned to user`,
        changedBy: input.assignedBy,
        workspaceId: input.workspaceId || null,
        ipAddress: null,
        userAgent: null,
        timestamp: new Date(),
      });
      
      logger.info('Role assigned', {
        assignmentId: assignment.id,
        userId: input.userId,
        roleId: input.roleId,
        roleName: targetRole.name,
        assignedBy: input.assignedBy
      }, 'RBAC');
      
      return {
        ...assignment,
        roleName: targetRole.name,
        roleType: targetRole.type as 'system' | 'custom',
        roleColor: targetRole.color,
      };
      
    } catch (error) {
      logger.error('Failed to assign role', { error, input }, 'RBAC');
      throw error;
    }
  }
  
  /**
   * Remove a role assignment
   */
  async removeAssignment(
    assignmentId: string,
    removedBy: string,
    reason?: string
  ): Promise<void> {
    try {
      // Get existing assignment
      const existing = await this.db
        .select()
        .from(roleAssignments)
        .where(eq(roleAssignments.id, assignmentId))
        .limit(1);
      
      if (!existing.length) {
        throw new Error(`Assignment ${assignmentId} not found`);
      }
      
      const assignment = existing[0];
      
      // Deactivate assignment
      await this.db
        .update(roleAssignments)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(roleAssignments.id, assignmentId));
      
      // Log removal
      await this.db.insert(roleAuditLog).values({
        id: createId(),
        action: 'role_removed',
        roleId: assignment.roleId,
        userId: assignment.userId,
        assignmentId: assignment.id,
        previousValue: assignment as any,
        newValue: null,
        reason: reason || 'Role assignment removed',
        changedBy: removedBy,
        workspaceId: assignment.workspaceId,
        ipAddress: null,
        userAgent: null,
        timestamp: new Date(),
      });
      
      logger.info('Role assignment removed', {
        assignmentId,
        userId: assignment.userId,
        roleId: assignment.roleId,
        removedBy
      }, 'RBAC');
      
    } catch (error) {
      logger.error('Failed to remove assignment', { error, assignmentId }, 'RBAC');
      throw error;
    }
  }
  
  /**
   * Get all role assignments for a user
   */
  async getUserRoles(
    userId: string,
    workspaceId?: string
  ): Promise<RoleAssignmentWithRole[]> {
    try {
      const conditions: any[] = [
        eq(roleAssignments.userId, userId),
        eq(roleAssignments.isActive, true),
      ];
      
      if (workspaceId) {
        conditions.push(
          or(
            eq(roleAssignments.workspaceId, workspaceId),
            sql`${roleAssignments.workspaceId} IS NULL`
          )
        );
      }
      
      // Get assignments with role details
      const assignments = await this.db
        .select({
          assignment: roleAssignments,
          role: roles,
        })
        .from(roleAssignments)
        .leftJoin(roles, eq(roleAssignments.roleId, roles.id))
        .where(and(...conditions))
        .orderBy(desc(roleAssignments.assignedAt));
      
      return assignments.map(({ assignment, role }) => ({
        id: assignment.id,
        userId: assignment.userId,
        roleId: assignment.roleId,
        roleName: role?.name || 'Unknown',
        roleType: (role?.type as 'system' | 'custom') || 'custom',
        roleColor: role?.color || '#6B7280',
        workspaceId: assignment.workspaceId,
        projectIds: assignment.projectIds as string[] | null,
        departmentIds: assignment.departmentIds as string[] | null,
        assignedBy: assignment.assignedBy,
        assignedAt: assignment.assignedAt,
        expiresAt: assignment.expiresAt,
        reason: assignment.reason,
        notes: assignment.notes,
        isActive: assignment.isActive,
      }));
      
    } catch (error) {
      logger.error('Failed to get user roles', { error, userId }, 'RBAC');
      throw error;
    }
  }
  
  /**
   * Get all users with a specific role
   */
  async getRoleUsers(
    roleId: string,
    workspaceId?: string
  ): Promise<Array<{
    userId: string;
    assignmentId: string;
    assignedAt: Date;
    assignedBy: string;
  }>> {
    try {
      const conditions: any[] = [
        eq(roleAssignments.roleId, roleId),
        eq(roleAssignments.isActive, true),
      ];
      
      if (workspaceId) {
        conditions.push(eq(roleAssignments.workspaceId, workspaceId));
      }
      
      const assignments = await this.db
        .select({
          userId: roleAssignments.userId,
          assignmentId: roleAssignments.id,
          assignedAt: roleAssignments.assignedAt,
          assignedBy: roleAssignments.assignedBy,
        })
        .from(roleAssignments)
        .where(and(...conditions))
        .orderBy(desc(roleAssignments.assignedAt));
      
      return assignments;
      
    } catch (error) {
      logger.error('Failed to get role users', { error, roleId }, 'RBAC');
      throw error;
    }
  }
  
  /**
   * Bulk assign role to multiple users
   */
  async bulkAssignRole(
    userIds: string[],
    roleId: string,
    assignedBy: string,
    options?: {
      workspaceId?: string;
      reason?: string;
      notes?: string;
    }
  ): Promise<{
    successful: string[];
    failed: Array<{ userId: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ userId: string; error: string }> = [];
    
    for (const userId of userIds) {
      try {
        await this.assignRole({
          userId,
          roleId,
          assignedBy,
          workspaceId: options?.workspaceId,
          reason: options?.reason,
          notes: options?.notes,
        });
        successful.push(userId);
      } catch (error) {
        failed.push({
          userId,
          error: (error as Error).message,
        });
      }
    }
    
    logger.info('Bulk role assignment', {
      roleId,
      totalUsers: userIds.length,
      successful: successful.length,
      failed: failed.length,
      assignedBy
    }, 'RBAC');
    
    return { successful, failed };
  }
  
  /**
   * Bulk remove role from multiple users
   */
  async bulkRemoveRole(
    userIds: string[],
    roleId: string,
    removedBy: string,
    reason?: string
  ): Promise<{
    successful: string[];
    failed: Array<{ userId: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ userId: string; error: string }> = [];
    
    for (const userId of userIds) {
      try {
        // Find active assignment
        const assignment = await this.db
          .select()
          .from(roleAssignments)
          .where(
            and(
              eq(roleAssignments.userId, userId),
              eq(roleAssignments.roleId, roleId),
              eq(roleAssignments.isActive, true)
            )
          )
          .limit(1);
        
        if (assignment.length > 0) {
          await this.removeAssignment(assignment[0].id, removedBy, reason);
          successful.push(userId);
        } else {
          failed.push({
            userId,
            error: 'No active assignment found',
          });
        }
      } catch (error) {
        failed.push({
          userId,
          error: (error as Error).message,
        });
      }
    }
    
    logger.info('Bulk role removal', {
      roleId,
      totalUsers: userIds.length,
      successful: successful.length,
      failed: failed.length,
      removedBy
    }, 'RBAC');
    
    return { successful, failed };
  }
  
  /**
   * Update assignment scope (projects/departments)
   */
  async updateAssignmentScope(
    assignmentId: string,
    scope: {
      projectIds?: string[];
      departmentIds?: string[];
    },
    updatedBy: string
  ): Promise<void> {
    try {
      const existing = await this.db
        .select()
        .from(roleAssignments)
        .where(eq(roleAssignments.id, assignmentId))
        .limit(1);
      
      if (!existing.length) {
        throw new Error(`Assignment ${assignmentId} not found`);
      }
      
      await this.db
        .update(roleAssignments)
        .set({
          projectIds: scope.projectIds || null,
          departmentIds: scope.departmentIds || null,
          updatedAt: new Date(),
        })
        .where(eq(roleAssignments.id, assignmentId));
      
      // Log update
      await this.db.insert(roleAuditLog).values({
        id: createId(),
        action: 'role_updated',
        roleId: existing[0].roleId,
        userId: existing[0].userId,
        assignmentId: assignmentId,
        previousValue: existing[0] as any,
        newValue: { ...existing[0], ...scope } as any,
        reason: 'Assignment scope updated',
        changedBy: updatedBy,
        workspaceId: existing[0].workspaceId,
        ipAddress: null,
        userAgent: null,
        timestamp: new Date(),
      });
      
      logger.info('Assignment scope updated', {
        assignmentId,
        scope,
        updatedBy
      }, 'RBAC');
      
    } catch (error) {
      logger.error('Failed to update assignment scope', { error, assignmentId }, 'RBAC');
      throw error;
    }
  }
  
  /**
   * Get assignment history for a user
   */
  async getUserAssignmentHistory(
    userId: string,
    limit: number = 50
  ): Promise<Array<{
    action: string;
    roleId: string;
    roleName?: string;
    timestamp: Date;
    changedBy: string;
    reason: string | null;
  }>> {
    try {
      const history = await this.db
        .select({
          audit: roleAuditLog,
          role: roles,
        })
        .from(roleAuditLog)
        .leftJoin(roles, eq(roleAuditLog.roleId, roles.id))
        .where(
          and(
            eq(roleAuditLog.userId, userId),
            or(
              eq(roleAuditLog.action, 'role_assigned'),
              eq(roleAuditLog.action, 'role_removed')
            )
          )
        )
        .orderBy(desc(roleAuditLog.timestamp))
        .limit(limit);
      
      return history.map(({ audit, role }) => ({
        action: audit.action,
        roleId: audit.roleId || '',
        roleName: role?.name,
        timestamp: audit.timestamp,
        changedBy: audit.changedBy,
        reason: audit.reason,
      }));
      
    } catch (error) {
      logger.error('Failed to get assignment history', { error, userId }, 'RBAC');
      throw error;
    }
  }
}

// Export singleton instance
export const roleAssignmentService = new RoleAssignmentService();
export default roleAssignmentService;


