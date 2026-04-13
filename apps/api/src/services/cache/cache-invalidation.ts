/**
 * 🔄 Cache Invalidation Strategies
 * 
 * Provides intelligent cache invalidation for project management operations.
 * 
 * @epic-infrastructure: Smart cache invalidation for data consistency
 */

import { cacheManager } from './cache-manager';
import { CacheKeys } from './cache-keys';
import { logger } from '../../utils/logger';

/**
 * Cache Invalidation Service
 * 
 * Handles cache invalidation based on data changes in the project management system
 */
export class CacheInvalidation {
  /**
   * Invalidate all caches related to a user
   */
  static async onUserUpdate(userId: string): Promise<void> {
    logger.debug('Invalidating user caches', { userId });
    
    await cacheManager.invalidateTags(CacheKeys.user.tags(userId));
  }

  /**
   * Invalidate when user settings change
   */
  static async onUserSettingsUpdate(userId: string): Promise<void> {
    await cacheManager.delete(CacheKeys.user.settings(userId));
  }

  /**
   * Invalidate when user profile changes
   */
  static async onUserProfileUpdate(userId: string): Promise<void> {
    await cacheManager.delete(CacheKeys.user.profile(userId));
  }

  /**
   * Invalidate all caches related to a workspace
   */
  static async onWorkspaceUpdate(workspaceId: string): Promise<void> {
    logger.debug('Invalidating workspace caches', { workspaceId });
    
    await cacheManager.invalidateTags(CacheKeys.workspace.tags(workspaceId));
  }

  /**
   * Invalidate when workspace members change
   */
  static async onWorkspaceMemberChange(workspaceId: string, userId?: string): Promise<void> {
    await Promise.all([
      cacheManager.delete(CacheKeys.workspace.members(workspaceId)),
      userId ? cacheManager.invalidateTags(CacheKeys.user.tags(userId)) : Promise.resolve(),
    ]);
  }

  /**
   * Invalidate all caches related to a project
   */
  static async onProjectUpdate(projectId: string, workspaceId: string): Promise<void> {
    logger.debug('Invalidating project caches', { projectId, workspaceId });
    
    await cacheManager.invalidateTags(CacheKeys.project.tags(projectId, workspaceId));
  }

  /**
   * Invalidate when project is deleted
   */
  static async onProjectDelete(projectId: string, workspaceId: string): Promise<void> {
    logger.info('Invalidating caches for deleted project', { projectId });
    
    await Promise.all([
      cacheManager.invalidateTags(CacheKeys.project.tags(projectId, workspaceId)),
      cacheManager.delete(CacheKeys.workspace.projects(workspaceId)),
      cacheManager.delete(CacheKeys.workspace.analytics(workspaceId)),
    ]);
  }

  /**
   * Invalidate when project settings change
   */
  static async onProjectSettingsUpdate(projectId: string): Promise<void> {
    await Promise.all([
      cacheManager.delete(CacheKeys.project.byId(projectId)),
      cacheManager.delete(CacheKeys.project.overview(projectId)),
    ]);
  }

  /**
   * Invalidate when task is created, updated, or deleted
   */
  static async onTaskChange(taskId: string, projectId: string, workspaceId: string): Promise<void> {
    logger.debug('Invalidating task caches', { taskId, projectId });
    
    await Promise.all([
      // Task-specific caches
      cacheManager.invalidateTags(CacheKeys.task.tags(taskId, projectId)),
      
      // Project caches (task list changed)
      cacheManager.delete(CacheKeys.project.tasks(projectId)),
      cacheManager.delete(CacheKeys.project.overview(projectId)),
      cacheManager.delete(CacheKeys.project.health(projectId)),
      cacheManager.delete(CacheKeys.project.analytics(projectId)),
      
      // Workspace caches
      cacheManager.delete(CacheKeys.workspace.analytics(workspaceId)),
    ]);
  }

  /**
   * Invalidate when task status changes
   */
  static async onTaskStatusChange(
    taskId: string,
    projectId: string,
    workspaceId: string,
    assigneeId?: string
  ): Promise<void> {
    logger.debug('Invalidating caches for task status change', { taskId });
    
    const invalidations = [
      cacheManager.delete(CacheKeys.task.byId(taskId)),
      cacheManager.delete(CacheKeys.project.tasks(projectId)),
      cacheManager.delete(CacheKeys.project.health(projectId)),
      cacheManager.delete(CacheKeys.project.analytics(projectId)),
      cacheManager.delete(CacheKeys.workspace.analytics(workspaceId)),
    ];
    
    if (assigneeId) {
      invalidations.push(
        cacheManager.invalidateTags([`user:${assigneeId}:tasks`])
      );
    }
    
    await Promise.all(invalidations);
  }

  /**
   * Invalidate when task assignment changes
   */
  static async onTaskAssignmentChange(
    taskId: string,
    projectId: string,
    oldAssigneeId?: string,
    newAssigneeId?: string
  ): Promise<void> {
    const invalidations = [
      cacheManager.delete(CacheKeys.task.byId(taskId)),
    ];
    
    if (oldAssigneeId) {
      invalidations.push(cacheManager.invalidateTags([`user:${oldAssigneeId}:tasks`]));
    }
    
    if (newAssigneeId) {
      invalidations.push(cacheManager.invalidateTags([`user:${newAssigneeId}:tasks`]));
    }
    
    await Promise.all(invalidations);
  }

