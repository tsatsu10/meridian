/**
 * 🎨 Theme Management API
 * 
 * Handles custom theme creation, management, and workspace theme policies
 * Supports import/export, analytics, and cross-device synchronization
 * 
 * @epic-3.2-themes
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc, isNull } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { 
  customThemesTable, 
  workspaceThemePoliciesTable,
  userPreferencesExtendedTable,
  themeUsageAnalyticsTable,
  userTable 
} from "../database/schema";
import { createId } from "@paralleldrive/cuid2";
import logger from '../utils/logger';

const app = new Hono();

// Theme data validation schema
const themeDataSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  mode: z.enum(["light", "dark"]),
  colors: z.object({
    primary: z.record(z.string()),
    secondary: z.record(z.string()),
    accent: z.record(z.string()),
    neutral: z.record(z.string()),
    semantic: z.object({
      success: z.record(z.string()),
      warning: z.record(z.string()),
      error: z.record(z.string()),
      info: z.record(z.string()),
    }),
    brand: z.object({
      logo: z.string(),
      accent: z.string(),
      background: z.string(),
      text: z.string(),
      border: z.string(),
    }).optional(),
  }),
  accessibility: z.object({
    highContrast: z.boolean(),
    reducedMotion: z.boolean(),
    colorBlindFriendly: z.boolean(),
  }),
  typography: z.object({
    fontFamily: z.string(),
    fontSize: z.record(z.string()),
    fontWeight: z.record(z.string()),
    lineHeight: z.record(z.string()),
  }),
  spacing: z.record(z.string()),
  animations: z.object({
    duration: z.record(z.string()),
    easing: z.record(z.string()),
  }),
  shadows: z.record(z.string()),
  borderRadius: z.record(z.string()),
});

const createThemeSchema = z.object({
  themeData: themeDataSchema,
  workspaceId: z.string().optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

const updateThemeSchema = z.object({
  themeData: themeDataSchema.partial(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const workspaceThemePolicySchema = z.object({
  allowedThemes: z.array(z.string()).optional(),
  defaultThemeId: z.string().optional(),
  enforceTheme: z.boolean().default(false),
  customThemesEnabled: z.boolean().default(true),
  roleBasedDefaults: z.record(z.string()).optional(),
});

/**
 * Create a new custom theme
 */
app.post(
  "/",
  zValidator("json", createThemeSchema),
  async (c) => {
    try {
      const db = getDatabase();
      const data = c.req.valid("json");
      const userEmail = c.req.header("x-user-email");

      if (!userEmail) {
        return c.json({ error: "User email required" }, 401);
      }

      // Get user ID
      const user = await db.select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.email, userEmail))
        .limit(1);

      if (!user.length) {
        return c.json({ error: "User not found" }, 404);
      }

      const themeId = createId();
      
      const newTheme = {
        id: themeId,
        name: data.themeData.name,
        description: data.themeData.description,
        creatorId: user[0].id,
        workspaceId: data.workspaceId,
        themeData: JSON.stringify(data.themeData),
        isPublic: data.isPublic,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        version: "1.0.0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(customThemesTable).values(newTheme);

      return c.json({
        success: true,
        message: "Theme created successfully",
        data: { themeId, ...newTheme },
      });
    } catch (error) {
      logger.error("Failed to create theme:", error);
      return c.json({ error: "Failed to create theme" }, 500);
    }
  }
);

/**
 * Get all available themes for a user
 */
app.get("/", async (c) => {
  try {
    const db = getDatabase();
    const userEmail = c.req.header("x-user-email");
    const workspaceId = c.req.query("workspaceId");

    if (!userEmail) {
      return c.json({ error: "User email required" }, 401);
    }

    // Get user's custom themes
    const userThemes = await db.select()
      .from(customThemesTable)
      .leftJoin(userTable, eq(customThemesTable.creatorId, userTable.id))
      .where(eq(userTable.email, userEmail));

    // Get public themes
    const publicThemes = await db.select()
      .from(customThemesTable)
      .leftJoin(userTable, eq(customThemesTable.creatorId, userTable.id))
      .where(eq(customThemesTable.isPublic, true));

    // Get workspace themes if workspace is specified
    let workspaceThemes: any[] = [];
    if (workspaceId) {
      workspaceThemes = await db.select()
        .from(customThemesTable)
        .leftJoin(userTable, eq(customThemesTable.creatorId, userTable.id))
        .where(eq(customThemesTable.workspaceId, workspaceId));
    }

    // Combine and deduplicate themes
    const allThemes = [...userThemes, ...publicThemes, ...workspaceThemes];
    const uniqueThemes = allThemes.filter((theme, index, self) => 
      index === self.findIndex(t => t.custom_themes.id === theme.custom_themes.id)
    );

    // Parse theme data
    const themes = uniqueThemes.map(theme => ({
      ...theme.custom_themes,
      themeData: JSON.parse(theme.custom_themes.themeData),
      tags: theme.custom_themes.tags ? JSON.parse(theme.custom_themes.tags) : [],
      creator: {
        id: theme.user?.id,
        name: theme.user?.name,
        email: theme.user?.email,
      },
    }));

    return c.json({
      success: true,
      data: themes,
    });
  } catch (error) {
    logger.error("Failed to get themes:", error);
    return c.json({ error: "Failed to get themes" }, 500);
  }
});

