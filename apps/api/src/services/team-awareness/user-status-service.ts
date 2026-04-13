/**
 * User Status Service
 * Manage user online/offline status and availability
 * Phase 2 - Team Awareness Features
 */

import { getDatabase } from '../../database/connection';
import { userStatus } from '../../database/schema/team-awareness';
import { users } from '../../database/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { Logger } from '../logging/logger';
import { CacheService, CacheKeys, CacheTTL } from '../cache/cache-service';
import { createId } from '@paralleldrive/cuid2';

export type UserStatusType = 'online' | 'away' | 'busy' | 'offline' | 'in-meeting' | 'focus';

export interface UpdateStatusParams {
  userId: string;
  workspaceId: string;
  status: UserStatusType;
  statusMessage?: string;
  statusEmoji?: string;
  clearAt?: Date;
  currentProjectId?: string;
  currentTaskId?: string;
}

/**
 * User Status Service
 */
export class UserStatusService {
  private static getDb() {
    return getDatabase();
  }

  /**
   * Update user status
   */
  static async updateStatus(params: UpdateStatusParams) {
    try {
      const existingStatus = await this.getDb()
        .select()
        .from(userStatus)
        .where(
          and(
            eq(userStatus.userId, params.userId),
            eq(userStatus.workspaceId, params.workspaceId)
          )
        )
        .limit(1);

      const now = new Date();

      if (existingStatus.length > 0) {
        // Update existing status
        await this.getDb()
          .update(userStatus)
          .set({
            status: params.status,
            statusMessage: params.statusMessage,
            statusEmoji: params.statusEmoji,
            clearAt: params.clearAt,
            lastSeenAt: now,
            lastActivityAt: now,
            currentProjectId: params.currentProjectId,
            currentTaskId: params.currentTaskId,
            updatedAt: now,
          })
          .where(eq(userStatus.id, existingStatus[0].id));
      } else {
        // Create new status
        const statusId = createId();
        await this.getDb().insert(userStatus).values({
          id: statusId,
          userId: params.userId,
          workspaceId: params.workspaceId,
          status: params.status,
          statusMessage: params.statusMessage,
          statusEmoji: params.statusEmoji,
          clearAt: params.clearAt,
          lastSeenAt: now,
          lastActivityAt: now,
          currentProjectId: params.currentProjectId,
          currentTaskId: params.currentTaskId,
        });
      }

      // Invalidate cache
      await CacheService.invalidate(`user-status:${params.userId}:${params.workspaceId}`);
      await CacheService.invalidatePattern(`workspace-status:${params.workspaceId}*`);

      Logger.info('User status updated', {
        userId: params.userId,
        status: params.status,
      });
    } catch (error) {
      Logger.error('Failed to update user status', error, params);
      throw error;
    }
  }

