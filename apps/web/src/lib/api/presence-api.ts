// @epic-4.2-presence: Enhanced presence system API client
import { fetchApi } from "@/lib/fetch";

export interface UserPresence {
  userEmail: string;
  userName?: string;
  status: 'online' | 'offline' | 'away' | 'busy' | 'do_not_disturb' | 'custom';
  lastSeen?: Date;
  currentPage?: string;
  customStatusMessage?: string;
  customStatusEmoji?: string;
  statusExpiresAt?: Date;
  isStatusVisible?: boolean;
  lastActivityType?: string;
  timezone?: string;
  doNotDisturbUntil?: Date;
  updatedAt?: Date;
}

export interface PresenceHistoryItem {
  id: string;
  userEmail: string;
  workspaceId: string;
  previousStatus?: string;
  newStatus: string;
  statusMessage?: string;
  statusEmoji?: string;
  changeReason?: string;
  sessionDuration?: number;
  activityMetrics?: string;
  deviceInfo?: string;
  locationInfo?: string;
  createdAt: Date;
}

export interface UpdatePresenceData {
  status: UserPresence['status'];
  socketId?: string | null;
  currentPage?: string;
  customStatusMessage?: string;
  customStatusEmoji?: string;
  statusExpiresAt?: string;
  isStatusVisible?: boolean;
  lastActivityType?: string;
  lastActivityDetails?: string;
  timezone?: string;
  workingHours?: string;
  doNotDisturbUntil?: string;
  changeReason?: string;
}

export interface CustomStatusData {
  statusMessage?: string;
  statusEmoji?: string;
  expiresAt?: string;
  isVisible?: boolean;
}

/** Maps `GET /api/presence/online?workspaceId=` (see apps/api/src/modules/presence/index.ts) */
function mapOnlineUsersToUserPresence(users: Array<Record<string, unknown>>): UserPresence[] {
  return users.map((u) => ({
    userEmail: String(u.userEmail ?? ""),
    userName: u.userName != null ? String(u.userName) : undefined,
    status: u.isOnline === false ? "offline" : "online",
    lastSeen: u.lastSeen != null ? new Date(String(u.lastSeen)) : undefined,
  }));
}

// Workspace "presence" list is backed by the online-users endpoint (recent activity in workspace).
export async function getWorkspacePresence(workspaceId: string): Promise<UserPresence[]> {
  return getOnlineUsers(workspaceId);
}

// Get online users in workspace
export async function getOnlineUsers(workspaceId: string): Promise<UserPresence[]> {
  const response = await fetchApi(
    `/api/presence/online?workspaceId=${encodeURIComponent(workspaceId)}`,
  );
  const raw = response.users;
  if (!Array.isArray(raw)) return [];
  return mapOnlineUsersToUserPresence(raw as Array<Record<string, unknown>>);
}

// Update user presence
export async function updateUserPresence(
  workspaceId: string,
  userEmail: string,
  data: UpdatePresenceData
): Promise<UserPresence> {
  const response = await fetchApi(`/api/presence/workspace/${workspaceId}/user/${userEmail}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.data;
}

// Set custom status
export async function setCustomStatus(
  workspaceId: string,
  userEmail: string,
  statusData: CustomStatusData
): Promise<UserPresence> {
  const response = await fetchApi(`/api/presence/workspace/${workspaceId}/user/${userEmail}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(statusData),
  });
  return response.data;
}

// Clear custom status
export async function clearCustomStatus(
  workspaceId: string,
  userEmail: string
): Promise<UserPresence> {
  const response = await fetchApi(`/api/presence/workspace/${workspaceId}/user/${userEmail}/status`, {
    method: 'DELETE',
  });
  return response.data;
}

// Set do not disturb
export async function setDoNotDisturb(
  workspaceId: string,
  userEmail: string,
  until?: string
): Promise<UserPresence> {
  const response = await fetchApi(`/api/presence/workspace/${workspaceId}/user/${userEmail}/dnd`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ until }),
  });
  return response.data;
}

// Update working hours
export async function updateWorkingHours(
  workspaceId: string,
  userEmail: string,
  workingHours: string,
  timezone?: string
): Promise<UserPresence> {
  const response = await fetchApi(`/api/presence/workspace/${workspaceId}/user/${userEmail}/working-hours`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workingHours, timezone }),
  });
  return response.data;
}

// Get user presence history
export async function getPresenceHistory(
  workspaceId: string,
  userEmail: string,
  limit?: number
): Promise<PresenceHistoryItem[]> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  
  const url = `/api/presence/workspace/${workspaceId}/user/${userEmail}/history${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetchApi(url);
  return response.data;
}

// Get workspace presence analytics
export async function getWorkspacePresenceAnalytics(
  workspaceId: string,
  fromDate?: string,
  toDate?: string
): Promise<PresenceHistoryItem[]> {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  
  const url = `/api/presence/workspace/${workspaceId}/analytics${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetchApi(url);
  return response.data;
}

// Admin function to cleanup expired statuses
export async function cleanupExpiredStatuses(): Promise<void> {
  await fetchApi('/api/presence/admin/cleanup-expired', {
    method: 'POST',
  });
}

// Helper functions for status management
export function isUserOnline(presence: UserPresence): boolean {
  return ['online', 'away', 'busy', 'do_not_disturb', 'custom'].includes(presence.status);
}

export function isUserAvailable(presence: UserPresence): boolean {
  return presence.status === 'online' || presence.status === 'custom';
}

export function getUserStatusLabel(presence: UserPresence): string {
  if (presence.customStatusMessage && presence.status === 'custom') {
    return presence.customStatusMessage;
  }
  
  switch (presence.status) {
    case 'online':
      return 'Available';
    case 'away':
      return 'Away';
    case 'busy':
      return 'Busy';
    case 'do_not_disturb':
      return 'Do not disturb';
    case 'custom':
      return 'Custom status';
    case 'offline':
    default:
      return 'Offline';
  }
}

export function shouldShowDoNotDisturb(presence: UserPresence): boolean {
  return presence.status === 'do_not_disturb' && 
         (!presence.doNotDisturbUntil || new Date(presence.doNotDisturbUntil) > new Date());
}