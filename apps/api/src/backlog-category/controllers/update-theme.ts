/**
 * ✏️ Update Theme Controller
 * 
 * Updates an existing backlog theme
 */

import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { backlogThemesTable, activityTable, userTable } from "../../database/schema";
import logger from '../../utils/logger';

interface UpdateThemeInput {
  name?: string;
  description?: string;
  color?: string;
}

export async function updateTheme(
  themeId: string,
  updates: UpdateThemeInput,
  userId: string
) {
  const db = getDatabase();

  try {
    // Check if theme exists
    const existing = await db
      .select()
      .from(backlogThemesTable)
      .where(eq(backlogThemesTable.id, themeId))
      .limit(1);

    if (existing.length === 0) {
      throw new Error("Theme not found");
    }

    // TODO: Add permission check
    // Ensure user has permission to update this theme

    // Update theme
    const [updatedTheme] = await db
      .update(backlogThemesTable)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(backlogThemesTable.id, themeId))
      .returning();

    if (!updatedTheme) {
      throw new Error("Failed to update theme");
    }

    // 📊 Log activity
    try {
      await db.insert(activityTable).values({
        taskId: null,
        type: "theme",
        userId,
        content: {
          text: `Updated theme: ${updatedTheme.name}`,
          themeId: updatedTheme.id,
          themeName: updatedTheme.name,
          updates,
        },
      });
    } catch (logError) {
      logger.error("Failed to log activity:", logError);
      // Don't fail the operation if logging fails
    }

    return updatedTheme;
  } catch (error) {
    logger.error("Error updating theme:", error);
    throw error;
  }
}


