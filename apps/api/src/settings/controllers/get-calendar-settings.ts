/**
 * Get Calendar Settings Controller
 * Retrieves workspace-level calendar configuration
 */

import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceTable } from "../../database/schema";

export interface CalendarSettings {
  // Google Calendar Integration
  googleCalendarEnabled: boolean;
  googleCalendarSyncEnabled: boolean;
  googleCalendarSyncInterval: number; // minutes
  googleCalendarDefaultCalendar: string;
  
  // Event Defaults
  defaultEventDuration: number; // minutes
  defaultEventReminder: number; // minutes before event
  allowAllDayEvents: boolean;
  defaultEventVisibility: 'public' | 'private' | 'workspace';
  requireEventApproval: boolean;
  
  // Working Hours
  workingHoursEnabled: boolean;
  workingHoursStart: string; // '09:00'
  workingHoursEnd: string; // '17:00'
  workingDays: string[]; // ['monday', 'tuesday', ...]
  timezone: string;
  
  // Meeting Settings
  allowMeetingRooms: boolean;
  maxMeetingDuration: number; // minutes
  bufferTimeBetweenMeetings: number; // minutes
  allowRecurringEvents: boolean;
  maxRecurringInstances: number;
  
  // Calendar Display
  calendarViewType: 'month' | 'week' | 'day' | 'agenda';
  showWeekends: boolean;
  startDayOfWeek: 'sunday' | 'monday';
  timeFormat: '12h' | '24h';
  dateFormat: string;
  
  // Notifications
  sendEventReminders: boolean;
  sendEventUpdates: boolean;
  sendCancellationNotices: boolean;
  reminderMethods: string[]; // ['email', 'push', 'inApp']
  
  // External Calendars
  allowExternalCalendars: boolean;
  supportedCalendarTypes: string[]; // ['google', 'outlook', 'ical']
  
  // Privacy & Permissions
  allowGuestAccess: boolean;
  allowEventExport: boolean;
  showBusyTime: boolean;
  allowConflictingEvents: boolean;
}

const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  googleCalendarEnabled: false,
  googleCalendarSyncEnabled: false,
  googleCalendarSyncInterval: 15,
  googleCalendarDefaultCalendar: '',
  defaultEventDuration: 60,
  defaultEventReminder: 15,
  allowAllDayEvents: true,
  defaultEventVisibility: 'workspace',
  requireEventApproval: false,
  workingHoursEnabled: true,
  workingHoursStart: '09:00',
  workingHoursEnd: '17:00',
  workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  timezone: 'UTC',
  allowMeetingRooms: true,
  maxMeetingDuration: 480,
  bufferTimeBetweenMeetings: 0,
  allowRecurringEvents: true,
  maxRecurringInstances: 365,
  calendarViewType: 'month',
  showWeekends: true,
  startDayOfWeek: 'monday',
  timeFormat: '12h',
  dateFormat: 'MM/DD/YYYY',
  sendEventReminders: true,
  sendEventUpdates: true,
  sendCancellationNotices: true,
  reminderMethods: ['email', 'push', 'inApp'],
  allowExternalCalendars: true,
  supportedCalendarTypes: ['google', 'outlook', 'ical'],
  allowGuestAccess: true,
  allowEventExport: true,
  showBusyTime: true,
  allowConflictingEvents: false,
};

export default async function getCalendarSettings(
  workspaceId: string
): Promise<CalendarSettings> {
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
  
  // Get calendar settings from workspace settings JSONB
  const storedSettings = (workspace.settings as any) || {};
  const calendarSettings = storedSettings.calendar || {};
  
  // Merge with defaults
  return { ...DEFAULT_CALENDAR_SETTINGS, ...calendarSettings };
}


