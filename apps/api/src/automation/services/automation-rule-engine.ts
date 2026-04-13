/**
 * ⚡ Automation Rule Engine Service
 *
 * @epic-3.1-automation-engine
 */

import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import {
  automationRuleTable,
  notificationTable,
  taskTable,
  userTable,
} from "../../database/schema";
import { createId } from "@paralleldrive/cuid2";
import logger from "../../utils/logger";

const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
type TaskStatusValue = (typeof TASK_STATUSES)[number];

function toTaskStatus(value: unknown): TaskStatusValue {
  const s = typeof value === "string" ? value : "";
  return TASK_STATUSES.includes(s as TaskStatusValue)
    ? (s as TaskStatusValue)
    : "todo";
}

const PRIORITY_VALUES = ["low", "medium", "high", "urgent"] as const;
type PriorityValue = (typeof PRIORITY_VALUES)[number];

function toTaskPriority(value: unknown): PriorityValue {
  const s = typeof value === "string" ? value : "";
  return PRIORITY_VALUES.includes(s as PriorityValue)
    ? (s as PriorityValue)
    : "medium";
}

export interface TriggerData {
  taskId?: string;
  projectId?: string;
  userId?: string;
  status?: string;
  assigneeEmail?: string;
  [key: string]: unknown;
}

function triggerTypeOf(rule: { trigger: unknown }): string {
  const t = rule.trigger as { type?: string } | null;
  return typeof t?.type === "string" ? t.type : "";
}

function normalizeActions(rule: { actions: unknown }): {
  type: string;
  config: Record<string, unknown>;
}[] {
  const raw = rule.actions;
  if (Array.isArray(raw)) {
    return raw
      .map((a) => {
        const x = a as { type?: string; config?: Record<string, unknown> };
        if (!x?.type) return null;
        return { type: x.type, config: x.config ?? {} };
      })
      .filter((x): x is { type: string; config: Record<string, unknown> } => x != null);
  }
  return [];
}

