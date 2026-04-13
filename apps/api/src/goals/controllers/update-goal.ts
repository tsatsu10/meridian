/**
 * 🎯 Update Goal Controller
 * 
 * PUT /api/goals/:id
 * Updates an existing goal
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goals } from "../../database/schema/goals";
import { eq, and } from "drizzle-orm";
import type { UpdateGoalRequest } from "../types";
import logger from '../../utils/logger';

export async function updateGoal(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const goalId = c.req.param('id');
    
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    const body: UpdateGoalRequest = await c.req.json();
    
    // Validation
    if (body.title !== undefined && body.title.length > 100) {
      return c.json({ error: "Title must be 100 characters or less" }, 400);
    }
    
    if (body.description !== undefined && body.description.length > 500) {
      return c.json({ error: "Description must be 500 characters or less" }, 400);
    }
    
    if (body.progress !== undefined && (body.progress < 0 || body.progress > 100)) {
      return c.json({ error: "Progress must be between 0 and 100" }, 400);
    }
    
    // Check if goal exists and user has permission
    const existingGoal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
    });
    
    if (!existingGoal) {
      return c.json({ error: "Goal not found" }, 404);
    }
    
    if (existingGoal.userId !== userId) {
      return c.json({ error: "You can only update your own goals" }, 403);
    }
    
    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.timeframe !== undefined) updateData.timeframe = body.timeframe;
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.privacy !== undefined) updateData.privacy = body.privacy;
    if (body.progress !== undefined) updateData.progress = body.progress;
    if (body.parentGoalId !== undefined) updateData.parentGoalId = body.parentGoalId;
    
    // Update goal
    const [updatedGoal] = await db
      .update(goals)
      .set(updateData)
      .where(eq(goals.id, goalId))
      .returning();
    
    return c.json({ 
      success: true, 
      data: updatedGoal,
      message: "Goal updated successfully"
    });
    
  } catch (error) {
    logger.error("Update goal error:", error);
    return c.json({ 
      error: "Failed to update goal",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}



