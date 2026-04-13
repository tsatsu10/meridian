import { Hono } from "hono";
import { createId } from "@paralleldrive/cuid2";
import { authMiddleware } from "../middlewares/secure-auth";
import { getDatabase } from "../database/connection";
import { automationRule } from "../database/schema";
import {
  automationExecutions,
  automationRules as legacyAutomationRules,
} from "../database/schema-features";
import { eq, desc, and } from "drizzle-orm";
import logger from "../utils/logger";

const automationRoutes = new Hono();

function asJsonRecord(value: unknown): Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return [];
}

// Get automation metrics (canonical rules + legacy execution log table)
automationRoutes.get("/metrics", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const allRules = await db.select().from(automationRule);
    const totalRules = allRules.length;
    const activeRules = allRules.filter((r) => r.isActive === true).length;
    const pausedRules = allRules.filter((r) => r.isActive === false).length;

    const executions = await db.select().from(automationExecutions);
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter((e) => e.status === "success").length;
    const failedExecutions = executions.filter((e) => e.status === "failed").length;
    const avgExecTime =
      executions.length > 0
        ? executions.reduce((sum, e) => sum + (e.executionTime || 0), 0) / executions.length
        : 0;

    return c.json({
      data: {
        totalRules,
        activeRules,
        pausedRules,
        errorRules: 0,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        avgExecutionTime: Math.round(avgExecTime),
      },
    });
  } catch (error) {
    logger.error("Error fetching automation metrics:", error);
    return c.json({ error: "Failed to fetch automation metrics" }, 500);
  }
});

// List rules (canonical `automation_rule` table)
automationRoutes.get("/rules", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const dbRules = await db
      .select()
      .from(automationRule)
      .orderBy(desc(automationRule.createdAt));

    const rules = dbRules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      workspaceId: rule.workspaceId,
      projectId: rule.projectId,
      trigger: asJsonRecord(rule.trigger),
      conditions: asJsonRecord(rule.conditions),
      actions: asJsonArray(rule.actions),
      enabled: rule.isActive === true,
      status: rule.isActive ? "active" : "paused",
      createdBy: rule.createdBy,
      createdAt: rule.createdAt,
      lastRun: rule.lastExecuted,
      executionCount: rule.executionCount ?? 0,
      priority: rule.priority ?? 0,
    }));

    return c.json({ data: rules });
  } catch (error) {
    logger.error("Error fetching automation rules:", error);
    return c.json({ error: "Failed to fetch automation rules" }, 500);
  }
});

automationRoutes.post("/rules", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const body = (await c.req.json()) as Record<string, unknown>;
    const workspaceId =
      (c.get("workspaceId") as string | undefined) ??
      (typeof body.workspaceId === "string" ? body.workspaceId : undefined);
    if (!workspaceId) {
      return c.json({ error: "workspaceId is required (context or body)" }, 400);
    }

    const userId = c.get("userId") as string | undefined;
    const trigger =
      body.trigger ??
      (typeof body.triggerType === "string" ? { type: body.triggerType } : { type: "manual" });
    const conditions = body.conditions ?? body.triggerConditions ?? {};
    const actions =
      Array.isArray(body.actions) && body.actions.length > 0
        ? body.actions
        : [
            {
              type: String(body.actionType ?? "send_notification"),
              config: asJsonRecord(body.actionConfig),
            },
          ];

    const newRule = await db
      .insert(automationRule)
      .values({
        id: createId(),
        name: String(body.name ?? "Untitled rule"),
        description:
          typeof body.description === "string" ? body.description : null,
        workspaceId,
        projectId: typeof body.projectId === "string" ? body.projectId : null,
        trigger,
        conditions,
        actions,
        isActive: body.enabled !== false,
        priority: typeof body.priority === "number" ? body.priority : 0,
        executionCount: 0,
        createdBy: userId ?? null,
      })
      .returning();

    const row = newRule[0];
    if (!row) {
      return c.json({ error: "Insert returned no row" }, 500);
    }
    return c.json({ data: row }, 201);
  } catch (error) {
    logger.error("Error creating automation rule:", error);
    return c.json({ error: "Failed to create automation rule" }, 500);
  }
});

automationRoutes.put("/rules/:id", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const { id } = c.req.param();
    const body = (await c.req.json()) as Record<string, unknown>;

    const updated = await db
      .update(automationRule)
      .set({
        ...(typeof body.name === "string" ? { name: body.name } : {}),
        ...(body.description !== undefined
          ? {
              description:
                typeof body.description === "string" ? body.description : null,
            }
          : {}),
        ...(body.projectId !== undefined
          ? {
              projectId:
                typeof body.projectId === "string" ? body.projectId : null,
            }
          : {}),
        ...(body.trigger !== undefined ? { trigger: body.trigger } : {}),
        ...(body.conditions !== undefined ? { conditions: body.conditions } : {}),
        ...(body.actions !== undefined ? { actions: body.actions } : {}),
        ...(body.enabled !== undefined ? { isActive: Boolean(body.enabled) } : {}),
        ...(typeof body.priority === "number" ? { priority: body.priority } : {}),
        updatedAt: new Date(),
      })
      .where(eq(automationRule.id, id))
      .returning();

    if (updated.length === 0) {
      return c.json({ error: "Rule not found" }, 404);
    }
    return c.json({ data: updated[0] });
  } catch (error) {
    logger.error("Error updating automation rule:", error);
    return c.json({ error: "Failed to update automation rule" }, 500);
  }
});

