/**
 * 🎯 Log Progress Controller
 * 
 * POST /api/goals/:id/progress
 * Manually logs progress for a goal or key result
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goals, goalKeyResults, goalProgress } from "../../database/schema/goals";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import type { LogProgressRequest } from "../types";
import logger from '../../utils/logger';

export async function logProgress(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const goalId = c.req.param('id');
    
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    const body: LogProgressRequest = await c.req.json();
    
    // Validation
    if (body.value === undefined || body.value < 0) {
      return c.json({ error: "Valid progress value is required" }, 400);
    }
    
    if (!body.keyResultId) {
      // Logging progress for the goal itself
      const goal = await db.query.goals.findFirst({
        where: eq(goals.id, goalId),
      });
      
      if (!goal) {
        return c.json({ error: "Goal not found" }, 404);
      }
      
      if (goal.userId !== userId) {
        return c.json({ error: "Access denied" }, 403);
      }
      
      // Log goal progress
      const [progressEntry] = await db.insert(goalProgress).values({
        id: createId(),
        goalId: goalId,
        value: body.value.toString(),
        previousValue: goal.progress?.toString() || '0',
        note: body.note,
        recordedBy: userId,
        recordedAt: new Date(),
      }).returning();
      
      // Update goal progress
      await db.update(goals)
        .set({ 
          progress: Math.min(Math.round(body.value), 100),
          updatedAt: new Date()
        })
        .where(eq(goals.id, goalId));

      return c.json({ 
        success: true, 
        data: progressEntry,
        message: "Progress logged successfully"
      }, 201);
      
    } else {
      // Logging progress for a key result
      const keyResult = await db.query.goalKeyResults.findFirst({
        where: eq(goalKeyResults.id, body.keyResultId),
      });

      if (!keyResult) {
        return c.json({ error: "Key result not found" }, 404);
      }

      const goalForKr = await db.query.goals.findFirst({
        where: eq(goals.id, keyResult.goalId),
      });

      if (!goalForKr) {
        return c.json({ error: "Goal not found" }, 404);
      }

      if (goalForKr.userId !== userId) {
        return c.json({ error: "Access denied" }, 403);
      }
      
      const previousValue = parseFloat(keyResult.currentValue as string);
      
      // Log key result progress
      const [progressEntry] = await db.insert(goalProgress).values({
        id: createId(),
        keyResultId: body.keyResultId,
        goalId: keyResult.goalId,
        value: body.value.toString(),
        previousValue: previousValue.toString(),
        note: body.note,
        recordedBy: userId,
        recordedAt: new Date(),
      }).returning();
      
      // Update key result current value
      await db.update(goalKeyResults)
        .set({ 
          currentValue: body.value.toString(),
          updatedAt: new Date()
        })
        .where(eq(goalKeyResults.id, body.keyResultId));
      
      // Recalculate goal progress
      await recalculateGoalProgress(keyResult.goalId);
      
      return c.json({ 
        success: true, 
        data: progressEntry,
        message: "Progress logged successfully"
      }, 201);
    }
    
  } catch (error) {
    logger.error("Log progress error:", error);
    return c.json({ 
      error: "Failed to log progress",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}

/**
 * Recalculates goal progress based on key results
 */
async function recalculateGoalProgress(goalId: string) {
  try {
    const db = getDatabase();
    const keyResults = await db.query.goalKeyResults.findMany({
      where: eq(goalKeyResults.goalId, goalId),
    });
    
    if (keyResults.length === 0) {
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



