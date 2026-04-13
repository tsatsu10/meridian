import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { milestoneTable } from "../../database/schema";
import { eq } from "drizzle-orm";
import logger from '../../utils/logger';

// @epic-1.3-milestones: Update project milestones
// @role-project-manager: PM needs to update milestone details and status
// @permission-canManageProjectMilestones

export async function updateMilestone(c: Context) {
  try {
    const db = getDatabase();
    const milestoneId = c.req.param("milestoneId");
    const body = await c.req.json();
    const {
      title,
      description,
      type,
      status,
      dueDate,
      riskLevel,
      riskDescription,
      dependencyTaskIds,
      stakeholderIds,
      progress,
    } = body;

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only include fields that are provided
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type) updateData.type = type;
    if (status) {
      updateData.status = status;
      if (status === "achieved") {
        updateData.completedDate = new Date();
        updateData.progress = 100;
      }
    }
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (riskLevel) updateData.riskLevel = riskLevel;
    if (riskDescription !== undefined) updateData.riskDescription = riskDescription;
    if (dependencyTaskIds) updateData.dependencyTaskIds = JSON.stringify(dependencyTaskIds);
    if (stakeholderIds) updateData.stakeholderIds = JSON.stringify(stakeholderIds);
    if (progress !== undefined) updateData.progress = progress;

    // Update milestone
    const milestone = await db
      .update(milestoneTable)
      .set(updateData)
      .where(eq(milestoneTable.id, milestoneId))
      .returning()
      .get();

    if (!milestone) {
      return c.json(
        {
          error: "Milestone not found",
        },
        404
      );
    }

    // Parse JSON fields for response
    return c.json({
      ...milestone,
      dependencyTaskIds: milestone.dependencyTaskIds ? JSON.parse(milestone.dependencyTaskIds) : [],
      stakeholderIds: milestone.stakeholderIds ? JSON.parse(milestone.stakeholderIds) : [],
    });
  } catch (error) {
    logger.error("Error updating milestone:", error);
    return c.json(
      {
        error: "Failed to update milestone",
      },
      500
    );
  }
} 