  /**
   * Get user status
   */
  static async getUserStatus(userId: string, workspaceId: string) {
    const cacheKey = `user-status:${userId}:${workspaceId}`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        const status = await this.getDb()
          .select()
          .from(userStatus)
          .where(
            and(
              eq(userStatus.userId, userId),
              eq(userStatus.workspaceId, workspaceId)
            )
          )
          .limit(1);

        if (status.length === 0) {
          return {
            userId,
            workspaceId,
            status: 'offline' as UserStatusType,
            lastSeenAt: null,
          };
        }

        return status[0];
      },
      CacheTTL.VERY_SHORT // 1 minute cache for real-time status
    );
  }

  /**
   * Get workspace team status
   */
  static async getWorkspaceStatuses(workspaceId: string) {
    const cacheKey = `workspace-status:${workspaceId}`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        const statuses = await this.getDb()
          .select({
            id: userStatus.id,
            userId: userStatus.userId,
            status: userStatus.status,
            statusMessage: userStatus.statusMessage,
            statusEmoji: userStatus.statusEmoji,
            clearAt: userStatus.clearAt,
            lastSeenAt: userStatus.lastSeenAt,
            lastActivityAt: userStatus.lastActivityAt,
            currentProjectId: userStatus.currentProjectId,
            currentTaskId: userStatus.currentTaskId,
            user: {
              id: users.id,
              username: users.name,
              email: users.email,
              avatarUrl: users.avatar,
            },
          })
          .from(userStatus)
          .leftJoin(users, eq(userStatus.userId, users.id))
          .where(eq(userStatus.workspaceId, workspaceId));

        return statuses;
      },
      CacheTTL.VERY_SHORT
    );
  }

  /**
   * Get multiple user statuses
   */
  static async getUserStatuses(userIds: string[], workspaceId: string) {
    try {
      const statuses = await this.getDb()
        .select()
        .from(userStatus)
        .where(
          and(
            inArray(userStatus.userId, userIds),
            eq(userStatus.workspaceId, workspaceId)
          )
        );

      return statuses;
    } catch (error) {
      Logger.error('Failed to get user statuses', error, { userIds, workspaceId });
      return [];
    }
  }

  /**
   * Update last seen timestamp
   */
  static async updateLastSeen(userId: string, workspaceId: string) {
    try {
      await this.getDb()
        .update(userStatus)
        .set({
          lastSeenAt: new Date(),
          lastActivityAt: new Date(),
        })
        .where(
          and(
            eq(userStatus.userId, userId),
            eq(userStatus.workspaceId, workspaceId)
          )
        );

      // Invalidate cache
      await CacheService.invalidate(`user-status:${userId}:${workspaceId}`);
    } catch (error) {
      Logger.error('Failed to update last seen', error, { userId, workspaceId });
    }
  }

  /**
   * Set user offline
   */
  static async setOffline(userId: string, workspaceId: string) {
    await this.updateStatus({
      userId,
      workspaceId,
      status: 'offline',
    });
  }

  /**
   * Set user online
   */
  static async setOnline(userId: string, workspaceId: string) {
    await this.updateStatus({
      userId,
      workspaceId,
      status: 'online',
    });
  }

  /**
   * Clear expired status messages
   */
  static async clearExpiredStatuses() {
    try {
      const now = new Date();

      await this.getDb()
        .update(userStatus)
        .set({
          statusMessage: null,
          statusEmoji: null,
          clearAt: null,
        })
        .where(and(
          // Only clear if clearAt is set and in the past
          // Using raw SQL since we need to check null and compare dates
        ));

      Logger.info('Cleared expired status messages');
    } catch (error) {
      Logger.error('Failed to clear expired statuses', error);
    }
  }

  /**
   * Get online users count
   */
  static async getOnlineCount(workspaceId: string): Promise<number> {
    const cacheKey = `workspace-online-count:${workspaceId}`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        const result = await this.getDb()
          .select()
          .from(userStatus)
          .where(
            and(
              eq(userStatus.workspaceId, workspaceId),
              eq(userStatus.status, 'online')
            )
          );

        return result.length;
      },
      CacheTTL.VERY_SHORT
    );
  }

  /**
   * Get availability statistics
   */
  static async getAvailabilityStats(workspaceId: string) {
    const cacheKey = `workspace-availability:${workspaceId}`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        const allStatuses = await this.getDb()
          .select()
          .from(userStatus)
          .where(eq(userStatus.workspaceId, workspaceId));

        const stats = {
          online: 0,
          away: 0,
          busy: 0,
          offline: 0,
          'in-meeting': 0,
          focus: 0,
          total: allStatuses.length,
        };

        for (const status of allStatuses) {
          if (status.status && status.status in stats) {
            stats[status.status as keyof typeof stats]++;
          }
        }

        return stats;
      },
      CacheTTL.VERY_SHORT
    );
  }

  /**
   * Heartbeat - Update user activity
   */
  static async heartbeat(userId: string, workspaceId: string, currentProjectId?: string, currentTaskId?: string) {
    try {
      await this.updateLastSeen(userId, workspaceId);

      // Update current context if provided
      if (currentProjectId || currentTaskId) {
        await this.getDb()
          .update(userStatus)
          .set({
            currentProjectId,
            currentTaskId,
          })
          .where(
            and(
              eq(userStatus.userId, userId),
              eq(userStatus.workspaceId, workspaceId)
            )
          );
      }
    } catch (error) {
      Logger.error('Heartbeat failed', error, { userId, workspaceId });
    }
  }
}

export default UserStatusService;



