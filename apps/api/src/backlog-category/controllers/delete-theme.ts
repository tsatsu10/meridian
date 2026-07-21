/**
 * 🗑️ Delete Theme Controller
 *
 * Deletes a backlog theme
 */

import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { backlogThemesTable, activityTable } from "../../database/schema";
import logger from "../../utils/logger";

export async function deleteTheme(themeId: string, userId: string) {
  const db = getDatabase();

  try {
    // Check if theme exists
    const existing = await db
      .select()
      .from(backlogThemesTable)
      .where(eq(backlogThemesTable.id, themeId))
      .limit(1);

    const [theme] = existing;
    if (!theme) {
      throw new Error("Theme not found");
    }

    // Authorization (project-scoped canManageProjectSettings) is enforced by
    // requireThemePermission at the route layer.

    // Delete theme
    await db
      .delete(backlogThemesTable)
      .where(eq(backlogThemesTable.id, themeId));

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
