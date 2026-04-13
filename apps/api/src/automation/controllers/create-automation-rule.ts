/**
 * ⚡ Create Automation Rule Controller
 *
 * Creates simple if-then automation rules (canonical `automation_rule` table).
 * @epic-3.1-automation-engine
 */

import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { automationRuleTable, userTable } from "../../database/schema";
import logger from "../../utils/logger";

const createAutomationRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  projectId: z.string().optional(),
  triggerType: z.enum([
    "task_created",
    "task_status_changed",
    "task_assigned",
    "task_completed",
    "due_date_approaching",
    "project_created",
    "milestone_reached",
  ]),
  triggerConditions: z.record(z.any()),
  actionType: z.enum([
    "send_notification",
    "assign_task",
    "update_status",
    "create_task",
    "send_email",
    "webhook_call",
  ]),
  actionConfig: z.record(z.any()),
  isActive: z.boolean().default(true),
  priority: z.number().min(0).max(10).default(0),
});

async function handleCreateAutomationRule(c: Context) {
  const db = getDatabase();

  try {
    const data = (
      c.req as unknown as {
        valid: (k: "json") => z.infer<typeof createAutomationRuleSchema>;
      }
    ).valid("json");
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    const [userRow] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    const rule = await db
      .insert(automationRuleTable)
      .values({
        id: createId(),
        name: data.name,
        description: data.description,
        workspaceId,
        projectId: data.projectId,
        trigger: { type: data.triggerType },
        conditions: data.triggerConditions,
        actions: [{ type: data.actionType, config: data.actionConfig }],
        isActive: data.isActive,
        priority: data.priority,
        createdBy: userRow?.id ?? null,
      })
      .returning();

    const row = rule[0];
    if (!row) {
      return c.json({ error: "Failed to create automation rule" }, 500);
    }

    return c.json({
      success: true,
      message: "Automation rule created successfully",
      data: {
        ...row,
        triggerType: (row.trigger as { type?: string } | null)?.type,
        triggerConditions: row.conditions,
        actionType: Array.isArray(row.actions)
          ? (row.actions as { type?: string }[])[0]?.type
          : undefined,
        actionConfig: Array.isArray(row.actions)
          ? (row.actions as { config?: Record<string, unknown> }[])[0]?.config
          : undefined,
      },
    });
  } catch (error) {
    logger.error("Failed to create automation rule:", error);
    return c.json(
      {
        error: "Failed to create automation rule",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
}

export const createAutomationRule = [
  zValidator("json", createAutomationRuleSchema),
  handleCreateAutomationRule,
];
