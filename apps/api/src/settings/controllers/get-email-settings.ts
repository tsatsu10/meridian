/**
 * Get Email & Communication Settings Controller
 * Retrieves workspace-level email and communication configuration
 */

import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceTable } from "../../database/schema";

export interface EmailSettings {
  // SMTP Configuration
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
  smtpPassword: string; // Encrypted in storage
  smtpFromEmail: string;
  smtpFromName: string;
  
  // Email Preferences
  enableEmailNotifications: boolean;
  emailSignature: string;
  autoReplyEnabled: boolean;
  autoReplyMessage: string;
  forwardingEnabled: boolean;
  forwardingEmail: string;
  
  // Digest Settings
  dailyDigestEnabled: boolean;
  dailyDigestTime: string; // '09:00'
  weeklyDigestEnabled: boolean;
  weeklyDigestDay: string; // 'monday'
  weeklyDigestTime: string;
  digestIncludeProjects: boolean;
  digestIncludeTasks: boolean;
  digestIncludeMessages: boolean;
  digestIncludeActivities: boolean;
  
  // Communication Settings
  allowDirectMessages: boolean;
  allowChannelCreation: boolean;
  requireMessageApproval: boolean;
  messageRetentionDays: number | null;
  allowFileSharing: boolean;
  maxFileSize: number; // MB
  allowedFileTypes: string[];
  
  // Notification Schedules
  notificationQuietHoursEnabled: boolean;
  notificationQuietHoursStart: string;
  notificationQuietHoursEnd: string;
  notificationDaysEnabled: string[];
}

const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  smtpEnabled: false,
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: true,
  smtpUsername: '',
  smtpPassword: '',
  smtpFromEmail: '',
  smtpFromName: '',
  enableEmailNotifications: true,
  emailSignature: '',
  autoReplyEnabled: false,
  autoReplyMessage: '',
  forwardingEnabled: false,
  forwardingEmail: '',
  dailyDigestEnabled: false,
  dailyDigestTime: '09:00',
  weeklyDigestEnabled: false,
  weeklyDigestDay: 'monday',
  weeklyDigestTime: '09:00',
  digestIncludeProjects: true,
  digestIncludeTasks: true,
  digestIncludeMessages: true,
  digestIncludeActivities: true,
  allowDirectMessages: true,
  allowChannelCreation: true,
  requireMessageApproval: false,
  messageRetentionDays: null,
  allowFileSharing: true,
  maxFileSize: 10,
  allowedFileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'jpg', 'jpeg', 'png', 'gif', 'zip'],
  notificationQuietHoursEnabled: false,
  notificationQuietHoursStart: '22:00',
  notificationQuietHoursEnd: '08:00',
  notificationDaysEnabled: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
};

export default async function getEmailSettings(
  workspaceId: string
): Promise<EmailSettings> {
  const db = getDatabase();
  
  // Get workspace
  const [workspace] = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.id, workspaceId))
    .limit(1);
  
  if (!workspace) {
    throw new Error('Workspace not found');
  }
  
  // Get email settings from workspace settings JSONB
  const storedSettings = (workspace.settings as any) || {};
  const emailSettings = storedSettings.email || {};
  
  // Merge with defaults
  return { ...DEFAULT_EMAIL_SETTINGS, ...emailSettings };
}


