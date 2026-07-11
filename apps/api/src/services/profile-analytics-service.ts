/**
 * 📊 Profile Analytics Service
 *
 * Handles profile views tracking, analytics calculation,
 * optimization suggestions, and statistics management
 */

import { createId } from "@paralleldrive/cuid2";
import { getDatabase } from "../database/connection";
import {
  userStatistics,
  tasks,
  projectMembers,
  teamMembers,
} from "../database/schema";
import { eq, and, desc, count, sql, gte, lte } from "drizzle-orm";
import logger from "../utils/logger";

/**
 * Calculate user statistics
 */
export async function calculateUserStatistics(
  userId: string,
  workspaceId: string,
): Promise<any> {
  const db = getDatabase();

  try {
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Task stats
    const tasksCompletedWeek = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, userId),
          eq(tasks.status, "done"),
          gte(tasks.completedAt, oneWeekAgo),
        ),
      );

    const tasksCompletedMonth = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, userId),
          eq(tasks.status, "done"),
          gte(tasks.completedAt, oneMonthAgo),
        ),
      );

    const tasksCompletedAllTime = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, userId), eq(tasks.status, "done")));

    const tasksOverdue = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, userId),
          sql`${tasks.status} != 'done'`,
          lte(tasks.dueDate, now),
        ),
      );

    // Project stats
    const projectsActive = await db
      .select({ count: count() })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.userEmail, userId), // Using userId for now
          eq(projectMembers.isActive, true),
        ),
      );

    // Team stats
    const teamsCount = await db
      .select({ count: count() })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    const teamsLeadCount = await db
      .select({ count: count() })
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, userId), eq(teamMembers.role, "lead")));

    // Create or update statistics
    const stats = {
      id: createId(),
      userId,
      tasksCompletedWeek: tasksCompletedWeek[0]?.count || 0,
      tasksCompletedMonth: tasksCompletedMonth[0]?.count || 0,
      tasksCompletedAllTime: tasksCompletedAllTime[0]?.count || 0,
      tasksOverdue: tasksOverdue[0]?.count || 0,
      projectsActive: projectsActive[0]?.count || 0,
      teamsCount: teamsCount[0]?.count || 0,
      teamsLeadCount: teamsLeadCount[0]?.count || 0,
      messagesSent: 0,
      lastCalculated: now,
    };

    // Try to update first, if not exists, insert
    const existingStats = await db
      .select()
      .from(userStatistics)
      .where(eq(userStatistics.userId, userId));

    if (existingStats.length > 0) {
      await db
        .update(userStatistics)
        .set(stats)
        .where(eq(userStatistics.userId, userId));
    } else {
      await db.insert(userStatistics).values(stats);
    }

    return stats;
  } catch (error) {
    logger.error("Error calculating user statistics:", error);
    throw error;
  }
}

/**
 * Get user statistics
 */
export async function getUserStatistics(userId: string): Promise<any> {
  const db = getDatabase();

  try {
    const [stats] = await db
      .select()
      .from(userStatistics)
      .where(eq(userStatistics.userId, userId));

    return stats || null;
  } catch (error) {
    logger.error("Error getting user statistics:", error);
    return null;
  }
}
