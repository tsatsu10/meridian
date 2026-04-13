// Memoized selectors using reselect for optimal performance

import { createSelector, createSelectorCreator, lruMemoize } from 'reselect';
import type { RootState } from '../index';

// Custom selector creator with LRU cache for expensive computations
const createLRUSelector = createSelectorCreator(lruMemoize, {
  maxSize: 50,
  equalityCheck: (a, b) => a === b,
});

// Base state selectors
const selectAuthState = (state: RootState) => state.auth;
const selectWorkspaceState = (state: RootState) => state.workspace;
const selectProjectState = (state: RootState) => state.project;
const selectTaskState = (state: RootState) => state.task;
const selectTeamState = (state: RootState) => state.team;
const selectCommunicationState = (state: RootState) => state.communication;
const selectUIState = (state: RootState) => state.ui;

// Authentication selectors
export const selectCurrentUser = createSelector(
  [selectAuthState],
  (auth) => auth.user
);

export const selectUserPermissions = createSelector(
  [selectCurrentUser],
  (user) => user?.permissions || []
);

export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (auth) => auth.isAuthenticated
);

export const selectAuthLoading = createSelector(
  [selectAuthState],
  (auth) => auth.loading
);

export const selectSessionInfo = createSelector(
  [selectAuthState],
  (auth) => ({
    session: auth.session,
    isValid: auth.session ? auth.session.expiresAt > Date.now() : false,
    timeRemaining: auth.session ? Math.max(0, auth.session.expiresAt - Date.now()) : 0,
    warning: auth.sessionWarning,
  })
);

// Permission checking selector factory
export const createHasPermissionSelector = (permission: string) =>
  createSelector(
    [selectUserPermissions],
    (permissions) => permissions.includes(permission)
  );

// Multi-permission checking
export const createHasAllPermissionsSelector = (requiredPermissions: string[]) =>
  createSelector(
    [selectUserPermissions],
    (permissions) => requiredPermissions.every(perm => permissions.includes(perm))
  );

export const createHasAnyPermissionSelector = (requiredPermissions: string[]) =>
  createSelector(
    [selectUserPermissions],
    (permissions) => requiredPermissions.some(perm => permissions.includes(perm))
  );

// Workspace selectors
export const selectCurrentWorkspace = createSelector(
  [selectWorkspaceState],
  (workspace) => workspace.current
);

export const selectWorkspaceMembers = createSelector(
  [selectWorkspaceState],
  (workspace) => workspace.members || []
);

export const selectWorkspaceUsage = createSelector(
  [selectWorkspaceState],
  (workspace) => workspace.usage
);

export const selectOnlineMembers = createSelector(
  [selectWorkspaceState],
  (workspace) => workspace.onlineMembers || []
);

export const selectWorkspaceById = (workspaceId: string) =>
  createSelector(
    [selectWorkspaceState],
    (workspace) => workspace.list.find(w => w.id === workspaceId)
  );

// Workspace analytics
export const selectWorkspaceAnalytics = createLRUSelector(
  [selectWorkspaceMembers, selectOnlineMembers, selectWorkspaceUsage],
  (members, onlineMembers, usage) => ({
    totalMembers: members.length,
    onlineCount: onlineMembers.length,
    offlineCount: members.length - onlineMembers.length,
    onlinePercentage: members.length > 0 ? (onlineMembers.length / members.length) * 100 : 0,
    storageUsed: usage?.storage || 0,
    storagePercentage: usage?.storage && usage?.storageLimit 
      ? (usage.storage / usage.storageLimit) * 100 
      : 0,
    projectCount: usage?.projects || 0,
    apiCallsCount: usage?.apiCalls || 0,
  })
);

// Project selectors
export const selectProjectList = createSelector(
  [selectProjectState],
  (project) => project.list || []
);

export const selectActiveProject = createSelector(
  [selectProjectState],
  (project) => project.active
);

export const selectProjectMembers = createSelector(
  [selectProjectState],
  (project) => project.members || []
);

export const selectProjectTasks = createSelector(
  [selectProjectState],
  (project) => project.tasks || []
);

export const selectProjectById = (projectId: string) =>
  createSelector(
    [selectProjectList],
    (projects) => projects.find(p => p.id === projectId)
  );

// Project analytics with memoization
export const selectProjectAnalytics = createLRUSelector(
  [selectProjectState],
  (project) => project.analytics
);

export const selectProjectProgress = createLRUSelector(
  [selectProjectTasks],
  (tasks) => {
    if (!tasks.length) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = tasks.filter(task => task.status === 'done').length;
    const total = tasks.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    return { completed, total, percentage };
  }
);

export const selectProjectsByStatus = createLRUSelector(
  [selectProjectList],
  (projects) => projects.reduce((acc, project) => {
    const status = project.status || 'active';
    if (!acc[status]) acc[status] = [];
    acc[status].push(project);
    return acc;
  }, {} as Record<string, any[]>)
);

// Task selectors
export const selectTaskList = createSelector(
  [selectTaskState],
  (task) => task.list || []
);

