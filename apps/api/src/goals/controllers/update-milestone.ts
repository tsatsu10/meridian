/**
 * 🎯 Update Milestone Controller
 * 
 * PUT /api/goal-milestones/:id
 * Updates milestone details or status
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goalMilestones } from "../../database/schema/goals";
import { eq } from "drizzle-orm";
import logger from '../../utils/logger';

export async function updateMilestone(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const milestoneId = c.req.param('id');
    
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    const body = await c.req.json();
    
    // Check permission
    const existing = await db.query.goalMilestones.findFirst({
      where: eq(goalMilestones.id, milestoneId),
    });
    
    if (!existing) {
      return c.json({ error: "Milestone not found" }, 404);
    }
    
    if (existing.userId !== userId) {
      return c.json({ error: "Access denied" }, 403);
    }
    
    // Build update
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (body.title) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.dueDate) updateData.dueDate = new Date(body.dueDate);
    if (body.priority) updateData.priority = body.priority;
    if (body.status) {
      updateData.status = body.status;
      if (body.status === 'completed') {
        updateData.completedAt = new Date();
      }
    }
    if (body.goalIds) updateData.goalIds = body.goalIds;
    if (body.taskIds) updateData.taskIds = body.taskIds;
    if (body.stakeholders) updateData.stakeholders = body.stakeholders;
    if (body.successCriteria) updateData.successCriteria = body.successCriteria;
    
    const [updated] = await db
      .update(goalMilestones)
      .set(updateData)
      .where(eq(goalMilestones.id, milestoneId))
      .returning();
    
    return c.json({ 
      success: true, 
      data: updated,
      message: "Milestone updated successfully"
    });
    
  } catch (error) {
    logger.error("Update milestone error:", error);
    return c.json({ 
      error: "Failed to update milestone",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}



