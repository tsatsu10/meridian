import { Hono } from "hono";
import { authMiddleware } from "../middlewares/secure-auth";
import { getDatabase } from "../database/connection";
import { workspaceSettings } from "../database/schema-features";
import { eq } from "drizzle-orm";
import logger from '../utils/logger';

const workspaceSettingsRoutes = new Hono();

// Get workspace settings
workspaceSettingsRoutes.get("/", authMiddleware, async (c) => {
  try {
    const workspaceId = c.get("workspaceId") as string | undefined;
    const db = getDatabase();
    
    if (!workspaceId) {
      return c.json({ error: "Workspace ID is required" }, 400);
    }

    const settings = await db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, workspaceId))
      .limit(1);

    if (!settings || settings.length === 0 || !settings[0]) {
      // Return default settings if none exist
      return c.json({
        allowGuestInvites: true,
        requireApprovalForNewMembers: false,
        enableTeamChat: true,
        enableFileSharing: true,
        enableTimeTracking: true,
        enableProjectTemplates: true,
        enableAdvancedAnalytics: false,
        enableAutomation: true,
        enableIntegrations: true,
        enableNotifications: true,
      });
    }

    const setting = settings[0];
    return c.json({
      allowGuestInvites: setting.allowGuestInvites,
      requireApprovalForNewMembers: setting.requireApprovalForNewMembers,
      enableTeamChat: setting.enableTeamChat,
      enableFileSharing: setting.enableFileSharing,
      enableTimeTracking: setting.enableTimeTracking,
      enableProjectTemplates: setting.enableProjectTemplates,
      enableAdvancedAnalytics: setting.enableAdvancedAnalytics,
      enableAutomation: setting.enableAutomation,
      enableIntegrations: setting.enableIntegrations,
      enableNotifications: setting.enableNotifications,
    });
  } catch (error) {
    logger.error("Error fetching workspace settings:", error);
    return c.json({ error: "Failed to fetch workspace settings" }, 500);
  }
});

// Update workspace settings
workspaceSettingsRoutes.patch("/", authMiddleware, async (c) => {
  try {
    const workspaceId = c.get("workspaceId") as string | undefined;
    const userId = c.get("userId") as string | undefined;
    const body = await c.req.json();
    const db = getDatabase();
    
    if (!workspaceId || !userId) {
      return c.json({ error: "Workspace ID and User ID are required" }, 400);
    }

    // Check if settings exist
    const existingSettings = await db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, workspaceId))
      .limit(1);

    const settingsData = {
      allowGuestInvites: body.allowGuestInvites ?? true,
      requireApprovalForNewMembers: body.requireApprovalForNewMembers ?? false,
      enableTeamChat: body.enableTeamChat ?? true,
      enableFileSharing: body.enableFileSharing ?? true,
      enableTimeTracking: body.enableTimeTracking ?? true,
      enableProjectTemplates: body.enableProjectTemplates ?? true,
      enableAdvancedAnalytics: body.enableAdvancedAnalytics ?? false,
      enableAutomation: body.enableAutomation ?? true,
      enableIntegrations: body.enableIntegrations ?? true,
      enableNotifications: body.enableNotifications ?? true,
      updatedAt: new Date(),
      updatedBy: userId,
    };

    if (existingSettings && existingSettings.length > 0) {
      // Update existing settings
      await db
        .update(workspaceSettings)
        .set(settingsData)
        .where(eq(workspaceSettings.workspaceId, workspaceId));
    } else {
      // Create new settings
      await db.insert(workspaceSettings).values({
        workspaceId,
        ...settingsData,
        createdAt: new Date(),
        createdBy: userId,
      });
    }

    return c.json({ success: true, message: "Workspace settings updated successfully" });
  } catch (error) {
    logger.error("Error updating workspace settings:", error);
    return c.json({ error: "Failed to update workspace settings" }, 500);
  }
});

export default workspaceSettingsRoutes;

