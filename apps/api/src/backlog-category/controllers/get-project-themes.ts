/**
 * 📋 Get Project Themes Controller
 *
 * Retrieves all themes for a specific project
 */

import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { backlogThemesTable } from "../../database/schema";
import logger from "../../utils/logger";

export async function getProjectThemes(projectId: string, userId: string) {
  const db = getDatabase();

  try {
    // Authorization (project-scoped canViewWorkspace) is enforced by
    // requireThemeProjectPermission at the route layer.
    const themes = await db
      .select()
      .from(backlogThemesTable)
      .where(eq(backlogThemesTable.projectId, projectId))
      .orderBy(backlogThemesTable.createdAt);

    return themes;
  } catch (error) {
    logger.error("Error fetching themes:", error);
    throw new Error("Failed to fetch themes");
  }
}
