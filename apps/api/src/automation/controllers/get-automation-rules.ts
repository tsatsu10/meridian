/**
 * 📋 Get Automation Rules Controller
 * @epic-3.1-automation-engine
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { automationRuleTable } from "../../database/schema";
import logger from "../../utils/logger";

export const getAutomationRules = async (c: {
  req: {
    header: (name: string) => string | undefined;
    query: (name: string) => string | undefined;
  };
  get: (key: string) => unknown;
  json: (body: unknown, status?: number) => Response;
}) => {
  const db = getDatabase();

  try {
    const workspaceId =
      c.req.header("x-workspace-id") || c.req.query("workspaceId");
    const userEmail =
      c.req.header("x-user-email") ||
      c.req.query("userEmail") ||
      (c.get("userEmail") as string | undefined);

    if (!workspaceId || !userEmail) {
      return c.json(
        {
          message: "Automation Rules API - Parameters Required",
          error: "Workspace ID and user email required",
          howToUse: {
            headers: {
              "x-workspace-id": "Your workspace ID",
              "x-user-email": "Your email address",
            },
            alternativeQueryParams: {
              workspaceId: "Your workspace ID",
              userEmail: "Your email address",
            },
            example:
              "/api/automation/rules?workspaceId=abc123&userEmail=user@example.com",
          },
          availableFilters: {
            projectId: "Filter by project ID",
            active: "Filter by active status (true/false)",
            triggerType: "Filter by trigger type",
          },
        },
        400,
      );
    }

    const projectId = c.req.query("projectId");
    const isActive = c.req.query("active");
    const triggerType = c.req.query("triggerType");

    const conditions = [eq(automationRuleTable.workspaceId, workspaceId)];

    if (projectId) {
      conditions.push(eq(automationRuleTable.projectId, projectId));
    }

    if (isActive !== undefined) {
      conditions.push(eq(automationRuleTable.isActive, isActive === "true"));
    }

    if (triggerType) {
      conditions.push(
        sql`${automationRuleTable.trigger}->>'type' = ${triggerType}`,
      );
    }

    const rules = await db
      .select()
      .from(automationRuleTable)
      .where(and(...conditions))
      .orderBy(
        desc(automationRuleTable.priority),
        desc(automationRuleTable.createdAt),
      );

    const processedRules = rules.map((rule) => {
      const trig = rule.trigger as { type?: string } | null;
      const cond = rule.conditions as Record<string, unknown> | null;
      const acts = rule.actions as unknown;
      return {
        ...rule,
        triggerType: trig?.type,
        triggerConditions: cond ?? {},
        actionConfig: Array.isArray(acts)
          ? (acts as { config?: Record<string, unknown> }[])[0]?.config ?? {}
          : {},
        actionsNormalized: acts,
      };
    });

    return c.json({
      success: true,
      data: processedRules,
      meta: {
        total: rules.length,
        filters: {
          projectId,
          isActive,
          triggerType,
        },
      },
    });
  } catch (error) {
    logger.error("Failed to get automation rules:", error);
    return c.json(
      {
        error: "Failed to get automation rules",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
};
