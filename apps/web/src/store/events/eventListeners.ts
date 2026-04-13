// Event listeners system for handling specific application events

import { eventBus, MeridianEvent } from './eventBus';
import type { RootState } from '../index';
import { logger } from "../../lib/logger";

// Event type definitions for type safety
export interface AuthEvents {
  'auth:login': { userId: string; email: string; timestamp: number };
  'auth:logout': { userId: string; reason: 'user' | 'timeout' | 'security'; timestamp: number };
  'auth:session_expired': { userId: string; sessionId: string; timestamp: number };
  'auth:mfa_required': { userId: string; method: string; timestamp: number };
  'auth:password_changed': { userId: string; timestamp: number };
}

export interface WorkspaceEvents {
  'workspace:created': { workspaceId: string; name: string; ownerId: string; timestamp: number };
  'workspace:updated': { workspaceId: string; changes: Record<string, any>; userId: string; timestamp: number };
  'workspace:deleted': { workspaceId: string; name: string; userId: string; timestamp: number };
  'workspace:member_added': { workspaceId: string; userId: string; role: string; invitedBy: string; timestamp: number };
  'workspace:member_removed': { workspaceId: string; userId: string; removedBy: string; timestamp: number };
  'workspace:switched': { fromWorkspaceId: string | null; toWorkspaceId: string; userId: string; timestamp: number };
}

export interface ProjectEvents {
  'project:created': { projectId: string; workspaceId: string; name: string; ownerId: string; timestamp: number };
  'project:updated': { projectId: string; changes: Record<string, any>; userId: string; timestamp: number };
  'project:deleted': { projectId: string; name: string; userId: string; timestamp: number };
  'project:archived': { projectId: string; name: string; userId: string; timestamp: number };
  'project:member_added': { projectId: string; userId: string; role: string; addedBy: string; timestamp: number };
  'project:status_changed': { projectId: string; fromStatus: string; toStatus: string; userId: string; timestamp: number };
}

export interface TaskEvents {
  'task:created': { taskId: string; projectId: string; title: string; assigneeId?: string; createdBy: string; timestamp: number };
  'task:updated': { taskId: string; changes: Record<string, any>; userId: string; timestamp: number };
  'task:assigned': { taskId: string; fromUserId?: string; toUserId: string; assignedBy: string; timestamp: number };
  'task:completed': { taskId: string; completedBy: string; duration?: number; timestamp: number };
  'task:commented': { taskId: string; commentId: string; content: string; userId: string; timestamp: number };
  'task:moved': { taskId: string; fromStatus: string; toStatus: string; userId: string; timestamp: number };
  'task:deleted': { taskId: string; title: string; deletedBy: string; timestamp: number };
}

export interface TeamEvents {
  'team:created': { teamId: string; name: string; workspaceId: string; ownerId: string; timestamp: number };
  'team:updated': { teamId: string; changes: Record<string, any>; userId: string; timestamp: number };
  'team:member_added': { teamId: string; userId: string; role: string; addedBy: string; timestamp: number };
  'team:channel_created': { teamId: string; channelId: string; name: string; createdBy: string; timestamp: number };
  'team:meeting_scheduled': { teamId: string; meetingId: string; title: string; datetime: number; scheduledBy: string; timestamp: number };
}

export interface CommunicationEvents {
  'message:sent': { messageId: string; channelId: string; content: string; senderId: string; timestamp: number };
  'message:edited': { messageId: string; oldContent: string; newContent: string; editedBy: string; timestamp: number };
  'message:deleted': { messageId: string; channelId: string; deletedBy: string; timestamp: number };
  'channel:created': { channelId: string; name: string; type: string; createdBy: string; timestamp: number };
  'user:typing': { userId: string; channelId: string; isTyping: boolean; timestamp: number };
  'user:presence': { userId: string; status: 'online' | 'away' | 'busy' | 'offline'; timestamp: number };
}

export interface UIEvents {
  'ui:modal_opened': { modalId: string; data?: any; timestamp: number };
  'ui:modal_closed': { modalId: string; timestamp: number };
  'ui:theme_changed': { fromTheme: string; toTheme: string; timestamp: number };
  'ui:sidebar_toggled': { collapsed: boolean; timestamp: number };
  'ui:page_viewed': { path: string; title: string; timestamp: number };
}