  /**
   * Invalidate when milestone changes
   */
  static async onMilestoneChange(projectId: string, workspaceId: string): Promise<void> {
    await Promise.all([
      cacheManager.delete(CacheKeys.project.milestones(projectId)),
      cacheManager.delete(CacheKeys.project.health(projectId)),
      cacheManager.delete(CacheKeys.project.analytics(projectId)),
      cacheManager.delete(CacheKeys.workspace.analytics(workspaceId)),
    ]);
  }

  /**
   * Invalidate when time entry is created/updated
   */
  static async onTimeEntryChange(
    userId: string,
    taskId?: string,
    projectId?: string,
    workspaceId?: string
  ): Promise<void> {
    const invalidations = [
      cacheManager.invalidateTags(CacheKeys.timeEntry.tags(userId, taskId)),
    ];
    
    if (taskId) {
      invalidations.push(cacheManager.delete(CacheKeys.task.timeEntries(taskId)));
    }
    
    if (projectId) {
      invalidations.push(cacheManager.invalidateTags([`time:project:${projectId}`]));
    }
    
    if (workspaceId) {
      invalidations.push(cacheManager.invalidateTags([`analytics:workspace:${workspaceId}`]));
    }
    
    await Promise.all(invalidations);
  }

  /**
   * Invalidate when new notification is created
   */
  static async onNotificationCreate(userId: string): Promise<void> {
    await cacheManager.invalidateTags(CacheKeys.notification.tags(userId));
  }

  /**
   * Invalidate when notification is read/deleted
   */
  static async onNotificationUpdate(userId: string): Promise<void> {
    await Promise.all([
      cacheManager.delete(CacheKeys.notification.unread(userId)),
      cacheManager.delete(CacheKeys.notification.count(userId)),
    ]);
  }

  /**
   * Invalidate when user presence changes
   */
  static async onPresenceChange(userId: string, workspaceId: string): Promise<void> {
    await Promise.all([
      cacheManager.delete(CacheKeys.presence.user(userId)),
      cacheManager.delete(CacheKeys.presence.workspace(workspaceId)),
      cacheManager.delete(CacheKeys.presence.online(workspaceId)),
    ]);
  }

  /**
   * Invalidate when channel message is sent
   */
  static async onChannelMessage(channelId: string, workspaceId: string): Promise<void> {
    await Promise.all([
      cacheManager.invalidateTags([`channel:${channelId}:messages`]),
      cacheManager.invalidateTags([`channel:${channelId}:unread`]),
    ]);
  }

  /**
   * Invalidate when analytics data changes
   */
  static async onAnalyticsDataChange(
    resourceType: 'workspace' | 'project' | 'user' | 'team',
    resourceId: string
  ): Promise<void> {
    await cacheManager.invalidateTags(CacheKeys.analytics.tags(resourceId, resourceType));
  }

  /**
   * Invalidate dashboard when underlying data changes
   */
  static async onDashboardDataChange(
    userId: string,
    workspaceId: string,
    projectId?: string
  ): Promise<void> {
    const invalidations = [
      cacheManager.delete(CacheKeys.dashboard.user(userId, workspaceId)),
    ];
    
    if (projectId) {
      invalidations.push(cacheManager.delete(CacheKeys.dashboard.project(projectId)));
    }
    
    await Promise.all(invalidations);
  }

  /**
   * Invalidate search results when data changes
   */
  static async onSearchableDataChange(workspaceId: string): Promise<void> {
    await cacheManager.invalidateTags(CacheKeys.search.tags(workspaceId));
  }

  /**
   * Bulk invalidation for complex operations
   */
  static async onComplexOperation(options: {
    userIds?: string[];
    workspaceIds?: string[];
    projectIds?: string[];
    taskIds?: string[];
  }): Promise<void> {
    const { userIds = [], workspaceIds = [], projectIds = [], taskIds = [] } = options;
    
    const invalidations: Promise<any>[] = [];
    
    // Invalidate users
    for (const userId of userIds) {
      invalidations.push(cacheManager.invalidateTags(CacheKeys.user.tags(userId)));
    }
    
    // Invalidate workspaces
    for (const workspaceId of workspaceIds) {
      invalidations.push(cacheManager.invalidateTags(CacheKeys.workspace.tags(workspaceId)));
    }
    
    // Invalidate projects
    for (const projectId of projectIds) {
      // Need workspaceId for project tags, but we can invalidate specific keys
      invalidations.push(cacheManager.invalidateTags([`project:${projectId}`]));
    }
    
    // Invalidate tasks
    for (const taskId of taskIds) {
      invalidations.push(cacheManager.invalidateTags([`task:${taskId}`]));
    }
    
    await Promise.all(invalidations);
    
    logger.info('Bulk cache invalidation complete', {
      users: userIds.length,
      workspaces: workspaceIds.length,
      projects: projectIds.length,
      tasks: taskIds.length,
    });
  }
}

export default CacheInvalidation;


