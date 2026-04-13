/**
 * 🔧 Create Workflow Template Controller
 *
 * @epic-3.1-automation-engine
 */

import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userTable } from "../../database/schema";
import { WorkflowEngine } from "../services/workflow-engine";
import logger from "../../utils/logger";

const createWorkflowTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.enum(["general", "project", "task", "notification", "integration"]),
  triggers: z.array(
    z.object({
      type: z.string(),
      conditions: z.record(z.any()).optional(),
      projectIds: z.array(z.string()).optional(),
      taskIds: z.array(z.string()).optional(),
    }),
  ),
  actions: z.array(
    z.object({
      type: z.string(),
      config: z.record(z.any()),
      delayMs: z.number().optional(),
    }),
  ),
  conditions: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(false),
});

async function handleCreateWorkflowTemplate(c: Context) {
  try {
    const data = (
      c.req as unknown as {
        valid: (k: "json") => z.infer<typeof createWorkflowTemplateSchema>;
      }
    ).valid("json");
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    const db = getDatabase();
    const [userRow] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);
    if (!userRow?.id) {
      return c.json({ error: "User not found for email" }, 400);
    }

    const template = await WorkflowEngine.createTemplate(workspaceId, userRow.id, {
      name: data.name,
      description: data.description,
      category: data.category,
      triggers: data.triggers,
      actions: data.actions,
      conditions: data.conditions,
    });

    return c.json({
      success: true,
      message: "Workflow template created successfully",
      data: template,
    });
  } catch (error) {
    logger.error("Failed to create workflow template:", error);
    return c.json(
      {
        error: "Failed to create workflow template",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
}

export const createWorkflowTemplate = [
  zValidator("json", createWorkflowTemplateSchema),
  handleCreateWorkflowTemplate,
];
