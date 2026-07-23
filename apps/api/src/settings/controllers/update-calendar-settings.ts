/**
 * Update Calendar Settings Controller
 * Updates workspace-level calendar configuration
 */

import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceTable } from "../../database/schema";
import type { CalendarSettings } from "./get-calendar-settings";

export default async function updateCalendarSettings(
  workspaceId: string,
  updates: Partial<CalendarSettings>,
) {
  const db = getDatabase();

  // Get current workspace
  const [workspace] = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.id, workspaceId))
    .limit(1);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  // Get current settings
  const currentSettings = (workspace.settings as Record<string, unknown>) || {};
  const currentCalendarSettings = currentSettings.calendar || {};

  // Merge updates
  const updatedCalendarSettings = { ...currentCalendarSettings, ...updates };

  // Update workspace settings
  const [updatedWorkspace] = await db
    .update(workspaceTable)
    .set({
      settings: {
        ...currentSettings,
        calendar: updatedCalendarSettings,
      },
      updatedAt: new Date(),
    })
    .where(eq(workspaceTable.id, workspaceId))
    .returning();

  return updatedWorkspace;
}
