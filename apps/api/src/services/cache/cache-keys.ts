/**
 * 🔑 Cache Key Patterns
 * 
 * Centralized cache key generation for consistency and tag-based invalidation.
 * 
 * @epic-infrastructure: Cache key management for project management system
 */

/**
 * Cache key patterns for different resources
 */
export const CacheKeys = {
  /**
   * User-related cache keys
   */
  user: {
    byId: (userId: string) => `user:${userId}`,
    byEmail: (email: string) => `user:email:${email}`,
    profile: (userId: string) => `user:${userId}:profile`,
    settings: (userId: string) => `user:${userId}:settings`,
    permissions: (userId: string, workspaceId: string) => 
      `user:${userId}:workspace:${workspaceId}:permissions`,
    tags: (userId: string) => [`user:${userId}`, 'users'],
  },

  /**
   * Workspace-related cache keys
   */
  workspace: {
    byId: (workspaceId: string) => `workspace:${workspaceId}`,
    members: (workspaceId: string) => `workspace:${workspaceId}:members`,
    projects: (workspaceId: string) => `workspace:${workspaceId}:projects`,
    settings: (workspaceId: string) => `workspace:${workspaceId}:settings`,
    analytics: (workspaceId: string) => `workspace:${workspaceId}:analytics`,
    tags: (workspaceId: string) => [`workspace:${workspaceId}`, 'workspaces'],
  },

  /**
   * Project-related cache keys
   */
  project: {
    byId: (projectId: string) => `project:${projectId}`,
    tasks: (projectId: string) => `project:${projectId}:tasks`,
    members: (projectId: string) => `project:${projectId}:members`,
    milestones: (projectId: string) => `project:${projectId}:milestones`,
    health: (projectId: string) => `project:${projectId}:health`,
    analytics: (projectId: string) => `project:${projectId}:analytics`,
    overview: (projectId: string) => `project:${projectId}:overview`,
    tags: (projectId: string, workspaceId: string) => [
      `project:${projectId}`,
      `workspace:${workspaceId}:projects`,
      'projects',
    ],
  },

  /**
   * Task-related cache keys
   */
  task: {
    byId: (taskId: string) => `task:${taskId}`,
    byProject: (projectId: string, filters?: string) => 
      `project:${projectId}:tasks${filters ? `:${filters}` : ''}`,
    byAssignee: (assigneeId: string, filters?: string) =>
      `user:${assigneeId}:tasks${filters ? `:${filters}` : ''}`,
    dependencies: (taskId: string) => `task:${taskId}:dependencies`,
    comments: (taskId: string) => `task:${taskId}:comments`,
    timeEntries: (taskId: string) => `task:${taskId}:time-entries`,
    tags: (taskId: string, projectId: string) => [
      `task:${taskId}`,
      `project:${projectId}:tasks`,
      'tasks',
    ],
  },

  /**
   * Dashboard cache keys
   */
  dashboard: {
    user: (userId: string, workspaceId: string) =>
      `dashboard:user:${userId}:workspace:${workspaceId}`,
    project: (projectId: string) => `dashboard:project:${projectId}`,
    team: (teamId: string) => `dashboard:team:${teamId}`,
    executive: (workspaceId: string) => `dashboard:executive:${workspaceId}`,
    tags: (userId: string, workspaceId: string) => [
      `dashboard:user:${userId}`,
      `workspace:${workspaceId}`,
      'dashboards',
    ],
  },

  /**
   * Analytics cache keys
   */
  analytics: {
    workspace: (workspaceId: string, period: string) =>
      `analytics:workspace:${workspaceId}:${period}`,
    project: (projectId: string, period: string) =>
      `analytics:project:${projectId}:${period}`,
    user: (userId: string, period: string) =>
      `analytics:user:${userId}:${period}`,
    team: (teamId: string, period: string) =>
      `analytics:team:${teamId}:${period}`,
    tags: (resourceId: string, resourceType: string) => [
      `analytics:${resourceType}:${resourceId}`,
      'analytics',
    ],
  },

  /**
   * Time entry cache keys
   */
  timeEntry: {
    active: (userId: string) => `time:active:${userId}`,
    byTask: (taskId: string) => `time:task:${taskId}`,
    byUser: (userId: string, period: string) =>
      `time:user:${userId}:${period}`,
    byProject: (projectId: string, period: string) =>
      `time:project:${projectId}:${period}`,
    tags: (userId: string, taskId?: string) => {
      const tags = [`time:user:${userId}`, 'time-entries'];
      if (taskId) tags.push(`task:${taskId}`);
      return tags;
    },
  },

  /**
   * Notification cache keys
   */
  notification: {
    unread: (userId: string) => `notifications:unread:${userId}`,
    recent: (userId: string, limit: number) =>
      `notifications:recent:${userId}:${limit}`,
    count: (userId: string) => `notifications:count:${userId}`,
    tags: (userId: string) => [
      `notifications:${userId}`,
      'notifications',
    ],
  },

  /**
   * Presence cache keys
   */
  presence: {
    user: (userId: string) => `presence:${userId}`,
    workspace: (workspaceId: string) => `presence:workspace:${workspaceId}`,
    online: (workspaceId: string) => `presence:online:${workspaceId}`,
    tags: (userId: string, workspaceId: string) => [
      `presence:${userId}`,
      `workspace:${workspaceId}:presence`,
      'presence',
    ],
  },

  /**
   * Channel & Message cache keys
   */
  channel: {
    byId: (channelId: string) => `channel:${channelId}`,
    members: (channelId: string) => `channel:${channelId}:members`,
    messages: (channelId: string, limit: number) =>
      `channel:${channelId}:messages:${limit}`,
    unread: (channelId: string, userId: string) =>
      `channel:${channelId}:unread:${userId}`,
    tags: (channelId: string, workspaceId: string) => [
      `channel:${channelId}`,
      `workspace:${workspaceId}:channels`,
      'channels',
    ],
  },

  /**
   * Search cache keys
   */
  search: {
    query: (workspaceId: string, query: string, filters?: string) =>
      `search:${workspaceId}:${query}${filters ? `:${filters}` : ''}`,
    tags: (workspaceId: string) => [
      `search:${workspaceId}`,
      'search',
    ],
  },
};

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  // Short-lived (real-time data)
  presence: 30,           // 30 seconds
  onlineUsers: 60,        // 1 minute
  unreadCount: 60,        // 1 minute
  activeTimeEntry: 30,    // 30 seconds
  
  // Medium-lived (frequently changing)
  taskList: 300,          // 5 minutes
  projectOverview: 300,   // 5 minutes
  notifications: 180,     // 3 minutes
  channelMessages: 120,   // 2 minutes
  searchResults: 300,     // 5 minutes
  
  // Long-lived (infrequently changing)
  userProfile: 1800,      // 30 minutes
  workspaceSettings: 3600, // 1 hour
  projectSettings: 3600,  // 1 hour
  analytics: 1800,        // 30 minutes
  dashboardData: 600,     // 10 minutes
  
  // Very long-lived (rarely changing)
  userPermissions: 7200,  // 2 hours
  workspaceMembers: 3600, // 1 hour
  projectHealth: 600,     // 10 minutes
};

/**
 * Helper to generate cache key with filters
 */
export function cacheKeyWithFilters(
  base: string,
  filters: Record<string, any>
): string {
  const filterStr = Object.entries(filters)
    .filter(([_, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b)) // Consistent ordering
    .map(([key, value]) => `${key}:${value}`)
    .join(':');
  
  return filterStr ? `${base}:${filterStr}` : base;
}

/**
 * Helper to generate pagination cache key
 */
export function paginationCacheKey(
  base: string,
  limit: number,
  offset: number,
  sortBy?: string,
  sortOrder?: string
): string {
  const parts = [base, `limit:${limit}`, `offset:${offset}`];
  
  if (sortBy) parts.push(`sort:${sortBy}`);
  if (sortOrder) parts.push(`order:${sortOrder}`);
  
  return parts.join(':');
}

export default CacheKeys;


