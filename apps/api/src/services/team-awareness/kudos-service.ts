/**
 * Kudos Service
 * Team recognition and appreciation system
 * Phase 2 - Team Awareness Features
 */

import { getDatabase } from '../../database/connection';
import { kudos } from '../../database/schema/team-awareness';
import { users } from '../../database/schema';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { Logger } from '../logging/logger';
import { CacheService, CacheTTL } from '../cache/cache-service';
import { createId } from '@paralleldrive/cuid2';

export type KudosType = 
  | 'great-work'
  | 'helpful'
  | 'creative'
  | 'teamwork'
  | 'leadership'
  | 'problem-solving';

export interface GiveKudosParams {
  workspaceId: string;
  projectId?: string;
  giverId: string;
  receiverId: string;
  type: KudosType;
  message: string;
  relatedEntityType?: 'task' | 'project' | 'sprint';
  relatedEntityId?: string;
  isPublic?: boolean;
}

export interface KudosFilters {
  workspaceId: string;
  userId?: string; // Filter by giver or receiver
  projectId?: string;
  type?: KudosType;
  isPublic?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Kudos Service
 */
export class KudosService {
  private static getDb() {
    return getDatabase();
  }

  /**
   * Give kudos to a team member
   */
  static async giveKudos(params: GiveKudosParams) {
    try {
      const kudosId = createId();

      const [newKudos] = await this.getDb()
        .insert(kudos)
        .values({
          id: kudosId,
          workspaceId: params.workspaceId,
          projectId: params.projectId,
          giverId: params.giverId,
          receiverId: params.receiverId,
          type: params.type,
          message: params.message,
          relatedEntityType: params.relatedEntityType,
          relatedEntityId: params.relatedEntityId,
          isPublic: params.isPublic ?? true,
          reactions: {},
        })
        .returning();

      // Invalidate caches
      await CacheService.invalidatePattern(`kudos:${params.workspaceId}*`);
      await CacheService.invalidatePattern(`kudos:user:${params.receiverId}*`);

      Logger.business('Kudos given', {
        giverId: params.giverId,
        receiverId: params.receiverId,
        type: params.type,
      });

      return newKudos;
    } catch (error) {
      Logger.error('Failed to give kudos', error, params);
      throw error;
    }
  }

