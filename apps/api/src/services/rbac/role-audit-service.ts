/**
 * 🔐 Role Audit Service
 * 
 * Comprehensive auditing for all RBAC operations:
 * - Role assignments and removals
 * - Permission grants and revokes
 * - Custom permission overrides
 * - Role hierarchy changes
 * 
 * Provides complete audit trail for compliance and security.
 */

import { createId } from '@paralleldrive/cuid2';
import { getDatabase } from '../../database/connection';
import { roleAuditLog, roleHistoryTable, userTable } from '../../database/schema';
import { winstonLog } from '../../utils/winston-logger';
import { auditLogger } from '../../utils/audit-logger';

export interface RoleAuditContext {
  userId: string;
  changedBy: string;
  workspaceId?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  notes?: string;
}

export interface RoleChangeDetails {
  previousRole?: string;
  newRole: string;
  previousPermissions?: string[];
  newPermissions?: string[];
  previousScope?: any;
  newScope?: any;
}

/**
 * Role Audit Service
 */
export class RoleAuditService {
  /**
   * Log role assignment
   */
  static async logRoleAssignment(
    ctx: RoleAuditContext,
    details: RoleChangeDetails,
    assignmentId?: string
  ): Promise<void> {
    const db = getDatabase();

    try {
      // Create audit log entry
      await db.insert(roleAuditLog).values({
        id: createId(),
        action: 'role_assigned',
        roleId: null, // Legacy field, can be null
        userId: ctx.userId,
        assignmentId,
        previousValue: details.previousRole ? {
          role: details.previousRole,
          permissions: details.previousPermissions,
          scope: details.previousScope,
        } : null,
        newValue: {
          role: details.newRole,
          permissions: details.newPermissions,
          scope: details.newScope,
        },
        reason: ctx.reason || 'Role assigned',
        changedBy: ctx.changedBy,
        workspaceId: ctx.workspaceId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        timestamp: new Date(),
      });

      // Create role history entry (legacy table)
      await db.insert(roleHistoryTable).values({
        id: createId(),
        userId: ctx.userId,
        role: details.newRole,
        workspaceId: ctx.workspaceId,
        action: 'assigned',
        performedBy: ctx.changedBy,
        reason: ctx.reason || 'Role assigned',
        notes: ctx.notes,
        metadata: {
          previousRole: details.previousRole,
          newRole: details.newRole,
          timestamp: new Date().toISOString(),
        },
      });

      // Log with Winston
      winstonLog.security('Role assigned', {
        userId: ctx.userId,
        previousRole: details.previousRole,
        newRole: details.newRole,
        changedBy: ctx.changedBy,
        workspaceId: ctx.workspaceId,
        reason: ctx.reason,
      }, {
        category: 'AUTH',
        requestId: ctx.notes,
      });

      // Log with audit logger
      await auditLogger.logEvent({
        eventType: 'role_change',
        action: 'role_assigned',
        userId: ctx.changedBy,
        workspaceId: ctx.workspaceId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        outcome: 'success',
        severity: 'high',
        details: {
          targetUserId: ctx.userId,
          previousRole: details.previousRole,
          newRole: details.newRole,
          reason: ctx.reason,
        },
        metadata: {
          timestamp: new Date(),
        },
      });

    } catch (error) {
      winstonLog.error('Failed to log role assignment', {
        error: error instanceof Error ? error.message : String(error),
        ctx,
        details,
      }, { category: 'AUTH' });
      
      // Don't throw - audit logging failure shouldn't block the operation
    }
  }

  /**
   * Log role removal
   */
  static async logRoleRemoval(
    ctx: RoleAuditContext,
    previousRole: string,
    assignmentId?: string
  ): Promise<void> {
    const db = getDatabase();

    try {
      await db.insert(roleAuditLog).values({
        id: createId(),
        action: 'role_removed',
        roleId: null,
        userId: ctx.userId,
        assignmentId,
        previousValue: { role: previousRole },
        newValue: { role: 'guest' },
        reason: ctx.reason || 'Role removed',
        changedBy: ctx.changedBy,
        workspaceId: ctx.workspaceId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        timestamp: new Date(),
      });

      await db.insert(roleHistoryTable).values({
        id: createId(),
        userId: ctx.userId,
        role: previousRole,
        workspaceId: ctx.workspaceId,
        action: 'removed',
        performedBy: ctx.changedBy,
        reason: ctx.reason || 'Role removed',
        notes: ctx.notes,
        metadata: {
          previousRole,
          timestamp: new Date().toISOString(),
        },
      });

      winstonLog.security('Role removed', {
        userId: ctx.userId,
        previousRole,
        changedBy: ctx.changedBy,
        workspaceId: ctx.workspaceId,
      });

      await auditLogger.logEvent({
        eventType: 'role_change',
        action: 'role_removed',
        userId: ctx.changedBy,
        workspaceId: ctx.workspaceId,
        outcome: 'success',
        severity: 'high',
        details: {
          targetUserId: ctx.userId,
          previousRole,
        },
      });

    } catch (error) {
      winstonLog.error('Failed to log role removal', { error, ctx });
    }
  }

