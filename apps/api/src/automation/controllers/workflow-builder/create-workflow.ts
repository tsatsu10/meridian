/**
 * 🎨 Create Visual Workflow Controller
 *
 * @epic-3.2.3-visual-workflows
 */

import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { z } from "zod";
import { WorkflowBuilderService } from "../../services/workflow-builder-service";
import logger from "../../../utils/logger";

const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  category: z.enum(["trigger", "action", "logic", "integration"]),
  config: z.record(z.any()),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  connections: z
    .object({
      input: z.array(z.string()).optional(),
      output: z.array(z.string()).optional(),
    })
    .optional(),
});

const workflowConnectionSchema = z.object({
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

const workflowSettingsSchema = z.object({
  errorHandling: z.enum(["stop", "continue", "retry"]).default("stop"),
  retryCount: z.number().min(1).max(10).optional(),
  timeout: z.number().min(1000).max(300000).optional(),
});

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  nodes: z.array(workflowNodeSchema).min(1),
  connections: z.array(workflowConnectionSchema),
  variables: z.record(z.any()).optional(),
  settings: workflowSettingsSchema.optional(),
  tags: z.array(z.string()).optional(),
});

async function handleCreateVisualWorkflow(c: Context) {
  try {
    const data = (
      c.req as unknown as {
        valid: (k: "json") => z.infer<typeof createWorkflowSchema>;
      }
    ).valid("json");
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    const workflowBuilder = new WorkflowBuilderService();

    const result = await workflowBuilder.createWorkflow(workspaceId, userEmail, data);

    if (!result.success) {
      return c.json(
        {
          error: "Failed to create workflow",
          details: result.error,
        },
        400,
      );
    }

    return c.json({
      success: true,
      message: "Visual workflow created successfully",
      data: {
        workflow: result.workflow,
      },
    });
  } catch (error) {
    logger.error("Failed to create visual workflow:", error);
    return c.json(
      {
        error: "Failed to create visual workflow",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
}

export const createVisualWorkflow = [
  zValidator("json", createWorkflowSchema),
  handleCreateVisualWorkflow,
];
