/**
 * 🎯 Get Goal Detail Controller
 * 
 * GET /api/goals/:id
 * Gets detailed information about a specific goal including key results and progress history
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goals } from "../../database/schema/goals";
import { eq } from "drizzle-orm";
import logger from '../../utils/logger';

export async function getGoalDetail(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const goalId = c.req.param('id');
    
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    // Fetch goal with all related data
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
      with: {
        keyResults: {
          orderBy: (keyResults, { asc }) => [asc(keyResults.createdAt)],
          with: {
            progressEntries: {
              orderBy: (progress, { desc }) => [desc(progress.recordedAt)],
              limit: 10, // Last 10 progress updates
            },
          },
        },
        progressEntries: {
          orderBy: (progress, { desc }) => [desc(progress.recordedAt)],
          limit: 10,
        },
        childGoals: true, // If this goal has sub-goals
      },
    });
    
    if (!goal) {
      return c.json({ error: "Goal not found" }, 404);
    }
    
    // Check access permission
    // User can see: their own goals, team goals if they're in the team, org goals
    if (goal.userId !== userId && goal.privacy === 'private') {
      return c.json({ error: "Access denied" }, 403);
    }
    
    return c.json({ 
      success: true, 
      data: goal
    });
    
  } catch (error) {
    logger.error("Get goal detail error:", error);
    return c.json({ 
      error: "Failed to fetch goal details",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}



