/**
 * 🎯 Add Key Result Controller
 * 
 * POST /api/goals/:id/key-results
 * Adds a key result to a goal
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goals, goalKeyResults } from "../../database/schema/goals";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import type { CreateKeyResultRequest } from "../types";
import logger from '../../utils/logger';

export async function addKeyResult(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const goalId = c.req.param('id');
    
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    const body: CreateKeyResultRequest = await c.req.json();
    
    // Validation
    if (!body.title || body.title.length === 0) {
      return c.json({ error: "Title is required" }, 400);
    }
    
    if (body.title.length > 100) {
      return c.json({ error: "Title must be 100 characters or less" }, 400);
    }
    
    if (!body.targetValue || body.targetValue <= 0) {
      return c.json({ error: "Target value must be greater than 0" }, 400);
    }
    
    if (!body.unit) {
      return c.json({ error: "Unit is required (%, count, currency, hours, custom)" }, 400);
    }
    
    if (!['%', 'count', 'currency', 'hours', 'custom'].includes(body.unit)) {
      return c.json({ error: "Invalid unit. Must be: %, count, currency, hours, or custom" }, 400);
    }
    
    // Check if goal exists and user has permission
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
    });
    
    if (!goal) {
      return c.json({ error: "Goal not found" }, 404);
    }
    
    if (goal.userId !== userId) {
      return c.json({ error: "You can only add key results to your own goals" }, 403);
    }
    
    // Create key result
    const [keyResult] = await db.insert(goalKeyResults).values({
      id: createId(),
      goalId,
      title: body.title,
      description: body.description,
      targetValue: body.targetValue.toString(),
      currentValue: (body.currentValue || 0).toString(),
      unit: body.unit,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: 'not_started',
      metadata: {},
    }).returning();
    
    // Recalculate goal progress
    await recalculateGoalProgress(goalId);
    
    return c.json({ 
      success: true, 
      data: keyResult,
      message: "Key result added successfully"
    }, 201);
    
  } catch (error) {
    logger.error("Add key result error:", error);
    return c.json({ 
      error: "Failed to add key result",
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
    // Get all key results for this goal
    const keyResults = await db.query.goalKeyResults.findMany({
      where: eq(goalKeyResults.goalId, goalId),
    });
    
    if (keyResults.length === 0) {
      // No key results, keep progress at 0
      await db.update(goals)
        .set({ progress: 0, updatedAt: new Date() })
        .where(eq(goals.id, goalId));
      return;
    }
    
    // Calculate average completion percentage
    let totalProgress = 0;
    for (const kr of keyResults) {
      const current = parseFloat(kr.currentValue as string) || 0;
      const target = parseFloat(kr.targetValue as string) || 1;
      const krProgress = Math.min((current / target) * 100, 100);
      totalProgress += krProgress;
    }
    
    const averageProgress = Math.round(totalProgress / keyResults.length);
    
    // Update goal progress
    await db.update(goals)
      .set({ 
        progress: averageProgress,
        updatedAt: new Date()
      })
      .where(eq(goals.id, goalId));
      
  } catch (error) {
    logger.error("Error recalculating goal progress:", error);
    // Don't throw - this is a background operation
  }
}