export const selectActiveTask = createSelector(
  [selectTaskState],
  (task) => task.active
);

export const selectTaskBoards = createSelector(
  [selectTaskState],
  (task) => task.boards || []
);

export const selectTaskById = (taskId: string) =>
  createSelector(
    [selectTaskList],
    (tasks) => tasks.find(t => t.id === taskId)
  );

// Task filtering and sorting with heavy memoization
export const selectFilteredTasks = createLRUSelector(
  [selectTaskList, selectTaskState],
  (tasks, taskState) => {
    const { filter, sort, search } = taskState.ui || {};
    
    let filtered = [...tasks];
    
    // Apply filters
    if (filter?.status && filter.status !== 'all') {
      filtered = filtered.filter(task => task.status === filter.status);
    }
    
    if (filter?.assignee && filter.assignee !== 'all') {
      filtered = filtered.filter(task => task.assigneeId === filter.assignee);
    }
    
    if (filter?.priority && filter.priority !== 'all') {
      filtered = filtered.filter(task => task.priority === filter.priority);
    }
    
    if (filter?.project && filter.project !== 'all') {
      filtered = filtered.filter(task => task.projectId === filter.project);
    }
    
    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply sorting
    if (sort?.field) {
      filtered.sort((a, b) => {
        const aVal = a[sort.field as keyof typeof a];
        const bVal = b[sort.field as keyof typeof b];
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;
        
        return sort.direction === 'desc' ? -comparison : comparison;
      });
    }
    
    return filtered;
  }
);

export const selectTasksByStatus = createLRUSelector(
  [selectTaskList],
  (tasks) => tasks.reduce((acc, task) => {
    const status = task.status || 'todo';
    if (!acc[status]) acc[status] = [];
    acc[status].push(task);
    return acc;
  }, {} as Record<string, any[]>)
);

export const selectTasksByPriority = createLRUSelector(
  [selectTaskList],
  (tasks) => tasks.reduce((acc, task) => {
    const priority = task.priority || 'medium';
    if (!acc[priority]) acc[priority] = [];
    acc[priority].push(task);
    return acc;
  }, {} as Record<string, any[]>)
);

export const selectOverdueTasks = createLRUSelector(
  [selectTaskList],
  (tasks) => {
    const now = Date.now();
    return tasks.filter(task => 
      task.dueDate && new Date(task.dueDate).getTime() < now && task.status !== 'done'
    );
  }
);