export class AutomationRuleEngine {
  static async processTrigger(
    triggerType: string,
    triggerData: TriggerData,
    workspaceId: string,
  ) {
    try {
      const db = getDatabase();

      const rules = await db
        .select()
        .from(automationRuleTable)
        .where(
          and(
            eq(automationRuleTable.workspaceId, workspaceId),
            eq(automationRuleTable.isActive, true),
          ),
        );

      const results: {
        ruleId: string;
        ruleName: string;
        actionType?: string;
        success: boolean;
        result?: unknown;
        error?: string;
      }[] = [];

      for (const rule of rules) {
        if (triggerTypeOf(rule) !== triggerType) {
          continue;
        }

        const conditions = (rule.conditions as Record<string, unknown>) ?? {};
        if (!this.matchesConditions(conditions, triggerData)) {
          continue;
        }

        const actions = normalizeActions(rule);

        for (const action of actions) {
          try {
            const actionResult = await this.executeAction(
              action.type,
              action.config as Record<string, unknown>,
              triggerData,
            );

            await db
              .update(automationRuleTable)
              .set({
                executionCount: (rule.executionCount ?? 0) + 1,
                lastExecuted: new Date(),
              })
              .where(eq(automationRuleTable.id, rule.id));

            results.push({
              ruleId: rule.id,
              ruleName: rule.name,
              actionType: action.type,
              success: true,
              result: actionResult,
            });
          } catch (error) {
            results.push({
              ruleId: rule.id,
              ruleName: rule.name,
              actionType: action.type,
              success: false,
              error:
                error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      }

      return results;
    } catch (error) {
      logger.error("Failed to process automation trigger:", error);
      throw error;
    }
  }

  private static matchesConditions(
    conditions: Record<string, unknown>,
    triggerData: TriggerData,
  ): boolean {
    for (const [key, expectedValue] of Object.entries(conditions)) {
      const actualValue = triggerData[key];

      if (Array.isArray(expectedValue)) {
        if (!expectedValue.includes(actualValue)) {
          return false;
        }
      } else if (expectedValue !== actualValue) {
        return false;
      }
    }
    return true;
  }

  private static async executeAction(
    actionType: string,
    actionConfig: Record<string, unknown>,
    triggerData: TriggerData,
  ) {
    switch (actionType) {
      case "send_notification":
        return await this.executeSendNotification(
          actionConfig,
          triggerData,
        );

      case "assign_task":
        return await this.executeAssignTask(actionConfig, triggerData);

      case "update_status":
        return await this.executeUpdateStatus(actionConfig, triggerData);

      case "create_task":
        return await this.executeCreateTask(actionConfig, triggerData);

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  private static async executeSendNotification(
    config: Record<string, unknown>,
    triggerData: TriggerData,
  ) {
    const title = String(config.title ?? "");
    const content = String(config.content ?? "");
    const userEmail = String(
      config.userEmail ??
        triggerData.userEmail ??
        triggerData.assigneeEmail ??
        "",
    );
    const type = String(config.type ?? "automation");

    const processedTitle = this.replaceVariables(title, triggerData);
    const processedContent = this.replaceVariables(content, triggerData);
    const db = getDatabase();

    if (!userEmail) {
      throw new Error("userEmail required for send_notification");
    }

    const [u] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);
    if (!u) {
      throw new Error(`No user for email: ${userEmail}`);
    }

    await db.insert(notificationTable).values({
      userId: u.id,
      userEmail,
      title: processedTitle,
      content: processedContent,
      type,
      resourceId:
        (triggerData.taskId as string | undefined) ??
        (triggerData.projectId as string | undefined) ??
        null,
      resourceType: triggerData.taskId ? "task" : "project",
    });

    return { notificationSent: true, title: processedTitle };
  }

  private static async executeAssignTask(
    config: Record<string, unknown>,
    triggerData: TriggerData,
  ) {
    const assigneeEmail = config.assigneeEmail as string | undefined;
    const taskId = (config.taskId as string | undefined) ?? triggerData.taskId;

    if (!taskId) {
      throw new Error("Task ID required for assign action");
    }

    const db = getDatabase();
    let assigneeId: string | null = null;
    let userEmail: string | null = null;
    if (assigneeEmail) {
      const [u] = await db
        .select({ id: userTable.id, email: userTable.email })
        .from(userTable)
        .where(eq(userTable.email, assigneeEmail))
        .limit(1);
      if (u) {
        assigneeId = u.id;
        userEmail = u.email;
      }
    }

    await db
      .update(taskTable)
      .set({ assigneeId, userEmail })
      .where(eq(taskTable.id, taskId));

    return { taskAssigned: true, taskId, assigneeEmail };
  }

  private static async executeUpdateStatus(
    config: Record<string, unknown>,
    triggerData: TriggerData,
  ) {
    const status = toTaskStatus(config.status);
    const taskId = (config.taskId as string | undefined) ?? triggerData.taskId;

    if (!taskId) {
      throw new Error("Task ID required for status update");
    }

    const db = getDatabase();
    await db
      .update(taskTable)
      .set({ status })
      .where(eq(taskTable.id, taskId));

    return { statusUpdated: true, taskId, newStatus: status };
  }

  private static async executeCreateTask(
    config: Record<string, unknown>,
    triggerData: TriggerData,
  ) {
    const title = String(config.title ?? "Task");
    const description =
      config.description != null ? String(config.description) : undefined;
    const projectId =
      (config.projectId as string | undefined) ?? triggerData.projectId;
    const assigneeEmail = config.assigneeEmail as string | undefined;
    const priority = toTaskPriority(config.priority);

    if (!projectId) {
      throw new Error("projectId required for create_task");
    }

    const processedTitle = this.replaceVariables(title, triggerData);
    const processedDescription = description
      ? this.replaceVariables(description, triggerData)
      : undefined;

    const db = getDatabase();
    const taskId = createId();

    let assigneeId: string | null = null;
    let userEmail: string | null = null;
    if (assigneeEmail) {
      const [u] = await db
        .select({ id: userTable.id, email: userTable.email })
        .from(userTable)
        .where(eq(userTable.email, assigneeEmail))
        .limit(1);
      if (u) {
        assigneeId = u.id;
        userEmail = u.email;
      }
    }

    await db.insert(taskTable).values({
      id: taskId,
      title: processedTitle,
      description: processedDescription ?? null,
      projectId,
      assigneeId,
      userEmail,
      status: "todo",
      priority,
    });

    return { taskCreated: true, taskId, title: processedTitle };
  }

  private static replaceVariables(
    template: string,
    triggerData: TriggerData,
  ): string {
    if (!template) return template;

    let result = template;
    for (const [key, value] of Object.entries(triggerData)) {
      if (value !== undefined && value !== null) {
        result = result.replace(
          new RegExp(`{{${key}}}`, "g"),
          String(value),
        );
      }
    }
    return result;
  }
}

export async function triggerAutomationRules(
  eventType: string,
  eventData: TriggerData,
  workspaceId: string,
) {
  return await AutomationRuleEngine.processTrigger(
    eventType,
    eventData,
    workspaceId,
  );
}
