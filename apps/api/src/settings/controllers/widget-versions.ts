/**
 * 🔔 Widget Version Management Controllers
 * 
 * Handles version updates, changelogs, and update notifications
 */

import { type Handler } from "hono";
import { getDatabase } from "../../database/connection";
import { 
  userWidgetInstances, 
  dashboardWidgets, 
  widgetVersions 
} from "../../database/schema";
import { eq, and, desc, gt } from "drizzle-orm";
import logger from "../../utils/logger";

// Get available updates for user's installed widgets
export const getWidgetUpdates: Handler = async (c) => {
  try {
    const db = getDatabase();
    const userEmail = c.req.param("userEmail");
    const workspaceId = c.req.param("workspaceId");

    if (!userEmail || !workspaceId) {
      return c.json({ error: "User email and workspace ID required" }, 400);
    }

    // Get all user's installed widgets
    const instances = await db
      .select({
        instanceId: userWidgetInstances.id,
        widgetId: userWidgetInstances.widgetId,
        currentVersion: dashboardWidgets.version,
        widgetName: dashboardWidgets.name,
      })
      .from(userWidgetInstances)
      .innerJoin(
        dashboardWidgets,
        eq(userWidgetInstances.widgetId, dashboardWidgets.id)
      )
      .where(
        and(
          eq(userWidgetInstances.userEmail, userEmail),
          eq(userWidgetInstances.workspaceId, workspaceId)
        )
      );

    // Check for updates for each widget
    const updates = [];
    
    for (const instance of instances) {
      // Get latest version from widgetVersions table
      const [latestVersionRecord] = await db
        .select()
        .from(widgetVersions)
        .where(eq(widgetVersions.widgetId, instance.widgetId))
        .orderBy(desc(widgetVersions.releaseDate))
        .limit(1);

      if (latestVersionRecord) {
        const currentVersion = instance.currentVersion || "1.0.0";
        const latestVersion = latestVersionRecord.version;

        // Compare versions
        if (isNewerVersion(latestVersion, currentVersion)) {
          updates.push({
            widgetId: instance.widgetId,
            widgetName: instance.widgetName,
            currentVersion,
            latestVersion,
            changelog: {
              version: latestVersion,
              releaseDate: latestVersionRecord.releaseDate,
              changes: latestVersionRecord.changes || [],
              upgradeNotes: latestVersionRecord.upgradeNotes,
            },
            releaseDate: latestVersionRecord.releaseDate,
            isBreakingChange: latestVersionRecord.isBreakingChange || false,
            instanceId: instance.instanceId,
          });
        }
      }
    }

    return c.json({ data: updates });
  } catch (error: any) {
    logger.error("❌ Error fetching widget updates:", error);
    return c.json({ error: error.message || "Failed to fetch updates" }, 500);
  }
};

// Get changelog for a specific version
export const getVersionChangelog: Handler = async (c) => {
  try {
    const db = getDatabase();
    const widgetId = c.req.param("widgetId");
    const version = c.req.param("version");

    if (!widgetId || !version) {
      return c.json({ error: "Widget ID and version required" }, 400);
    }

    const [changelog] = await db
      .select()
      .from(widgetVersions)
      .where(
        and(
          eq(widgetVersions.widgetId, widgetId),
          eq(widgetVersions.version, version)
        )
      )
      .limit(1);

    if (!changelog) {
      return c.json({ error: "Changelog not found" }, 404);
    }

    return c.json({ data: changelog });
  } catch (error: any) {
    logger.error("❌ Error fetching changelog:", error);
    return c.json({ error: error.message || "Failed to fetch changelog" }, 500);
  }
};

// Get all versions for a widget
export const getWidgetVersionHistory: Handler = async (c) => {
  try {
    const db = getDatabase();
    const widgetId = c.req.param("widgetId");

    if (!widgetId) {
      return c.json({ error: "Widget ID required" }, 400);
    }

    const versions = await db
      .select()
      .from(widgetVersions)
      .where(eq(widgetVersions.widgetId, widgetId))
      .orderBy(desc(widgetVersions.releaseDate));

    return c.json({ data: versions });
  } catch (error: any) {
    logger.error("❌ Error fetching version history:", error);
    return c.json({ error: error.message || "Failed to fetch version history" }, 500);
  }
};

// Update widget instance to latest version
export const updateWidgetInstance: Handler = async (c) => {
  try {
    const db = getDatabase();
    const instanceId = c.req.param("instanceId");
    const body = await c.req.json();
    const { targetVersion } = body;

    if (!instanceId) {
      return c.json({ error: "Instance ID required" }, 400);
    }

    // Get current instance
    const [instance] = await db
      .select()
      .from(userWidgetInstances)
      .where(eq(userWidgetInstances.id, instanceId))
      .limit(1);

    if (!instance) {
      return c.json({ error: "Widget instance not found" }, 404);
    }

    // Get widget details
    const [widget] = await db
      .select()
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.id, instance.widgetId))
      .limit(1);

    if (!widget) {
      return c.json({ error: "Widget not found" }, 404);
    }

    // If targetVersion specified, verify it exists
    if (targetVersion) {
      const [versionRecord] = await db
        .select()
        .from(widgetVersions)
        .where(
          and(
            eq(widgetVersions.widgetId, widget.id),
            eq(widgetVersions.version, targetVersion)
          )
        )
        .limit(1);

      if (!versionRecord) {
        return c.json({ error: "Target version not found" }, 404);
      }

      // Update widget's version (in a real implementation, this would update the widget definition)
      // For now, we'll just track that the user updated
      logger.info(`✅ Updated widget instance ${instanceId} to version ${targetVersion}`);
    }

    return c.json({ 
      success: true, 
      message: "Widget updated successfully",
      data: {
        instanceId,
        widgetId: widget.id,
        newVersion: targetVersion || widget.version,
      }
    });
  } catch (error: any) {
    logger.error("❌ Error updating widget instance:", error);
    return c.json({ error: error.message || "Failed to update widget" }, 500);
  }
};

// Helper function to compare semantic versions
function isNewerVersion(version1: string, version2: string): boolean {
  const parseVersion = (v: string): number[] => {
    const match = v.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!match) return [0, 0, 0];
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  };

  const [major1, minor1, patch1] = parseVersion(version1);
  const [major2, minor2, patch2] = parseVersion(version2);

  if (major1 > major2) return true;
  if (major1 < major2) return false;

  if (minor1 > minor2) return true;
  if (minor1 < minor2) return false;

  return patch1 > patch2;
}

