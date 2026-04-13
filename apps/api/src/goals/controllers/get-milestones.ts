/**
 * 🎯 Get Milestones Controller
 * 
 * GET /api/goal-milestones/:userId
 * Gets milestones for a user with countdown calculations
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goalMilestones } from "../../database/schema/goals";
import { eq, and, gte, desc, asc, inArray } from "drizzle-orm";
import logger from '../../utils/logger';

export async function getMilestones(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const targetUserId = c.req.param('userId');
    
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    // Users can only see their own milestones for now
    if (targetUserId !== userId) {
      return c.json({ error: "Access denied" }, 403);
    }
    
    const milestones = await db.query.goalMilestones.findMany({
      where: and(
        eq(goalMilestones.userId, targetUserId),
        inArray(goalMilestones.status, ['pending', 'in_progress'])
      ),
      orderBy: [asc(goalMilestones.dueDate)],
    });
    
    // Calculate countdown for each milestone
    const milestonesWithCountdown = milestones.map(milestone => {
      const now = new Date();
      const dueDate = new Date(milestone.dueDate);
      const diffTime = dueDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let urgency: 'safe' | 'warning' | 'urgent' | 'overdue';
      if (daysRemaining < 0) urgency = 'overdue';
      else if (daysRemaining <= 3) urgency = 'urgent';
      else if (daysRemaining <= 7) urgency = 'warning';
      else urgency = 'safe';
      
      return {
        ...milestone,
        daysRemaining,
        urgency,
      };
    });
    
    return c.json({ 
      success: true, 
      data: milestonesWithCountdown,
      count: milestonesWithCountdown.length
    });
    
  } catch (error) {
    logger.error("Get milestones error:", error);
    return c.json({ 
      error: "Failed to fetch milestones",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}



