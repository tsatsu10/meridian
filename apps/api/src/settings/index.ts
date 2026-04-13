// @epic-3.2-settings: Settings API with audit logging and real-time sync
import { Hono } from "hono";
import { eq, and, or, desc, gte, lte, like, count } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { settingsAuditLogTable, userSettingsTable, settingsPresetTable, users, customThemesTable, dashboardTemplatesTable, dashboardWidgetsTable, userWidgetInstancesTable } from "../database/schema";
import { createId } from "@paralleldrive/cuid2";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "../middlewares/secure-auth";

// Import email settings controllers
import getEmailSettings from "./controllers/get-email-settings";
import updateEmailSettings from "./controllers/update-email-settings";
import {
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  testSMTPConnection,
  sendTestEmail,
} from "./controllers/email-templates";

// Import automation settings controllers
import getAutomationSettings from "./controllers/get-automation-settings";
import updateAutomationSettings from "./controllers/update-automation-settings";

// Import calendar settings controllers
import getCalendarSettings from "./controllers/get-calendar-settings";
import updateCalendarSettings from "./controllers/update-calendar-settings";

// Import audit log controllers
import getAuditLogs, { getAuditStats, getAuditFilterOptions } from "./controllers/get-audit-logs";
import { getAuditLogSettings, updateAuditLogSettings, exportAuditLogs } from "./controllers/audit-log-settings";
import logger from '../utils/logger';

// Import backup controllers
import {
  getBackupSettings,
  updateBackupSettings,
  getBackupHistory,
  createManualBackup,
  restoreFromBackup,
  downloadBackup,
  deleteBackup,
  verifyBackup,
} from "./controllers/backup-settings";

// Import role manager controllers
import {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  cloneRole,
  getAllPermissions,
  getRoleTemplates,
} from "./controllers/role-manager";

// Import advanced search controllers
import {
  performSearch,
  getSearchSuggestions,
  getSavedSearches,
  saveSearch,
  updateSavedSearch,
  deleteSavedSearch,
  recordSearchUsage,
} from "./controllers/advanced-search";

// Import import/export controllers
import {
  exportWorkspaceData,
  validateImportData,
  importWorkspaceData,
  getExportTemplates,
} from "./controllers/import-export";

// Import themes controllers
import {
  getThemes,
  getTheme,
  createTheme,
  updateTheme,
  deleteTheme,
  cloneTheme,
  applyTheme,
  getBrandingSettings,
  updateBrandingSettings,
  THEME_TEMPLATES,
} from "./controllers/themes";

// Import widget marketplace controllers
import {
  getMarketplaceWidgets,
  getWidgetById,
  rateWidget,
  addWidgetReview,
  markReviewHelpful,
  getWidgetCollections,
  trackWidgetEvent,
  getWidgetAnalytics,
  createWidget,
  updateWidget,
  deleteWidget,
  getWidgetCategories,
} from "./controllers/widgets";

// Import widget instance controllers
import {
  installWidget,
  getUserWidgetInstances,
  updateWidgetInstance,
  uninstallWidget,
  reorderWidgets,
  installWidgetCollection,
  batchUpdatePositions,
} from "./controllers/widget-instances";

// Import dashboard management controllers
import {
  getUserDashboards,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  setDefaultDashboard,
  duplicateDashboard,
} from "./controllers/dashboards";

// Import widget version controllers
import {
  getWidgetUpdates,
  getVersionChangelog,
  getWidgetVersionHistory,
  updateWidgetInstance as updateWidgetToVersion,
} from "./controllers/widget-versions";

// Import localization controllers
import {
  getLanguages,
  getLanguage,
  addLanguage,
  updateLanguage,
  deleteLanguage,
  getTranslations,
  updateTranslations,
  exportTranslations,
  importTranslations,
  getLocalizationSettings,
  updateLocalizationSettings,
  SUPPORTED_LANGUAGES,
} from "./controllers/localization";

// Import keyboard shortcuts controllers
import {
  getShortcuts,
  getShortcut,
  updateShortcuts,
  updateShortcut,
  deleteShortcut,
  resetShortcuts,
  applyPreset,
  getPresets,
} from "./controllers/shortcuts";

// Import advanced filters controllers
import {
  getSavedFilters,
  getSavedFilter,
  createSavedFilter,
  updateSavedFilter,
  deleteSavedFilter,
  cloneSavedFilter,
  recordFilterUsage,
  getFilterTemplates,
} from "./controllers/filters";

const app = new Hono<{ Variables: { userEmail: string } }>();

// Root endpoint - Get current user's settings
app.get("/", async (c) => {
  try {
    const userEmail = c.get("userEmail");

    if (!userEmail) {
      return c.json({
        message: "Settings API",
        version: "1.0.0",
        endpoints: {
          "GET /": "Get current user's settings (authenticated)",
          "GET /:userId": "Get specific user's settings (requires matching authentication)",
          "PATCH /:userId/:section": "Update a settings section",
          "POST /:userId/:section/reset": "Reset a settings section to defaults"
        },
        note: "Authentication required to access settings"
      });
    }

    // Return default settings structure
    // TODO: Settings table not yet implemented in active schema
    const settingsObject: any = {
      profile: {
        name: "",
        email: userEmail,
        bio: "",
        timezone: "UTC",
        language: "en"
      },
      appearance: {
        theme: "system",
        fontSize: 14,
        density: "comfortable"
      },
      notifications: {
        email: { taskAssigned: true, projectUpdates: true },
        push: { taskAssigned: true, mentions: true },
        inApp: { taskAssigned: true, mentions: true }
      },
      security: {
        twoFactorEnabled: false,
        sessionTimeout: true
      },
      privacy: {
        profileVisibility: "workspace",
        activityVisibility: "team"
      }
    };

    return c.json({
      data: settingsObject,
      success: true,
      userEmail: userEmail,
      message: "Settings feature is under development - returning default settings",
      timestamp: new Date().toISOString(),
      version: Date.now(),
    });
  } catch (error) {
    logger.error("Failed to get settings:", error);
    return c.json({ 
      error: "Failed to retrieve settings",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Helper function to get client metadata
function getClientMetadata(c: any) {
  return {
    ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
    userAgent: c.req.header("user-agent") || "unknown",
    timestamp: new Date().toISOString(),
    sessionId: c.req.header("x-session-id") || createId(),
  };
}

// Helper function to log audit events
async function logAuditEvent(
  userEmail: string,
  action: string,
  section: string,
  changes: Record<string, any>,
  metadata: Record<string, any>
) {
  const db = getDatabase();
  try {
    await db.insert(settingsAuditLogTable).values({
      userEmail,
      action,
      section,
      oldValue: JSON.stringify(changes.from || null),
      newValue: JSON.stringify(changes.to || null),
      metadata: metadata,
    });
  } catch (error) {
    logger.error("Failed to log audit event:", error);
  }
}

// Get user settings
app.get("/:userId", async (c) => {
  const db = getDatabase(); // FIX: Initialize database connection
  const userId = c.req.param("userId");
  const userEmail = c.get("userEmail");

  // Security: Users can only access their own settings
  if (userId !== userEmail) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  try {
    const settings = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userEmail, userEmail));

    // Convert to the expected format
    const settingsObject: any = {
      profile: {},
      appearance: {},
      notifications: {},
      security: {},
      privacy: {},
    };

    settings.forEach((setting) => {
      settingsObject[setting.section] = JSON.parse(setting.settings);
    });

    return c.json({
      data: settingsObject,
      success: true,
      timestamp: new Date().toISOString(),
      version: Date.now(),
    });
  } catch (error) {
    logger.error("Failed to get settings:", error);
    return c.json({ error: "Failed to retrieve settings" }, 500);
  }
});

// Update settings section
app.patch("/:userId/:section", async (c) => {
  const db = getDatabase(); // FIX: Initialize database connection
  const userId = c.req.param("userId");
  const section = c.req.param("section");
  const userEmail = c.get("userEmail");

  // Security: Users can only update their own settings
  if (userId !== userEmail) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  try {
    const { updates, version } = await c.req.json();
    const metadata = getClientMetadata(c);

    // Get current settings for audit trail
    const currentSettings = await db
      .select()
      .from(userSettingsTable)
      .where(
        and(
          eq(userSettingsTable.userEmail, userEmail),
          eq(userSettingsTable.section, section)
        )
      )
      .limit(1);

    const currentData = currentSettings[0] 
      ? JSON.parse(currentSettings[0].settings)
      : {};

    // Merge updates with current settings
    const newSettings = { ...currentData, ...updates };

    // Create audit trail
    const changes: Record<string, any> = {};
    Object.keys(updates).forEach((key) => {
      if (currentData[key] !== updates[key]) {
        changes[key] = {
          from: currentData[key],
          to: updates[key],
        };
      }
    });

    // Update or insert settings
    if (currentSettings[0]) {
      await db
        .update(userSettingsTable)
        .set({
          settings: JSON.stringify(newSettings),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userSettingsTable.userEmail, userEmail),
            eq(userSettingsTable.section, section)
          )
        );
    } else {
      await db.insert(userSettingsTable).values({
        userEmail,
        section,
        settings: JSON.stringify(newSettings),
      });
    }

    // Log audit event
    await logAuditEvent(userEmail, "UPDATE", section, changes, metadata);

    // Get all updated settings to return
    const allSettings = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userEmail, userEmail));

    const settingsObject: any = {
      profile: {},
      appearance: {},
      notifications: {},
      security: {},
      privacy: {},
    };

    allSettings.forEach((setting) => {
      settingsObject[setting.section] = JSON.parse(setting.settings);
    });

    return c.json({
      data: {
        settings: settingsObject,
        conflicts: [], // No conflicts in this simple implementation
      },
      success: true,
      timestamp: new Date().toISOString(),
      version: Date.now(),
    });
  } catch (error) {
    logger.error("Failed to update settings:", error);
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

// Reset settings section
app.post("/:userId/:section/reset", async (c) => {
  const db = getDatabase(); // FIX: Initialize database connection
  const userId = c.req.param("userId");
  const section = c.req.param("section");
  const userEmail = c.get("userEmail");

  // Security: Users can only reset their own settings
  if (userId !== userEmail) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  try {
    const metadata = getClientMetadata(c);

    // Get current settings for audit trail
    const currentSettings = await db
      .select()
      .from(userSettingsTable)
      .where(
        and(
          eq(userSettingsTable.userEmail, userEmail),
          eq(userSettingsTable.section, section)
        )
      )
      .limit(1);

    const currentData = currentSettings[0] 
      ? JSON.parse(currentSettings[0].settings)
      : {};

    // Default settings for each section
    const defaultSettings: Record<string, any> = {
      profile: {
        name: "",
        email: userEmail,
        bio: "",
        location: "",
        website: "",
        timezone: "UTC",
        language: "en",
        jobTitle: "",
        company: "",
        phone: "",
      },
      appearance: {
        theme: "system",
        fontSize: 14,
        sidebarCollapsed: false,
        density: "comfortable",
        animations: true,
        soundEffects: false,
        highContrast: false,
        reducedMotion: false,
        compactMode: false,
      },
      notifications: {
        email: {
          taskAssigned: true,
          taskCompleted: true,
          taskOverdue: true,
          projectUpdates: true,
          teamInvitations: true,
          weeklyDigest: true,
          mentions: true,
          comments: true,
        },
        push: {
          taskAssigned: true,
          taskCompleted: false,
          taskOverdue: true,
          mentions: true,
          comments: true,
          directMessages: true,
          projectUpdates: false,
        },
        inApp: {
          taskAssigned: true,
          taskCompleted: true,
          taskOverdue: true,
          mentions: true,
          comments: true,
          directMessages: true,
          projectUpdates: true,
          teamActivity: true,
        },
        soundEnabled: true,
      },
      security: {
        twoFactorEnabled: false,
        loginNotifications: true,
        sessionTimeout: true,
        deviceTracking: true,
        suspiciousActivityAlerts: true,
      },
      privacy: {
        profileVisibility: true,
        activityTracking: true,
        analyticsOptIn: false,
        marketingOptIn: false,
        dataRetention: true,
        showOnlineStatus: true,
        allowDirectMessages: true,
      },
    };

    const resetData = defaultSettings[section] || {};

    // Create audit trail
    const changes: Record<string, any> = {};
    Object.keys(currentData).forEach((key) => {
      changes[key] = {
        from: currentData[key],
        to: resetData[key] || null,
      };
    });

    // Update settings
    if (currentSettings[0]) {
      await db
        .update(userSettingsTable)
        .set({
          settings: JSON.stringify(resetData),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userSettingsTable.userEmail, userEmail),
            eq(userSettingsTable.section, section)
          )
        );
    } else {
      await db.insert(userSettingsTable).values({
        userEmail,
        section,
        settings: JSON.stringify(resetData),
      });
    }

    // Log audit event
    await logAuditEvent(userEmail, "RESET", section, changes, metadata);

    // Get all settings to return
    const allSettings = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userEmail, userEmail));

    const settingsObject: any = {
      profile: {},
      appearance: {},
      notifications: {},
      security: {},
      privacy: {},
    };

    allSettings.forEach((setting) => {
      settingsObject[setting.section] = JSON.parse(setting.settings);
    });

    return c.json({
      data: settingsObject,
      success: true,
      timestamp: new Date().toISOString(),
      version: Date.now(),
    });
  } catch (error) {
    logger.error("Failed to reset settings:", error);
    return c.json({ error: "Failed to reset settings" }, 500);
  }
});

