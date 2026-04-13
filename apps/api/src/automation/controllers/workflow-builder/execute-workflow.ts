/**
 * ⚡ Execute Visual Workflow Controller
 *
 * @epic-3.2.3-visual-workflows
 */

import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { z } from "zod";
import { VisualWorkflowEngine } from "../../services/visual-workflow-engine";
import logger from "../../../utils/logger";

const executeWorkflowSchema = z.object({
  triggerData: z.record(z.any()).optional(),
  debugMode: z.boolean().default(false),
});

async function handleExecuteVisualWorkflow(c: Context) {
  try {
    const data = (
      c.req as unknown as {
        valid: (k: "json") => z.infer<typeof executeWorkflowSchema>;
      }
    ).valid("json");
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");
    const workflowId = c.req.param("id");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    if (!workflowId) {
      return c.json({ error: "Workflow ID required" }, 400);
    }

    const workflowEngine = new VisualWorkflowEngine();

    const result = await workflowEngine.executeWorkflow(
      workflowId,
      data.triggerData || {},
      data.debugMode,
    );

    if (!result.success) {
      return c.json(
        {
          error: "Workflow execution failed",
          details: result.error,
          executionId: result.executionId,
        },
        400,
      );
    }

    return c.json({
      success: true,
      message: "Workflow executed successfully",
      data: {
        executionId: result.executionId,
        debugMode: data.debugMode,
      },
    });
  } catch (error) {
    logger.error("Failed to execute visual workflow:", error);
    return c.json(
      {
        error: "Failed to execute visual workflow",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
}

export const executeVisualWorkflow = [
  zValidator("json", executeWorkflowSchema),
  handleExecuteVisualWorkflow,
];
