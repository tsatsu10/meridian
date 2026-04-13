/**
 * 📈 Work History Service
 * 
 * Tracks career progression within the workspace
 */

import { createId } from "@paralleldrive/cuid2";
import { getDatabase } from "../database/connection";
import { userWorkHistory, users, projects, teams } from "../database/schema";
import { eq, and, desc } from "drizzle-orm";
import logger from "../utils/logger";

export interface WorkHistoryEvent {
  eventType: 'role_change' | 'promotion' | 'project_completed' | 'milestone' | 'team_join' | 'project_join';
  eventTitle: string;
  eventDescription?: string;
  fromValue?: string;
  toValue?: string;
  projectId?: string;
  teamId?: string;
}

/**
 * Record a work history event
 */
export async function recordWorkHistoryEvent(
  userId: string,
  workspaceId: string,
  event: WorkHistoryEvent
): Promise<any> {
  const db = getDatabase();

  try {
    const historyEntry = await db
      .insert(userWorkHistory)
      .values({
        id: createId(),
        userId,
        workspaceId,
        ...event,
        eventDate: new Date(),
      })
      .returning();

    logger.info(`Recorded work history event: ${event.eventType} for user ${userId}`);

    return historyEntry[0];
  } catch (error) {
    logger.error("Error recording work history event:", error);
    throw error;
  }
}

/**
 * Get user work history
 */
export async function getUserWorkHistory(
  userId: string,
  workspaceId?: string,
  options?: { limit?: number; offset?: number }
): Promise<any[]> {
  const db = getDatabase();

  try {
    const conditions = [eq(userWorkHistory.userId, userId)];

    if (workspaceId) {
      conditions.push(eq(userWorkHistory.workspaceId, workspaceId));
    }

    const history = await db
      .select({
        id: userWorkHistory.id,
        eventType: userWorkHistory.eventType,
        eventTitle: userWorkHistory.eventTitle,
        eventDescription: userWorkHistory.eventDescription,
        fromValue: userWorkHistory.fromValue,
        toValue: userWorkHistory.toValue,
        eventDate: userWorkHistory.eventDate,
        // Project info
        projectId: projects.id,
        projectName: projects.name,
        // Team info
        teamId: teams.id,
        teamName: teams.name,
      })
      .from(userWorkHistory)
      .leftJoin(projects, eq(userWorkHistory.projectId, projects.id))
      .leftJoin(teams, eq(userWorkHistory.teamId, teams.id))
      .where(and(...conditions))
      .orderBy(desc(userWorkHistory.eventDate))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return history;
  } catch (error) {
    logger.error("Error getting user work history:", error);
    return [];
  }
}

/**
 * Get tenure milestones
 */
export function getTenureMilestones(daysInWorkspace: number): any[] {
  const milestones = [
    { days: 30, name: "1 Month", icon: "🌟" },
    { days: 90, name: "3 Months", icon: "✨" },
    { days: 180, name: "6 Months", icon: "🎯" },
    { days: 365, name: "1 Year", icon: "🎂" },
    { days: 730, name: "2 Years", icon: "🎉" },
    { days: 1095, name: "3 Years", icon: "🏆" },
    { days: 1460, name: "4 Years", icon: "👑" },
    { days: 1825, name: "5 Years", icon: "💎" },
  ];

  return milestones
    .filter((m) => daysInWorkspace >= m.days)
    .sort((a, b) => b.days - a.days);
}

/**
 * Record major contribution
 */
export async function recordMajorContribution(
  userId: string,
  workspaceId: string,
  data: {
    title: string;
    description?: string;
    projectId: string;
    type?: 'project_lead' | 'key_feature' | 'problem_solver' | 'team_builder';
  }
): Promise<any> {
  return recordWorkHistoryEvent(userId, workspaceId, {
    eventType: 'project_completed',
    eventTitle: data.title,
    eventDescription: data.description,
    projectId: data.projectId,
    toValue: data.type || 'major_contribution',
  });
}

