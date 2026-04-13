/**
 * 🎨 Dashboard Management Controllers
 * 
 * CRUD operations for user dashboards
 */

import { type Handler } from "hono";
import { getDatabase } from "../../database/connection";
import { userWidgetInstances, dashboardWidgets, userDashboards } from "../../database/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import logger from "../../utils/logger";

let userDashboardsTableReady: Promise<void> | null = null;

async function ensureUserDashboardsTable(db: any) {
  if (!userDashboardsTableReady) {
    userDashboardsTableReady = db
      .execute(sql`
        CREATE TABLE IF NOT EXISTS user_dashboards (
          id text PRIMARY KEY,
          user_id text,
          user_email text NOT NULL REFERENCES users(email) ON DELETE CASCADE,
          workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          name text NOT NULL,
          description text,
          icon text,
          is_default boolean DEFAULT false,
          layout jsonb,
          metadata jsonb,
          created_at timestamptz DEFAULT now() NOT NULL,
          updated_at timestamptz DEFAULT now()
        );
      `)
      .then(() =>
        db.execute(sql`
          CREATE INDEX IF NOT EXISTS user_dashboards_user_workspace_idx
            ON user_dashboards(user_email, workspace_id);
        `)
      )
      .then(() => undefined)
      .catch((error) => {
        userDashboardsTableReady = null;
        throw error;
      });
  }

  return userDashboardsTableReady;
}

// Get all dashboards for a user in a workspace
export const getUserDashboards: Handler = async (c) => {
  try {
    const db = getDatabase();
    await ensureUserDashboardsTable(db);
    const userEmail = c.req.param("userEmail");
    const workspaceId = c.req.param("workspaceId");

    if (!userEmail || !workspaceId) {
      return c.json({ error: "User email and workspace ID required" }, 400);
    }

    let dashboards = await db
      .select()
      .from(userDashboards)
      .where(
        and(
          eq(userDashboards.userEmail, userEmail),
          eq(userDashboards.workspaceId, workspaceId)
        )
      )
      .orderBy(asc(userDashboards.createdAt));

    const widgetInstances = await db
      .select({
        dashboardId: userWidgetInstances.dashboardId,
      })
      .from(userWidgetInstances)
      .where(
        and(
          eq(userWidgetInstances.userEmail, userEmail),
          eq(userWidgetInstances.workspaceId, workspaceId)
        )
      );

    const instanceIds = Array.from(
      new Set(
        widgetInstances
          .map((instance) => instance.dashboardId)
          .filter((id): id is string => Boolean(id))
      )
    );

    const existingIds = new Set(dashboards.map((dashboard) => dashboard.id));
    const missingIds = instanceIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      const inserts = await Promise.all(
        missingIds.map((id, index) =>
          db
            .insert(userDashboards)
            .values({
              id,
              userEmail,
              workspaceId,
              name: `Dashboard ${dashboards.length + index + 1}`,
              description: null,
              icon: null,
              isDefault: dashboards.length === 0 && index === 0,
            })
            .returning()
        )
      );

      dashboards = [...dashboards, ...inserts.flat()];
    }

    if (dashboards.length === 0) {
      const [defaultDashboard] = await db
        .insert(userDashboards)
        .values({
          id: createId(),
          userEmail,
          workspaceId,
          name: "My Dashboard",
          description: "Default dashboard",
          icon: "📊",
          isDefault: true,
        })
        .returning();

      return c.json({ data: [defaultDashboard] });
    }

    const hasDefaultDashboard = dashboards.some((dashboard) => dashboard.isDefault);
    if (!hasDefaultDashboard && dashboards.length > 0) {
      const firstDashboard = dashboards[0];
      const [updatedDashboard] = await db
        .update(userDashboards)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(userDashboards.id, firstDashboard.id))
        .returning();

      dashboards = dashboards.map((dashboard) =>
        dashboard.id === updatedDashboard.id ? updatedDashboard : dashboard
      );
    }

    return c.json({ data: dashboards });
  } catch (error: any) {
    await logger.error("❌ Error fetching dashboards", error, 'DATABASE');
    return c.json({ error: error.message || "Failed to fetch dashboards" }, 500);
  }
};

