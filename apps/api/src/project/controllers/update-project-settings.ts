import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { projectSettingsTable } from "../../database/schema";

async function updateProjectSettings(
  projectId: string, 
  category: string, 
  settings: Record<string, any>, 
  modifiedBy?: string
) {
  const db = getDatabase();
  // Check if settings already exist
  const [existingSettings] = await db
    .select()
    .from(projectSettingsTable)
    .where(
      and(
        eq(projectSettingsTable.projectId, projectId),
        eq(projectSettingsTable.category, category)
      )
    );

  const settingsData = {
    projectId,
    category,
    settings: JSON.stringify(settings),
    lastModified: new Date(),
    modifiedBy,
  };

  if (existingSettings) {
    // Update existing settings
    const updatedSettings = await db
      .update(projectSettingsTable)
      .set({
        ...settingsData,
        version: existingSettings.version + 1,
      })
      .where(
        and(
          eq(projectSettingsTable.projectId, projectId),
          eq(projectSettingsTable.category, category)
        )
      )
      .returning();

    return {
      ...updatedSettings[0],
      settings: JSON.parse(updatedSettings[0].settings),
    };
  } else {
    // Create new settings
    const newSettings = await db
      .insert(projectSettingsTable)
      .values({
        ...settingsData,
        version: 1,
      })
      .returning();

    return {
      ...newSettings[0],
      settings: JSON.parse(newSettings[0].settings),
    };
  }
}

export default updateProjectSettings; 
