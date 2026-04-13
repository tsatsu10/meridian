/**
 * Mood Tracker Service
 * Track team morale and sentiment
 * Phase 2 - Team Awareness Features
 */

import { getDatabase } from '../../database/connection';
import { moodLog, activityFeedSettings } from '../../database/schema/team-awareness';
import { eq, desc, and, sql, gte, lte } from 'drizzle-orm';
import { Logger } from '../logging/logger';
import { CacheService, CacheTTL } from '../cache/cache-service';
import { createId } from '@paralleldrive/cuid2';

export type MoodType = 'great' | 'good' | 'okay' | 'stressed' | 'overwhelmed' | 'frustrated';
export type WorkloadLevel = 'light' | 'balanced' | 'heavy' | 'overloaded';

export interface LogMoodParams {
  userId: string;
  workspaceId: string;
  projectId?: string;
  mood: MoodType;
  moodScore: number; // 1-5
  note?: string;
  tags?: string[];
  workloadLevel?: WorkloadLevel;
  isAnonymous?: boolean;
}

export interface MoodFilters {
  workspaceId: string;
  userId?: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
  isAnonymous?: boolean;
  limit?: number;
}

/**
 * Mood Tracker Service
 */
export class MoodTrackerService {
  private static getDb() {
    return getDatabase();
  }

  /**
   * Mood to score mapping
   */
  private static readonly MOOD_SCORES: Record<MoodType, number> = {
    great: 5,
    good: 4,
    okay: 3,
    stressed: 2,
    overwhelmed: 1,
    frustrated: 1,
  };

  /**
   * Log user mood
   */
  static async logMood(params: LogMoodParams) {
    try {
      const moodId = createId();

      const [newMood] = await this.getDb()
        .insert(moodLog)
        .values({
          id: moodId,
          userId: params.userId,
          workspaceId: params.workspaceId,
          projectId: params.projectId,
          mood: params.mood,
          moodScore: params.moodScore,
          note: params.note,
          tags: params.tags,
          workloadLevel: params.workloadLevel,
          isAnonymous: params.isAnonymous ?? false,
        })
        .returning();

      // Invalidate caches
      await CacheService.invalidatePattern(`mood:${params.workspaceId}*`);
      if (!params.isAnonymous) {
        await CacheService.invalidatePattern(`mood:user:${params.userId}*`);
      }

      Logger.business('Mood logged', {
        userId: params.isAnonymous ? 'anonymous' : params.userId,
        mood: params.mood,
        moodScore: params.moodScore,
      });

      return newMood;
    } catch (error) {
      Logger.error('Failed to log mood', error, params);
      throw error;
    }
  }

