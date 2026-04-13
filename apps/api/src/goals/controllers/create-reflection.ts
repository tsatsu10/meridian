/**
 * 💭 Create Reflection Controller
 * 
 * POST /api/goals/:id/reflections
 * Creates a new reflection for a goal
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goalReflections, goals } from "../../database/schema/goals";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import logger from '../../utils/logger';

export async function createReflection(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const goalId = c.req.param('id');
    
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    const body = await c.req.json();
    
    // Validation
    if (!body.content || body.content.length === 0) {
      return c.json({ error: "Reflection content is required" }, 400);
    }
    
    if (body.content.length > 2000) {
      return c.json({ error: "Reflection must be 2000 characters or less" }, 400);
    }
    
    // Verify goal exists and user has permission
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
    });
    
    if (!goal) {
      return c.json({ error: "Goal not found" }, 404);
    }
    
    if (goal.userId !== userId) {
      return c.json({ error: "You can only create reflections for your own goals" }, 403);
    }
    
    // Create reflection
    const [reflection] = await db.insert(goalReflections).values({
      id: createId(),
      goalId,
      userId,
      content: body.content,
      reflectionType: body.reflectionType || 'weekly',
      mood: body.mood || 'neutral',
      whatWentWell: body.whatWentWell,
      whatToImprove: body.whatToImprove,
      lessonsLearned: body.lessonsLearned,
      isPrivate: body.isPrivate ?? true, // Default to private
      createdAt: new Date(),
    }).returning();
    
    return c.json({
      success: true,
      data: reflection,
      message: "Reflection created successfully"
    }, 201);
    
  } catch (error) {
    logger.error("Create reflection error:", error);
    return c.json({
      error: "Failed to create reflection",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}



