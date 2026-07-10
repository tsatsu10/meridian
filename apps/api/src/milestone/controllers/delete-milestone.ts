import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { milestoneTable } from "../../database/schema";
import { eq } from "drizzle-orm";
import logger from '../../utils/logger';

// @epic-1.3-milestones: Delete project milestones
// @role-project-manager: PM needs to remove outdated or cancelled milestones
// @permission-canManageProjectMilestones

export async function deleteMilestone(c: Context) {
  try {
    const db = getDatabase();
    const milestoneId = c.req.param("milestoneId");
    if (!milestoneId) {
      return c.json({ error: "Milestone ID is required" }, 400);
    }

    // Delete milestone
    const [milestone] = await db
      .delete(milestoneTable)
      .where(eq(milestoneTable.id, milestoneId))
      .returning();

    if (!milestone) {
      return c.json(
        {
          error: "Milestone not found",
        },
        404
      );
    }

    return c.json({
      message: "Milestone deleted successfully",
      deletedMilestone: milestone,
    });
  } catch (error) {
    logger.error("Error deleting milestone:", error);
    return c.json(
      {
        error: "Failed to delete milestone",
      },
      500
    );
  }
} 
