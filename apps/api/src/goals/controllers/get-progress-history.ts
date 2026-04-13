/**
 * 🎯 Get Progress History Controller
 * 
 * GET /api/goals/:id/progress
 * Gets progress history for a goal
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goals, goalProgress } from "../../database/schema/goals";
import { eq, desc } from "drizzle-orm";
import logger from '../../utils/logger';

export async function getProgressHistory(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const goalId = c.req.param('id');
    
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    // Verify goal access
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
    });
    
    if (!goal) {
      return c.json({ error: "Goal not found" }, 404);
    }
    
    // Check permission (own goal, team goal, or org goal)
    if (goal.userId !== userId && goal.privacy === 'private') {
      return c.json({ error: "Access denied" }, 403);
    }
    
    // Get progress history
    const progressHistory = await db.query.goalProgress.findMany({
      where: eq(goalProgress.goalId, goalId),
      orderBy: desc(goalProgress.recordedAt),
      limit: 100, // Last 100 entries
    });
    
    return c.json({ 
      success: true, 
      data: progressHistory,
      count: progressHistory.length
    });
    
  } catch (error) {
    logger.error("Get progress history error:", error);
    return c.json({ 
      error: "Failed to fetch progress history",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}