export interface SystemEvents {
  'system:error': { error: Error; context: string; severity: 'low' | 'medium' | 'high' | 'critical'; timestamp: number };
  'system:performance_warning': { metric: string; value: number; threshold: number; timestamp: number };
  'system:connection_lost': { reconnectAttempts: number; timestamp: number };
  'system:connection_restored': { downtime: number; timestamp: number };
  'system:cache_invalidated': { cacheKey: string; reason: string; timestamp: number };
}

// Combined event types
export type AllEvents = AuthEvents & WorkspaceEvents & ProjectEvents & TaskEvents & TeamEvents & CommunicationEvents & UIEvents & SystemEvents;

// Event listener registry
export class EventListenerRegistry {
  private store: any; // Would be typed as Store<RootState> in real implementation
  private registeredListeners: Map<string, string[]> = new Map();

  constructor(store: any) {
    this.store = store;
    this.setupDefaultListeners();
  }

  private setupDefaultListeners(): void {
    // Authentication event listeners
    this.register('auth', [
      this.onUserLogin.bind(this),
      this.onUserLogout.bind(this),
      this.onSessionExpired.bind(this),
    ]);

    // Workspace event listeners
    this.register('workspace', [
      this.onWorkspaceCreated.bind(this),
      this.onWorkspaceSwitched.bind(this),
      this.onWorkspaceMemberAdded.bind(this),
    ]);

    // Project event listeners
    this.register('project', [
      this.onProjectCreated.bind(this),
      this.onProjectUpdated.bind(this),
      this.onProjectStatusChanged.bind(this),
    ]);

    // Task event listeners
    this.register('task', [
      this.onTaskCreated.bind(this),
      this.onTaskAssigned.bind(this),
      this.onTaskCompleted.bind(this),
      this.onTaskMoved.bind(this),
    ]);

    // Team event listeners
    this.register('team', [
      this.onTeamCreated.bind(this),
      this.onTeamMemberAdded.bind(this),
      this.onMeetingScheduled.bind(this),
    ]);

    // Communication event listeners
    this.register('communication', [
      this.onMessageSent.bind(this),
      this.onUserPresenceChanged.bind(this),
      this.onChannelCreated.bind(this),
    ]);

    // UI event listeners
    this.register('ui', [
      this.onModalOpened.bind(this),
      this.onThemeChanged.bind(this),
      this.onPageViewed.bind(this),
    ]);

    // System event listeners
    this.register('system', [
      this.onSystemError.bind(this),
      this.onPerformanceWarning.bind(this),
      this.onConnectionLost.bind(this),
      this.onCacheInvalidated.bind(this),
    ]);
  }

  private register(category: string, listeners: Function[]): void {
    const listenerIds: string[] = [];

    listeners.forEach(listener => {
      const listenerId = eventBus.on(
        `${category}:*`,
        listener,
        {
          category: category as any,
          priority: 5,
          errorHandler: (error, event) => {
            console.error(`Error in ${category} event listener:`, error, event);
            // Could dispatch error to store here
          },
        }
      );
      listenerIds.push(listenerId);
    });

    this.registeredListeners.set(category, listenerIds);
  }

  // Authentication event handlers
  private async onUserLogin(event: MeridianEvent<AuthEvents['auth:login']>): Promise<void> {
    if (event.type !== 'auth:login') return;

    logger.info("User logged in:");
    
    // Update analytics
    eventBus.emit('analytics:user_action', {
      action: 'login',
      userId: event.payload.userId,
      timestamp: event.payload.timestamp,
    }, { category: 'system' });

    // Load user preferences
    eventBus.emit('user:load_preferences', {
      userId: event.payload.userId,
    }, { category: 'data' });

    // Initialize user session
    eventBus.emit('session:initialize', {
      userId: event.payload.userId,
      email: event.payload.email,
    }, { category: 'system' });
  }

