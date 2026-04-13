/**
 * 🎯 Get Upcoming Milestones Controller
 * 
 * GET /api/goal-milestones/countdown
 * Gets top 3 upcoming milestones for countdown widget
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goalMilestones } from "../../database/schema/goals";
import { eq, and, gte, asc } from "drizzle-orm";
import logger from '../../utils/logger';

export async function getUpcomingMilestones(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    const now = new Date();
    
    // Get upcoming milestones (not yet completed, due in future or recent past)
    const milestones = await db.query.goalMilestones.findMany({
      where: and(
        eq(goalMilestones.userId, userId),
        eq(goalMilestones.status, 'pending')
      ),
      orderBy: [asc(goalMilestones.dueDate)],
      limit: 3, // Top 3 upcoming
    });
    
    // Calculate countdown and urgency for each
    const milestonesWithCountdown = milestones.map(milestone => {
      const dueDate = new Date(milestone.dueDate);
      const diffTime = dueDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const hoursRemaining = Math.ceil(diffTime / (1000 * 60 * 60));
      
      let urgency: 'safe' | 'warning' | 'urgent' | 'overdue';
      let urgencyColor: string;
      
      if (daysRemaining < 0) {
        urgency = 'overdue';
        urgencyColor = 'gray';
      } else if (daysRemaining <= 3) {
        urgency = 'urgent';
        urgencyColor = 'red';
      } else if (daysRemaining <= 7) {
        urgency = 'warning';
        urgencyColor = 'orange';
      } else if (daysRemaining <= 14) {
        urgency = 'warning';
        urgencyColor = 'yellow';
      } else {
        urgency = 'safe';
        urgencyColor = 'green';
      }
      
      return {
        ...milestone,
        daysRemaining,
        hoursRemaining,
        urgency,
        urgencyColor,
        isOverdue: daysRemaining < 0,
        isToday: daysRemaining === 0,
      };
    });
    
    return c.json({ 
      success: true, 
      data: milestonesWithCountdown
    });
    
  } catch (error) {
    logger.error("Get upcoming milestones error:", error);
    return c.json({ 
      error: "Failed to fetch upcoming milestones",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}



