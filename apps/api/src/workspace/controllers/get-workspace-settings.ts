/**
 * Get Workspace Settings Controller
 * Retrieves comprehensive workspace configuration including:
 * - Basic info (name, description, logo)
 * - Member invitation settings
 * - Default project settings
 * - Visibility and permissions
 */

import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceTable, workspaceMembers, userTable } from "../../database/schema";

export interface WorkspaceSettings {
  // Basic Info
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  slug: string | null;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  
  // Member Settings
  memberCount: number;
  allowMemberInvites: boolean;
  requireAdminApproval: boolean;
  enableGuestAccess: boolean;
  autoRemoveInactive: boolean;
  inactivityDays: number;
  maxMembers: number | null;
  
  // Project Defaults
  defaultProjectVisibility: 'private' | 'team' | 'workspace';
  defaultTaskPriority: 'low' | 'medium' | 'high' | 'urgent';
  enableTimeTracking: boolean;
  requireTaskApproval: boolean;
  
  // Workspace Preferences
  workingDays: string[]; // ['monday', 'tuesday', ...]
  workingHoursStart: string; // '09:00'
  workingHoursEnd: string; // '17:00'
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  
  // Feature Flags
  enableAutomation: boolean;
  enableCalendar: boolean;
  enableMessaging: boolean;
  enableAnalytics: boolean;
  
  // Branding
  primaryColor: string;
  accentColor: string;
  customDomain: string | null;
}

const DEFAULT_SETTINGS = {
  allowMemberInvites: true,
  requireAdminApproval: false,
  enableGuestAccess: true,
  autoRemoveInactive: false,
  inactivityDays: 90,
  maxMembers: null,
  defaultProjectVisibility: 'team' as const,
  defaultTaskPriority: 'medium' as const,
  enableTimeTracking: true,
  requireTaskApproval: false,
  workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  workingHoursStart: '09:00',
  workingHoursEnd: '17:00',
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h' as const,
  enableAutomation: true,
  enableCalendar: true,
  enableMessaging: true,
  enableAnalytics: true,
  primaryColor: '#3B82F6',
  accentColor: '#8B5CF6',
  customDomain: null,
};

export default async function getWorkspaceSettings(
  userEmail: string,
  workspaceId: string
): Promise<WorkspaceSettings> {
  const db = getDatabase();
  
  // Get workspace with owner info
  const [workspace] = await db
    .select({
      workspace: workspaceTable,
      owner: userTable,
    })
    .from(workspaceTable)
    .leftJoin(userTable, eq(workspaceTable.ownerId, userTable.id))
    .where(eq(workspaceTable.id, workspaceId))
    .limit(1);
  
  if (!workspace) {
    throw new Error('Workspace not found');
  }
  
  // Verify user is a member
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
  
  // Count members
  const memberCount = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));
  
  // Merge default settings with stored settings
  const storedSettings = (workspace.workspace.settings as any) || {};
  const settings = { ...DEFAULT_SETTINGS, ...storedSettings };
  
  return {
    id: workspace.workspace.id,
    name: workspace.workspace.name,
    description: workspace.workspace.description,
    logo: workspace.workspace.logo,
    slug: workspace.workspace.slug,
    ownerId: workspace.workspace.ownerId,
    ownerEmail: workspace.owner?.email || '',
    ownerName: workspace.owner?.name || 'Unknown',
    isActive: workspace.workspace.isActive ?? true,
    createdAt: workspace.workspace.createdAt,
    updatedAt: workspace.workspace.updatedAt,
    memberCount: memberCount.length,
    ...settings,
  };
}


