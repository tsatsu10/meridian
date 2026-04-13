/**
 * 🎯 Smart Profile Fetchers
 * 
 * API fetchers for smart profile features
 */

import { api } from "@/lib/api";

// ========================================
// PROFILE VIEWS & ANALYTICS
// ========================================

export async function recordProfileView(userId: string, data?: {
  source?: string;
  sectionsViewed?: string[];
  deviceType?: string;
}) {
  const response = await api.post(`/api/smart-profile/${userId}/view`, data || {});
  return response?.data || response;
}

export async function getProfileViewers(userId: string, options?: {
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());
  
  const response = await api.get(`/api/smart-profile/${userId}/views?${params}`);
  return response?.data || response;
}

export async function getProfileViewStats(userId: string) {
  const response = await api.get(`/api/smart-profile/${userId}/views/stats`);
  return response?.data || response;
}

export async function getProfileInsights(userId: string) {
  const response = await api.get(`/api/smart-profile/${userId}/insights`);
  return response?.data || response;
}

// ========================================
// COMPLETENESS & OPTIMIZATION
// ========================================

export async function getCompletenessScore(userId: string) {
  const response = await api.get(`/api/smart-profile/${userId}/completeness`);
  return response?.data || response;
}

export async function getOptimizationSuggestions(userId: string) {
  const response = await api.get(`/api/smart-profile/${userId}/suggestions`);
  return response?.data || response;
}

export async function dismissSuggestion(suggestionId: string) {
  const response = await api.post(`/api/smart-profile/suggestions/${suggestionId}/dismiss`);
  return response?.data || response;
}

// ========================================
// AVAILABILITY
// ========================================

export async function getUserAvailability(userId: string) {
  const response = await api.get(`/api/smart-profile/${userId}/availability`);
  return response?.data || response;
}

export async function updateUserAvailability(data: {
  status?: 'available' | 'away' | 'busy' | 'do_not_disturb' | 'offline';
  statusMessage?: string;
  statusEmoji?: string;
  autoStatus?: boolean;
  manualStatusUntil?: string;
  timezone?: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: string[];
}) {
  const response = await api.put('/api/smart-profile/availability', data);
  return response?.data || response;
}

// ========================================
// COLLABORATORS
// ========================================

export async function getFrequentCollaborators(userId: string, limit?: number) {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  
  const response = await api.get(`/api/smart-profile/${userId}/collaborators?${params}`);
  return response?.data || response;
}

export async function recalculateCollaborators(userId: string) {
  const response = await api.post(`/api/smart-profile/${userId}/collaborators/recalculate`);
  return response?.data || response;
}

// ========================================
// STATISTICS
// ========================================

export async function getUserStatistics(userId: string) {
  const response = await api.get(`/api/smart-profile/${userId}/statistics`);
  return response?.data || response;
}

export async function recalculateStatistics(userId: string, workspaceId: string) {
  const response = await api.post(
    `/api/smart-profile/${userId}/statistics/recalculate?workspaceId=${workspaceId}`
  );
  return response?.data || response;
}

// ========================================
// WORK & ACTIVITY
// ========================================

export async function getActiveProjects(userId: string) {
  const response = await api.get(`/api/smart-profile/${userId}/active-projects`);
  return response?.data || response;
}

export async function getRecentTasks(userId: string) {
  const response = await api.get(`/api/smart-profile/${userId}/recent-tasks`);
  return response?.data || response;
}

export async function getActivityFeed(userId: string, options?: {
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());
  
  const response = await api.get(`/api/smart-profile/${userId}/activity?${params}`);
  return response?.data || response;
}

export async function getUserWorkload(userId: string) {
  const response = await api.get(`/api/smart-profile/${userId}/workload`);
  return response?.data || response;
}

export async function getTeamCollaborations(userId: string) {
  const response = await api.get(`/api/smart-profile/${userId}/teams`);
  return response?.data || response;
}

// ========================================
// BADGES
// ========================================

export async function getUserBadges(userId: string) {
  const response = await api.get(`/api/smart-profile/${userId}/badges`);
  return response?.data || response;
}

export async function checkBadges(userId: string) {
  const response = await api.post(`/api/smart-profile/${userId}/badges/check`);
  return response?.data || response;
}

export async function toggleBadgeVisibility(badgeId: string) {
  const response = await api.put(`/api/smart-profile/badges/${badgeId}/visibility`);
  return response?.data || response;
}

export async function getAvailableBadges() {
  const response = await api.get('/api/smart-profile/badges/available');
  return response?.data || response;
}

// ========================================
// WORK HISTORY
// ========================================

export async function getWorkHistory(userId: string, workspaceId?: string, options?: {
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (workspaceId) params.append('workspaceId', workspaceId);
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());
  
  const response = await api.get(`/api/smart-profile/${userId}/work-history?${params}`);
  return response?.data || response;
}

export async function getTenureMilestones(userId: string) {
  const response = await api.get(`/api/smart-profile/${userId}/milestones`);
  return response?.data || response;
}

// ========================================
// COMBINED ANALYTICS
// ========================================

export async function getCompleteAnalytics(userId: string) {
  const response = await api.get(`/api/smart-profile/${userId}/analytics`);
  return response?.data || response;
}

// Query keys for React Query
export const smartProfileKeys = {
  viewers: (userId: string) => ['smart-profile', 'viewers', userId],
  viewStats: (userId: string) => ['smart-profile', 'view-stats', userId],
  insights: (userId: string) => ['smart-profile', 'insights', userId],
  completeness: (userId: string) => ['smart-profile', 'completeness', userId],
  suggestions: (userId: string) => ['smart-profile', 'suggestions', userId],
  availability: (userId: string) => ['smart-profile', 'availability', userId],
  collaborators: (userId: string) => ['smart-profile', 'collaborators', userId],
  statistics: (userId: string) => ['smart-profile', 'statistics', userId],
  activeProjects: (userId: string) => ['smart-profile', 'active-projects', userId],
  recentTasks: (userId: string) => ['smart-profile', 'recent-tasks', userId],
  activity: (userId: string) => ['smart-profile', 'activity', userId],
  workload: (userId: string) => ['smart-profile', 'workload', userId],
  teams: (userId: string) => ['smart-profile', 'teams', userId],
  badges: (userId: string) => ['smart-profile', 'badges', userId],
  workHistory: (userId: string, workspaceId?: string) => ['smart-profile', 'work-history', userId, workspaceId],
  milestones: (userId: string) => ['smart-profile', 'milestones', userId],
  analytics: (userId: string) => ['smart-profile', 'analytics', userId],
};

