/**
 * ➕ Create Theme Controller
 * 
 * Creates a new backlog theme/category for a project
 */

import { getDatabase } from "../../database/connection";
import { backlogThemesTable, activityTable, userTable } from "../../database/schema";
import { eq } from "drizzle-orm";
import logger from '../../utils/logger';

interface CreateThemeInput {
  projectId: string;
  name: string;
  description?: string;
  color?: string;
  createdBy: string;
}

export async function createTheme(input: CreateThemeInput) {
  const db = getDatabase();

  try {
    // Create theme
    const [newTheme] = await db
      .insert(backlogThemesTable)
      .values({
        projectId: input.projectId,
        name: input.name,
        description: input.description,
        color: input.color || "#6366f1",
        createdBy: input.createdBy,
      })
      .returning();

    if (!newTheme) {
      throw new Error("Failed to create theme");
    }

    // 📊 Log activity
    try {
      const [user] = await db
        .select({ email: userTable.email })
        .from(userTable)
        .where(eq(userTable.id, input.createdBy))
        .limit(1);

      if (user) {
        await db.insert(activityTable).values({
          taskId: null,
          type: "theme",
          userId: input.createdBy,
          content: { 
            text: `Created theme: ${newTheme.name}`,
            themeId: newTheme.id,
            themeName: newTheme.name,
          },
        });
      }
    } catch (logError) {
      logger.error("Failed to log activity:", logError);
      // Don't fail the operation if logging fails
    }

    return newTheme;
  } catch (error) {
    logger.error("Error creating theme:", error);
    throw new Error("Failed to create theme");
  }
}


