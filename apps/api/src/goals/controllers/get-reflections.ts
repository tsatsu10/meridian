/**
 * 💭 Get Reflections Controller
 * 
 * GET /api/goals/:id/reflections
 * Gets all reflections for a goal
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goalReflections, goals } from "../../database/schema/goals";
import { eq, desc } from "drizzle-orm";
import logger from '../../utils/logger';

export async function getReflections(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const goalId = c.req.param('id');
    
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    // Verify goal exists and user has permission
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
    });
    
    if (!goal) {
      return c.json({ error: "Goal not found" }, 404);
    }
    
    if (goal.userId !== userId) {
      return c.json({ error: "You can only view reflections for your own goals" }, 403);
    }
    
    // Get all reflections for this goal
    const reflections = await db.query.goalReflections.findMany({
      where: eq(goalReflections.goalId, goalId),
      orderBy: [desc(goalReflections.createdAt)],
    });
    
    return c.json({
      success: true,
      data: reflections,
      count: reflections.length,
    });
    
  } catch (error) {
    logger.error("Get reflections error:", error);
    return c.json({
      error: "Failed to fetch reflections",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}