// Create new dashboard
export const createDashboard: Handler = async (c) => {
  let body: any;

  try {
    const db = getDatabase();
    await ensureUserDashboardsTable(db);
    body = await c.req.json();
    const { userId, userEmail, workspaceId, name, description, templateId, icon, layout, makeDefault } = body;

    if (!userEmail || !workspaceId || !name) {
      return c.json({ error: "User email, workspace ID, and name are required" }, 400);
    }

    const dashboardId = createId();

    const existingDashboards = await db
      .select()
      .from(userDashboards)
      .where(
        and(
          eq(userDashboards.userEmail, userEmail),
          eq(userDashboards.workspaceId, workspaceId)
        )
      );

    const shouldBeDefault = makeDefault === true || existingDashboards.length === 0;

    if (shouldBeDefault && existingDashboards.length > 0) {
      await db
        .update(userDashboards)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(userDashboards.userEmail, userEmail),
            eq(userDashboards.workspaceId, workspaceId)
          )
        );
    }

    const [dashboardRecord] = await db
      .insert(userDashboards)
      .values({
        id: dashboardId,
        userId: userId || null,
        userEmail,
        workspaceId,
        name,
        description: description || null,
        icon: icon || null,
        layout: layout || null,
        isDefault: shouldBeDefault,
      })
      .returning();

    // If template ID provided, install template widgets
    if (templateId) {
      const templates: Record<string, string[]> = {
        "analytics": ["performance-metrics", "velocity-tracker", "time-tracking-summary", "burndown-chart"],
        "team": ["team-health-monitor", "team-chat-widget", "team-mood-tracker", "team-capacity-planner"],
        "personal": ["my-tasks"],
        "project-manager": ["project-health-monitor", "project-timeline", "project-budget-tracker", "risk-monitor", "milestone-tracker", "resource-allocation"],
      };

      const widgetIds = templates[templateId] || [];

      // Find widgets by componentId
      for (let i = 0; i < widgetIds.length; i++) {
        const componentId = widgetIds[i];
        
        const [widget] = await db
          .select()
          .from(dashboardWidgets)
          .where(eq(dashboardWidgets.component, componentId))
          .limit(1);

        if (widget && widget.id) {
          // Install widget to new dashboard
          // Ensure JSONB fields have valid values (not null/undefined)
          const defaultSize = widget.defaultSize && typeof widget.defaultSize === 'object' 
            ? widget.defaultSize 
            : { width: 4, height: 4 };
          const defaultConfig = widget.defaultConfig && typeof widget.defaultConfig === 'object'
            ? widget.defaultConfig
            : {};
          
          await db.insert(userWidgetInstances).values({
            id: createId(),
            userEmail,
            workspaceId,
            widgetId: widget.id,
            dashboardId,
            position: { x: (i % 3) * 4, y: Math.floor(i / 3) * 4 },
            size: defaultSize,
            config: defaultConfig,
            isVisible: true,
            order: i,
          });
        }
      }
    }

    return c.json({ data: dashboardRecord });
  } catch (error: any) {
    await logger.error("❌ Error creating dashboard", error, 'DATABASE');

    if (error?.code === '42601' || error?.message?.includes('syntax error')) {
      await logger.error("SQL syntax error while creating dashboard", {
        message: error.message,
        code: error.code,
        position: error.position,
        severity: error.severity,
        body,
      }, 'DATABASE');
    }

    return c.json({ error: error?.message || "Failed to create dashboard" }, 500);
  }
};

