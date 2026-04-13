/**
 * 🎨 Theme Management Module
 * 
 * API endpoints for managing project themes/categories in the backlog
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createTheme, getProjectThemes, updateTheme, deleteTheme } from "./controllers";
import logger from '../utils/logger';

const theme = new Hono<{
  Variables: {
    userEmail: string;
  };
}>();

// 🛡️ SECURITY: Theme validation schema
const themeSchema = z.object({
  name: z.string()
    .min(1, "Theme name is required")
    .max(100, "Theme name must be less than 100 characters")
    .trim(),
  description: z.string()
    .max(500, "Description must be less than 500 characters")
    .trim()
    .optional(),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code (e.g., #FF5733)")
    .optional()
    .default("#6366f1"),
});

// 📋 GET /api/themes/:projectId - Get all themes for a project
theme.get("/:projectId", async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const userEmail = c.get("userEmail");
    
    if (!userEmail) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // For now, we'll use userEmail as userId (this matches the current pattern)
    const user = { id: userEmail, email: userEmail };

    const themes = await getProjectThemes(projectId, user.id);

    return c.json({
      success: true,
      data: themes,
    });
  } catch (error: any) {
    logger.error("Error fetching themes:", error);
    return c.json(
      {
        success: false,
        error: error.message || "Failed to fetch themes",
      },
      500
    );
  }
});

// ➕ POST /api/themes/:projectId - Create a new theme
theme.post(
  "/:projectId",
  zValidator("json", themeSchema),
  async (c) => {
    try {
      const projectId = c.req.param("projectId");
      const userEmail = c.get("userEmail");
      
      if (!userEmail) {
        return c.json({ success: false, error: "Unauthorized" }, 401);
      }

      // For now, we'll use userEmail as userId
      const user = { id: userEmail, email: userEmail };
      const themeData = c.req.valid("json");

      const newTheme = await createTheme({
        ...themeData,
        projectId,
        createdBy: user.id,
      });

      return c.json(
        {
          success: true,
          data: newTheme,
          message: `Theme "${themeData.name}" created successfully`,
        },
        201
      );
    } catch (error: any) {
      logger.error("Error creating theme:", error);
      return c.json(
        {
          success: false,
          error: error.message || "Failed to create theme",
        },
        500
      );
    }
  }
);

// ✏️ PUT /api/themes/:themeId - Update a theme
theme.put(
  "/:themeId",
  zValidator("json", themeSchema.partial()),
  async (c) => {
    try {
      const themeId = c.req.param("themeId");
      const userEmail = c.get("userEmail");
      
      if (!userEmail) {
        return c.json({ success: false, error: "Unauthorized" }, 401);
      }

      const user = { id: userEmail, email: userEmail };
      const updates = c.req.valid("json");

      const updatedTheme = await updateTheme(themeId, updates, user.id);

      return c.json({
        success: true,
        data: updatedTheme,
        message: "Theme updated successfully",
      });
    } catch (error: any) {
      logger.error("Error updating theme:", error);
      return c.json(
        {
          success: false,
          error: error.message || "Failed to update theme",
        },
        error.message.includes("not found") ? 404 : 500
      );
    }
  }
);

// 🗑️ DELETE /api/themes/:themeId - Delete a theme
theme.delete("/:themeId", async (c) => {
  try {
    const themeId = c.req.param("themeId");
    const userEmail = c.get("userEmail");
    
    if (!userEmail) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const user = { id: userEmail, email: userEmail };

    await deleteTheme(themeId, user.id);

    return c.json({
      success: true,
      message: "Theme deleted successfully",
    });
  } catch (error: any) {
    logger.error("Error deleting theme:", error);
    return c.json(
      {
        success: false,
        error: error.message || "Failed to delete theme",
      },
      error.message.includes("not found") ? 404 : 500
    );
  }
});

export default theme;

