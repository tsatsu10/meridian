/**
 * 🎯 Create Goal Controller
 * 
 * POST /api/goals
 * Creates a new goal (objective, personal, team, or strategic)
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goals } from "../../database/schema/goals";
import { createId } from "@paralleldrive/cuid2";
import type { CreateGoalRequest } from "../types";
import logger from '../../utils/logger';

export async function createGoal(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const workspaceId = c.get('workspaceId');
    
    if (!userId || !workspaceId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    const body: CreateGoalRequest = await c.req.json();
    
    // Validation
    if (!body.title || body.title.length === 0) {
      return c.json({ error: "Title is required" }, 400);
    }
    
    if (body.title.length > 100) {
      return c.json({ error: "Title must be 100 characters or less" }, 400);
    }
    
    if (body.description && body.description.length > 500) {
      return c.json({ error: "Description must be 500 characters or less" }, 400);
    }
    
    if (!body.type) {
      return c.json({ error: "Type is required (objective, personal, team, or strategic)" }, 400);
    }
    
    if (!['objective', 'personal', 'team', 'strategic'].includes(body.type)) {
      return c.json({ error: "Invalid type. Must be: objective, personal, team, or strategic" }, 400);
    }
    
    if (!body.timeframe) {
      return c.json({ error: "Timeframe is required (e.g., 'Q1 2025', '2025', 'custom')" }, 400);
    }
    
    // Create goal
    const [goal] = await db.insert(goals).values({
      id: createId(),
      workspaceId,
      userId,
      title: body.title,
      description: body.description,
      type: body.type,
      timeframe: body.timeframe,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      priority: body.priority || 'medium',
      privacy: body.privacy || 'private',
      parentGoalId: body.parentGoalId || null,
      status: 'active',
      progress: 0,
      metadata: {},
    }).returning();
    
    return c.json({ 
      success: true, 
      data: goal,
      message: "Goal created successfully"
    }, 201);
    
  } catch (error) {
    logger.error("Create goal error:", error);
    return c.json({ 
      error: "Failed to create goal",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}



