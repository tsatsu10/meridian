/**
 * 🎯 Create Milestone Controller
 * 
 * POST /api/goal-milestones
 * Creates a new personal or team milestone
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goalMilestones } from "../../database/schema/goals";
import { createId } from "@paralleldrive/cuid2";
import logger from '../../utils/logger';

export async function createMilestone(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const workspaceId = c.get('workspaceId');
    
    if (!userId || !workspaceId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    const body = await c.req.json();
    
    // Validation
    if (!body.title || body.title.length === 0) {
      return c.json({ error: "Title is required" }, 400);
    }
    
    if (!body.dueDate) {
      return c.json({ error: "Due date is required" }, 400);
    }
    
    // Create milestone
    const [milestone] = await db.insert(goalMilestones).values({
      id: createId(),
      workspaceId,
      userId,
      title: body.title,
      description: body.description,
      dueDate: new Date(body.dueDate),
      goalIds: body.goalIds || [],
      taskIds: body.taskIds || [],
      priority: body.priority || 'medium',
      status: 'pending',
      stakeholders: body.stakeholders || [],
      successCriteria: body.successCriteria || [],
      metadata: {},
    }).returning();
    
    return c.json({ 
      success: true, 
      data: milestone,
      message: "Milestone created successfully"
    }, 201);
    
  } catch (error) {
    logger.error("Create milestone error:", error);
    return c.json({ 
      error: "Failed to create milestone",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}