  /**
   * Get mood logs with filters
   */
  static async getMoodLogs(filters: MoodFilters) {
    const cacheKey = `mood:${filters.workspaceId}:${filters.userId || 'all'}:${filters.projectId || 'all'}`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        const conditions = [eq(moodLog.workspaceId, filters.workspaceId)];

        if (filters.userId && !filters.isAnonymous) {
          conditions.push(eq(moodLog.userId, filters.userId));
        }

        if (filters.projectId) {
          conditions.push(eq(moodLog.projectId, filters.projectId));
        }

        if (filters.startDate) {
          conditions.push(gte(moodLog.createdAt, filters.startDate));
        }

        if (filters.endDate) {
          conditions.push(lte(moodLog.createdAt, filters.endDate));
        }

        if (filters.isAnonymous !== undefined) {
          conditions.push(eq(moodLog.isAnonymous, filters.isAnonymous));
        }

        const logs = await this.getDb()
          .select()
          .from(moodLog)
          .where(and(...conditions))
          .orderBy(desc(moodLog.createdAt))
          .limit(filters.limit || 50);

        return logs;
      },
      CacheTTL.SHORT
    );
  }

  /**
   * Get user mood history
   */
  static async getUserMoodHistory(userId: string, workspaceId: string, days: number = 30) {
    const cacheKey = `mood:user:${userId}:history:${days}`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const logs = await this.getDb()
          .select()
          .from(moodLog)
          .where(
            and(
              eq(moodLog.userId, userId),
              eq(moodLog.workspaceId, workspaceId),
              gte(moodLog.createdAt, startDate)
            )
          )
          .orderBy(desc(moodLog.createdAt));

        return logs;
      },
      CacheTTL.MEDIUM
    );
  }

  /**
   * Get workspace mood statistics
   */
  static async getWorkspaceMoodStats(workspaceId: string, days: number = 7) {
    const cacheKey = `mood:workspace:${workspaceId}:stats:${days}`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Average mood score
        const [avgMood] = await this.getDb()
          .select({
            average: sql<number>`AVG(${moodLog.moodScore})::float`,
            count: sql<number>`count(*)::int`,
          })
          .from(moodLog)
          .where(
            and(
              eq(moodLog.workspaceId, workspaceId),
              gte(moodLog.createdAt, startDate)
            )
          );

        // Mood distribution
        const moodDistribution = await this.getDb()
          .select({
            mood: moodLog.mood,
            count: sql<number>`count(*)::int`,
          })
          .from(moodLog)
          .where(
            and(
              eq(moodLog.workspaceId, workspaceId),
              gte(moodLog.createdAt, startDate)
            )
          )
          .groupBy(moodLog.mood);

        // Workload distribution
        const workloadDistribution = await this.getDb()
          .select({
            workloadLevel: moodLog.workloadLevel,
            count: sql<number>`count(*)::int`,
          })
          .from(moodLog)
          .where(
            and(
              eq(moodLog.workspaceId, workspaceId),
              gte(moodLog.createdAt, startDate),
              sql`${moodLog.workloadLevel} IS NOT NULL`
            )
          )
          .groupBy(moodLog.workloadLevel);

        // Common tags
        const allTags = await this.getDb()
          .select({ tags: moodLog.tags })
          .from(moodLog)
          .where(
            and(
              eq(moodLog.workspaceId, workspaceId),
              gte(moodLog.createdAt, startDate),
              sql`${moodLog.tags} IS NOT NULL`
            )
          );

        // Flatten and count tags
        const tagCounts: Record<string, number> = {};
        for (const log of allTags) {
          if (log.tags && Array.isArray(log.tags)) {
            for (const tag of log.tags) {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            }
          }
        }

        const topTags = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag, count]) => ({ tag, count }));

        return {
          averageMood: avgMood?.average || 0,
          totalLogs: avgMood?.count || 0,
          moodDistribution,
          workloadDistribution,
          topTags,
        };
      },
      CacheTTL.MEDIUM
    );
  }

  /**
   * Get mood trend (daily averages)
   */
  static async getMoodTrend(workspaceId: string, days: number = 30) {
    const cacheKey = `mood:workspace:${workspaceId}:trend:${days}`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const trend = await this.getDb()
          .select({
            date: sql<string>`DATE(${moodLog.createdAt})`,
            averageMood: sql<number>`AVG(${moodLog.moodScore})::float`,
            count: sql<number>`count(*)::int`,
          })
          .from(moodLog)
          .where(
            and(
              eq(moodLog.workspaceId, workspaceId),
              gte(moodLog.createdAt, startDate)
            )
          )
          .groupBy(sql`DATE(${moodLog.createdAt})`)
          .orderBy(sql`DATE(${moodLog.createdAt})`);

        return trend;
      },
      CacheTTL.LONG
    );
  }

  /**
   * Check if user should log mood today
   */
  static async shouldLogMoodToday(userId: string, workspaceId: string): Promise<boolean> {
    try {
      // Check user's mood reminder settings
      const [settings] = await this.getDb()
        .select()
        .from(activityFeedSettings)
        .where(
          and(
            eq(activityFeedSettings.userId, userId),
            eq(activityFeedSettings.workspaceId, workspaceId)
          )
        )
        .limit(1);

      if (!settings || !settings.moodReminderEnabled) {
        return false;
      }

      // Check if already logged today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayLog] = await this.getDb()
        .select()
        .from(moodLog)
        .where(
          and(
            eq(moodLog.userId, userId),
            eq(moodLog.workspaceId, workspaceId),
            gte(moodLog.createdAt, today)
          )
        )
        .limit(1);

      if (todayLog) {
        return false; // Already logged today
      }

      // Check if today is a reminder day
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()];
      const reminderDays = settings.moodReminderDays as string[] || ['monday', 'wednesday', 'friday'];

      return reminderDays.includes(dayOfWeek);
    } catch (error) {
      Logger.error('Failed to check mood reminder', error, { userId, workspaceId });
      return false;
    }
  }

  /**
   * Get users who need mood reminders
   */
  static async getUsersNeedingReminders(workspaceId: string): Promise<string[]> {
    try {
      const today = new Date();
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()];
      today.setHours(0, 0, 0, 0);

      // Get users with mood reminders enabled
      const settings = await this.getDb()
        .select()
        .from(activityFeedSettings)
        .where(
          and(
            eq(activityFeedSettings.workspaceId, workspaceId),
            eq(activityFeedSettings.moodReminderEnabled, true)
          )
        );

      // Filter users who:
      // 1. Have today in their reminder days
      // 2. Haven't logged mood today
      const userIds: string[] = [];

      for (const setting of settings) {
        const reminderDays = setting.moodReminderDays as string[] || ['monday', 'wednesday', 'friday'];
        
        if (!reminderDays.includes(dayOfWeek)) {
          continue;
        }

        // Check if already logged today
        const [todayLog] = await this.getDb()
          .select()
          .from(moodLog)
          .where(
            and(
              eq(moodLog.userId, setting.userId),
              eq(moodLog.workspaceId, workspaceId),
              gte(moodLog.createdAt, today)
            )
          )
          .limit(1);

        if (!todayLog) {
          userIds.push(setting.userId);
        }
      }

      return userIds;
    } catch (error) {
      Logger.error('Failed to get users needing reminders', error, { workspaceId });
      return [];
    }
  }

  /**
   * Get team morale indicator
   */
  static async getTeamMoraleIndicator(workspaceId: string): Promise<{
    level: 'high' | 'good' | 'moderate' | 'low' | 'critical';
    score: number;
    trend: 'improving' | 'stable' | 'declining';
  }> {
    const cacheKey = `mood:workspace:${workspaceId}:morale`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        // Get average mood for last 7 days
        const stats = await this.getWorkspaceMoodStats(workspaceId, 7);
        const currentScore = stats.averageMood;

        // Get average mood for previous 7 days
        const previousStats = await this.getWorkspaceMoodStats(workspaceId, 14);
        const previousScore = previousStats.averageMood;

        // Determine level
        let level: 'high' | 'good' | 'moderate' | 'low' | 'critical';
        if (currentScore >= 4.5) level = 'high';
        else if (currentScore >= 3.5) level = 'good';
        else if (currentScore >= 2.5) level = 'moderate';
        else if (currentScore >= 1.5) level = 'low';
        else level = 'critical';

        // Determine trend
        let trend: 'improving' | 'stable' | 'declining';
        const diff = currentScore - previousScore;
        if (diff > 0.3) trend = 'improving';
        else if (diff < -0.3) trend = 'declining';
        else trend = 'stable';

        return {
          level,
          score: currentScore,
          trend,
        };
      },
      CacheTTL.MEDIUM
    );
  }
}

export default MoodTrackerService;