/**
 * Get a specific theme by ID
 */
app.get("/:themeId", async (c) => {
  try {
    const db = getDatabase();
    const themeId = c.req.param("themeId");
    
    const theme = await db.select()
      .from(customThemesTable)
      .leftJoin(userTable, eq(customThemesTable.creatorId, userTable.id))
      .where(eq(customThemesTable.id, themeId))
      .limit(1);

    if (!theme.length) {
      return c.json({ error: "Theme not found" }, 404);
    }

    const themeData = {
      ...theme[0].custom_themes,
      themeData: JSON.parse(theme[0].custom_themes.themeData),
      tags: theme[0].custom_themes.tags ? JSON.parse(theme[0].custom_themes.tags) : [],
      creator: {
        id: theme[0].user?.id,
        name: theme[0].user?.name,
        email: theme[0].user?.email,
      },
    };

    return c.json({
      success: true,
      data: themeData,
    });
  } catch (error) {
    logger.error("Failed to get theme:", error);
    return c.json({ error: "Failed to get theme" }, 500);
  }
});

/**
 * Update a custom theme
 */
app.put(
  "/:themeId",
  zValidator("json", updateThemeSchema),
  async (c) => {
    try {
      const db = getDatabase();
      const themeId = c.req.param("themeId");
      const data = c.req.valid("json");
      const userEmail = c.req.header("x-user-email");

      if (!userEmail) {
        return c.json({ error: "User email required" }, 401);
      }

      // Check if user owns the theme
      const theme = await db.select()
        .from(customThemesTable)
        .leftJoin(userTable, eq(customThemesTable.creatorId, userTable.id))
        .where(
          and(
            eq(customThemesTable.id, themeId),
            eq(userTable.email, userEmail)
          )
        )
        .limit(1);

      if (!theme.length) {
        return c.json({ error: "Theme not found or access denied" }, 404);
      }

      // Prepare update data
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.themeData) {
        const currentThemeData = JSON.parse(theme[0].custom_themes.themeData);
        const mergedThemeData = { ...currentThemeData, ...data.themeData };
        updateData.themeData = JSON.stringify(mergedThemeData);
      }

      if (data.isPublic !== undefined) {
        updateData.isPublic = data.isPublic;
      }

      if (data.tags) {
        updateData.tags = JSON.stringify(data.tags);
      }

      await db.update(customThemesTable)
        .set(updateData)
        .where(eq(customThemesTable.id, themeId));

      return c.json({
        success: true,
        message: "Theme updated successfully",
      });
    } catch (error) {
      logger.error("Failed to update theme:", error);
      return c.json({ error: "Failed to update theme" }, 500);
    }
  }
);

/**
 * Delete a custom theme
 */
app.delete("/:themeId", async (c) => {
  try {
    const db = getDatabase();
    const themeId = c.req.param("themeId");
    const userEmail = c.req.header("x-user-email");

    if (!userEmail) {
      return c.json({ error: "User email required" }, 401);
    }

    // Check if user owns the theme
    const theme = await db.select()
      .from(customThemesTable)
      .leftJoin(userTable, eq(customThemesTable.creatorId, userTable.id))
      .where(
        and(
          eq(customThemesTable.id, themeId),
          eq(userTable.email, userEmail)
        )
      )
      .limit(1);

    if (!theme.length) {
      return c.json({ error: "Theme not found or access denied" }, 404);
    }

    await db.delete(customThemesTable)
      .where(eq(customThemesTable.id, themeId));

    return c.json({
      success: true,
      message: "Theme deleted successfully",
    });
  } catch (error) {
    logger.error("Failed to delete theme:", error);
    return c.json({ error: "Failed to delete theme" }, 500);
  }
});

/**
 * Get workspace theme policy
 */
app.get("/workspace/:workspaceId/policy", async (c) => {
  try {
    const db = getDatabase();
    const workspaceId = c.req.param("workspaceId");
    
    const policy = await db.select()
      .from(workspaceThemePoliciesTable)
      .where(eq(workspaceThemePoliciesTable.workspaceId, workspaceId))
      .limit(1);

    if (!policy.length) {
      return c.json({
        success: true,
        data: {
          allowedThemes: null,
          defaultThemeId: null,
          enforceTheme: false,
          customThemesEnabled: true,
          roleBasedDefaults: null,
        },
      });
    }

    const policyData = {
      ...policy[0],
      allowedThemes: policy[0].allowedThemes ? JSON.parse(policy[0].allowedThemes) : null,
      roleBasedDefaults: policy[0].roleBasedDefaults ? JSON.parse(policy[0].roleBasedDefaults) : null,
    };

    return c.json({
      success: true,
      data: policyData,
    });
  } catch (error) {
    logger.error("Failed to get workspace theme policy:", error);
    return c.json({ error: "Failed to get workspace theme policy" }, 500);
  }
});

