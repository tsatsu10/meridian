import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { milestoneTable } from "../../database/schema";
import { eq } from "drizzle-orm";
import logger from '../../utils/logger';

// @epic-1.3-milestones: View project milestones
// @role-project-manager: PM needs to view all project milestones
// @permission-canViewProjectMilestones

export async function getMilestones(c: Context) {
  try {
    const db = getDatabase();
    const projectId = c.req.param("projectId");

    // Get all milestones for the project
    const milestones = await db
      .select()
      .from(milestoneTable)
      .where(eq(milestoneTable.projectId, projectId))
      .all();

    // Calculate milestone statistics
    const stats = {
      total: milestones.length,
      achieved: milestones.filter(m => m.status === "achieved").length,
      upcoming: milestones.filter(m => m.status === "upcoming").length,
      missed: milestones.filter(m => m.status === "missed").length,
    };

    // Parse JSON fields
    const formattedMilestones = milestones.map(milestone => ({
      ...milestone,
      dependencyTaskIds: milestone.dependencyTaskIds ? JSON.parse(milestone.dependencyTaskIds) : [],
      stakeholderIds: milestone.stakeholderIds ? JSON.parse(milestone.stakeholderIds) : [],
    }));

    return c.json({
      milestones: formattedMilestones,
      stats,
    });
  } catch (error) {
    logger.error("Error getting milestones:", error);
    return c.json(
      {
        error: "Failed to get milestones",
      },
      500
    );
  }
} 
