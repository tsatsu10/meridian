import type { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { milestoneTable } from "../../database/schema";
import { eq } from "drizzle-orm";
import logger from "../../utils/logger";

// @epic-1.3-milestones: Update project milestones
// @role-project-manager: PM needs to update milestone details and status
// @permission-canManageProjectMilestones

export async function updateMilestone(c: Context) {
  try {
    const db = getDatabase();
    const milestoneId = c.req.param("milestoneId");
    if (!milestoneId) {
      return c.json({ error: "Milestone ID is required" }, 400);
    }
    const body = await c.req.json();
    const {
      title,
      description,
      type,
      status,
      dueDate,
      riskLevel,
      riskDescription,
      successCriteria,
      dependencyTaskIds,
      stakeholderIds,
    } = body;

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Only include fields that are provided
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type) updateData.type = type;
    if (status) {
      updateData.status = status;
      // Note: no "progress" column exists on the milestone table - a
      // previous version of this handler wrote to "progress" and
      // "completedDate" (the real column is "completedAt"), which would
      // have thrown on every "achieved" transition once this endpoint was
      // actually reachable.
      if (status === "achieved") {
        updateData.completedAt = new Date();
      }
    }
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (riskLevel) updateData.riskLevel = riskLevel;
    if (riskDescription !== undefined)
      updateData.riskDescription = riskDescription;
    if (successCriteria !== undefined)
      updateData.successCriteria = successCriteria;
    if (dependencyTaskIds)
      updateData.dependencyTaskIds = JSON.stringify(dependencyTaskIds);
    if (stakeholderIds)
      updateData.stakeholderIds = JSON.stringify(stakeholderIds);

    // Update milestone
    const [milestone] = await db
      .update(milestoneTable)
      .set(updateData)
      .where(eq(milestoneTable.id, milestoneId))
      .returning();

    if (!milestone) {
      return c.json(
        {
          error: "Milestone not found",
        },
        404,
      );
    }

    // Parse JSON fields for response
    return c.json({
      ...milestone,
      dependencyTaskIds: milestone.dependencyTaskIds
        ? JSON.parse(milestone.dependencyTaskIds)
        : [],
      stakeholderIds: milestone.stakeholderIds
        ? JSON.parse(milestone.stakeholderIds)
        : [],
    });
  } catch (error) {
    logger.error("Error updating milestone:", error);
    return c.json(
      {
        error: "Failed to update milestone",
      },
      500,
    );
  }
}