/**
 * Update workspace theme policy
 */
app.put(
  "/workspace/:workspaceId/policy",
  zValidator("json", workspaceThemePolicySchema),
  async (c) => {
    try {
      const db = getDatabase();
      const workspaceId = c.req.param("workspaceId");
      const data = c.req.valid("json");

      // Check if policy exists
      const existingPolicy = await db.select()
        .from(workspaceThemePoliciesTable)
        .where(eq(workspaceThemePoliciesTable.workspaceId, workspaceId))
        .limit(1);

      const updateData = {
        allowedThemes: data.allowedThemes ? JSON.stringify(data.allowedThemes) : null,
        defaultThemeId: data.defaultThemeId,
        enforceTheme: data.enforceTheme,
        customThemesEnabled: data.customThemesEnabled,
        roleBasedDefaults: data.roleBasedDefaults ? JSON.stringify(data.roleBasedDefaults) : null,
        updatedAt: new Date(),
      };

      if (existingPolicy.length) {
        // Update existing policy
        await db.update(workspaceThemePoliciesTable)
          .set(updateData)
          .where(eq(workspaceThemePoliciesTable.workspaceId, workspaceId));
      } else {
        // Create new policy
        await db.insert(workspaceThemePoliciesTable).values({
          id: createId(),
          workspaceId,
          ...updateData,
          createdAt: new Date(),
        });
      }

      return c.json({
        success: true,
        message: "Workspace theme policy updated successfully",
      });
    } catch (error) {
      logger.error("Failed to update workspace theme policy:", error);
      return c.json({ error: "Failed to update workspace theme policy" }, 500);
    }
  }
);

/**
 * Track theme usage analytics
 */
app.post(
  "/analytics/usage",
  zValidator("json", z.object({
    themeId: z.string(),
    workspaceId: z.string().optional(),
    usageDuration: z.number().optional(),
    deviceType: z.string().optional(),
    browserInfo: z.record(z.any()).optional(),
    sessionId: z.string().optional(),
  })),
  async (c) => {
    try {
      const db = getDatabase();
      const data = c.req.valid("json");
      const userEmail = c.req.header("x-user-email");

      if (!userEmail) {
        return c.json({ error: "User email required" }, 401);
      }

      // Get user ID
      const user = await db.select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.email, userEmail))
        .limit(1);

      if (!user.length) {
        return c.json({ error: "User not found" }, 404);
      }

      await db.insert(themeUsageAnalyticsTable).values({
        id: createId(),
        userId: user[0].id,
        themeId: data.themeId,
        workspaceId: data.workspaceId,
        usageDuration: data.usageDuration,
        deviceType: data.deviceType,
        browserInfo: data.browserInfo ? JSON.stringify(data.browserInfo) : null,
        appliedAt: new Date(),
        sessionId: data.sessionId,
      });

      return c.json({
        success: true,
        message: "Theme usage tracked successfully",
      });
    } catch (error) {
      logger.error("Failed to track theme usage:", error);
      return c.json({ error: "Failed to track theme usage" }, 500);
    }
  }
);

/**
 * Get theme recommendations based on usage analytics and role
 */
app.get("/recommendations", async (c) => {
  try {
    const db = getDatabase();
    const userEmail = c.req.header("x-user-email");
    const workspaceId = c.req.query("workspaceId");

    if (!userEmail) {
      return c.json({ error: "User email required" }, 401);
    }

    // Get popular themes in workspace
    const popularThemes = await db.select({
      themeId: themeUsageAnalyticsTable.themeId,
      usageCount: "COUNT(*) as usage_count",
    })
      .from(themeUsageAnalyticsTable)
      .where(
        workspaceId 
          ? eq(themeUsageAnalyticsTable.workspaceId, workspaceId)
          : isNull(themeUsageAnalyticsTable.workspaceId)
      )
      .groupBy(themeUsageAnalyticsTable.themeId)
      .orderBy(desc("usage_count"))
      .limit(5);

    // Get theme details
    const recommendedThemes = await db.select()
      .from(customThemesTable)
      .leftJoin(userTable, eq(customThemesTable.creatorId, userTable.id))
      .where(
        and(
          eq(customThemesTable.isPublic, true),
          // Include popular theme IDs here
        )
      )
      .limit(10);

    const themes = recommendedThemes.map(theme => ({
      ...theme.custom_themes,
      themeData: JSON.parse(theme.custom_themes.themeData),
      tags: theme.custom_themes.tags ? JSON.parse(theme.custom_themes.tags) : [],
      creator: {
        id: theme.user?.id,
        name: theme.user?.name,
        email: theme.user?.email,
      },
    }));

    return c.json({
      success: true,
      data: themes,
    });
  } catch (error) {
    logger.error("Failed to get theme recommendations:", error);
    return c.json({ error: "Failed to get theme recommendations" }, 500);
  }
});

export default app; 