  private async onUserLogout(event: MeridianEvent<AuthEvents['auth:logout']>): Promise<void> {
    if (event.type !== 'auth:logout') return;

    logger.info("User logged out:");

    // Clear user data
    eventBus.emit('user:clear_data', {
      userId: event.payload.userId,
    }, { category: 'system' });

    // Clear cache
    eventBus.emit('cache:clear_user_data', {
      userId: event.payload.userId,
    }, { category: 'system' });

    // Update analytics
    eventBus.emit('analytics:user_action', {
      action: 'logout',
      userId: event.payload.userId,
      reason: event.payload.reason,
    }, { category: 'system' });
  }

  private async onSessionExpired(event: MeridianEvent<AuthEvents['auth:session_expired']>): Promise<void> {
    if (event.type !== 'auth:session_expired') return;

    logger.info("Session expired:");

    // Show session expired notification
    eventBus.emit('notification:show', {
      type: 'warning',
      title: 'Session Expired',
      message: 'Your session has expired. Please log in again.',
      persistent: true,
    }, { category: 'ui' });

    // Redirect to login
    eventBus.emit('navigation:redirect', {
      path: '/auth/sign-in',
      reason: 'session_expired',
    }, { category: 'ui' });
  }

  // Workspace event handlers
  private async onWorkspaceCreated(event: MeridianEvent<WorkspaceEvents['workspace:created']>): Promise<void> {
    if (event.type !== 'workspace:created') return;

    logger.info("Workspace created:");

    // Create default project
    eventBus.emit('project:create_default', {
      workspaceId: event.payload.workspaceId,
      ownerId: event.payload.ownerId,
    }, { category: 'data' });

    // Send welcome notification
    eventBus.emit('notification:send', {
      userId: event.payload.ownerId,
      type: 'success',
      title: 'Workspace Created',
      message: `Welcome to ${event.payload.name}! Your workspace is ready.`,
    }, { category: 'system' });

    // Track workspace creation
    eventBus.emit('analytics:workspace_action', {
      action: 'created',
      workspaceId: event.payload.workspaceId,
      userId: event.payload.ownerId,
    }, { category: 'system' });
  }

  private async onWorkspaceSwitched(event: MeridianEvent<WorkspaceEvents['workspace:switched']>): Promise<void> {
    if (event.type !== 'workspace:switched') return;

    logger.info("Workspace switched:");

    // Clear current workspace cache
    if (event.payload.fromWorkspaceId) {
      eventBus.emit('cache:clear_workspace', {
        workspaceId: event.payload.fromWorkspaceId,
      }, { category: 'system' });
    }

    // Load new workspace data
    eventBus.emit('workspace:load_data', {
      workspaceId: event.payload.toWorkspaceId,
      userId: event.payload.userId,
    }, { category: 'data' });

    // Update UI breadcrumbs
    eventBus.emit('ui:update_breadcrumbs', {
      workspaceId: event.payload.toWorkspaceId,
    }, { category: 'ui' });
  }

  private async onWorkspaceMemberAdded(event: MeridianEvent<WorkspaceEvents['workspace:member_added']>): Promise<void> {
    if (event.type !== 'workspace:member_added') return;

    logger.info("Member added to workspace:");

    // Send welcome email
    eventBus.emit('email:send_welcome', {
      userId: event.payload.userId,
      workspaceId: event.payload.workspaceId,
      invitedBy: event.payload.invitedBy,
    }, { category: 'system' });

    // Create notification for other members
    eventBus.emit('notification:broadcast_workspace', {
      workspaceId: event.payload.workspaceId,
      excludeUserId: event.payload.userId,
      type: 'info',
      message: `New member joined the workspace`,
    }, { category: 'system' });
  }

  // Project event handlers
  private async onProjectCreated(event: MeridianEvent<ProjectEvents['project:created']>): Promise<void> {
    if (event.type !== 'project:created') return;

    logger.info("Project created:");

    // Create default task columns
    eventBus.emit('task:create_default_columns', {
      projectId: event.payload.projectId,
    }, { category: 'data' });

    // Add creator as project member
    eventBus.emit('project:add_member', {
      projectId: event.payload.projectId,
      userId: event.payload.ownerId,
      role: 'owner',
    }, { category: 'data' });

    // Track project creation
    eventBus.emit('analytics:project_action', {
      action: 'created',
      projectId: event.payload.projectId,
      workspaceId: event.payload.workspaceId,
      userId: event.payload.ownerId,
    }, { category: 'system' });
  }