// Get audit logs
app.get("/:userId/audit", async (c) => {
  const db = getDatabase();
  const userId = c.req.param("userId");
  const userEmail = c.get("userEmail");

  // Security: Users can only access their own audit logs
  if (userId !== userEmail) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  try {
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = parseInt(c.req.query("offset") || "0");
    const section = c.req.query("section");
    const action = c.req.query("action");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    // Build where conditions
    const whereConditions = [eq(settingsAuditLogTable.userEmail, userEmail)];
    
    if (section) {
      whereConditions.push(eq(settingsAuditLogTable.section, section));
    }
    if (action) {
      whereConditions.push(eq(settingsAuditLogTable.action, action));
    }
    if (startDate) {
      whereConditions.push(gte(settingsAuditLogTable.createdAt, new Date(startDate)));
    }
    if (endDate) {
      whereConditions.push(lte(settingsAuditLogTable.createdAt, new Date(endDate)));
    }

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(settingsAuditLogTable)
      .where(and(...whereConditions));

    const total = totalResult[0]?.count || 0;

    // Get paginated results
    const logs = await db
      .select()
      .from(settingsAuditLogTable)
      .where(and(...whereConditions))
      .orderBy(desc(settingsAuditLogTable.createdAt))
      .limit(limit)
      .offset(offset);

    // Format logs for frontend
    const formattedLogs = logs.map((log: any) => ({
      id: log.id,
      userId: log.userEmail,
      action: log.action,
      section: log.section,
      changes: JSON.parse(log.changes),
      metadata: JSON.parse(log.metadata),
    }));

    return c.json({
      data: {
        logs: formattedLogs,
        total,
      },
      success: true,
      timestamp: new Date().toISOString(),
      version: Date.now(),
    });
  } catch (error) {
    logger.error("Failed to get audit logs:", error);
    return c.json({ error: "Failed to retrieve audit logs" }, 500);
  }
});

// Validate settings
app.post("/:section/validate", async (c) => {
  const section = c.req.param("section");

  try {
    const { settings } = await c.req.json();
    const errors: Array<{ field: string; message: string; code: string }> = [];

    // Basic validation rules
    if (section === "profile") {
      if (settings.email && !settings.email.includes("@")) {
        errors.push({
          field: "email",
          message: "Invalid email format",
          code: "INVALID_EMAIL",
        });
      }
      if (settings.name && settings.name.length > 100) {
        errors.push({
          field: "name",
          message: "Name must be less than 100 characters",
          code: "NAME_TOO_LONG",
        });
      }
    }

    if (section === "appearance") {
      if (settings.fontSize && (settings.fontSize < 10 || settings.fontSize > 24)) {
        errors.push({
          field: "fontSize",
          message: "Font size must be between 10 and 24",
          code: "INVALID_FONT_SIZE",
        });
      }
    }

    return c.json({
      data: errors,
      success: true,
      timestamp: new Date().toISOString(),
      version: Date.now(),
    });
  } catch (error) {
    logger.error("Failed to validate settings:", error);
    return c.json({ error: "Failed to validate settings" }, 500);
  }
});

// Apply preset
app.post("/:userId/preset/:presetId", async (c) => {
  const db = getDatabase();
  const userId = c.req.param("userId");
  const presetId = c.req.param("presetId");
  const userEmail = c.get("userEmail");

  // Security: Users can only apply presets to their own settings
  if (userId !== userEmail) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  try {
    const { customizations } = await c.req.json();
    const metadata = getClientMetadata(c);

    // Get preset (for now, we'll use hardcoded presets, but this could come from the database)
    const presets: Record<string, any> = {
      "sarah-pm": {
        id: "sarah-pm",
        name: "Sarah (PM)",
        settings: {
          appearance: { theme: "light", density: "comfortable", animations: true },
          notifications: { email: { taskAssigned: true, projectUpdates: true } },
        },
      },
      // Add other presets as needed
    };

    const preset = presets[presetId];
    if (!preset) {
      return c.json({ error: "Preset not found" }, 404);
    }

    // Apply preset settings with customizations
    const presetSettings = { ...preset.settings, ...(customizations || {}) };

    // Update each section
    for (const [section, sectionSettings] of Object.entries(presetSettings)) {
      // Get current settings for audit trail
      const currentSettings = await db
        .select()
        .from(userSettingsTable)
        .where(
          and(
            eq(userSettingsTable.userEmail, userEmail),
            eq(userSettingsTable.section, section)
          )
        )
        .limit(1);

      const currentData = currentSettings[0] 
        ? JSON.parse(currentSettings[0].settings)
        : {};

      const newSettings = { ...currentData, ...(sectionSettings as Record<string, any>) };

      // Create audit trail
      const changes: Record<string, any> = {};
      Object.keys(sectionSettings as any).forEach((key) => {
        if (currentData[key] !== (sectionSettings as any)[key]) {
          changes[key] = {
            from: currentData[key],
            to: (sectionSettings as any)[key],
          };
        }
      });

      // Update settings
      if (currentSettings[0]) {
        await db
          .update(userSettingsTable)
          .set({
            settings: JSON.stringify(newSettings),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(userSettingsTable.userEmail, userEmail),
              eq(userSettingsTable.section, section)
            )
          );
      } else {
        await db.insert(userSettingsTable).values({
          userEmail,
          section,
          settings: JSON.stringify(newSettings),
        });
      }
    }

    // Log audit event
    await logAuditEvent(
      userEmail,
      "PRESET_APPLIED",
      "preset",
      { presetId, presetName: preset.name, customizations },
      metadata
    );

    // Get all updated settings
    const allSettings = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userEmail, userEmail));

    const settingsObject: any = {
      profile: {},
      appearance: {},
      notifications: {},
      security: {},
      privacy: {},
    };

    allSettings.forEach((setting: any) => {
      settingsObject[setting.section] = JSON.parse(setting.settings);
    });

    return c.json({
      data: {
        settings: settingsObject,
        applied: preset,
      },
      success: true,
      timestamp: new Date().toISOString(),
      version: Date.now(),
    });
  } catch (error) {
    logger.error("Failed to apply preset:", error);
    return c.json({ error: "Failed to apply preset" }, 500);
  }
});

// Export settings
app.post("/:userId/export", async (c) => {
  const db = getDatabase();
  const userId = c.req.param("userId");
  const userEmail = c.get("userEmail");

  // Security: Users can only export their own settings
  if (userId !== userEmail) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  try {
    const { format, sections, includeMetadata } = await c.req.json();
    const metadata = getClientMetadata(c);

    // Get settings
    const settings = await db
      .select()
      .from(userSettingsTable)
      .where(
        sections && sections.length > 0
          ? and(
              eq(userSettingsTable.userEmail, userEmail),
              sections.length === 1 
                ? eq(userSettingsTable.section, sections[0])
                : sections.map((section: string) => eq(userSettingsTable.section, section)).reduce((acc: any, curr: any) => acc ? and(acc, curr) : curr)
            )
          : eq(userSettingsTable.userEmail, userEmail)
      );

    const settingsObject: any = {};
    settings.forEach((setting: any) => {
      settingsObject[setting.section] = JSON.parse(setting.settings);
    });

    // Add metadata if requested
    if (includeMetadata) {
      settingsObject._metadata = {
        exportedAt: new Date().toISOString(),
        exportedBy: userEmail,
        version: "1.0",
        format,
      };
    }

    // Format data based on requested format
    let data: string;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case "json":
        data = JSON.stringify(settingsObject, null, 2);
        mimeType = "application/json";
        extension = ".json";
        break;
      case "csv":
        // Convert to CSV format
        const csvRows = ["Section,Key,Value"];
        Object.entries(settingsObject).forEach(([section, sectionData]) => {
          if (section !== "_metadata") {
            Object.entries(sectionData as any).forEach(([key, value]) => {
              csvRows.push(`${section},${key},"${JSON.stringify(value)}"`);
            });
          }
        });
        data = csvRows.join("\n");
        mimeType = "text/csv";
        extension = ".csv";
        break;
      case "yaml":
        // Simple YAML conversion (you might want to use a proper YAML library)
        data = Object.entries(settingsObject)
          .map(([section, sectionData]) => {
            const sectionYaml = Object.entries(sectionData as any)
              .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
              .join("\n");
            return `${section}:\n${sectionYaml}`;
          })
          .join("\n\n");
        mimeType = "text/yaml";
        extension = ".yaml";
        break;
      default:
        throw new Error("Unsupported format");
    }

    const filename = `meridian-settings-${new Date().toISOString().split("T")[0]}${extension}`;

    // Log audit event
    await logAuditEvent(
      userEmail,
      "EXPORT",
      "export",
      { format, sections: sections || "all", filename },
      metadata
    );

    return c.json({
      data: {
        data,
        filename,
        mimeType,
      },
      success: true,
      timestamp: new Date().toISOString(),
      version: Date.now(),
    });
  } catch (error) {
    logger.error("Failed to export settings:", error);
    return c.json({ error: "Failed to export settings" }, 500);
  }
});

// Health check
app.get("/health", async (c) => {
  return c.json({
    data: { status: "ok" },
    success: true,
    timestamp: new Date().toISOString(),
    version: Date.now(),
  });
});

// ========================================
// 📧 EMAIL & COMMUNICATION SETTINGS - Phase 1
// ========================================

