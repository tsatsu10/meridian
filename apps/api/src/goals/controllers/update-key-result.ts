/**
 * 🎯 Update Key Result Controller
 * 
 * PUT /api/key-results/:id
 * Updates a key result and recalculates goal progress
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goals, goalKeyResults, goalProgress } from "../../database/schema/goals";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import type { UpdateKeyResultRequest } from "../types";
import logger from '../../utils/logger';

export async function updateKeyResult(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const keyResultId = c.req.param('id');

    if (!keyResultId) {
      return c.json({ error: "Key result id required" }, 400);
    }

    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    const body: UpdateKeyResultRequest = await c.req.json();
    
    // Validation
    if (body.title !== undefined && body.title.length > 100) {
      return c.json({ error: "Title must be 100 characters or less" }, 400);
    }
    
    if (body.targetValue !== undefined && body.targetValue <= 0) {
      return c.json({ error: "Target value must be greater than 0" }, 400);
    }
    
    const existingKR = await db.query.goalKeyResults.findFirst({
      where: eq(goalKeyResults.id, keyResultId),
    });

    if (!existingKR) {
      return c.json({ error: "Key result not found" }, 404);
    }

    const goalRow = await db.query.goals.findFirst({
      where: eq(goals.id, existingKR.goalId),
    });

    if (!goalRow) {
      return c.json({ error: "Goal not found" }, 404);
    }

    if (goalRow.userId !== userId) {
      return c.json({ error: "You can only update key results for your own goals" }, 403);
    }
    
    // Track if currentValue changed for progress logging
    const oldValue = parseFloat(existingKR.currentValue as string);
    const newValue = body.currentValue !== undefined ? body.currentValue : oldValue;
    const valueChanged = oldValue !== newValue;
    
    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.targetValue !== undefined) updateData.targetValue = body.targetValue.toString();
    if (body.currentValue !== undefined) updateData.currentValue = body.currentValue.toString();
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.status !== undefined) updateData.status = body.status;
    
    // Update key result
    const [updatedKR] = await db
      .update(goalKeyResults)
      .set(updateData)
      .where(eq(goalKeyResults.id, keyResultId))
      .returning();

    if (!updatedKR) {
      return c.json({ error: "Failed to update key result" }, 500);
    }

    // Log progress if value changed
    if (valueChanged) {
      await db.insert(goalProgress).values({
        id: createId(),
        keyResultId: keyResultId,
        goalId: existingKR.goalId,
        value: newValue.toString(),
        previousValue: oldValue.toString(),
        recordedBy: userId,
        recordedAt: new Date(),
      });
    }
    
    // Recalculate goal progress and check for completion
    const progressResult = await recalculateGoalProgress(existingKR.goalId);
    
    if (progressResult?.goalCompleted) {
      logger.info('Goal completed', {
        goalId: existingKR.goalId,
        userId: goalRow.userId,
        title: goalRow.title,
      });
    }

    return c.json({ 
      success: true, 
      data: updatedKR,
      message: "Key result updated successfully",
      goalProgress: progressResult
    });
    
  } catch (error) {
    logger.error("Update key result error:", error);
    return c.json({ 
      error: "Failed to update key result",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}

/**
 * Recalculates goal progress based on key results completion
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
      return { progress: 0, goalCompleted: false };
    }
    
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
    
    // Get the goal to check for completion status
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
    });
    
    if (!goal) return { progress: averageProgress, goalCompleted: false };
    
    const wasCompleted = goal.status === 'completed';
    const isNowCompleted = averageProgress >= 100 && completedCount === keyResults.length;
    
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
      goalCompleted: isNowCompleted && !wasCompleted,
    };
  } catch (error) {
    logger.error("Error recalculating goal progress:", error);
    return { progress: 0, goalCompleted: false };
  }
}



