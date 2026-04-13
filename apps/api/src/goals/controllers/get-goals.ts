/**
 * 🎯 Get Goals Controller
 * 
 * GET /api/goals/:workspaceId
 * Lists goals with optional filters (status, type, userId)
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goals, goalKeyResults } from "../../database/schema/goals";
import { eq, and, desc } from "drizzle-orm";
import logger from '../../utils/logger';

export async function getGoals(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const workspaceId = c.req.param('workspaceId');
    
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    // Get query parameters for filtering
    const status = c.req.query('status');
    const type = c.req.query('type');
    const filterUserId = c.req.query('userId');
    const privacy = c.req.query('privacy');
    
    // Build where conditions
    const conditions = [eq(goals.workspaceId, workspaceId)];
    
    if (status) {
      conditions.push(eq(goals.status, status));
    }
    
    if (type) {
      conditions.push(eq(goals.type, type));
    }
    
    if (filterUserId) {
      conditions.push(eq(goals.userId, filterUserId));
    } else {
      // Default: show user's own goals
      conditions.push(eq(goals.userId, userId));
    }
    
    if (privacy) {
      conditions.push(eq(goals.privacy, privacy));
    }
    
    // Fetch goals with key results
    const goalsWithKRs = await db.query.goals.findMany({
      where: and(...conditions),
      with: {
        keyResults: {
          orderBy: (keyResults, { asc }) => [asc(keyResults.createdAt)],
        },
      },
      orderBy: (goals, { desc }) => [desc(goals.createdAt)],
    });
    
    return c.json({ 
      success: true, 
      data: goalsWithKRs,
      count: goalsWithKRs.length
    });
    
  } catch (error) {
    logger.error("Get goals error:", error);
    return c.json({ 
      error: "Failed to fetch goals",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}