  private async onProjectUpdated(event: MeridianEvent<ProjectEvents['project:updated']>): Promise<void> {
    if (event.type !== 'project:updated') return;

    logger.info("Project updated:");

    // Invalidate project cache
    eventBus.emit('cache:invalidate', {
      key: `project:${event.payload.projectId}`,
      reason: 'project_updated',
    }, { category: 'system' });

    // Notify project members
    eventBus.emit('notification:notify_project_members', {
      projectId: event.payload.projectId,
      excludeUserId: event.payload.userId,
      type: 'info',
      message: 'Project has been updated',
    }, { category: 'system' });
  }

  private async onProjectStatusChanged(event: MeridianEvent<ProjectEvents['project:status_changed']>): Promise<void> {
    if (event.type !== 'project:status_changed') return;

    logger.info("Project status changed:");

    // Send status change notification
    eventBus.emit('notification:project_status_changed', {
      projectId: event.payload.projectId,
      fromStatus: event.payload.fromStatus,
      toStatus: event.payload.toStatus,
      changedBy: event.payload.userId,
    }, { category: 'system' });

    // Update project timeline
    eventBus.emit('timeline:add_event', {
      projectId: event.payload.projectId,
      type: 'status_change',
      data: {
        fromStatus: event.payload.fromStatus,
        toStatus: event.payload.toStatus,
        userId: event.payload.userId,
      },
    }, { category: 'data' });
  }

  // Task event handlers
  private async onTaskCreated(event: MeridianEvent<TaskEvents['task:created']>): Promise<void> {
    if (event.type !== 'task:created') return;

    logger.info("Task created:");

    // Send notification to assignee
    if (event.payload.assigneeId) {
      eventBus.emit('notification:send', {
        userId: event.payload.assigneeId,
        type: 'info',
        title: 'New Task Assigned',
        message: `You have been assigned a new task: ${event.payload.title}`,
      }, { category: 'system' });
    }

    // Update project activity
    eventBus.emit('activity:add', {
      projectId: event.payload.projectId,
      type: 'task_created',
      userId: event.payload.createdBy,
      data: {
        taskId: event.payload.taskId,
        title: event.payload.title,
      },
    }, { category: 'data' });
  }

  private async onTaskAssigned(event: MeridianEvent<TaskEvents['task:assigned']>): Promise<void> {
    if (event.type !== 'task:assigned') return;

    logger.info("Task assigned:");

    // Notify new assignee
    eventBus.emit('notification:send', {
      userId: event.payload.toUserId,
      type: 'info',
      title: 'Task Assigned',
      message: 'A task has been assigned to you',
    }, { category: 'system' });

    // Notify previous assignee if any
    if (event.payload.fromUserId) {
      eventBus.emit('notification:send', {
        userId: event.payload.fromUserId,
        type: 'info',
        title: 'Task Reassigned',
        message: 'A task has been reassigned to someone else',
      }, { category: 'system' });
    }
  }

  private async onTaskCompleted(event: MeridianEvent<TaskEvents['task:completed']>): Promise<void> {
    if (event.type !== 'task:completed') return;

    logger.info("Task completed:");

    // Update user metrics
    eventBus.emit('metrics:task_completed', {
      userId: event.payload.completedBy,
      taskId: event.payload.taskId,
      duration: event.payload.duration,
    }, { category: 'system' });

    // Check if project is completed
    eventBus.emit('project:check_completion', {
      taskId: event.payload.taskId,
    }, { category: 'data' });

    // Send congratulations notification
    eventBus.emit('notification:send', {
      userId: event.payload.completedBy,
      type: 'success',
      title: 'Task Completed!',
      message: 'Great job on completing your task!',
    }, { category: 'system' });
  }

  private async onTaskMoved(event: MeridianEvent<TaskEvents['task:moved']>): Promise<void> {
    if (event.type !== 'task:moved') return;

    logger.info("Task moved:");

    // Update task timeline
    eventBus.emit('timeline:add_event', {
      taskId: event.payload.taskId,
      type: 'status_change',
      data: {
        fromStatus: event.payload.fromStatus,
        toStatus: event.payload.toStatus,
        userId: event.payload.userId,
      },
    }, { category: 'data' });

    // Trigger automation if any
    eventBus.emit('automation:task_moved', {
      taskId: event.payload.taskId,
      fromStatus: event.payload.fromStatus,
      toStatus: event.payload.toStatus,
    }, { category: 'system' });
  }

