import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { milestoneTable } from "../../database/schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import logger from '../../utils/logger';

// @epic-1.3-milestones: Create new project milestones
// @role-project-manager: PM needs to create and manage milestones
// @permission-canManageProjectMilestones

export async function createMilestone(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get("userId");
    const body = await c.req.json();
    const {
      title,
      description,
      type,
      dueDate,
      projectId,
      riskLevel,
      riskDescription,
      dependencyTaskIds,
      stakeholderIds,
    } = body;

    // Validate required fields
    if (!title || !type || !dueDate || !projectId) {
      return c.json(
        {
          error: "Missing required fields",
        },
        400
      );
    }

    // Create milestone
    const milestone = await db
      .insert(milestoneTable)
      .values({
        id: createId(),
        title,
        description,
        type,
        dueDate: new Date(dueDate),
        projectId,
        riskLevel: riskLevel || "low",
        riskDescription,
        dependencyTaskIds: dependencyTaskIds ? JSON.stringify(dependencyTaskIds) : null,
        stakeholderIds: stakeholderIds ? JSON.stringify(stakeholderIds) : null,
        createdBy: userId,
      })
      .returning()
      .get();

    return c.json(milestone);
  } catch (error) {
    logger.error("Error creating milestone:", error);
    return c.json(
      {
        error: "Failed to create milestone",
      },
      500
    );
  }
} 
