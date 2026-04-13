/**
 * 🤝 Collaborators Service
 * 
 * Calculates and manages frequent collaborator relationships
 */

import { createId } from "@paralleldrive/cuid2";
import { getDatabase } from "../database/connection";
import {
  frequentCollaborators,
  tasks,
  projectMembers,
  users,
  userProfileTable,
} from "../database/schema";
import { eq, and, sql, desc, ne } from "drizzle-orm";
import logger from "../utils/logger";

/**
 * Calculate frequent collaborators for a user
 */
export async function calculateFrequentCollaborators(userId: string): Promise<void> {
  const db = getDatabase();

  try {
    // Get all tasks assigned to this user
    const userTasks = await db
      .select({ id: tasks.id, projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.assigneeId, userId));

    const taskIds = userTasks.map((t) => t.id);
    const projectIds = [...new Set(userTasks.map((t) => t.projectId))];

    // Get all users who worked on the same tasks (through comments, etc.)
    // For now, simplify to users in same projects
    const collaboratorsMap = new Map<string, {
      count: number;
      sharedProjects: string[];
      sharedTasks: string[];
      lastCollaboration: Date;
    }>();

    // Get project members for user's projects
    for (const projectId of projectIds) {
      const members = await db
        .select({ userEmail: projectMembers.userEmail })
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            ne(projectMembers.userEmail, userId) // Exclude self
          )
        );

      for (const member of members) {
        const collabId = member.userEmail;
        if (!collaboratorsMap.has(collabId)) {
          collaboratorsMap.set(collabId, {
            count: 0,
            sharedProjects: [],
            sharedTasks: [],
            lastCollaboration: new Date(),
          });
        }

        const collab = collaboratorsMap.get(collabId)!;
        collab.count++;
        collab.sharedProjects.push(projectId);
      }
    }

    // Convert to array and calculate scores
    const collaborators = Array.from(collaboratorsMap.entries()).map(
      ([collaboratorEmail, data]) => {
        // Collaboration score based on frequency and recency
        const baseScore = Math.min(data.count * 10, 70); // Max 70 from frequency
        const recencyDays = Math.floor(
          (Date.now() - data.lastCollaboration.getTime()) / (1000 * 60 * 60 * 24)
        );
        const recencyScore = Math.max(30 - recencyDays, 0); // Max 30 from recency

        return {
          collaboratorEmail,
          collaborationScore: baseScore + recencyScore,
          ...data,
        };
      }
    );

    // Sort by score and take top 10
    const topCollaborators = collaborators
      .sort((a, b) => b.collaborationScore - a.collaborationScore)
      .slice(0, 10);

    // Get user IDs for collaborators
    for (const collab of topCollaborators) {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, collab.collaboratorEmail));

      if (user) {
        // Delete existing record
        await db
          .delete(frequentCollaborators)
          .where(
            and(
              eq(frequentCollaborators.userId, userId),
              eq(frequentCollaborators.collaboratorId, user.id)
            )
          );

        // Insert new record
        await db.insert(frequentCollaborators).values({
          id: createId(),
          userId,
          collaboratorId: user.id,
          collaborationCount: collab.count,
          sharedProjects: collab.sharedProjects,
          sharedTasks: collab.sharedTasks,
          lastCollaboration: collab.lastCollaboration,
          collaborationScore: collab.collaborationScore.toString(),
        });
      }
    }

    logger.info(
      `Calculated ${topCollaborators.length} frequent collaborators for user ${userId}`
    );
  } catch (error) {
    logger.error("Error calculating frequent collaborators:", error);
    throw error;
  }
}

/**
 * Get frequent collaborators
 */
export async function getFrequentCollaborators(
  userId: string,
  limit: number = 5
): Promise<any[]> {
  const db = getDatabase();

  try {
    const collaborators = await db
      .select({
        id: frequentCollaborators.id,
        collaborationCount: frequentCollaborators.collaborationCount,
        sharedProjects: frequentCollaborators.sharedProjects,
        sharedTasks: frequentCollaborators.sharedTasks,
        lastCollaboration: frequentCollaborators.lastCollaboration,
        collaborationScore: frequentCollaborators.collaborationScore,
        // Collaborator info
        collaboratorId: users.id,
        collaboratorName: users.name,
        collaboratorEmail: users.email,
        collaboratorAvatar: users.avatar,
        collaboratorJobTitle: userProfileTable.jobTitle,
        collaboratorCompany: userProfileTable.company,
      })
      .from(frequentCollaborators)
      .leftJoin(users, eq(frequentCollaborators.collaboratorId, users.id))
      .leftJoin(userProfileTable, eq(users.id, userProfileTable.userId))
      .where(eq(frequentCollaborators.userId, userId))
      .orderBy(desc(frequentCollaborators.collaborationScore))
      .limit(limit);

    return collaborators;
  } catch (error) {
    logger.error("Error getting frequent collaborators:", error);
    return [];
  }
}

/**
 * Recalculate collaborators for all active users (cron job)
 */
export async function recalculateAllCollaborators(): Promise<void> {
  const db = getDatabase();

  try {
    const allUsers = await db.select({ id: users.id }).from(users);

    for (const user of allUsers) {
      await calculateFrequentCollaborators(user.id);
    }

    logger.info(`Recalculated collaborators for ${allUsers.length} users`);
  } catch (error) {
    logger.error("Error recalculating all collaborators:", error);
  }
}