  // Team event handlers
  private async onTeamCreated(event: MeridianEvent<TeamEvents['team:created']>): Promise<void> {
    if (event.type !== 'team:created') return;

    logger.info("Team created:");

    // Create default team channel
    eventBus.emit('channel:create_default', {
      teamId: event.payload.teamId,
      createdBy: event.payload.ownerId,
    }, { category: 'data' });

    // Add creator as team owner
    eventBus.emit('team:add_member', {
      teamId: event.payload.teamId,
      userId: event.payload.ownerId,
      role: 'owner',
    }, { category: 'data' });
  }

  private async onTeamMemberAdded(event: MeridianEvent<TeamEvents['team:member_added']>): Promise<void> {
    if (event.type !== 'team:member_added') return;

    logger.info("Team member added:");

    // Send welcome notification
    eventBus.emit('notification:send', {
      userId: event.payload.userId,
      type: 'info',
      title: 'Added to Team',
      message: 'You have been added to a team',
    }, { category: 'system' });

    // Grant channel access
    eventBus.emit('channel:grant_access', {
      teamId: event.payload.teamId,
      userId: event.payload.userId,
    }, { category: 'data' });
  }

  private async onMeetingScheduled(event: MeridianEvent<TeamEvents['team:meeting_scheduled']>): Promise<void> {
    if (event.type !== 'team:meeting_scheduled') return;

    logger.info("Meeting scheduled:");

    // Send calendar invites
    eventBus.emit('calendar:send_invites', {
      meetingId: event.payload.meetingId,
      teamId: event.payload.teamId,
      title: event.payload.title,
      datetime: event.payload.datetime,
    }, { category: 'system' });

    // Create reminder
    eventBus.emit('reminder:create', {
      meetingId: event.payload.meetingId,
      datetime: event.payload.datetime - 15 * 60 * 1000, // 15 minutes before
    }, { category: 'system' });
  }

  // Communication event handlers
  private async onMessageSent(event: MeridianEvent<CommunicationEvents['message:sent']>): Promise<void> {
    if (event.type !== 'message:sent') return;

    logger.info("Message sent:");

    // Update channel activity
    eventBus.emit('channel:update_activity', {
      channelId: event.payload.channelId,
      lastMessageId: event.payload.messageId,
      lastActivity: event.payload.timestamp,
    }, { category: 'data' });

    // Check for mentions and notify users
    eventBus.emit('mentions:check_and_notify', {
      messageId: event.payload.messageId,
      content: event.payload.content,
      senderId: event.payload.senderId,
    }, { category: 'system' });

    // Process message for AI insights
    eventBus.emit('ai:process_message', {
      messageId: event.payload.messageId,
      content: event.payload.content,
      channelId: event.payload.channelId,
    }, { category: 'system' });
  }

  private async onUserPresenceChanged(event: MeridianEvent<CommunicationEvents['user:presence']>): Promise<void> {
    if (event.type !== 'user:presence') return;

    logger.info("User presence changed:");

    // Broadcast presence to relevant channels
    eventBus.emit('presence:broadcast', {
      userId: event.payload.userId,
      status: event.payload.status,
    }, { category: 'system' });

    // Update user's last seen
    eventBus.emit('user:update_last_seen', {
      userId: event.payload.userId,
      timestamp: event.payload.timestamp,
      status: event.payload.status,
    }, { category: 'data' });
  }

  private async onChannelCreated(event: MeridianEvent<CommunicationEvents['channel:created']>): Promise<void> {
    if (event.type !== 'channel:created') return;

    logger.info("Channel created:");

    // Add creator as channel admin
    eventBus.emit('channel:add_member', {
      channelId: event.payload.channelId,
      userId: event.payload.createdBy,
      role: 'admin',
    }, { category: 'data' });

    // Send welcome message
    eventBus.emit('message:send_system', {
      channelId: event.payload.channelId,
      content: `Welcome to ${event.payload.name}! 🎉`,
      type: 'system',
    }, { category: 'system' });
  }