// Update dashboard
export const updateDashboard: Handler = async (c) => {
  try {
    const db = getDatabase();
    await ensureUserDashboardsTable(db);
    const dashboardId = c.req.param("dashboardId");
    const body = await c.req.json();
    const { name, description, icon, layout } = body;

    if (!dashboardId) {
      return c.json({ error: "Dashboard ID required" }, 400);
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (typeof name === "string") updates.name = name;
    if (typeof description !== "undefined") updates.description = description || null;
    if (typeof icon !== "undefined") updates.icon = icon || null;
    if (typeof layout !== "undefined") updates.layout = layout || null;

    const [dashboard] = await db
      .update(userDashboards)
      .set(updates)
      .where(eq(userDashboards.id, dashboardId))
      .returning();

    if (!dashboard) {
      return c.json({ error: "Dashboard not found" }, 404);
    }

    return c.json({ data: dashboard });
  } catch (error: any) {
    await logger.error("❌ Error updating dashboard", error, 'DATABASE');
    return c.json({ error: error.message || "Failed to update dashboard" }, 500);
  }
};

// Delete dashboard
export const deleteDashboard: Handler = async (c) => {
  try {
    const db = getDatabase();
    await ensureUserDashboardsTable(db);
    const dashboardId = c.req.param("dashboardId");

    if (!dashboardId) {
      return c.json({ error: "Dashboard ID required" }, 400);
    }

    const [dashboard] = await db
      .select()
      .from(userDashboards)
      .where(eq(userDashboards.id, dashboardId))
      .limit(1);

    if (!dashboard) {
      return c.json({ error: "Dashboard not found" }, 404);
    }

    // Delete all widget instances for this dashboard
    await db
      .delete(userWidgetInstances)
      .where(eq(userWidgetInstances.dashboardId, dashboardId));

    await db
      .delete(userDashboards)
      .where(eq(userDashboards.id, dashboardId));

    if (dashboard.isDefault) {
      const [nextDashboard] = await db
        .select()
        .from(userDashboards)
        .where(
          and(
            eq(userDashboards.userEmail, dashboard.userEmail),
            eq(userDashboards.workspaceId, dashboard.workspaceId)
          )
        )
        .orderBy(asc(userDashboards.createdAt))
        .limit(1);

      if (nextDashboard) {
        await db
          .update(userDashboards)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(userDashboards.id, nextDashboard.id));
      }
    }

    return c.json({ success: true, message: "Dashboard deleted" });
  } catch (error: any) {
    await logger.error("❌ Error deleting dashboard", error, 'DATABASE');
    return c.json({ error: error.message || "Failed to delete dashboard" }, 500);
  }
};

// Set default dashboard
export const setDefaultDashboard: Handler = async (c) => {
  try {
    const db = getDatabase();
    await ensureUserDashboardsTable(db);
    const dashboardId = c.req.param("dashboardId");

    if (!dashboardId) {
      return c.json({ error: "Dashboard ID required" }, 400);
    }

    const [dashboard] = await db
      .select()
      .from(userDashboards)
      .where(eq(userDashboards.id, dashboardId))
      .limit(1);

    if (!dashboard) {
      return c.json({ error: "Dashboard not found" }, 404);
    }

    await db
      .update(userDashboards)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(userDashboards.userEmail, dashboard.userEmail),
          eq(userDashboards.workspaceId, dashboard.workspaceId)
        )
      );

    const [updatedDashboard] = await db
      .update(userDashboards)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(userDashboards.id, dashboardId))
      .returning();

    return c.json({
      success: true,
      message: "Default dashboard set",
      data: updatedDashboard,
    });
  } catch (error: any) {
    await logger.error("❌ Error setting default dashboard", error, 'DATABASE');
    return c.json({ error: error.message || "Failed to set default dashboard" }, 500);
  }
};

// Duplicate dashboard
export const duplicateDashboard: Handler = async (c) => {
  try {
    const db = getDatabase();
    await ensureUserDashboardsTable(db);
    const dashboardId = c.req.param("dashboardId");

    if (!dashboardId) {
      return c.json({ error: "Dashboard ID required" }, 400);
    }

    const [sourceDashboard] = await db
      .select()
      .from(userDashboards)
      .where(eq(userDashboards.id, dashboardId))
      .limit(1);

    if (!sourceDashboard) {
      return c.json({ error: "Dashboard not found" }, 404);
    }

    // Get all widget instances from source dashboard
    const instances = await db
      .select()
      .from(userWidgetInstances)
      .where(eq(userWidgetInstances.dashboardId, dashboardId));

    const newDashboardId = createId();

    const [newDashboard] = await db
      .insert(userDashboards)
      .values({
        id: newDashboardId,
        userId: sourceDashboard.userId,
        userEmail: sourceDashboard.userEmail,
        workspaceId: sourceDashboard.workspaceId,
        name: `Copy of ${sourceDashboard.name}`,
        description: sourceDashboard.description,
        icon: sourceDashboard.icon,
        layout: sourceDashboard.layout,
        isDefault: false,
        metadata: sourceDashboard.metadata,
      })
      .returning();

    // Copy all widget instances to new dashboard
    for (const instance of instances) {
      await db.insert(userWidgetInstances).values({
        id: createId(),
        userEmail: instance.userEmail,
        workspaceId: instance.workspaceId,
        widgetId: instance.widgetId,
        dashboardId: newDashboardId,
        position: instance.position,
        size: instance.size,
        config: instance.config,
        isVisible: instance.isVisible,
        order: instance.order,
      });
    }

    return c.json({ data: newDashboard });
  } catch (error: any) {
    await logger.error("❌ Error duplicating dashboard", error, 'DATABASE');
    return c.json({ error: error.message || "Failed to duplicate dashboard" }, 500);
  }
};