  /**
   * Get kudos with filters
   */
  static async getKudos(filters: KudosFilters) {
    const cacheKey = `kudos:${filters.workspaceId}:${filters.userId || 'all'}:${filters.projectId || 'all'}`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        const conditions = [eq(kudos.workspaceId, filters.workspaceId)];

        if (filters.userId) {
          // Get kudos where user is either giver or receiver
          conditions.push(
            sql`(${kudos.giverId} = ${filters.userId} OR ${kudos.receiverId} = ${filters.userId})`
          );
        }

        if (filters.projectId) {
          conditions.push(eq(kudos.projectId, filters.projectId));
        }

        if (filters.type) {
          conditions.push(eq(kudos.type, filters.type));
        }

        if (filters.isPublic !== undefined) {
          conditions.push(eq(kudos.isPublic, filters.isPublic));
        }

        const result = await this.getDb()
          .select({
            id: kudos.id,
            workspaceId: kudos.workspaceId,
            projectId: kudos.projectId,
            giverId: kudos.giverId,
            receiverId: kudos.receiverId,
            type: kudos.type,
            message: kudos.message,
            relatedEntityType: kudos.relatedEntityType,
            relatedEntityId: kudos.relatedEntityId,
            isPublic: kudos.isPublic,
            reactions: kudos.reactions,
            createdAt: kudos.createdAt,
            giver: {
              id: users.id,
              username: users.name,
              email: users.email,
              avatarUrl: users.avatar,
            },
          })
          .from(kudos)
          .leftJoin(users, eq(kudos.giverId, users.id))
          .where(and(...conditions))
          .orderBy(desc(kudos.createdAt))
          .limit(filters.limit || 50)
          .offset(filters.offset || 0);

        // Fetch receiver data separately
        const receiverIds = result.map(k => k.receiverId);
        const receivers = await this.getDb()
          .select({
            id: users.id,
            username: users.name,
            email: users.email,
            avatarUrl: users.avatar,
          })
          .from(users)
          .where(inArray(users.id, receiverIds));

        const receiversMap = new Map(receivers.map(r => [r.id, r]));

        return result.map(k => ({
          ...k,
          receiver: receiversMap.get(k.receiverId),
        }));
      },
      CacheTTL.SHORT
    );
  }

  /**
   * Get kudos received by user
   */
  static async getReceivedKudos(userId: string, workspaceId: string, limit: number = 20) {
    const cacheKey = `kudos:user:${userId}:received`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        const result = await this.getDb()
          .select({
            id: kudos.id,
            workspaceId: kudos.workspaceId,
            projectId: kudos.projectId,
            giverId: kudos.giverId,
            receiverId: kudos.receiverId,
            type: kudos.type,
            message: kudos.message,
            relatedEntityType: kudos.relatedEntityType,
            relatedEntityId: kudos.relatedEntityId,
            isPublic: kudos.isPublic,
            reactions: kudos.reactions,
            createdAt: kudos.createdAt,
            giver: {
              id: users.id,
              username: users.name,
              email: users.email,
              avatarUrl: users.avatar,
            },
          })
          .from(kudos)
          .leftJoin(users, eq(kudos.giverId, users.id))
          .where(
            and(
              eq(kudos.receiverId, userId),
              eq(kudos.workspaceId, workspaceId)
            )
          )
          .orderBy(desc(kudos.createdAt))
          .limit(limit);

        return result;
      },
      CacheTTL.MEDIUM
    );
  }

  /**
   * Get kudos statistics
   */
  static async getKudosStats(userId: string, workspaceId: string) {
    const cacheKey = `kudos:stats:${userId}:${workspaceId}`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        // Count received kudos
        const [receivedCount] = await this.getDb()
          .select({ count: sql<number>`count(*)::int` })
          .from(kudos)
          .where(
            and(
              eq(kudos.receiverId, userId),
              eq(kudos.workspaceId, workspaceId)
            )
          );

        // Count given kudos
        const [givenCount] = await this.getDb()
          .select({ count: sql<number>`count(*)::int` })
          .from(kudos)
          .where(
            and(
              eq(kudos.giverId, userId),
              eq(kudos.workspaceId, workspaceId)
            )
          );

        // Count by type received
        const typeBreakdown = await this.getDb()
          .select({
            type: kudos.type,
            count: sql<number>`count(*)::int`,
          })
          .from(kudos)
          .where(
            and(
              eq(kudos.receiverId, userId),
              eq(kudos.workspaceId, workspaceId)
            )
          )
          .groupBy(kudos.type);

        return {
          received: receivedCount?.count || 0,
          given: givenCount?.count || 0,
          typeBreakdown,
        };
      },
      CacheTTL.MEDIUM
    );
  }

  /**
   * Add reaction to kudos
   */
  static async addReaction(kudosId: string, userId: string, emoji: string) {
    try {
      const [existingKudos] = await this.getDb()
        .select()
        .from(kudos)
        .where(eq(kudos.id, kudosId))
        .limit(1);

      if (!existingKudos) {
        throw new Error('Kudos not found');
      }

      const reactions = (existingKudos.reactions as any) || {};
      
      if (!reactions[emoji]) {
        reactions[emoji] = [];
      }

      // Toggle reaction (add if not present, remove if present)
      const userIndex = reactions[emoji].indexOf(userId);
      if (userIndex > -1) {
        reactions[emoji].splice(userIndex, 1);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      } else {
        reactions[emoji].push(userId);
      }

      await this.getDb()
        .update(kudos)
        .set({ reactions })
        .where(eq(kudos.id, kudosId));

      // Invalidate cache
      await CacheService.invalidatePattern(`kudos:${existingKudos.workspaceId}*`);

      Logger.info('Kudos reaction updated', { kudosId, userId, emoji });

      return reactions;
    } catch (error) {
      Logger.error('Failed to add kudos reaction', error, { kudosId, userId, emoji });
      throw error;
    }
  }

  /**
   * Get top kudos receivers (leaderboard)
   */
  static async getTopReceivers(workspaceId: string, limit: number = 10) {
    const cacheKey = `kudos:leaderboard:${workspaceId}`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        const topReceivers = await this.getDb()
          .select({
            receiverId: kudos.receiverId,
            count: sql<number>`count(*)::int`,
            user: {
              id: users.id,
              username: users.name,
              email: users.email,
              avatarUrl: users.avatar,
            },
          })
          .from(kudos)
          .leftJoin(users, eq(kudos.receiverId, users.id))
          .where(eq(kudos.workspaceId, workspaceId))
          .groupBy(kudos.receiverId, users.id, users.name, users.email, users.avatar)
          .orderBy(desc(sql`count(*)`))
          .limit(limit);

        return topReceivers;
      },
      CacheTTL.LONG
    );
  }

  /**
   * Delete kudos
   */
  static async deleteKudos(kudosId: string, userId: string) {
    try {
      const [existingKudos] = await this.getDb()
        .select()
        .from(kudos)
        .where(eq(kudos.id, kudosId))
        .limit(1);

      if (!existingKudos) {
        throw new Error('Kudos not found');
      }

      // Only giver can delete
      if (existingKudos.giverId !== userId) {
        throw new Error('Only the kudos giver can delete');
      }

      await this.getDb().delete(kudos).where(eq(kudos.id, kudosId));

      // Invalidate cache
      await CacheService.invalidatePattern(`kudos:${existingKudos.workspaceId}*`);

      Logger.info('Kudos deleted', { kudosId, userId });
    } catch (error) {
      Logger.error('Failed to delete kudos', error, { kudosId, userId });
      throw error;
    }
  }

  /**
   * Get recent kudos wall
   */
  static async getKudosWall(workspaceId: string, limit: number = 20) {
    const cacheKey = `kudos:wall:${workspaceId}`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        return this.getKudos({
          workspaceId,
          isPublic: true,
          limit,
        });
      },
      CacheTTL.SHORT
    );
  }
}

export default KudosService;