  // UI event handlers
  private async onModalOpened(event: MeridianEvent<UIEvents['ui:modal_opened']>): Promise<void> {
    if (event.type !== 'ui:modal_opened') return;

    logger.info("Modal opened:");

    // Track modal usage analytics
    eventBus.emit('analytics:ui_interaction', {
      type: 'modal_opened',
      modalId: event.payload.modalId,
      timestamp: event.payload.timestamp,
    }, { category: 'system' });
  }

  private async onThemeChanged(event: MeridianEvent<UIEvents['ui:theme_changed']>): Promise<void> {
    if (event.type !== 'ui:theme_changed') return;

    logger.info("Theme changed:");

    // Save user preference
    eventBus.emit('user:save_preference', {
      key: 'theme',
      value: event.payload.toTheme,
    }, { category: 'data' });

    // Apply theme to all components
    eventBus.emit('ui:apply_theme', {
      theme: event.payload.toTheme,
    }, { category: 'ui' });
  }

  private async onPageViewed(event: MeridianEvent<UIEvents['ui:page_viewed']>): Promise<void> {
    if (event.type !== 'ui:page_viewed') return;

    logger.info("Page viewed:");

    // Track page view analytics
    eventBus.emit('analytics:page_view', {
      path: event.payload.path,
      title: event.payload.title,
      timestamp: event.payload.timestamp,
    }, { category: 'system' });

    // Update user's last active page
    eventBus.emit('user:update_last_page', {
      path: event.payload.path,
      timestamp: event.payload.timestamp,
    }, { category: 'data' });
  }

  // System event handlers
  private async onSystemError(event: MeridianEvent<SystemEvents['system:error']>): Promise<void> {
    if (event.type !== 'system:error') return;

    console.error('System error:', event.payload);

    // Send error to monitoring service
    eventBus.emit('monitoring:send_error', {
      error: event.payload.error,
      context: event.payload.context,
      severity: event.payload.severity,
    }, { category: 'system' });

    // Show user notification for critical errors
    if (event.payload.severity === 'critical') {
      eventBus.emit('notification:show', {
        type: 'error',
        title: 'System Error',
        message: 'A critical error occurred. Please refresh the page.',
        persistent: true,
      }, { category: 'ui' });
    }
  }

  private async onPerformanceWarning(event: MeridianEvent<SystemEvents['system:performance_warning']>): Promise<void> {
    if (event.type !== 'system:performance_warning') return;

    console.warn('Performance warning:', event.payload);

    // Log performance issue
    eventBus.emit('monitoring:performance_issue', {
      metric: event.payload.metric,
      value: event.payload.value,
      threshold: event.payload.threshold,
      timestamp: event.payload.timestamp,
    }, { category: 'system' });

    // Trigger performance optimization
    eventBus.emit('performance:optimize', {
      metric: event.payload.metric,
      value: event.payload.value,
    }, { category: 'system' });
  }

  private async onConnectionLost(event: MeridianEvent<SystemEvents['system:connection_lost']>): Promise<void> {
    if (event.type !== 'system:connection_lost') return;

    console.warn('Connection lost:', event.payload);

    // Show offline notification
    eventBus.emit('notification:show', {
      type: 'warning',
      title: 'Connection Lost',
      message: 'Attempting to reconnect...',
      persistent: true,
    }, { category: 'ui' });

    // Enable offline mode
    eventBus.emit('offline:enable', {
      timestamp: event.payload.timestamp,
    }, { category: 'system' });
  }

  private async onCacheInvalidated(event: MeridianEvent<SystemEvents['system:cache_invalidated']>): Promise<void> {
    if (event.type !== 'system:cache_invalidated') return;

    logger.info("Cache invalidated:");

    // Refresh affected data
    eventBus.emit('data:refresh', {
      cacheKey: event.payload.cacheKey,
      reason: event.payload.reason,
    }, { category: 'data' });
  }

  // Cleanup method
  destroy(): void {
    for (const listenerIds of this.registeredListeners.values()) {
      listenerIds.forEach(id => eventBus.off(id));
    }
    this.registeredListeners.clear();
  }
}

// Export factory function
export function createEventListeners(store: any): EventListenerRegistry {
  return new EventListenerRegistry(store);
}

// Export default
export default EventListenerRegistry;