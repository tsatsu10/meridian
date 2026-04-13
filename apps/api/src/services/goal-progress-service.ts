/**
 * 🎯 Goal Progress Service
 * 
 * Centralized service for goal progress calculations
 */

import { getDatabase } from "../database/connection";
import { goals, goalKeyResults } from "../database/schema/goals";
import { eq } from "drizzle-orm";
import logger from '../utils/logger';

/**
 * Recalculate goal progress based on all key results
 */
export async function recalculateGoalProgress(goalId: string) {
  try {
    const db = getDatabase();
    const keyResults = await db.query.goalKeyResults.findMany({
      where: eq(goalKeyResults.goalId, goalId),
    });
    
    if (keyResults.length === 0) {
      return;
    }
    
    // Calculate average progress from all key results
    let totalProgress = 0;
    let completedCount = 0;
    
    for (const kr of keyResults) {
      const current = parseFloat(kr.currentValue as string) || 0;
      const target = parseFloat(kr.targetValue as string) || 1;
      const krProgress = Math.min((current / target) * 100, 100);
      totalProgress += krProgress;
      
      if (krProgress >= 100) {
        completedCount++;
      }
    }
    
    const averageProgress = Math.round(totalProgress / keyResults.length);
    
    // Get the goal to check for completion
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
    });
    
    if (!goal) return;
    
    const wasCompleted = goal.status === 'completed';
    const isNowCompleted = averageProgress >= 100 && completedCount === keyResults.length;
    
    // Update goal progress and status
    await db.update(goals)
      .set({ 
        progress: averageProgress,
        status: isNowCompleted ? 'completed' : goal.status,
        updatedAt: new Date()
      })
      .where(eq(goals.id, goalId));

    return {
      progress: averageProgress,
      completedKeyResults: completedCount,
      totalKeyResults: keyResults.length,
      goalCompleted: isNowCompleted,
    };
  } catch (error) {
    logger.error("Error recalculating goal progress:", error);
    throw error;
  }
}



