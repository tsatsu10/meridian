/**
 * 🗑️ Delete Theme Controller
 * 
 * Deletes a backlog theme
 */

import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { backlogThemesTable, activityTable } from "../../database/schema";
import logger from '../../utils/logger';

export async function deleteTheme(themeId: string, userId: string) {
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

    const theme = existing[0]!;

    // TODO: Add permission check
    // Ensure user has permission to delete this theme

    // TODO: Handle tasks assigned to this theme
    // Either reassign or set to null

    // Delete theme
    await db.delete(backlogThemesTable).where(eq(backlogThemesTable.id, themeId));

    // 📊 Log activity
    try {
      await db.insert(activityTable).values({
        taskId: null,
        type: "theme",
        userId,
        content: {
          text: `Deleted theme: ${theme.name}`,
          themeId: theme.id,
          themeName: theme.name,
        },
      });
    } catch (logError) {
      logger.error("Failed to log activity:", logError);
      // Don't fail the operation if logging fails
    }

    return { success: true };
  } catch (error) {
    logger.error("Error deleting theme:", error);
    throw error;
  }
}


