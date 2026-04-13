import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { projectSettingsTable } from "../../database/schema";

async function getProjectSettings(projectId: string, category: string) {
  const db = getDatabase();
  const [settings] = await db
    .select()
    .from(projectSettingsTable)
    .where(
      and(
        eq(projectSettingsTable.projectId, projectId),
        eq(projectSettingsTable.category, category)
      )
    );

  if (!settings) {
    return {
      projectId,
      category,
      settings: {},
      version: 1,
      lastModified: new Date(),
      modifiedBy: null,
    };
  }

  return {
    ...settings,
    settings: JSON.parse(settings.settings),
  };
}

export default getProjectSettings; 
