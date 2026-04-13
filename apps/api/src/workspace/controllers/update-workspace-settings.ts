/**
 * Update Workspace Settings Controller
 * Updates workspace configuration with validation
 */

import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceTable, workspaceMembers, userTable } from "../../database/schema";

export interface UpdateWorkspaceSettingsInput {
  // Basic Info
  name?: string;
  description?: string;
  slug?: string;
  
  // Member Settings
  allowMemberInvites?: boolean;
  requireAdminApproval?: boolean;
  enableGuestAccess?: boolean;
  autoRemoveInactive?: boolean;
  inactivityDays?: number;
  maxMembers?: number | null;
  
  // Project Defaults
  defaultProjectVisibility?: 'private' | 'team' | 'workspace';
  defaultTaskPriority?: 'low' | 'medium' | 'high' | 'urgent';
  enableTimeTracking?: boolean;
  requireTaskApproval?: boolean;
  
  // Workspace Preferences
  workingDays?: string[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  
  // Feature Flags
  enableAutomation?: boolean;
  enableCalendar?: boolean;
  enableMessaging?: boolean;
  enableAnalytics?: boolean;
  
  // Branding
  primaryColor?: string;
  accentColor?: string;
  customDomain?: string | null;
}

export default async function updateWorkspaceSettings(
  userEmail: string,
  workspaceId: string,
  updates: UpdateWorkspaceSettingsInput
): Promise<any> {
  const db = getDatabase();
  
  // Verify user is workspace owner or admin
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userEmail, userEmail)
      )
    )
    .limit(1);
  
  if (!membership) {
    throw new Error('Access denied: Not a workspace member');
  }
  
  if (membership.role !== 'admin' && membership.role !== 'manager') {
    // Check if user is workspace owner
    const [workspace] = await db
      .select()
      .from(workspaceTable)
      .where(eq(workspaceTable.id, workspaceId))
      .limit(1);
    
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    
    const [owner] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);
    
    if (!owner || workspace.ownerId !== owner.id) {
      throw new Error('Access denied: Only workspace owners or admins can update settings');
    }
  }
  
  // Separate basic fields from settings
  const basicUpdates: any = {};
  const settingsUpdates: any = {};
  
  // Basic fields that go directly to workspace table
  if (updates.name !== undefined) basicUpdates.name = updates.name;
  if (updates.description !== undefined) basicUpdates.description = updates.description;
  if (updates.slug !== undefined) basicUpdates.slug = updates.slug;
  
  // Everything else goes to settings JSONB
  const settingsFields = [
    'allowMemberInvites', 'requireAdminApproval', 'enableGuestAccess',
    'autoRemoveInactive', 'inactivityDays', 'maxMembers',
    'defaultProjectVisibility', 'defaultTaskPriority', 'enableTimeTracking',
    'requireTaskApproval', 'workingDays', 'workingHoursStart', 'workingHoursEnd',
    'timezone', 'dateFormat', 'timeFormat', 'enableAutomation', 'enableCalendar',
    'enableMessaging', 'enableAnalytics', 'primaryColor', 'accentColor', 'customDomain'
  ];
  
  settingsFields.forEach(field => {
    if (updates[field as keyof UpdateWorkspaceSettingsInput] !== undefined) {
      settingsUpdates[field] = updates[field as keyof UpdateWorkspaceSettingsInput];
    }
  });
  
  // Get current workspace to merge settings
  const [currentWorkspace] = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.id, workspaceId))
    .limit(1);
  
  if (!currentWorkspace) {
    throw new Error('Workspace not found');
  }
  
  const currentSettings = (currentWorkspace.settings as any) || {};
  const mergedSettings = { ...currentSettings, ...settingsUpdates };
  
  // Update workspace
  const [updatedWorkspace] = await db
    .update(workspaceTable)
    .set({
      ...basicUpdates,
      ...(Object.keys(settingsUpdates).length > 0 ? { settings: mergedSettings } : {}),
      updatedAt: new Date(),
    })
    .where(eq(workspaceTable.id, workspaceId))
    .returning();
  
  return updatedWorkspace;
}


