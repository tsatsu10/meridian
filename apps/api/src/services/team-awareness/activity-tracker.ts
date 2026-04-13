/**
 * Activity Tracker Service
 * Track and retrieve user activities
 * Phase 2 - Team Awareness Features
 */

import { getDatabase } from '../../database/connection';
import { userActivity } from '../../database/schema/team-awareness';
import { users } from '../../database/schema';
import { eq, desc, and, inArray, sql } from 'drizzle-orm';
import { Logger } from '../logging/logger';
import { CacheService, CacheKeys, CacheTTL } from '../cache/cache-service';
import { createId } from '@paralleldrive/cuid2';

export interface ActivityParams {
  userId: string;
  workspaceId: string;
  projectId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityTitle?: string;
  description?: string;
  metadata?: any;
  isPublic?: boolean;
}

export interface ActivityFilters {
  workspaceId: string;
  userId?: string;
  projectId?: string;
  entityType?: string;
  isPublic?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Activity Tracker Service
 */
export class ActivityTracker {
  /**
   * Log an activity
   */
  static async logActivity(params: ActivityParams): Promise<void> {
    try {
      const db = getDatabase();
      const activityId = createId();

      await db.insert(userActivity).values({
        id: activityId,
        userId: params.userId,
        workspaceId: params.workspaceId,
        projectId: params.projectId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityTitle: params.entityTitle,
        description: params.description,
        metadata: params.metadata,
        isPublic: params.isPublic ?? true,
      });

      // TODO: Re-enable cache invalidation once Redis is properly initialized
      // Invalidate activity cache (skip for now if Redis not available)
      try {
        await CacheService.invalidatePattern(`activity:${params.workspaceId}*`);
      } catch (cacheError) {
        // Ignore cache errors - Redis might not be initialized
      }
      
      Logger.business('Activity logged', {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
      });
    } catch (error) {
      Logger.error('Failed to log activity', error, params);
    }
  }

