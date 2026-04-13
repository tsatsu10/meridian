/**
 * ✏️ Update Visual Workflow Controller
 * 
 * Updates an existing visual workflow with new configuration
 * @epic-3.2.3-visual-workflows
 */

import { Context } from "hono";
import { z } from "zod";
import { WorkflowBuilderService } from "../../services/workflow-builder-service";
import logger from '../../../utils/logger';

// Similar schemas from create-workflow but all optional
const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  category: z.enum(["trigger", "action", "logic", "integration"]),
  config: z.record(z.any()),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  connections: z.object({
    input: z.array(z.string()).optional(),
    output: z.array(z.string()).optional()
  }).optional()
});

const workflowConnectionSchema = z.object({
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional()
});

const workflowSettingsSchema = z.object({
  errorHandling: z.enum(["stop", "continue", "retry"]).default("stop"),
  retryCount: z.number().min(1).max(10).optional(),
  timeout: z.number().min(1000).max(300000).optional()
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  nodes: z.array(workflowNodeSchema).optional(),
  connections: z.array(workflowConnectionSchema).optional(),
  variables: z.record(z.any()).optional(),
  settings: workflowSettingsSchema.optional(),
  tags: z.array(z.string()).optional()
});

export const updateVisualWorkflow = async (c: Context) => {
  try {
    // Validate the request body
    const body = await c.req.json();
    const validation = updateWorkflowSchema.safeParse(body);
    
    if (!validation.success) {
      return c.json({ error: "Invalid request data", details: validation.error }, 400);
    }

    const data = validation.data;
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");
    const workflowId = c.req.param("id");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    if (!workflowId) {
      return c.json({ error: "Workflow ID required" }, 400);
    }

    const workflowBuilder = new WorkflowBuilderService();

    const result = await workflowBuilder.updateWorkflow(
      workflowId,
      workspaceId,
      data
    );

    if (!result.success) {
      return c.json({
        error: "Failed to update workflow",
        details: result.error
      }, 400);
    }

    return c.json({
      success: true,
      message: "Visual workflow updated successfully",
      data: {
        workflow: result.workflow
      }
    });

  } catch (error) {
    logger.error("Failed to update visual workflow:", error);
    return c.json({
      error: "Failed to update visual workflow",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}; 