// Get email settings for workspace
app.get("/email/:workspaceId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  
  try {
    const settings = await getEmailSettings(workspaceId);
    return c.json({
      data: settings,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get email settings:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Update email settings
app.patch(
  "/email/:workspaceId",
  zValidator("json", z.object({
    smtpEnabled: z.boolean().optional(),
    smtpHost: z.string().optional(),
    smtpPort: z.number().int().min(1).max(65535).optional(),
    smtpSecure: z.boolean().optional(),
    smtpUsername: z.string().optional(),
    smtpPassword: z.string().optional(),
    smtpFromEmail: z.string().email().optional(),
    smtpFromName: z.string().optional(),
    enableEmailNotifications: z.boolean().optional(),
    emailSignature: z.string().optional(),
    autoReplyEnabled: z.boolean().optional(),
    autoReplyMessage: z.string().optional(),
    forwardingEnabled: z.boolean().optional(),
    forwardingEmail: z.string().email().optional(),
    dailyDigestEnabled: z.boolean().optional(),
    dailyDigestTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    weeklyDigestEnabled: z.boolean().optional(),
    weeklyDigestDay: z.string().optional(),
    weeklyDigestTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    digestIncludeProjects: z.boolean().optional(),
    digestIncludeTasks: z.boolean().optional(),
    digestIncludeMessages: z.boolean().optional(),
    digestIncludeActivities: z.boolean().optional(),
    allowDirectMessages: z.boolean().optional(),
    allowChannelCreation: z.boolean().optional(),
    requireMessageApproval: z.boolean().optional(),
    messageRetentionDays: z.number().int().positive().nullable().optional(),
    allowFileSharing: z.boolean().optional(),
    maxFileSize: z.number().int().positive().optional(),
    allowedFileTypes: z.array(z.string()).optional(),
    notificationQuietHoursEnabled: z.boolean().optional(),
    notificationQuietHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    notificationQuietHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    notificationDaysEnabled: z.array(z.string()).optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const updates = c.req.valid("json");
    
    try {
      await updateEmailSettings(workspaceId, updates);
      const updatedSettings = await getEmailSettings(workspaceId);
      
      return c.json({
        data: updatedSettings,
        success: true,
        message: "Email settings updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update email settings:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Test SMTP connection
app.post("/email/test-connection", zValidator("json", z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string(),
  password: z.string(),
  fromEmail: z.string().email(),
})), async (c) => {
  const config = c.req.valid("json");
  
  try {
    const result = await testSMTPConnection(config);
    return c.json({
      data: result,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("SMTP connection test failed:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Send test email
app.post("/email/send-test", zValidator("json", z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string(),
  password: z.string(),
  fromEmail: z.string().email(),
  fromName: z.string(),
  toEmail: z.string().email(),
})), async (c) => {
  const { toEmail, ...config } = c.req.valid("json");
  
  try {
    const result = await sendTestEmail(config, toEmail);
    return c.json({
      data: result,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to send test email:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// 📄 EMAIL TEMPLATES - Phase 1
// ========================================

// Get all email templates for workspace
app.get("/email/:workspaceId/templates", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  
  try {
    const templates = await getEmailTemplates(workspaceId);
    return c.json({
      data: templates,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get email templates:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get single email template
app.get("/email/:workspaceId/templates/:templateId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const templateId = c.req.param("templateId");
  
  try {
    const template = await getEmailTemplate(templateId, workspaceId);
    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }
    return c.json({
      data: template,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get email template:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Create email template
app.post("/email/:workspaceId/templates", zValidator("json", z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  htmlBody: z.string().min(1),
  textBody: z.string().optional(),
  category: z.string(),
  variables: z.any().optional(),
  metadata: z.any().optional(),
})), async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const userEmail = c.get("userEmail");
  const input = c.req.valid("json");
  
  try {
    // Get user ID from email
    const db = getDatabase();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    const template = await createEmailTemplate(workspaceId, user.id, input);
    return c.json({
      data: template,
      success: true,
      message: "Email template created successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to create email template:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Update email template
app.patch("/email/:workspaceId/templates/:templateId", zValidator("json", z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(500).optional(),
  htmlBody: z.string().min(1).optional(),
  textBody: z.string().optional(),
  category: z.string().optional(),
  variables: z.any().optional(),
  isActive: z.boolean().optional(),
  metadata: z.any().optional(),
})), async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const templateId = c.req.param("templateId");
  const updates = c.req.valid("json");
  
  try {
    const template = await updateEmailTemplate(templateId, workspaceId, updates);
    return c.json({
      data: template,
      success: true,
      message: "Email template updated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to update email template:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete email template
app.delete("/email/:workspaceId/templates/:templateId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const templateId = c.req.param("templateId");
  
  try {
    await deleteEmailTemplate(templateId, workspaceId);
    return c.json({
      success: true,
      message: "Email template deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to delete email template:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// ⚡ AUTOMATION SETTINGS - Phase 1
// ========================================

// Get automation settings for workspace
app.get("/automation/:workspaceId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  
  try {
    const settings = await getAutomationSettings(workspaceId);
    return c.json({
      data: settings,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get automation settings:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Update automation settings
app.patch(
  "/automation/:workspaceId",
  zValidator("json", z.object({
    automationEnabled: z.boolean().optional(),
    allowUserAutomation: z.boolean().optional(),
    maxRulesPerUser: z.number().int().min(1).max(1000).optional(),
    maxActionsPerRule: z.number().int().min(1).max(100).optional(),
    workflowExecutionTimeout: z.number().int().min(10).max(3600).optional(),
    maxConcurrentWorkflows: z.number().int().min(1).max(100).optional(),
    retryFailedWorkflows: z.boolean().optional(),
    maxRetryAttempts: z.number().int().min(0).max(10).optional(),
    retryDelayMinutes: z.number().int().min(1).max(1440).optional(),
    notifyOnWorkflowStart: z.boolean().optional(),
    notifyOnWorkflowComplete: z.boolean().optional(),
    notifyOnWorkflowError: z.boolean().optional(),
    errorNotificationRecipients: z.array(z.string().email()).optional(),
    dailyExecutionLimit: z.number().int().positive().nullable().optional(),
    monthlyExecutionLimit: z.number().int().positive().nullable().optional(),
    executionHistoryRetentionDays: z.number().int().min(1).max(365).optional(),
    allowRulePriorities: z.boolean().optional(),
    defaultRulePriority: z.number().int().min(1).max(10).optional(),
    enableDebugMode: z.boolean().optional(),
    logExecutionDetails: z.boolean().optional(),
    allowExternalWebhooks: z.boolean().optional(),
    webhookTimeout: z.number().int().min(5).max(300).optional(),
    allowAPIIntegrations: z.boolean().optional(),
    requireApprovalForDestructive: z.boolean().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const updates = c.req.valid("json");
    
    try {
      await updateAutomationSettings(workspaceId, updates);
      const updatedSettings = await getAutomationSettings(workspaceId);
      
      return c.json({
        data: updatedSettings,
        success: true,
        message: "Automation settings updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update automation settings:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// ========================================
// 📅 CALENDAR SETTINGS - Phase 1
// ========================================

// Get calendar settings for workspace
app.get("/calendar/:workspaceId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  
  try {
    const settings = await getCalendarSettings(workspaceId);
    return c.json({
      data: settings,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get calendar settings:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Update calendar settings
app.patch(
  "/calendar/:workspaceId",
  zValidator("json", z.object({
    googleCalendarEnabled: z.boolean().optional(),
    googleCalendarSyncEnabled: z.boolean().optional(),
    googleCalendarSyncInterval: z.number().int().min(5).max(1440).optional(),
    googleCalendarDefaultCalendar: z.string().optional(),
    defaultEventDuration: z.number().int().min(15).max(1440).optional(),
    defaultEventReminder: z.number().int().min(0).max(1440).optional(),
    allowAllDayEvents: z.boolean().optional(),
    defaultEventVisibility: z.enum(['public', 'private', 'workspace']).optional(),
    requireEventApproval: z.boolean().optional(),
    workingHoursEnabled: z.boolean().optional(),
    workingHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    workingHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    workingDays: z.array(z.string()).optional(),
    timezone: z.string().optional(),
    allowMeetingRooms: z.boolean().optional(),
    maxMeetingDuration: z.number().int().min(15).max(1440).optional(),
    bufferTimeBetweenMeetings: z.number().int().min(0).max(120).optional(),
    allowRecurringEvents: z.boolean().optional(),
    maxRecurringInstances: z.number().int().min(1).max(365).optional(),
    calendarViewType: z.enum(['month', 'week', 'day', 'agenda']).optional(),
    showWeekends: z.boolean().optional(),
    startDayOfWeek: z.enum(['sunday', 'monday']).optional(),
    timeFormat: z.enum(['12h', '24h']).optional(),
    dateFormat: z.string().optional(),
    sendEventReminders: z.boolean().optional(),
    sendEventUpdates: z.boolean().optional(),
    sendCancellationNotices: z.boolean().optional(),
    reminderMethods: z.array(z.string()).optional(),
    allowExternalCalendars: z.boolean().optional(),
    supportedCalendarTypes: z.array(z.string()).optional(),
    allowGuestAccess: z.boolean().optional(),
    allowEventExport: z.boolean().optional(),
    showBusyTime: z.boolean().optional(),
    allowConflictingEvents: z.boolean().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const updates = c.req.valid("json");
    
    try {
      await updateCalendarSettings(workspaceId, updates);
      const updatedSettings = await getCalendarSettings(workspaceId);
      
      return c.json({
        data: updatedSettings,
        success: true,
        message: "Calendar settings updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update calendar settings:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// ========================================
// 📊 AUDIT LOGS & ACTIVITY - Phase 2
// ========================================

// Get audit logs with filtering
app.get("/audit/:workspaceId/logs", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const query = c.req.query();
  
  try {
    const logs = await getAuditLogs(workspaceId, {
      startDate: query.startDate,
      endDate: query.endDate,
      userEmail: query.userEmail,
      action: query.action,
      entityType: query.entityType,
      searchTerm: query.searchTerm,
      page: query.page ? parseInt(query.page) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize) : undefined,
    });
    
    return c.json({
      data: logs,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get audit logs:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get audit log statistics
app.get("/audit/:workspaceId/stats", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const query = c.req.query();
  
  try {
    const stats = await getAuditStats(
      workspaceId,
      query.startDate,
      query.endDate
    );
    
    return c.json({
      data: stats,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get audit stats:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get audit log filter options
app.get("/audit/:workspaceId/filters", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  
  try {
    const filters = await getAuditFilterOptions(workspaceId);
    
    return c.json({
      data: filters,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get filter options:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get audit log settings
app.get("/audit/:workspaceId/settings", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  
  try {
    const settings = await getAuditLogSettings(workspaceId);
    
    return c.json({
      data: settings,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get audit log settings:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Update audit log settings
app.patch(
  "/audit/:workspaceId/settings",
  zValidator("json", z.object({
    enableAuditLogs: z.boolean().optional(),
    logUserActions: z.boolean().optional(),
    logSystemActions: z.boolean().optional(),
    logAPIRequests: z.boolean().optional(),
    logSecurityEvents: z.boolean().optional(),
    retentionDays: z.number().int().min(1).max(3650).optional(),
    autoArchiveEnabled: z.boolean().optional(),
    archiveAfterDays: z.number().int().min(1).max(3650).optional(),
    autoDeleteEnabled: z.boolean().optional(),
    deleteAfterDays: z.number().int().min(1).max(3650).optional(),
    logIPAddresses: z.boolean().optional(),
    logUserAgents: z.boolean().optional(),
    logMetadata: z.boolean().optional(),
    logChanges: z.boolean().optional(),
    excludeActions: z.array(z.string()).optional(),
    excludeEntityTypes: z.array(z.string()).optional(),
    anonymizeUserData: z.boolean().optional(),
    anonymizeAfterDays: z.number().int().min(1).max(3650).optional(),
    immutableLogs: z.boolean().optional(),
    requireApprovalForDeletion: z.boolean().optional(),
    notifyOnCriticalActions: z.boolean().optional(),
    criticalActions: z.array(z.string()).optional(),
    allowLogExport: z.boolean().optional(),
    exportFormat: z.enum(['json', 'csv', 'both']).optional(),
    includeMetadataInExport: z.boolean().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const updates = c.req.valid("json");
    
    try {
      await updateAuditLogSettings(workspaceId, updates);
      const updatedSettings = await getAuditLogSettings(workspaceId);
      
      return c.json({
        data: updatedSettings,
        success: true,
        message: "Audit log settings updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update audit log settings:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Export audit logs
app.post("/audit/:workspaceId/export", zValidator("json", z.object({
  format: z.enum(['json', 'csv']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})), async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const { format, startDate, endDate } = c.req.valid("json");
  
  try {
    const result = await exportAuditLogs(workspaceId, format, startDate, endDate);
    
    return c.json({
      data: result,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to export audit logs:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// 💾 BACKUP & RECOVERY - Phase 2
// ========================================

// Get backup settings
app.get("/backup/:workspaceId/settings", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  
  try {
    const settings = await getBackupSettings(workspaceId);
    
    return c.json({
      data: settings,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get backup settings:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Update backup settings
app.patch(
  "/backup/:workspaceId/settings",
  zValidator("json", z.object({
    enableAutomatedBackups: z.boolean().optional(),
    backupFrequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']).optional(),
    backupTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    backupDayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
    backupDayOfMonth: z.number().int().min(1).max(31).optional(),
    includeWorkspaceData: z.boolean().optional(),
    includeProjects: z.boolean().optional(),
    includeTasks: z.boolean().optional(),
    includeUsers: z.boolean().optional(),
    includeMessages: z.boolean().optional(),
    includeFiles: z.boolean().optional(),
    includeSettings: z.boolean().optional(),
    includeAuditLogs: z.boolean().optional(),
    maxBackupCount: z.number().int().min(1).max(100).optional(),
    retentionDays: z.number().int().min(1).max(3650).optional(),
    compressBackups: z.boolean().optional(),
    encryptBackups: z.boolean().optional(),
    storageType: z.enum(['local', 's3', 'azure', 'gcp']).optional(),
    storagePath: z.string().optional(),
    s3Bucket: z.string().optional(),
    s3Region: z.string().optional(),
    azureContainer: z.string().optional(),
    gcpBucket: z.string().optional(),
    notifyOnSuccess: z.boolean().optional(),
    notifyOnFailure: z.boolean().optional(),
    notificationRecipients: z.array(z.string().email()).optional(),
    incrementalBackups: z.boolean().optional(),
    verifyBackupIntegrity: z.boolean().optional(),
    excludePatterns: z.array(z.string()).optional(),
    maxBackupSize: z.number().int().positive().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const updates = c.req.valid("json");
    
    try {
      await updateBackupSettings(workspaceId, updates);
      const updatedSettings = await getBackupSettings(workspaceId);
      
      return c.json({
        data: updatedSettings,
        success: true,
        message: "Backup settings updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update backup settings:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Get backup history
app.get("/backup/:workspaceId/history", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const limit = parseInt(c.req.query("limit") || "50");
  
  try {
    const history = await getBackupHistory(workspaceId, limit);
    
    return c.json({
      data: history,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get backup history:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Create manual backup
app.post("/backup/:workspaceId/create", zValidator("json", z.object({
  includeFiles: z.boolean().optional().default(false),
})), async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const { includeFiles } = c.req.valid("json");
  
  try {
    const result = await createManualBackup(workspaceId, includeFiles);
    
    return c.json({
      data: result,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to create backup:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Restore from backup
app.post("/backup/:workspaceId/:backupId/restore", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const backupId = c.req.param("backupId");
  
  try {
    const result = await restoreFromBackup(workspaceId, backupId);
    
    return c.json({
      data: result,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to restore backup:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Download backup
app.get("/backup/:workspaceId/:backupId/download", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const backupId = c.req.param("backupId");
  
  try {
    const result = await downloadBackup(workspaceId, backupId);
    
    return c.json({
      data: result,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to download backup:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete backup
app.delete("/backup/:workspaceId/:backupId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const backupId = c.req.param("backupId");
  
  try {
    const result = await deleteBackup(workspaceId, backupId);
    
    return c.json({
      data: result,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to delete backup:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Verify backup integrity
app.post("/backup/:workspaceId/:backupId/verify", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const backupId = c.req.param("backupId");
  
  try {
    const result = await verifyBackup(workspaceId, backupId);
    
    return c.json({
      data: result,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to verify backup:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// 🔐 ROLE PERMISSIONS MANAGER - Phase 2
// ========================================

// Get all permissions (categories and list)
app.get("/roles/permissions", async (c) => {
  try {
    const permissions = getAllPermissions();
    
    return c.json({
      data: permissions,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get permissions:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get role templates
app.get("/roles/templates", async (c) => {
  try {
    const templates = getRoleTemplates();
    
    return c.json({
      data: templates,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get templates:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get all roles for workspace
app.get("/roles/:workspaceId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  
  try {
    const roles = await getRoles(workspaceId);
    
    return c.json({
      data: roles,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get roles:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get single role
app.get("/roles/:workspaceId/:roleId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const roleId = c.req.param("roleId");
  
  try {
    const role = await getRole(workspaceId, roleId);
    
    if (!role) {
      return c.json({ error: "Role not found" }, 404);
    }
    
    return c.json({
      data: role,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get role:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Create custom role
app.post(
  "/roles/:workspaceId",
  zValidator("json", z.object({
    name: z.string().min(1).max(50),
    description: z.string().max(200),
    permissions: z.array(z.string()),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    basedOn: z.string().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const data = c.req.valid("json");
    
    try {
      const role = await createRole(workspaceId, data);
      
      return c.json({
        data: role,
        success: true,
        message: "Role created successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to create role:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Update custom role
app.patch(
  "/roles/:workspaceId/:roleId",
  zValidator("json", z.object({
    name: z.string().min(1).max(50).optional(),
    description: z.string().max(200).optional(),
    permissions: z.array(z.string()).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const roleId = c.req.param("roleId");
    const data = c.req.valid("json");
    
    try {
      const role = await updateRole(workspaceId, roleId, data);
      
      return c.json({
        data: role,
        success: true,
        message: "Role updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update role:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Delete custom role
app.delete("/roles/:workspaceId/:roleId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const roleId = c.req.param("roleId");
  
  try {
    await deleteRole(workspaceId, roleId);
    
    return c.json({
      success: true,
      message: "Role deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to delete role:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Clone role
app.post(
  "/roles/:workspaceId/:roleId/clone",
  zValidator("json", z.object({
    name: z.string().min(1).max(50),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const roleId = c.req.param("roleId");
    const { name } = c.req.valid("json");
    
    try {
      const role = await cloneRole(workspaceId, roleId, name);
      
      return c.json({
        data: role,
        success: true,
        message: "Role cloned successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to clone role:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// ========================================
// 🔍 ADVANCED SEARCH - Phase 2
// ========================================

// Perform search
app.post(
  "/search/:workspaceId",
  zValidator("json", z.object({
    query: z.string().optional(),
    types: z.array(z.enum(['project', 'task', 'user', 'message'])).optional(),
    status: z.array(z.string()).optional(),
    priority: z.array(z.string()).optional(),
    assignedTo: z.array(z.string()).optional(),
    createdBy: z.array(z.string()).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    tags: z.array(z.string()).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const { limit = 50, ...filters } = c.req.valid("json");
    
    try {
      const results = await performSearch(workspaceId, filters, limit);
      
      return c.json({
        data: results,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to perform search:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Get search suggestions
app.get("/search/:workspaceId/suggestions", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const query = c.req.query("q") || "";
  const limit = parseInt(c.req.query("limit") || "10");
  
  try {
    const suggestions = await getSearchSuggestions(workspaceId, query, limit);
    
    return c.json({
      data: suggestions,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get suggestions:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get saved searches
app.get("/search/:workspaceId/saved", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const userEmail = c.get("userEmail");
  
  try {
    const searches = await getSavedSearches(workspaceId, userEmail);
    
    return c.json({
      data: searches,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get saved searches:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Save search
app.post(
  "/search/:workspaceId/saved",
  zValidator("json", z.object({
    name: z.string().min(1).max(100),
    filters: z.object({
      query: z.string().optional(),
      types: z.array(z.enum(['project', 'task', 'user', 'message'])).optional(),
      status: z.array(z.string()).optional(),
      priority: z.array(z.string()).optional(),
      assignedTo: z.array(z.string()).optional(),
      createdBy: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
    isPublic: z.boolean().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const userEmail = c.get("userEmail");
    const { name, filters, isPublic = false } = c.req.valid("json");
    
    try {
      const savedSearch = await saveSearch(workspaceId, userEmail, name, filters, isPublic);
      
      return c.json({
        data: savedSearch,
        success: true,
        message: "Search saved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to save search:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Update saved search
app.patch(
  "/search/:workspaceId/saved/:searchId",
  zValidator("json", z.object({
    name: z.string().min(1).max(100).optional(),
    filters: z.object({
      query: z.string().optional(),
      types: z.array(z.enum(['project', 'task', 'user', 'message'])).optional(),
      status: z.array(z.string()).optional(),
      priority: z.array(z.string()).optional(),
      assignedTo: z.array(z.string()).optional(),
      createdBy: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }).optional(),
    isPublic: z.boolean().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const searchId = c.req.param("searchId");
    const userEmail = c.get("userEmail");
    const updates = c.req.valid("json");
    
    try {
      const savedSearch = await updateSavedSearch(workspaceId, userEmail, searchId, updates);
      
      return c.json({
        data: savedSearch,
        success: true,
        message: "Search updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update saved search:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Delete saved search
app.delete("/search/:workspaceId/saved/:searchId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const searchId = c.req.param("searchId");
  const userEmail = c.get("userEmail");
  
  try {
    await deleteSavedSearch(workspaceId, userEmail, searchId);
    
    return c.json({
      success: true,
      message: "Search deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to delete saved search:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Record search usage
app.post("/search/:workspaceId/saved/:searchId/use", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const searchId = c.req.param("searchId");
  const userEmail = c.get("userEmail");
  
  try {
    await recordSearchUsage(workspaceId, userEmail, searchId);
    
    return c.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to record search usage:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// 📦 IMPORT/EXPORT - Phase 2
// ========================================

// Get export templates
app.get("/import-export/templates", async (c) => {
  try {
    const templates = getExportTemplates();
    
    return c.json({
      data: templates,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get templates:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Export workspace data
app.post(
  "/import-export/:workspaceId/export",
  zValidator("json", z.object({
    format: z.enum(['json', 'csv']),
    includeProjects: z.boolean().optional(),
    includeTasks: z.boolean().optional(),
    includeUsers: z.boolean().optional(),
    includeRoles: z.boolean().optional(),
    projectIds: z.array(z.string()).optional(),
    dateRange: z.object({
      start: z.string(),
      end: z.string(),
    }).optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const options = c.req.valid("json");
    
    try {
      const result = await exportWorkspaceData(workspaceId, options);
      
      return c.json({
        data: result,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to export data:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Validate import data
app.post(
  "/import-export/:workspaceId/validate",
  zValidator("json", z.object({
    format: z.enum(['json', 'csv']),
    data: z.any(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const { format, data } = c.req.valid("json");
    
    try {
      const result = await validateImportData(workspaceId, data, format);
      
      return c.json({
        data: result,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to validate import data:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Import workspace data
app.post(
  "/import-export/:workspaceId/import",
  zValidator("json", z.object({
    format: z.enum(['json', 'csv']),
    data: z.any(),
    validateOnly: z.boolean().optional(),
    skipDuplicates: z.boolean().optional(),
    updateExisting: z.boolean().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const options = c.req.valid("json");
    
    try {
      const result = await importWorkspaceData(workspaceId, options.data, options);
      
      return c.json({
        data: result,
        success: result.success,
        message: result.success 
          ? `Successfully imported ${result.importedRecords} of ${result.totalRecords} records`
          : `Import failed with ${result.errors.length} errors`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to import data:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// ========================================
// 🎨 THEMES & BRANDING - Phase 3
// ========================================

// Get theme templates
app.get("/themes/templates", async (c) => {
  try {
    return c.json({
      data: THEME_TEMPLATES,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get theme templates:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get all themes for a workspace
app.get(
  "/themes/:workspaceId/themes",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    
    try {
      const themes = await getThemes(workspaceId);
      
      return c.json({
        data: themes,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to get themes:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Get a single theme
app.get(
  "/themes/:workspaceId/themes/:themeId",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const themeId = c.req.param("themeId");
    
    try {
      const theme = await getTheme(workspaceId, themeId);
      
      if (!theme) {
        return c.json({ error: "Theme not found" }, 404);
      }
      
      return c.json({
        data: theme,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to get theme:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Create a new theme
app.post(
  "/themes/:workspaceId/themes",
  zValidator("json", z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    colors: z.object({
      primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      primaryForeground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      secondaryForeground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      accentForeground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      foreground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      card: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      cardForeground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      popover: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      popoverForeground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      muted: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      mutedForeground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      border: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      input: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      ring: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      destructive: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      destructiveForeground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      success: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      successForeground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      warning: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      warningForeground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      info: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      infoForeground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    }),
    typography: z.object({
      fontFamily: z.string(),
      fontSizeBase: z.number().min(10).max(24),
      fontSizeSmall: z.number().min(8).max(20),
      fontSizeLarge: z.number().min(12).max(32),
      fontSizeHeading: z.number().min(16).max(48),
      lineHeight: z.number().min(1).max(3),
      letterSpacing: z.number().min(-2).max(2),
      fontWeightNormal: z.number().min(100).max(900),
      fontWeightMedium: z.number().min(100).max(900),
      fontWeightBold: z.number().min(100).max(900),
    }),
    spacing: z.object({
      borderRadius: z.enum(['sharp', 'rounded', 'pill']),
      borderRadiusValue: z.string(),
      componentSpacing: z.enum(['compact', 'normal', 'spacious']),
      containerMaxWidth: z.string(),
      shadowIntensity: z.enum(['none', 'subtle', 'normal', 'strong']),
    }),
    isPublic: z.boolean().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const themeData = c.req.valid("json");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    
    try {
      const theme = await createTheme(workspaceId, userEmail, themeData);
      
      return c.json({
        data: theme,
        success: true,
        message: "Theme created successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to create theme:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Update a theme
app.patch(
  "/themes/:workspaceId/themes/:themeId",
  zValidator("json", z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    colors: z.any().optional(),
    typography: z.any().optional(),
    spacing: z.any().optional(),
    isPublic: z.boolean().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const themeId = c.req.param("themeId");
    const updates = c.req.valid("json");
    
    try {
      const theme = await updateTheme(workspaceId, themeId, updates);
      
      return c.json({
        data: theme,
        success: true,
        message: "Theme updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update theme:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Delete a theme
app.delete(
  "/themes/:workspaceId/themes/:themeId",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const themeId = c.req.param("themeId");
    
    try {
      await deleteTheme(workspaceId, themeId);
      
      return c.json({
        success: true,
        message: "Theme deleted successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to delete theme:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Clone a theme
app.post(
  "/themes/:workspaceId/themes/:themeId/clone",
  zValidator("json", z.object({
    name: z.string().min(1).max(100),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const themeId = c.req.param("themeId");
    const { name } = c.req.valid("json");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    
    try {
      const theme = await cloneTheme(workspaceId, themeId, userEmail, name);
      
      return c.json({
        data: theme,
        success: true,
        message: "Theme cloned successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to clone theme:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Apply a theme
app.post(
  "/themes/:workspaceId/themes/:themeId/apply",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const themeId = c.req.param("themeId");
    
    try {
      await applyTheme(workspaceId, themeId);
      
      return c.json({
        success: true,
        message: "Theme applied successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to apply theme:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Get branding settings
app.get(
  "/themes/:workspaceId/branding",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    
    try {
      const branding = await getBrandingSettings(workspaceId);
      
      return c.json({
        data: branding,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to get branding settings:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// ========================================
// 🎨 THEME MARKETPLACE & SHARING - Phase 4.1
// ========================================

// Share/publish theme to marketplace
app.post(
  "/themes/:workspaceId/themes/:themeId/share",
  zValidator("json", z.object({
    isPublic: z.boolean(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const themeId = c.req.param("themeId");
    const { isPublic } = c.req.valid("json");
    
    try {
      const theme = await updateTheme(workspaceId, themeId, { isPublic });
      
      return c.json({
        data: theme,
        success: true,
        message: isPublic ? "Theme published to marketplace" : "Theme made private",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update theme visibility:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Get marketplace themes (public themes from all workspaces)
app.get("/themes/marketplace", async (c) => {
  try {
    // Use getThemes from all workspaces with isGlobal filter
    const db = getDatabase();
    const themes = await db
      .select()
      .from(customThemesTable)
      .where(
        and(
          eq(customThemesTable.isGlobal, true),
          eq(customThemesTable.isActive, true)
        )
      )
      .orderBy(desc(customThemesTable.createdAt));
    
    return c.json({
      data: themes,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get marketplace themes:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Install theme from marketplace
app.post(
  "/themes/:workspaceId/marketplace/:themeId/install",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const themeId = c.req.param("themeId");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    
    try {
      const db = getDatabase();
      // Get the marketplace theme
      const [sourceTheme] = await db
        .select()
        .from(customThemesTable)
        .where(
          and(
            eq(customThemesTable.id, themeId),
            eq(customThemesTable.isGlobal, true)
          )
        )
        .limit(1);
      
      if (!sourceTheme) {
        return c.json({ error: "Theme not found in marketplace" }, 404);
      }
      
      // Clone the theme for this workspace
      const newTheme = await cloneTheme(
        workspaceId,
        themeId,
        userEmail,
        `${sourceTheme.name} (Installed)`
      );
      
      return c.json({
        data: newTheme,
        success: true,
        message: "Theme installed successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to install theme:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Export theme (get JSON)
app.get(
  "/themes/:workspaceId/themes/:themeId/export",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const themeId = c.req.param("themeId");
    
    try {
      const theme = await getTheme(workspaceId, themeId);
      
      if (!theme) {
        return c.json({ error: "Theme not found" }, 404);
      }
      
      // Return theme as downloadable JSON
      return c.json({
        data: {
          name: theme.name,
          description: theme.description,
          colors: theme.colors,
          typography: theme.typography,
          spacing: theme.spacing,
          isPublic: theme.isPublic,
          exportedAt: new Date().toISOString(),
          version: "1.0",
        },
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to export theme:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Import theme (from JSON)
app.post(
  "/themes/:workspaceId/themes/import",
  zValidator("json", z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    colors: z.any(),
    typography: z.any().optional(),
    spacing: z.any().optional(),
    isPublic: z.boolean().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const themeData = c.req.valid("json");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    
    try {
      // Import default typography/spacing from THEME_TEMPLATES
      const theme = await createTheme(workspaceId, userEmail, {
        name: themeData.name,
        description: themeData.description,
        colors: themeData.colors,
        typography: themeData.typography || THEME_TEMPLATES.default.typography,
        spacing: themeData.spacing || THEME_TEMPLATES.default.spacing,
        isPublic: themeData.isPublic || false,
      });
      
      return c.json({
        data: theme,
        success: true,
        message: "Theme imported successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to import theme:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// ========================================
// 🖼️ BACKGROUND IMAGE CUSTOMIZATION - Phase 4.3
// ========================================

// Upload background image
app.post("/background/upload", async (c) => {
  try {
    const userEmail = c.get("userEmail");
    if (!userEmail) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed" }, 400);
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ error: "File size exceeds 10MB limit" }, 400);
    }

    // Convert file to base64 (for simplicity - in production, use proper file storage)
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    return c.json({
      success: true,
      imageUrl: dataUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to upload background image:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get background preferences
app.get("/background/:userEmail", async (c) => {
  const userEmailParam = c.req.param("userEmail");
  const userEmail = c.get("userEmail");
  
  if (!userEmail || userEmail !== userEmailParam) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    const [preferences] = await db
      .select()
      .from(userSettingsTable)
      .where(
        and(
          eq(userSettingsTable.userEmail, userEmail),
          eq(userSettingsTable.section, "appearance")
        )
      )
      .limit(1);

    const backgroundPrefs = preferences ? JSON.parse(preferences.settings) : {};

    return c.json({
      data: {
        backgroundImage: backgroundPrefs.backgroundImage || null,
        backgroundPosition: backgroundPrefs.backgroundPosition || "center",
        backgroundBlur: backgroundPrefs.backgroundBlur || 0,
        backgroundOpacity: backgroundPrefs.backgroundOpacity || 100,
      },
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get background preferences:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Update background preferences
app.patch(
  "/background/:userEmail",
  zValidator("json", z.object({
    backgroundImage: z.string().optional().nullable(),
    backgroundPosition: z.enum(["center", "top", "bottom", "left", "right"]).optional(),
    backgroundBlur: z.number().min(0).max(20).optional(),
    backgroundOpacity: z.number().min(0).max(100).optional(),
  })),
  async (c) => {
    const userEmailParam = c.req.param("userEmail");
    const userEmail = c.get("userEmail");
    const updates = c.req.valid("json");
    
    if (!userEmail || userEmail !== userEmailParam) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const db = getDatabase();
      
      // Get current settings
      const [currentSettings] = await db
        .select()
        .from(userSettingsTable)
        .where(
          and(
            eq(userSettingsTable.userEmail, userEmail),
            eq(userSettingsTable.section, "appearance")
          )
        )
        .limit(1);

      if (!currentSettings) {
        // Create new settings if they don't exist
        await db.insert(userSettingsTable).values({
          userEmail,
          section: "appearance",
          settings: JSON.stringify(updates),
        });
      } else {
        // Update existing settings
        const existingSettings = JSON.parse(currentSettings.settings);
        await db
          .update(userSettingsTable)
          .set({
            settings: JSON.stringify({
              ...existingSettings,
              ...updates,
            }),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(userSettingsTable.userEmail, userEmail),
              eq(userSettingsTable.section, "appearance")
            )
          );
      }

      return c.json({
        success: true,
        message: "Background preferences updated",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update background preferences:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// ========================================
// ♿ ACCESSIBILITY SETTINGS - Phase 4.5
// ========================================

// Get all appearance settings (including accessibility)
app.get("/appearance/:userEmail", async (c) => {
  const userEmailParam = c.req.param("userEmail");
  const userEmail = c.get("userEmail");

  if (!userEmail || userEmail !== userEmailParam) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    const [settings] = await db
      .select()
      .from(userSettingsTable)
      .where(
        and(
          eq(userSettingsTable.userEmail, userEmail),
          eq(userSettingsTable.section, "appearance")
        )
      )
      .limit(1);

    if (!settings) {
      return c.json({
        settings: JSON.stringify({}),
        timestamp: new Date().toISOString(),
      });
    }

    return c.json({
      settings: settings.settings,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to fetch appearance settings:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// 🔤 FONT CUSTOMIZATION - Phase 4.4
// ========================================

// Get font preferences
app.get("/fonts/:userEmail", async (c) => {
  const userEmailParam = c.req.param("userEmail");
  const userEmail = c.get("userEmail");
  
  if (!userEmail || userEmail !== userEmailParam) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    const [preferences] = await db
      .select()
      .from(userSettingsTable)
      .where(
        and(
          eq(userSettingsTable.userEmail, userEmail),
          eq(userSettingsTable.section, "appearance")
        )
      )
      .limit(1);

    const fontPrefs = preferences ? JSON.parse(preferences.settings) : {};

    return c.json({
      data: {
        fontFamily: fontPrefs.fontFamily || "Inter",
        fontSize: fontPrefs.fontSize || 14,
        fontWeight: fontPrefs.fontWeight || 400,
        lineHeight: fontPrefs.lineHeight || 1.5,
        letterSpacing: fontPrefs.letterSpacing || 0,
      },
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get font preferences:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Update font preferences
app.patch(
  "/fonts/:userEmail",
  zValidator("json", z.object({
    fontFamily: z.string().optional(),
    fontSize: z.number().min(10).max(24).optional(),
    fontWeight: z.number().min(100).max(900).optional(),
    lineHeight: z.number().min(1).max(2.5).optional(),
    letterSpacing: z.number().min(-2).max(5).optional(),
  })),
  async (c) => {
    const userEmailParam = c.req.param("userEmail");
    const userEmail = c.get("userEmail");
    const updates = c.req.valid("json");
    
    if (!userEmail || userEmail !== userEmailParam) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const db = getDatabase();
      
      // Get current settings
      const [currentSettings] = await db
        .select()
        .from(userSettingsTable)
        .where(
          and(
            eq(userSettingsTable.userEmail, userEmail),
            eq(userSettingsTable.section, "appearance")
          )
        )
        .limit(1);

      if (!currentSettings) {
        // Create new settings if they don't exist
        await db.insert(userSettingsTable).values({
          userEmail,
          section: "appearance",
          settings: JSON.stringify(updates),
        });
      } else {
        // Update existing settings
        const existingSettings = JSON.parse(currentSettings.settings);
        await db
          .update(userSettingsTable)
          .set({
            settings: JSON.stringify({
              ...existingSettings,
              ...updates,
            }),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(userSettingsTable.userEmail, userEmail),
              eq(userSettingsTable.section, "appearance")
            )
          );
      }

      return c.json({
        success: true,
        message: "Font preferences updated",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update font preferences:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Update branding settings
app.patch(
  "/themes/:workspaceId/branding",
  zValidator("json", z.object({
    logoUrl: z.string().url().optional(),
    faviconUrl: z.string().url().optional(),
    loginBackgroundUrl: z.string().url().optional(),
    customCss: z.string().max(50000).optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const updates = c.req.valid("json");
    
    try {
      const branding = await updateBrandingSettings(workspaceId, updates);
      
      return c.json({
        data: branding,
        success: true,
        message: "Branding settings updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update branding settings:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// ========================================
// 🌍 LOCALIZATION - Phase 3
// ========================================

// Get supported languages
app.get("/localization/supported", async (c) => {
  try {
    return c.json({
      data: SUPPORTED_LANGUAGES,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get supported languages:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get all languages for workspace
app.get(
  "/localization/:workspaceId/languages",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    
    try {
      const languages = await getLanguages(workspaceId);
      
      return c.json({
        data: languages,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to get languages:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Get a single language
app.get(
  "/localization/:workspaceId/languages/:langCode",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const langCode = c.req.param("langCode");
    
    try {
      const language = await getLanguage(workspaceId, langCode);
      
      if (!language) {
        return c.json({ error: "Language not found" }, 404);
      }
      
      return c.json({
        data: language,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to get language:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Add a new language
app.post(
  "/localization/:workspaceId/languages",
  zValidator("json", z.object({
    languageCode: z.string().min(2).max(10),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const { languageCode } = c.req.valid("json");
    
    try {
      const language = await addLanguage(workspaceId, languageCode);
      
      return c.json({
        data: language,
        success: true,
        message: "Language added successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to add language:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Update a language
app.patch(
  "/localization/:workspaceId/languages/:langCode",
  zValidator("json", z.object({
    isEnabled: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    languageName: z.string().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const langCode = c.req.param("langCode");
    const updates = c.req.valid("json");
    
    try {
      const language = await updateLanguage(workspaceId, langCode, updates);
      
      return c.json({
        data: language,
        success: true,
        message: "Language updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update language:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Delete a language
app.delete(
  "/localization/:workspaceId/languages/:langCode",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const langCode = c.req.param("langCode");
    
    try {
      await deleteLanguage(workspaceId, langCode);
      
      return c.json({
        success: true,
        message: "Language deleted successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to delete language:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Get translations for a language
app.get(
  "/localization/:workspaceId/translations/:langCode",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const langCode = c.req.param("langCode");
    
    try {
      const translations = await getTranslations(workspaceId, langCode);
      
      return c.json({
        data: translations,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to get translations:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Update translations for a language
app.patch(
  "/localization/:workspaceId/translations/:langCode",
  zValidator("json", z.record(z.object({
    key: z.string(),
    value: z.string(),
    context: z.string().optional(),
    pluralForm: z.string().optional(),
  }))),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const langCode = c.req.param("langCode");
    const translations = c.req.valid("json");
    
    try {
      await updateTranslations(workspaceId, langCode, translations);
      
      return c.json({
        success: true,
        message: "Translations updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update translations:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Export translations
app.post(
  "/localization/:workspaceId/export",
  zValidator("json", z.object({
    languageCode: z.string().optional(),
    format: z.enum(['json', 'csv']).optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const { languageCode, format = 'json' } = c.req.valid("json");
    
    try {
      const exported = await exportTranslations(workspaceId, languageCode, format);
      
      return c.json({
        data: exported,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to export translations:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Import translations
app.post(
  "/localization/:workspaceId/import",
  zValidator("json", z.object({
    languageCode: z.string(),
    data: z.string(),
    format: z.enum(['json', 'csv']).optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const { languageCode, data, format = 'json' } = c.req.valid("json");
    
    try {
      const result = await importTranslations(workspaceId, languageCode, data, format);
      
      return c.json({
        data: result,
        success: true,
        message: `Imported ${result.imported} translations`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to import translations:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Get localization settings
app.get(
  "/localization/:workspaceId/settings",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    
    try {
      const settings = await getLocalizationSettings(workspaceId);
      
      return c.json({
        data: settings,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to get localization settings:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Update localization settings
app.patch(
  "/localization/:workspaceId/settings",
  zValidator("json", z.object({
    defaultLanguage: z.string().optional(),
    enabledLanguages: z.array(z.string()).optional(),
    fallbackLanguage: z.string().optional(),
    autoDetectLanguage: z.boolean().optional(),
    rtlLanguages: z.array(z.string()).optional(),
    dateFormat: z.string().optional(),
    timeFormat: z.enum(['12h', '24h']).optional(),
    numberFormat: z.object({
      decimalSeparator: z.string(),
      thousandSeparator: z.string(),
    }).optional(),
    currencyFormat: z.object({
      symbol: z.string(),
      position: z.enum(['before', 'after']),
    }).optional(),
    firstDayOfWeek: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).optional(),
    timezone: z.string().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const updates = c.req.valid("json");
    
    try {
      const settings = await updateLocalizationSettings(workspaceId, updates);
      
      return c.json({
        data: settings,
        success: true,
        message: "Localization settings updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update localization settings:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// ========================================
// ⌨️ KEYBOARD SHORTCUTS - Phase 3
// ========================================

// Get available presets
app.get("/shortcuts/presets", async (c) => {
  try {
    const presets = getPresets();
    
    return c.json({
      data: presets,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get shortcut presets:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get all shortcuts for a user
app.get(
  "/shortcuts/:workspaceId/shortcuts",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    
    try {
      const shortcuts = await getShortcuts(workspaceId, userEmail);
      
      return c.json({
        data: shortcuts,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to get shortcuts:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Get a single shortcut
app.get(
  "/shortcuts/:workspaceId/shortcuts/:shortcutId",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const shortcutId = c.req.param("shortcutId");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    
    try {
      const shortcut = await getShortcut(workspaceId, userEmail, shortcutId);
      
      if (!shortcut) {
        return c.json({ error: "Shortcut not found" }, 404);
      }
      
      return c.json({
        data: shortcut,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to get shortcut:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Update multiple shortcuts
app.patch(
  "/shortcuts/:workspaceId/shortcuts",
  zValidator("json", z.array(z.object({
    action: z.string().optional(),
    shortcutKeys: z.string().optional(),
    isEnabled: z.boolean().optional(),
    description: z.string().optional(),
  }))),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const updates = c.req.valid("json");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    
    try {
      const shortcuts = await updateShortcuts(workspaceId, userEmail, updates);
      
      return c.json({
        data: shortcuts,
        success: true,
        message: "Shortcuts updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update shortcuts:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Update a single shortcut
app.patch(
  "/shortcuts/:workspaceId/shortcuts/:shortcutId",
  zValidator("json", z.object({
    shortcutKeys: z.string().optional(),
    isEnabled: z.boolean().optional(),
    description: z.string().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const shortcutId = c.req.param("shortcutId");
    const updates = c.req.valid("json");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    
    try {
      const shortcut = await updateShortcut(workspaceId, userEmail, shortcutId, updates);
      
      return c.json({
        data: shortcut,
        success: true,
        message: "Shortcut updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update shortcut:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Delete/disable a shortcut
app.delete(
  "/shortcuts/:workspaceId/shortcuts/:shortcutId",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const shortcutId = c.req.param("shortcutId");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    
    try {
      await deleteShortcut(workspaceId, userEmail, shortcutId);
      
      return c.json({
        success: true,
        message: "Shortcut disabled successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to delete shortcut:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Reset shortcuts to defaults
app.post(
  "/shortcuts/:workspaceId/reset",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    
    try {
      const shortcuts = await resetShortcuts(workspaceId, userEmail);
      
      return c.json({
        data: shortcuts,
        success: true,
        message: "Shortcuts reset to defaults",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to reset shortcuts:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Apply a preset
app.post(
  "/shortcuts/:workspaceId/presets/:presetId/apply",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const presetId = c.req.param("presetId");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    
    try {
      const shortcuts = await applyPreset(workspaceId, userEmail, presetId);
      
      return c.json({
        data: shortcuts,
        success: true,
        message: "Preset applied successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to apply preset:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// ========================================
// 🔍 ADVANCED FILTERS - Phase 3
// ========================================

// Get filter templates
app.get("/filters/templates", async (c) => {
  const filterType = c.req.query("filterType");
  
  try {
    const templates = getFilterTemplates(filterType);
    
    return c.json({
      data: templates,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get filter templates:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get all saved filters
app.get(
  "/filters/:workspaceId/filters",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    const filterType = c.req.query("filterType");
    
    try {
      const filters = await getSavedFilters(workspaceId, userEmail, filterType);
      
      return c.json({
        data: filters,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to get saved filters:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Get a single saved filter
app.get(
  "/filters/:workspaceId/filters/:filterId",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const filterId = c.req.param("filterId");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    
    try {
      const filter = await getSavedFilter(workspaceId, userEmail, filterId);
      
      if (!filter) {
        return c.json({ error: "Filter not found" }, 404);
      }
      
      return c.json({
        data: filter,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to get saved filter:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Create a new saved filter
app.post(
  "/filters/:workspaceId/filters",
  zValidator("json", z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    filterType: z.enum(['projects', 'tasks', 'users', 'messages', 'files']),
    filterConfig: z.object({
      logic: z.enum(['AND', 'OR', 'NOT']),
      conditions: z.array(z.object({
        field: z.string(),
        operator: z.enum(['=', '!=', '~', '>', '<', 'between', 'in', 'isEmpty', 'isNotEmpty']),
        value: z.unknown(),
      })),
      groups: z.any().optional(),
    }),
    isPinned: z.boolean().optional(),
    isPublic: z.boolean().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const filterData = c.req.valid("json");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    
    try {
      const filter = await createSavedFilter(workspaceId, userEmail, filterData as any);
      
      return c.json({
        data: filter,
        success: true,
        message: "Filter saved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to create saved filter:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Update a saved filter
app.patch(
  "/filters/:workspaceId/filters/:filterId",
  zValidator("json", z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    filterConfig: z.any().optional(),
    isPinned: z.boolean().optional(),
    isPublic: z.boolean().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const filterId = c.req.param("filterId");
    const updates = c.req.valid("json");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    
    try {
      const filter = await updateSavedFilter(workspaceId, userEmail, filterId, updates);
      
      return c.json({
        data: filter,
        success: true,
        message: "Filter updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update saved filter:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Delete a saved filter
app.delete(
  "/filters/:workspaceId/filters/:filterId",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const filterId = c.req.param("filterId");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    
    try {
      await deleteSavedFilter(workspaceId, userEmail, filterId);
      
      return c.json({
        success: true,
        message: "Filter deleted successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to delete saved filter:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Clone a saved filter
app.post(
  "/filters/:workspaceId/filters/:filterId/clone",
  zValidator("json", z.object({
    name: z.string().min(1).max(100),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const filterId = c.req.param("filterId");
    const { name } = c.req.valid("json");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    
    try {
      const filter = await cloneSavedFilter(workspaceId, userEmail, filterId, name);
      
      return c.json({
        data: filter,
        success: true,
        message: "Filter cloned successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to clone filter:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Record filter usage
app.post(
  "/filters/:workspaceId/filters/:filterId/use",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const filterId = c.req.param("filterId");
    const userEmail = c.get("userEmail") || "system@meridian.app";
    
    try {
      await recordFilterUsage(workspaceId, userEmail, filterId);
      
      return c.json({
        success: true,
        message: "Filter usage recorded",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to record filter usage:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// ========================================
// 📊 DASHBOARD TEMPLATES - Phase 4.6
// ========================================

// Get all dashboard templates for a workspace
app.get("/dashboard-templates/:workspaceId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const userEmail = c.get("userEmail");

  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    const templates = await db
      .select()
      .from(dashboardTemplatesTable)
      .where(
        or(
          eq(dashboardTemplatesTable.workspaceId, workspaceId),
          eq(dashboardTemplatesTable.isGlobal, true)
        )
      )
      .orderBy(dashboardTemplatesTable.createdAt);

    return c.json({
      data: templates,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to fetch dashboard templates:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get public dashboard templates (marketplace)
app.get("/dashboard-templates/marketplace/public", async (c) => {
  const userEmail = c.get("userEmail");

  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    const templates = await db
      .select()
      .from(dashboardTemplatesTable)
      .where(
        and(
          eq(dashboardTemplatesTable.isPublic, true),
          eq(dashboardTemplatesTable.isActive, true)
        )
      )
      .orderBy(dashboardTemplatesTable.usageCount);

    return c.json({
      data: templates,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to fetch public dashboard templates:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get a specific dashboard template
app.get("/dashboard-templates/:workspaceId/:templateId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const templateId = c.req.param("templateId");
  const userEmail = c.get("userEmail");

  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    const [template] = await db
      .select()
      .from(dashboardTemplatesTable)
      .where(eq(dashboardTemplatesTable.id, templateId))
      .limit(1);

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    return c.json({
      data: template,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to fetch dashboard template:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Create a new dashboard template
app.post(
  "/dashboard-templates/:workspaceId",
  zValidator("json", z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    layout: z.any(),
    widgets: z.any(),
    gridConfig: z.any().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    thumbnail: z.string().optional(),
    isPublic: z.boolean().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const data = c.req.valid("json");
    const userEmail = c.get("userEmail");

    if (!userEmail) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const db = getDatabase();
      
      // Get user ID
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);

      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }

      const [template] = await db
        .insert(dashboardTemplatesTable)
        .values({
          name: data.name,
          description: data.description,
          workspaceId,
          layout: data.layout,
          widgets: data.widgets,
          gridConfig: data.gridConfig || {},
          category: data.category,
          tags: data.tags || [],
          thumbnail: data.thumbnail,
          isPublic: data.isPublic || false,
          createdBy: user.id,
        })
        .returning();

      return c.json({
        data: template,
        success: true,
        message: "Dashboard template created successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to create dashboard template:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Update a dashboard template
app.patch(
  "/dashboard-templates/:workspaceId/:templateId",
  zValidator("json", z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    layout: z.any().optional(),
    widgets: z.any().optional(),
    gridConfig: z.any().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    thumbnail: z.string().optional(),
    isPublic: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const templateId = c.req.param("templateId");
    const updates = c.req.valid("json");
    const userEmail = c.get("userEmail");

    if (!userEmail) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const db = getDatabase();
      
      const [template] = await db
        .update(dashboardTemplatesTable)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(dashboardTemplatesTable.id, templateId))
        .returning();

      if (!template) {
        return c.json({ error: "Template not found" }, 404);
      }

      return c.json({
        data: template,
        success: true,
        message: "Dashboard template updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update dashboard template:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Delete a dashboard template
app.delete("/dashboard-templates/:workspaceId/:templateId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const templateId = c.req.param("templateId");
  const userEmail = c.get("userEmail");

  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    
    await db
      .delete(dashboardTemplatesTable)
      .where(eq(dashboardTemplatesTable.id, templateId));

    return c.json({
      success: true,
      message: "Dashboard template deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to delete dashboard template:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Clone a dashboard template
app.post("/dashboard-templates/:workspaceId/:templateId/clone", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const templateId = c.req.param("templateId");
  const userEmail = c.get("userEmail");

  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    
    // Get user ID
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Get the original template
    const [original] = await db
      .select()
      .from(dashboardTemplatesTable)
      .where(eq(dashboardTemplatesTable.id, templateId))
      .limit(1);

    if (!original) {
      return c.json({ error: "Template not found" }, 404);
    }

    // Increment usage count of original
    await db
      .update(dashboardTemplatesTable)
      .set({
        usageCount: (original.usageCount || 0) + 1,
      })
      .where(eq(dashboardTemplatesTable.id, templateId));

    // Create clone
    const [cloned] = await db
      .insert(dashboardTemplatesTable)
      .values({
        name: `${original.name} (Copy)`,
        description: original.description,
        workspaceId,
        layout: original.layout,
        widgets: original.widgets,
        gridConfig: original.gridConfig,
        category: original.category,
        tags: original.tags,
        thumbnail: original.thumbnail,
        isPublic: false, // Cloned templates are private by default
        createdBy: user.id,
      })
      .returning();

    return c.json({
      data: cloned,
      success: true,
      message: "Dashboard template cloned successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to clone dashboard template:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// 🧩 WIDGET LIBRARY - Phase 4.7
// ========================================

// ⚠️ IMPORTANT: Specific routes MUST come before generic ones!
// Get widget collections (MUST be first!)
app.get("/widgets/collections", authMiddleware(), async (c) => {
  const category = c.req.query("category");

  try {
    const collections = await getWidgetCollections({ category, isPublic: true });
    return c.json({ success: true, data: collections });
  } catch (error: any) {
    logger.error("Failed to fetch widget collections:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get marketplace widgets with advanced filtering (MUST be first!)
app.get("/widgets/marketplace/:workspaceId", authMiddleware(), async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const category = c.req.query("category");
  const search = c.req.query("search");
  const isPremium = c.req.query("premium") === "true";
  const minRating = c.req.query("minRating") ? parseFloat(c.req.query("minRating")!) : undefined;
  const sortBy = c.req.query("sortBy") as "popular" | "rating" | "recent" | "name" | undefined;
  const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : undefined;
  const offset = c.req.query("offset") ? parseInt(c.req.query("offset")!) : undefined;
  
  try {
    const widgets = await getMarketplaceWidgets(workspaceId, {
      category,
      search,
      isPremium,
      minRating,
      sortBy,
      limit,
      offset,
      isPublic: true,
    });
    
    return c.json({ success: true, data: widgets });
  } catch (error: any) {
    logger.error("Failed to fetch marketplace widgets:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get all widgets (with marketplace filtering)
app.get("/widgets/:workspaceId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const userEmail = c.get("userEmail");
  const showPublic = c.req.query("public") === "true";

  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    
    let query;
    if (showPublic) {
      // Marketplace: show global and public widgets
      query = db
        .select()
        .from(dashboardWidgetsTable)
        .where(
          and(
            eq(dashboardWidgetsTable.isActive, true),
            or(
              eq(dashboardWidgetsTable.isGlobal, true),
              eq(dashboardWidgetsTable.isPublic, true)
            )
          )
        );
    } else {
      // Workspace widgets: global + workspace-specific
      query = db
        .select()
        .from(dashboardWidgetsTable)
        .where(
          and(
            eq(dashboardWidgetsTable.isActive, true),
            or(
              eq(dashboardWidgetsTable.workspaceId, workspaceId),
              eq(dashboardWidgetsTable.isGlobal, true)
            )
          )
        );
    }
    
    const widgets = await query.orderBy(desc(dashboardWidgetsTable.usageCount));

    return c.json({
      data: widgets,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to fetch widgets:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get a specific widget
app.get("/widgets/:workspaceId/:widgetId", async (c) => {
  const widgetId = c.req.param("widgetId");
  const userEmail = c.get("userEmail");

  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    const [widget] = await db
      .select()
      .from(dashboardWidgetsTable)
      .where(eq(dashboardWidgetsTable.id, widgetId))
      .limit(1);

    if (!widget) {
      return c.json({ error: "Widget not found" }, 404);
    }

    return c.json({
      data: widget,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to fetch widget:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Create a new widget
app.post(
  "/widgets/:workspaceId",
  zValidator("json", z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    type: z.string(),
    category: z.string(),
    component: z.string(),
    defaultConfig: z.any(),
    configSchema: z.any().optional(),
    dataSource: z.string().optional(),
    refreshInterval: z.number().optional(),
    defaultSize: z.any().optional(),
    minSize: z.any().optional(),
    maxSize: z.any().optional(),
    thumbnail: z.string().optional(),
    icon: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isPublic: z.boolean().optional(),
    isPremium: z.boolean().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const data = c.req.valid("json");
    const userEmail = c.get("userEmail");

    if (!userEmail) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const db = getDatabase();
      
      // Get user ID
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);

      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }

      const [widget] = await db
        .insert(dashboardWidgetsTable)
        .values({
          name: data.name,
          description: data.description,
          type: data.type,
          category: data.category,
          component: data.component,
          defaultConfig: data.defaultConfig,
          configSchema: data.configSchema || {},
          dataSource: data.dataSource,
          refreshInterval: data.refreshInterval,
          defaultSize: data.defaultSize || { width: 4, height: 2 },
          minSize: data.minSize || { width: 2, height: 1 },
          maxSize: data.maxSize || { width: 12, height: 6 },
          thumbnail: data.thumbnail,
          icon: data.icon,
          tags: data.tags || [],
          isPublic: data.isPublic || false,
          isPremium: data.isPremium || false,
          workspaceId,
          createdBy: user.id,
        })
        .returning();

      return c.json({
        data: widget,
        success: true,
        message: "Widget created successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to create widget:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Update a widget
app.patch(
  "/widgets/:workspaceId/:widgetId",
  zValidator("json", z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    defaultConfig: z.any().optional(),
    configSchema: z.any().optional(),
    thumbnail: z.string().optional(),
    icon: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isPublic: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })),
  async (c) => {
    const widgetId = c.req.param("widgetId");
    const updates = c.req.valid("json");
    const userEmail = c.get("userEmail");

    if (!userEmail) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const db = getDatabase();
      
      const [widget] = await db
        .update(dashboardWidgetsTable)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(dashboardWidgetsTable.id, widgetId))
        .returning();

      if (!widget) {
        return c.json({ error: "Widget not found" }, 404);
      }

      return c.json({
        data: widget,
        success: true,
        message: "Widget updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update widget:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Delete a widget
app.delete("/widgets/:workspaceId/:widgetId", async (c) => {
  const widgetId = c.req.param("widgetId");
  const userEmail = c.get("userEmail");

  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    
    await db
      .delete(dashboardWidgetsTable)
      .where(eq(dashboardWidgetsTable.id, widgetId));

    return c.json({
      success: true,
      message: "Widget deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to delete widget:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// 🎯 USER WIDGET INSTANCES
// ========================================

// Get user's widget instances
app.get("/widget-instances/:workspaceId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const userEmail = c.get("userEmail");
  const dashboardId = c.req.query("dashboardId");

  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    
    const whereConditions = [
      eq(userWidgetInstancesTable.userEmail, userEmail),
      eq(userWidgetInstancesTable.workspaceId, workspaceId),
    ];
    
    if (dashboardId) {
      whereConditions.push(eq(userWidgetInstancesTable.dashboardId, dashboardId));
    }
    
    const instances = await db
      .select()
      .from(userWidgetInstancesTable)
      .where(and(...whereConditions))
      .orderBy(userWidgetInstancesTable.order);

    return c.json({
      data: instances,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to fetch widget instances:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Add widget instance to user's dashboard
app.post(
  "/widget-instances/:workspaceId",
  zValidator("json", z.object({
    widgetId: z.string(),
    dashboardId: z.string().optional(),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }),
    size: z.object({
      width: z.number(),
      height: z.number(),
    }),
    config: z.any().optional(),
    filters: z.any().optional(),
  })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const data = c.req.valid("json");
    const userEmail = c.get("userEmail");

    if (!userEmail) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const db = getDatabase();
      
      // Increment widget usage count
      await db
        .update(dashboardWidgetsTable)
        .set({
          usageCount: count(),
        })
        .where(eq(dashboardWidgetsTable.id, data.widgetId));
      
      const [instance] = await db
        .insert(userWidgetInstancesTable)
        .values({
          widgetId: data.widgetId,
          userEmail,
          workspaceId,
          dashboardId: data.dashboardId,
          position: data.position,
          size: data.size,
          config: data.config || {},
          filters: data.filters || {},
        })
        .returning();

      return c.json({
        data: instance,
        success: true,
        message: "Widget added to dashboard",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to add widget instance:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Update widget instance
app.patch(
  "/widget-instances/:workspaceId/:instanceId",
  zValidator("json", z.object({
    position: z.object({
      x: z.number(),
      y: z.number(),
    }).optional(),
    size: z.object({
      width: z.number(),
      height: z.number(),
    }).optional(),
    config: z.any().optional(),
    filters: z.any().optional(),
    isVisible: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    order: z.number().optional(),
  })),
  async (c) => {
    const instanceId = c.req.param("instanceId");
    const updates = c.req.valid("json");
    const userEmail = c.get("userEmail");

    if (!userEmail) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const db = getDatabase();
      
      const [instance] = await db
        .update(userWidgetInstancesTable)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userWidgetInstancesTable.id, instanceId),
            eq(userWidgetInstancesTable.userEmail, userEmail)
          )
        )
        .returning();

      if (!instance) {
        return c.json({ error: "Widget instance not found" }, 404);
      }

      return c.json({
        data: instance,
        success: true,
        message: "Widget instance updated",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update widget instance:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Delete widget instance
app.delete("/widget-instances/:workspaceId/:instanceId", async (c) => {
  const instanceId = c.req.param("instanceId");
  const userEmail = c.get("userEmail");

  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    
    await db
      .delete(userWidgetInstancesTable)
      .where(
        and(
          eq(userWidgetInstancesTable.id, instanceId),
          eq(userWidgetInstancesTable.userEmail, userEmail)
        )
      );

    return c.json({
      success: true,
      message: "Widget removed from dashboard",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to delete widget instance:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// 🏪 WIDGET MARKETPLACE - Phase 4.7
// ========================================

// Get widget categories
app.get("/widgets/categories", authMiddleware(), async (c) => {
  try {
    const categories = await getWidgetCategories();
    return c.json({ success: true, data: categories });
  } catch (error: any) {
    logger.error("Failed to fetch widget categories:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get widget by ID with reviews and ratings
app.get("/widgets/:widgetId", authMiddleware(), async (c) => {
  const widgetId = c.req.param("widgetId");
  const userEmail = c.get("userEmail");
  
  try {
    const widgetData = await getWidgetById(widgetId, userEmail);
    return c.json({ success: true, data: widgetData });
  } catch (error: any) {
    logger.error("Failed to fetch widget:", error);
    return c.json({ success: false, error: error.message }, 404);
  }
});

// Rate a widget
app.post("/widgets/:widgetId/rate", authMiddleware(), async (c) => {
  const widgetId = c.req.param("widgetId");
  const userEmail = c.get("userEmail");
  
  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const body = await c.req.json();
    const rating = await rateWidget(widgetId, userEmail, body.rating);
    return c.json({ success: true, data: rating });
  } catch (error: any) {
    logger.error("Failed to rate widget:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Add widget review
app.post("/widgets/:widgetId/review", authMiddleware(), async (c) => {
  const widgetId = c.req.param("widgetId");
  const userEmail = c.get("userEmail");
  
  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const body = await c.req.json();
    const review = await addWidgetReview(widgetId, userEmail, {
      title: body.title,
      content: body.content,
      rating: body.rating,
    });
    return c.json({ success: true, data: review });
  } catch (error: any) {
    logger.error("Failed to add review:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Mark review as helpful
app.post("/widgets/reviews/:reviewId/helpful", authMiddleware(), async (c) => {
  const reviewId = c.req.param("reviewId");
  const userEmail = c.get("userEmail");
  
  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const body = await c.req.json();
    await markReviewHelpful(reviewId, userEmail, body.isHelpful);
    return c.json({ success: true, message: "Review helpfulness updated" });
  } catch (error: any) {
    logger.error("Failed to mark review helpful:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get widget analytics (for creators)
app.get("/widgets/:widgetId/analytics", authMiddleware(), async (c) => {
  const widgetId = c.req.param("widgetId");
  const period = c.req.query("period") as "day" | "week" | "month" | "all" | undefined;
  
  try {
    const analytics = await getWidgetAnalytics(widgetId, period);
    return c.json({ success: true, data: analytics });
  } catch (error: any) {
    logger.error("Failed to fetch widget analytics:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create new widget (widget studio)
app.post("/widgets", authMiddleware(), async (c) => {
  const userEmail = c.get("userEmail");
  
  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const body = await c.req.json();
    const widget = await createWidget(userEmail, body);
    return c.json({ success: true, data: widget });
  } catch (error: any) {
    logger.error("Failed to create widget:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update widget (creator only)
app.put("/widgets/:widgetId", authMiddleware(), async (c) => {
  const widgetId = c.req.param("widgetId");
  const userEmail = c.get("userEmail");
  
  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const body = await c.req.json();
    const widget = await updateWidget(widgetId, userEmail, body);
    return c.json({ success: true, data: widget });
  } catch (error: any) {
    logger.error("Failed to update widget:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete widget (creator only)
app.delete("/widgets/:widgetId", authMiddleware(), async (c) => {
  const widgetId = c.req.param("widgetId");
  const userEmail = c.get("userEmail");
  
  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    await deleteWidget(widgetId, userEmail);
    return c.json({ success: true, message: "Widget deactivated" });
  } catch (error: any) {
    logger.error("Failed to delete widget:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Install widget collection
app.post("/widgets/collections/:collectionId/install", authMiddleware(), async (c) => {
  const collectionId = c.req.param("collectionId");
  const userEmail = c.get("userEmail");
  
  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const body = await c.req.json();
    const instances = await installWidgetCollection(
      collectionId,
      userEmail,
      body.workspaceId
    );
    return c.json({ success: true, data: instances, count: instances.length });
  } catch (error: any) {
    logger.error("Failed to install widget collection:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ========================================
// 🎨 WIDGET INSTANCE MANAGEMENT
// ========================================

// Install widget to dashboard (NEW - uses new controller)
app.post("/widget-instances/install", authMiddleware(), async (c) => {
  const userEmail = c.get("userEmail");
  
  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const body = await c.req.json();

    // Debug logging
    logger.info("Widget install request:", {
      userEmail,
      workspaceId: body.workspaceId,
      widgetId: body.widgetId,
      hasDashboardId: !!body.dashboardId,
      hasPosition: !!body.position,
      hasSize: !!body.size
    });

    const instance = await installWidget(
      userEmail,
      body.workspaceId,
      body.widgetId,
      {
        dashboardId: body.dashboardId,
        position: body.position,
        size: body.size,
        config: body.config,
      }
    );
    return c.json({ success: true, data: instance });
  } catch (error: any) {
    logger.error("Failed to install widget:", error);
    logger.error("Error details:", {
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });
    return c.json({ success: false, error: error.message }, 400); // Changed to 400 for validation errors
  }
});

// Get user widget instances (NEW - uses new controller)
app.get("/widget-instances/:userEmail/:workspaceId", authMiddleware(), async (c) => {
  const userEmail = c.req.param("userEmail");
  const workspaceId = c.req.param("workspaceId");
  const dashboardId = c.req.query("dashboardId");
  
  try {
    const instances = await getUserWidgetInstances(userEmail, workspaceId, dashboardId);
    return c.json({ success: true, data: instances });
  } catch (error: any) {
    logger.error("Failed to fetch user widget instances:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update widget instance (NEW - uses new controller)
app.put("/widget-instances/:instanceId", authMiddleware(), async (c) => {
  const instanceId = c.req.param("instanceId");
  const userEmail = c.get("userEmail");
  
  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const body = await c.req.json();
    const instance = await updateWidgetInstance(instanceId, userEmail, body);
    return c.json({ success: true, data: instance });
  } catch (error: any) {
    logger.error("Failed to update widget instance:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Uninstall widget (NEW - uses new controller)
app.delete("/widget-instances/:instanceId", authMiddleware(), async (c) => {
  const instanceId = c.req.param("instanceId");
  const userEmail = c.get("userEmail");
  
  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    await uninstallWidget(instanceId, userEmail);
    return c.json({ success: true, message: "Widget uninstalled" });
  } catch (error: any) {
    logger.error("Failed to uninstall widget:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Reorder widgets
app.post("/widget-instances/reorder", authMiddleware(), async (c) => {
  const userEmail = c.get("userEmail");
  
  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const body = await c.req.json();
    await reorderWidgets(userEmail, body.workspaceId, body.widgetOrder);
    return c.json({ success: true, message: "Widgets reordered" });
  } catch (error: any) {
    logger.error("Failed to reorder widgets:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Batch update widget positions (for drag-and-drop)
app.post("/widget-instances/batch-update", authMiddleware(), async (c) => {
  const userEmail = c.get("userEmail");
  
  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const body = await c.req.json();
    await batchUpdatePositions(userEmail, body.workspaceId, body.updates);
    return c.json({ success: true, message: "Positions updated" });
  } catch (error: any) {
    logger.error("Failed to batch update positions:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ========================================
// 🎨 MULTI-DASHBOARD MANAGEMENT - Phase 2.1
// ========================================

// Get user's dashboards
app.get("/dashboards/:userEmail/:workspaceId", authMiddleware(), getUserDashboards);

// Create new dashboard
app.post("/dashboards", authMiddleware(), createDashboard);

// Update dashboard
app.put("/dashboards/:dashboardId", authMiddleware(), updateDashboard);

// Delete dashboard
app.delete("/dashboards/:dashboardId", authMiddleware(), deleteDashboard);

// Set default dashboard
app.post("/dashboards/:dashboardId/set-default", authMiddleware(), setDefaultDashboard);

// Duplicate dashboard
app.post("/dashboards/:dashboardId/duplicate", authMiddleware(), duplicateDashboard);

// ========================================
// 🔔 WIDGET VERSION MANAGEMENT - Phase 2.1
// ========================================

// Get available updates for user's widgets
app.get("/widget-updates/:userEmail/:workspaceId", authMiddleware(), getWidgetUpdates);

// Get changelog for specific version
app.get("/widgets/:widgetId/changelog/:version", authMiddleware(), getVersionChangelog);

// Get version history for a widget
app.get("/widgets/:widgetId/versions", authMiddleware(), getWidgetVersionHistory);

// Update widget instance to specific version
app.post("/widget-instances/:instanceId/update", authMiddleware(), updateWidgetToVersion);

// Track widget analytics event
app.post("/widgets/track", authMiddleware(), async (c) => {
  const userEmail = c.get("userEmail");
  
  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const body = await c.req.json();
    await trackWidgetEvent(
      body.widgetId,
      userEmail,
      body.workspaceId,
      body.eventType,
      body.metadata,
      body.performanceMs
    );
    return c.json({ success: true });
  } catch (error: any) {
    // Don't fail on analytics errors
    logger.warn("Failed to track widget event:", error);
    return c.json({ success: true }); // Return success anyway
  }
});

export default app; 