export const selectTaskAnalytics = createLRUSelector(
  [selectTaskList, selectOverdueTasks],
  (tasks, overdueTasks) => ({
    total: tasks.length,
    byStatus: tasks.reduce((acc, task) => {
      const status = task.status || 'todo';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byPriority: tasks.reduce((acc, task) => {
      const priority = task.priority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    overdue: overdueTasks.length,
    completionRate: tasks.length > 0 
      ? (tasks.filter(t => t.status === 'done').length / tasks.length) * 100 
      : 0,
  })
);

// Team selectors
export const selectTeamList = createSelector(
  [selectTeamState],
  (team) => team.list || []
);

export const selectActiveTeam = createSelector(
  [selectTeamState],
  (team) => team.active
);

export const selectTeamMembers = createSelector(
  [selectTeamState],
  (team) => team.members || []
);

export const selectTeamById = (teamId: string) =>
  createSelector(
    [selectTeamList],
    (teams) => teams.find(t => t.id === teamId)
  );

export const selectTeamChannels = createLRUSelector(
  [selectActiveTeam, selectCommunicationState],
  (activeTeam, communication) => {
    if (!activeTeam) return [];
    return communication.channels?.filter(channel => channel.teamId === activeTeam.id) || [];
  }
);

// Communication selectors
export const selectMessages = createSelector(
  [selectCommunicationState],
  (communication) => communication.messages || []
);

export const selectChannels = createSelector(
  [selectCommunicationState],
  (communication) => communication.channels || []
);

export const selectActiveChannel = createSelector(
  [selectCommunicationState],
  (communication) => communication.activeChannel
);

export const selectDirectMessages = createSelector(
  [selectCommunicationState],
  (communication) => communication.directMessages || []
);

export const selectChannelById = (channelId: string) =>
  createSelector(
    [selectChannels],
    (channels) => channels.find(c => c.id === channelId)
  );

export const selectMessagesByChannel = (channelId: string) =>
  createLRUSelector(
    [selectMessages],
    (messages) => messages.filter(msg => msg.channelId === channelId)
      .sort((a, b) => a.timestamp - b.timestamp)
  );

export const selectUnreadMessageCount = createLRUSelector(
  [selectMessages, selectCurrentUser],
  (messages, user) => {
    if (!user) return 0;
    return messages.filter(msg => 
      !msg.readBy?.includes(user.id) && msg.senderId !== user.id
    ).length;
  }
);

export const selectTypingUsers = createSelector(
  [selectCommunicationState],
  (communication) => communication.typingUsers || []
);

export const selectOnlineUsers = createSelector(
  [selectCommunicationState],
  (communication) => communication.onlineUsers || []
);

// UI selectors
export const selectTheme = createSelector(
  [selectUIState],
  (ui) => ui.theme
);

export const selectSidebarState = createSelector(
  [selectUIState],
  (ui) => ui.sidebar
);

export const selectModalState = createSelector(
  [selectUIState],
  (ui) => ({
    modals: ui.modals || {},
    data: ui.modalData || {},
  })
);

export const selectNavigationState = createSelector(
  [selectUIState],
  (ui) => ui.navigation
);

export const selectResponsiveState = createSelector(
  [selectUIState],
  (ui) => ui.responsive
);

export const selectAccessibilityState = createSelector(
  [selectUIState],
  (ui) => ui.accessibility
);

export const selectPerformanceState = createSelector(
  [selectUIState],
  (ui) => ui.performance
);

// Complex cross-slice selectors
export const selectUserWorkspaceInfo = createLRUSelector(
  [selectCurrentUser, selectCurrentWorkspace, selectWorkspaceMembers],
  (user, workspace, members) => {
    if (!user || !workspace) return null;
    
    const member = members.find(m => m.id === user.id);
    return {
      userId: user.id,
      workspaceId: workspace.id,
      role: member?.role || 'member',
      joinedAt: member?.joinedAt,
      lastActive: member?.lastActive,
      permissions: user.permissions || [],
    };
  }
);

export const selectUserTaskSummary = createLRUSelector(
  [selectCurrentUser, selectTaskList],
  (user, tasks) => {
    if (!user) return null;
    
    const userTasks = tasks.filter(task => task.assigneeId === user.id);
    
    return {
      total: userTasks.length,
      todo: userTasks.filter(t => t.status === 'todo').length,
      inProgress: userTasks.filter(t => t.status === 'in_progress').length,
      done: userTasks.filter(t => t.status === 'done').length,
      overdue: userTasks.filter(t => 
        t.dueDate && new Date(t.dueDate).getTime() < Date.now() && t.status !== 'done'
      ).length,
      highPriority: userTasks.filter(t => t.priority === 'high' || t.priority === 'critical').length,
    };
  }
);

export const selectDashboardData = createLRUSelector(
  [
    selectWorkspaceAnalytics,
    selectProjectAnalytics,
    selectTaskAnalytics,
    selectUserTaskSummary,
    selectUnreadMessageCount,
  ],
  (workspaceAnalytics, projectAnalytics, taskAnalytics, userTaskSummary, unreadMessages) => ({
    workspace: workspaceAnalytics,
    projects: projectAnalytics,
    tasks: taskAnalytics,
    userTasks: userTaskSummary,
    communications: {
      unreadMessages,
    },
    lastUpdated: Date.now(),
  })
);

// Performance monitoring selectors
export const selectPerformanceMetrics = createSelector(
  [selectUIState],
  (ui) => ({
    renderTime: ui.performance?.renderTime || 0,
    bundleSize: ui.performance?.bundleSize || 0,
    memoryUsage: ui.performance?.memoryUsage || 0,
    cacheHitRate: ui.performance?.cacheHitRate || 0,
  })
);

// Selector factory for creating dynamic filtered lists
export const createFilteredListSelector = <T>(
  listSelector: (state: RootState) => T[],
  filterFn: (item: T, filters: any) => boolean
) => (filters: any) =>
  createLRUSelector(
    [listSelector],
    (list) => list.filter(item => filterFn(item, filters))
  );

// Search selector factory
export const createSearchSelector = <T>(
  listSelector: (state: RootState) => T[],
  searchFields: (keyof T)[]
) => (query: string) =>
  createLRUSelector(
    [listSelector],
    (list) => {
      if (!query) return list;
      
      const searchLower = query.toLowerCase();
      return list.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(searchLower);
        })
      );
    }
  );

// Pagination selector factory
export const createPaginatedSelector = <T>(
  listSelector: (state: RootState) => T[]
) => (page: number, pageSize: number) =>
  createLRUSelector(
    [listSelector],
    (list) => {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      return {
        items: list.slice(start, end),
        totalItems: list.length,
        totalPages: Math.ceil(list.length / pageSize),
        currentPage: page,
        hasNextPage: end < list.length,
        hasPreviousPage: page > 1,
      };
    }
  );

// Export commonly used paginated selectors
export const selectPaginatedTasks = createPaginatedSelector(selectTaskList);
export const selectPaginatedProjects = createPaginatedSelector(selectProjectList);
export const selectPaginatedTeams = createPaginatedSelector(selectTeamList);

// Export commonly used search selectors
export const selectTaskSearch = createSearchSelector(selectTaskList, ['title', 'description']);
export const selectProjectSearch = createSearchSelector(selectProjectList, ['name', 'description']);
export const selectTeamSearch = createSearchSelector(selectTeamList, ['name', 'description']);

// Re-export for convenience
export {
  createSelector,
  createSelectorCreator,
  createLRUSelector,
  lruMemoize,
};