  /**
   * Log permission grant
   */
  static async logPermissionGrant(
    ctx: RoleAuditContext,
    permission: string,
    scope?: any
  ): Promise<void> {
    const db = getDatabase();

    try {
      await db.insert(roleAuditLog).values({
        id: createId(),
        action: 'permission_granted',
        roleId: null,
        userId: ctx.userId,
        assignmentId: null,
        previousValue: null,
        newValue: { permission, scope },
        reason: ctx.reason || 'Permission granted',
        changedBy: ctx.changedBy,
        workspaceId: ctx.workspaceId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        timestamp: new Date(),
      });

      winstonLog.security('Permission granted', {
        userId: ctx.userId,
        permission,
        scope,
        changedBy: ctx.changedBy,
      });

    } catch (error) {
      winstonLog.error('Failed to log permission grant', { error, ctx });
    }
  }

  /**
   * Log permission revoke
   */
  static async logPermissionRevoke(
    ctx: RoleAuditContext,
    permission: string,
    scope?: any
  ): Promise<void> {
    const db = getDatabase();

    try {
      await db.insert(roleAuditLog).values({
        id: createId(),
        action: 'permission_revoked',
        roleId: null,
        userId: ctx.userId,
        assignmentId: null,
        previousValue: { permission, scope },
        newValue: null,
        reason: ctx.reason || 'Permission revoked',
        changedBy: ctx.changedBy,
        workspaceId: ctx.workspaceId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        timestamp: new Date(),
      });

      winstonLog.security('Permission revoked', {
        userId: ctx.userId,
        permission,
        scope,
        changedBy: ctx.changedBy,
      });

    } catch (error) {
      winstonLog.error('Failed to log permission revoke', { error, ctx });
    }
  }

  /**
   * Get complete audit trail for user
   */
  static async getUserAuditTrail(
    userId: string,
    workspaceId?: string,
    limit: number = 100
  ): Promise<any[]> {
    const db = getDatabase();

    try {
      let query = db
        .select({
          audit: roleAuditLog,
          changedByUser: userTable,
        })
        .from(roleAuditLog)
        .leftJoin(userTable, eq(roleAuditLog.changedBy, userTable.id))
        .where(eq(roleAuditLog.userId, userId))
        .orderBy(desc(roleAuditLog.timestamp))
        .limit(limit);

      const results = await query;

      return results.map(r => ({
        id: r.audit.id,
        action: r.audit.action,
        previousValue: r.audit.previousValue,
        newValue: r.audit.newValue,
        reason: r.audit.reason,
        changedBy: {
          id: r.changedByUser?.id,
          name: r.changedByUser?.name,
          email: r.changedByUser?.email,
        },
        timestamp: r.audit.timestamp,
        ipAddress: r.audit.ipAddress,
        userAgent: r.audit.userAgent,
      }));

    } catch (error) {
      winstonLog.error('Failed to get user audit trail', { error, userId });
      return [];
    }
  }

  /**
   * Get workspace audit trail
   */
  static async getWorkspaceAuditTrail(
    workspaceId: string,
    limit: number = 100
  ): Promise<any[]> {
    const db = getDatabase();

    try {
      const results = await db
        .select({
          audit: roleAuditLog,
          changedByUser: userTable,
          targetUser: userTable,
        })
        .from(roleAuditLog)
        .leftJoin(userTable, eq(roleAuditLog.changedBy, userTable.id))
        .leftJoin(userTable, eq(roleAuditLog.userId, userTable.id))
        .where(eq(roleAuditLog.workspaceId, workspaceId))
        .orderBy(desc(roleAuditLog.timestamp))
        .limit(limit);

      return results.map(r => ({
        id: r.audit.id,
        action: r.audit.action,
        targetUser: {
          id: r.targetUser?.id,
          name: r.targetUser?.name,
          email: r.targetUser?.email,
        },
        previousValue: r.audit.previousValue,
        newValue: r.audit.newValue,
        reason: r.audit.reason,
        changedBy: {
          id: r.changedByUser?.id,
          name: r.changedByUser?.name,
          email: r.changedByUser?.email,
        },
        timestamp: r.audit.timestamp,
      }));

    } catch (error) {
      winstonLog.error('Failed to get workspace audit trail', { error, workspaceId });
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  static async getAuditStats(workspaceId?: string): Promise<{
    totalChanges: number;
    roleAssignments: number;
    roleRemovals: number;
    permissionGrants: number;
    permissionRevokes: number;
    last24Hours: number;
    last7Days: number;
  }> {
    const db = getDatabase();

    try {
      const now = Date.now();
      const last24h = new Date(now - 24 * 60 * 60 * 1000);
      const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

      // Get counts (simplified - in production use proper SQL COUNT)
      const allLogs = await db
        .select()
        .from(roleAuditLog)
        .where(workspaceId ? eq(roleAuditLog.workspaceId, workspaceId) : undefined);

      return {
        totalChanges: allLogs.length,
        roleAssignments: allLogs.filter(l => l.action === 'role_assigned').length,
        roleRemovals: allLogs.filter(l => l.action === 'role_removed').length,
        permissionGrants: allLogs.filter(l => l.action === 'permission_granted').length,
        permissionRevokes: allLogs.filter(l => l.action === 'permission_revoked').length,
        last24Hours: allLogs.filter(l => l.timestamp >= last24h).length,
        last7Days: allLogs.filter(l => l.timestamp >= last7d).length,
      };

    } catch (error) {
      winstonLog.error('Failed to get audit stats', { error, workspaceId });
      return {
        totalChanges: 0,
        roleAssignments: 0,
        roleRemovals: 0,
        permissionGrants: 0,
        permissionRevokes: 0,
        last24Hours: 0,
        last7Days: 0,
      };
    }
  }
}

export default RoleAuditService;