  /**
   * Get recent activities
   */
  static async getActivities(filters: ActivityFilters) {
    const db = getDatabase();
    // TODO: Re-enable caching once Redis is properly initialized
    // const cacheKey = `activity:${filters.workspaceId}:${filters.userId || 'all'}:${filters.projectId || 'all'}`;

    // Directly query without caching for now
    const conditions = [eq(userActivity.workspaceId, filters.workspaceId)];

    if (filters.userId) {
      conditions.push(eq(userActivity.userId, filters.userId));
    }

    if (filters.projectId) {
      conditions.push(eq(userActivity.projectId, filters.projectId));
    }

    if (filters.entityType) {
      conditions.push(eq(userActivity.entityType, filters.entityType));
    }

    if (filters.isPublic !== undefined) {
      conditions.push(eq(userActivity.isPublic, filters.isPublic));
    }

    const activities = await db
      .select({
        id: userActivity.id,
        userId: userActivity.userId,
        workspaceId: userActivity.workspaceId,
        projectId: userActivity.projectId,
        action: userActivity.action,
        entityType: userActivity.entityType,
        entityId: userActivity.entityId,
        entityTitle: userActivity.entityTitle,
        description: userActivity.description,
        metadata: userActivity.metadata,
        isPublic: userActivity.isPublic,
        createdAt: userActivity.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(userActivity)
      .leftJoin(users, eq(userActivity.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(userActivity.createdAt))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);

    return activities;
  }

  /**
   * Get activity statistics
   */
  static async getActivityStats(workspaceId: string, userId?: string) {
    const db = getDatabase();
    // TODO: Re-enable caching once Redis is properly initialized
    // const cacheKey = `activity:stats:${workspaceId}:${userId || 'all'}`;

    const conditions = [eq(userActivity.workspaceId, workspaceId)];

    if (userId) {
      conditions.push(eq(userActivity.userId, userId));
    }

    // Get activity counts by action
    const actionCounts = await db
      .select({
        action: userActivity.action,
        count: sql<number>`count(*)::int`,
      })
      .from(userActivity)
      .where(and(...conditions))
      .groupBy(userActivity.action);

    // Get activity counts by entity type
    const entityTypeCounts = await db
      .select({
        entityType: userActivity.entityType,
        count: sql<number>`count(*)::int`,
      })
      .from(userActivity)
      .where(and(...conditions))
      .groupBy(userActivity.entityType);

    // Get recent activity count (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userActivity)
      .where(
        and(
          ...conditions,
          sql`${userActivity.createdAt} > ${oneDayAgo}`
        )
      );

    return {
      actionCounts,
      entityTypeCounts,
      recentCount: recentCount[0]?.count || 0,
    };
  }

  /**
   * Get most active users
   */
  static async getMostActiveUsers(workspaceId: string, limit: number = 10) {
    const db = getDatabase();
    // TODO: Re-enable caching once Redis is properly initialized
    // const cacheKey = `activity:top-users:${workspaceId}`;

    const activeUsers = await db
      .select({
        userId: userActivity.userId,
        activityCount: sql<number>`count(*)::int`,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(userActivity)
      .leftJoin(users, eq(userActivity.userId, users.id))
      .where(eq(userActivity.workspaceId, workspaceId))
      .groupBy(userActivity.userId, users.id, users.name, users.email)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return activeUsers;
  }

  /**
   * Delete old activities (cleanup)
   */
  static async deleteOldActivities(workspaceId: string, daysToKeep: number = 90): Promise<number> {
    try {
      const db = getDatabase();
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const result = await db
        .delete(userActivity)
        .where(
          and(
            eq(userActivity.workspaceId, workspaceId),
            sql`${userActivity.createdAt} < ${cutoffDate}`
          )
        );

      Logger.info('Deleted old activities', {
        workspaceId,
        daysToKeep,
        deletedCount: result.rowCount,
      });

      return result.rowCount || 0;
    } catch (error) {
      Logger.error('Failed to delete old activities', error, { workspaceId });
      return 0;
    }
  }

  /**
   * Helper: Log task activity
   */
  static async logTaskActivity(
    userId: string,
    workspaceId: string,
    projectId: string,
    action: 'created' | 'updated' | 'completed' | 'deleted' | 'commented',
    taskId: string,
    taskTitle: string,
    metadata?: any
  ) {
    await this.logActivity({
      userId,
      workspaceId,
      projectId,
      action,
      entityType: 'task',
      entityId: taskId,
      entityTitle: taskTitle,
      description: `${action} task "${taskTitle}"`,
      metadata,
    });
  }

  /**
   * Helper: Log project activity
   */
  static async logProjectActivity(
    userId: string,
    workspaceId: string,
    action: 'created' | 'updated' | 'deleted',
    projectId: string,
    projectTitle: string,
    metadata?: any
  ) {
    await this.logActivity({
      userId,
      workspaceId,
      projectId,
      action,
      entityType: 'project',
      entityId: projectId,
      entityTitle: projectTitle,
      description: `${action} project "${projectTitle}"`,
      metadata,
    });
  }

  /**
   * Helper: Log comment activity
   */
  static async logCommentActivity(
    userId: string,
    workspaceId: string,
    projectId: string,
    entityType: 'task' | 'project',
    entityId: string,
    entityTitle: string,
    commentText: string
  ) {
    await this.logActivity({
      userId,
      workspaceId,
      projectId,
      action: 'commented',
      entityType,
      entityId,
      entityTitle,
      description: `commented on ${entityType} "${entityTitle}"`,
      metadata: { commentPreview: commentText.substring(0, 100) },
    });
  }

  /**
   * Helper: Log file activity
   */
  static async logFileActivity(
    userId: string,
    workspaceId: string,
    projectId: string | undefined,
    action: 'uploaded' | 'deleted',
    fileId: string,
    fileName: string,
    metadata?: any
  ) {
    await this.logActivity({
      userId,
      workspaceId,
      projectId,
      action,
      entityType: 'file',
      entityId: fileId,
      entityTitle: fileName,
      description: `${action} file "${fileName}"`,
      metadata,
    });
  }
}

export default ActivityTracker;



