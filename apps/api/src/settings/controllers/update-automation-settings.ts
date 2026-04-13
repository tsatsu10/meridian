/**
 * Update Automation Settings Controller
 * Updates workspace-level automation configuration
 */

import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceTable } from "../../database/schema";
import { AutomationSettings } from "./get-automation-settings";

export default async function updateAutomationSettings(
  workspaceId: string,
  updates: Partial<AutomationSettings>
): Promise<any> {
  const db = getDatabase();
  
  // Get current workspace
  const [workspace] = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.id, workspaceId))
    .limit(1);
  
  if (!workspace) {
    throw new Error('Workspace not found');
  }
  
  // Get current settings
  const currentSettings = (workspace.settings as any) || {};
  const currentAutomationSettings = currentSettings.automation || {};
  
  // Merge updates
  const updatedAutomationSettings = { ...currentAutomationSettings, ...updates };
  
  // Update workspace settings
  const [updatedWorkspace] = await db
    .update(workspaceTable)
    .set({
      settings: {
        ...currentSettings,
        automation: updatedAutomationSettings,
      },
      updatedAt: new Date(),
    })
    .where(eq(workspaceTable.id, workspaceId))
    .returning();
  
  return updatedWorkspace;
}


