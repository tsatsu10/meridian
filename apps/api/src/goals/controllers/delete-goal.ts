/**
 * 🎯 Delete Goal Controller
 * 
 * DELETE /api/goals/:id
 * Deletes a goal (soft delete by setting status to 'abandoned')
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goals } from "../../database/schema/goals";
import { eq } from "drizzle-orm";
import logger from '../../utils/logger';

export async function deleteGoal(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const goalId = c.req.param('id');
    
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    // Check if goal exists and user has permission
    const existingGoal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
    });
    
    if (!existingGoal) {
      return c.json({ error: "Goal not found" }, 404);
    }
    
    if (existingGoal.userId !== userId) {
      return c.json({ error: "You can only delete your own goals" }, 403);
    }
    
    // Soft delete by setting status to 'abandoned'
    // This preserves data for analytics and history
    await db
      .update(goals)
      .set({ 
        status: 'abandoned',
        updatedAt: new Date()
      })
      .where(eq(goals.id, goalId));
    
    return c.json({ 
      success: true, 
      message: "Goal deleted successfully"
    });
    
  } catch (error) {
    logger.error("Delete goal error:", error);
    return c.json({ 
      error: "Failed to delete goal",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}



