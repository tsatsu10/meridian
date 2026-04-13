/**
 * Notifications System - Barrel Export
 * Re-exports notification functionality for use in tests and other modules
 */

// Re-export notification route
export { default as notificationsRoute } from '../notification/index';

// Re-export notification controllers
export { default as createNotification } from '../notification/controllers/create-notification';
export { default as getNotifications } from '../notification/controllers/get-notifications';
export { default as markNotificationAsRead } from '../notification/controllers/mark-notification-as-read';

// Re-export notification services
export { NotificationDeliveryService } from '../notification/services/notification-delivery';
export type { NotificationPayload, DeliveryResult } from '../notification/services/notification-delivery';

// Mock notification service interface for tests
export const notificationService = {
  send: async (payload: any) => {
    const { createNotification } = await import('../notification/controllers/create-notification');
    return createNotification(payload);
  },
  
  getForUser: async (userEmail: string, options?: any) => {
    const { default: getNotifications } = await import('../notification/controllers/get-notifications');
    return getNotifications(userEmail, options || {});
  },
  
  markAsRead: async (id: string) => {
    const { default: markNotificationAsRead } = await import('../notification/controllers/mark-notification-as-read');
    return markNotificationAsRead(id);
  },

  clearAll: async (userEmail: string) => {
    // Mock implementation
    return { success: true };
  }
};

// Notification types for tests
export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  TASK_OVERDUE = 'task_overdue',
  COMMENT_MENTION = 'comment_mention',
  COMMENT_REPLY = 'comment_reply',
  PROJECT_UPDATE = 'project_update',
  DEADLINE_APPROACHING = 'deadline_approaching',
  KUDOS_RECEIVED = 'kudos_received',
  DIGEST = 'digest',
  CUSTOM = 'custom',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
}

// Notification configuration
export interface NotificationConfig {
  enabled: boolean;
  channels: string[];
  digestEnabled: boolean;
  digestFrequency: string;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export function createNotificationMiddleware(config?: Partial<NotificationConfig>) {
  return async (c: any, next: any) => {
    // Placeholder middleware
    await next();
  };
}


