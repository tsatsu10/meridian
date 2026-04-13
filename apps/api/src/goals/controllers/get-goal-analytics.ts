/**
 * 🎯 Get Goal Analytics Controller
 * 
 * GET /api/goals/:id/analytics
 * Gets analytics data for a goal (velocity, completion trend, etc.)
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goals, goalProgress } from "../../database/schema/goals";
import { eq, desc, gte, sql } from "drizzle-orm";
import logger from '../../utils/logger';

export async function getGoalAnalytics(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const goalId = c.req.param('id');
    
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    // Get goal with key results
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
      with: {
        keyResults: true,
        progressEntries: {
          orderBy: desc(goalProgress.recordedAt),
          limit: 50,
        },
      },
    });
    
    if (!goal) {
      return c.json({ error: "Goal not found" }, 404);
    }
    
    // Check permission
    if (goal.userId !== userId && goal.privacy === 'private') {
      return c.json({ error: "Access denied" }, 403);
    }
    
    // Calculate analytics
    const analytics = {
      goalId: goal.id,
      currentProgress: goal.progress || 0,
      keyResultsCount: goal.keyResults.length,
      completedKeyResults: goal.keyResults.filter(kr => {
        const current = parseFloat(kr.currentValue as string) || 0;
        const target = parseFloat(kr.targetValue as string) || 1;
        return current >= target;
      }).length,
      
      // Progress velocity (progress per day)
      velocity: calculateVelocity(goal.progressEntries),
      
      // Estimated completion date
      estimatedCompletion: estimateCompletion(goal),
      
      // Progress trend (last 7 days)
      progressTrend: calculateProgressTrend(goal.progressEntries),
      
      // Days since last update
      daysSinceLastUpdate: calculateDaysSinceUpdate(goal),
      
      // Overall health score (0-100)
      healthScore: calculateHealthScore(goal),
    };
    
    return c.json({ 
      success: true, 
      data: analytics
    });
    
  } catch (error) {
    logger.error("Get goal analytics error:", error);
    return c.json({ 
      error: "Failed to fetch goal analytics",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}

/**
 * Calculate progress velocity (progress per day)
 */
function calculateVelocity(progressEntries: any[]): number {
  if (progressEntries.length < 2) return 0;
  
  const latest = progressEntries[0];
  const oldest = progressEntries[progressEntries.length - 1];
  
  const progressChange = parseFloat(latest.value as string) - parseFloat(oldest.value as string);
  const timeChange = new Date(latest.recordedAt).getTime() - new Date(oldest.recordedAt).getTime();
  const days = timeChange / (1000 * 60 * 60 * 24);
  
  return days > 0 ? Math.round((progressChange / days) * 10) / 10 : 0;
}

/**
 * Estimate completion date based on velocity
 */
function estimateCompletion(goal: any): string | null {
  if (goal.progress >= 100) return null; // Already complete
  
  const velocity = calculateVelocity(goal.progressEntries);
  if (velocity <= 0) return null; // No progress or negative velocity
  
  const remainingProgress = 100 - (goal.progress || 0);
  const daysToCompletion = remainingProgress / velocity;
  
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + daysToCompletion);
  
  return estimatedDate.toISOString().split('T')[0]; // Return YYYY-MM-DD
}

/**
 * Calculate progress trend for last 7 days
 */
function calculateProgressTrend(progressEntries: any[]): Array<{ date: string; value: number }> {
  const trend: Array<{ date: string; value: number }> = [];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentEntries = progressEntries.filter(entry => 
    new Date(entry.recordedAt) >= sevenDaysAgo
  );
  
  for (const entry of recentEntries.reverse()) {
    trend.push({
      date: new Date(entry.recordedAt).toISOString().split('T')[0],
      value: parseFloat(entry.value as string) || 0,
    });
  }
  
  return trend;
}

/**
 * Calculate days since last update
 */
function calculateDaysSinceUpdate(goal: any): number {
  if (!goal.updatedAt) return 0;
  
  const now = new Date();
  const updated = new Date(goal.updatedAt);
  const diff = now.getTime() - updated.getTime();
  
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calculate overall health score (0-100)
 */
function calculateHealthScore(goal: any): number {
  let score = 100;
  
  // Deduct points for stale goals (no updates)
  const daysSinceUpdate = calculateDaysSinceUpdate(goal);
  if (daysSinceUpdate > 7) score -= 20;
  if (daysSinceUpdate > 14) score -= 20;
  
  // Deduct points for low progress
  const progress = goal.progress || 0;
  if (progress < 25) score -= 15;
  
  // Deduct points if overdue
  if (goal.endDate && new Date(goal.endDate) < new Date()) {
    score -= 30;
  }
  
  // Bonus for consistent progress
  const velocity = calculateVelocity(goal.progressEntries);
  if (velocity > 0) score += 10;
  
  return Math.max(0, Math.min(100, score));
}