automationRoutes.delete("/rules/:id", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const { id } = c.req.param();
    const deleted = await db
      .delete(automationRule)
      .where(eq(automationRule.id, id))
      .returning();
    if (deleted.length === 0) {
      return c.json({ error: "Rule not found" }, 404);
    }
    return c.json({ message: "Rule deleted successfully" });
  } catch (error) {
    logger.error("Error deleting automation rule:", error);
    return c.json({ error: "Failed to delete automation rule" }, 500);
  }
});

// Static workflow templates (UI samples)
automationRoutes.get("/templates", authMiddleware, async (c) => {
  try {
    const templates = [
      {
        id: "template-1",
        name: "Task Auto-Assignment",
        description: "Automatically distribute new tasks among team members",
        category: "task_management",
        icon: "👥",
        popularity: 1250,
        trigger: { type: "task_created", config: {} },
        actions: [{ type: "assign_user", config: { strategy: "round-robin" } }],
      },
      {
        id: "template-2",
        name: "Deadline Reminder",
        description: "Send reminders 24 hours before task deadlines",
        category: "notifications",
        icon: "⏰",
        popularity: 980,
        trigger: { type: "time_scheduled", config: { beforeDeadline: "24h" } },
        actions: [{ type: "send_notification", config: {} }],
      },
      {
        id: "template-3",
        name: "Status Change Webhook",
        description: "Trigger external webhooks when task status changes",
        category: "integrations",
        icon: "🔗",
        popularity: 750,
        trigger: { type: "status_changed", config: {} },
        actions: [{ type: "send_webhook", config: { url: "" } }],
      },
      {
        id: "template-4",
        name: "Daily Summary Report",
        description: "Send a daily summary of completed and pending tasks",
        category: "workflows",
        icon: "📊",
        popularity: 890,
        trigger: { type: "time_scheduled", config: { schedule: "0 18 * * *" } },
        actions: [{ type: "send_email", config: { template: "daily_summary" } }],
      },
      {
        id: "template-5",
        name: "Priority Escalation",
        description: "Automatically increase priority of aging tasks",
        category: "task_management",
        icon: "🚨",
        popularity: 640,
        trigger: { type: "time_scheduled", config: { check: "daily" } },
        actions: [{ type: "update_field", config: { field: "priority", increment: true } }],
      },
      {
        id: "template-6",
        name: "Team Notification",
        description: "Notify team when tasks are completed",
        category: "notifications",
        icon: "🔔",
        popularity: 1120,
        trigger: { type: "task_completed", config: {} },
        actions: [{ type: "send_notification", config: { recipients: "team" } }],
      },
    ];
    return c.json({ data: templates });
  } catch (error) {
    logger.error("Error fetching automation templates:", error);
    return c.json({ error: "Failed to fetch automation templates" }, 500);
  }
});

// Legacy execution log (`automation_executions` ↔ `automation_rules` integer ids)
automationRoutes.get("/history", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const executions = await db
      .select({
        id: automationExecutions.id,
        ruleId: automationExecutions.ruleId,
        ruleName: legacyAutomationRules.name,
        timestamp: automationExecutions.createdAt,
        status: automationExecutions.status,
        duration: automationExecutions.executionTime,
        error: automationExecutions.error,
      })
      .from(automationExecutions)
      .leftJoin(
        legacyAutomationRules,
        eq(automationExecutions.ruleId, legacyAutomationRules.id),
      )
      .orderBy(desc(automationExecutions.createdAt))
      .limit(100);

    const history = executions.map((exec) => ({
      id: exec.id.toString(),
      ruleId: exec.ruleId.toString(),
      ruleName: exec.ruleName ?? "Unknown Rule",
      timestamp: exec.timestamp,
      status: exec.status,
      duration: exec.duration ?? undefined,
      error: exec.error ?? undefined,
    }));

    return c.json({ data: history });
  } catch (error) {
    logger.error("Error fetching execution history:", error);
    return c.json({ error: "Failed to fetch execution history" }, 500);
  }
});

automationRoutes.post("/rules/:ruleId/toggle", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const { ruleId } = c.req.param();
    const body = (await c.req.json()) as { enabled?: boolean };
    const enabled = body.enabled !== false;

    const updated = await db
      .update(automationRule)
      .set({ isActive: enabled, updatedAt: new Date() })
      .where(eq(automationRule.id, ruleId))
      .returning();

    if (updated.length === 0) {
      return c.json({ error: "Rule not found" }, 404);
    }
    return c.json({ success: true, data: { ruleId, enabled } });
  } catch (error) {
    logger.error("Error toggling rule:", error);
    return c.json({ error: "Failed to toggle rule" }, 500);
  }
});

automationRoutes.delete("/rules/:ruleId", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const { ruleId } = c.req.param();
    const deleted = await db
      .delete(automationRule)
      .where(eq(automationRule.id, ruleId))
      .returning();
    if (deleted.length === 0) {
      return c.json({ error: "Rule not found" }, 404);
    }
    return c.json({ success: true, data: { ruleId } });
  } catch (error) {
    logger.error("Error deleting rule:", error);
    return c.json({ error: "Failed to delete rule" }, 500);
  }
});

export default automationRoutes;
