/**
 * 🎯 Delete Key Result Controller
 * 
 * DELETE /api/key-results/:id
 * Deletes a key result and recalculates goal progress
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goals, goalKeyResults } from "../../database/schema/goals";
import { eq } from "drizzle-orm";
import logger from '../../utils/logger';

export async function deleteKeyResult(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const keyResultId = c.req.param('id');
    
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    // Get existing key result
    const existingKR = await db.query.goalKeyResults.findFirst({
      where: eq(goalKeyResults.id, keyResultId),
      with: {
        goal: true,
      },
    });
    
    if (!existingKR) {
      return c.json({ error: "Key result not found" }, 404);
    }
    
    // Check permission
    if (existingKR.goal.userId !== userId) {
      return c.json({ error: "You can only delete key results from your own goals" }, 403);
    }
    
    const goalId = existingKR.goalId;
    
    // Delete key result (cascade will delete progress entries)
    await db.delete(goalKeyResults)
      .where(eq(goalKeyResults.id, keyResultId));
    
    // Recalculate goal progress
    await recalculateGoalProgress(goalId);
    
    return c.json({ 
      success: true, 
      message: "Key result deleted successfully"
    });
    
  } catch (error) {
    logger.error("Delete key result error:", error);
    return c.json({ 
      error: "Failed to delete key result",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}

/**
 * Recalculates goal progress based on remaining key results
 */
async function recalculateGoalProgress(goalId: string) {
  try {
    const db = getDatabase();
    const keyResults = await db.query.goalKeyResults.findMany({
      where: eq(goalKeyResults.goalId, goalId),
    });
    
    if (keyResults.length === 0) {
      await db.update(goals)
        .set({ progress: 0, updatedAt: new Date() })
        .where(eq(goals.id, goalId));
      return;
    }
    
    let totalProgress = 0;
    for (const kr of keyResults) {
      const current = parseFloat(kr.currentValue as string) || 0;
      const target = parseFloat(kr.targetValue as string) || 1;
      const krProgress = Math.min((current / target) * 100, 100);
      totalProgress += krProgress;
    }
    
    const averageProgress = Math.round(totalProgress / keyResults.length);
    
    await db.update(goals)
      .set({ 
        progress: averageProgress,
        updatedAt: new Date()
      })
      .where(eq(goals.id, goalId));
      
  } catch (error) {
    logger.error("Error recalculating goal progress:", error);
  }
}



