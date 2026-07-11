import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { projectSettingsTable } from "../../database/schema";

async function updateProjectSettings(
  projectId: string,
  category: string,
  settings: Record<string, any>,
  modifiedBy?: string,
) {
  const db = getDatabase();
  // Check if settings already exist
  const [existingSettings] = await db
    .select()
    .from(projectSettingsTable)
    .where(
      and(
        eq(projectSettingsTable.projectId, projectId),
        eq(projectSettingsTable.category, category),
      ),
    );

  // Only real project_settings columns (no lastModified/modifiedBy columns
  // exist; settings is jsonb so no manual stringify)
  const settingsData = {
    projectId,
    category,
    settings,
  };

  if (existingSettings) {
    // Update existing settings
    const updatedSettings = await db
      .update(projectSettingsTable)
      // project_settings has no version column; updatedAt tracks changes
      .set({
        ...settingsData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectSettingsTable.projectId, projectId),
          eq(projectSettingsTable.category, category),
        ),
      )
      .returning();

    return {
      ...updatedSettings[0],
      settings:
        typeof updatedSettings[0]?.settings === "string"
          ? JSON.parse(updatedSettings[0].settings)
          : updatedSettings[0]?.settings,
    };
  }
  // Create new settings
  const newSettings = await db
    .insert(projectSettingsTable)
    .values({
      ...settingsData,
    })
    .returning();

  return {
    ...newSettings[0],
    settings:
      typeof newSettings[0]?.settings === "string"
        ? JSON.parse(newSettings[0].settings)
        : newSettings[0]?.settings,
  };
}

export default updateProjectSettings;
