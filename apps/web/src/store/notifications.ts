import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Notification {
  id: string;
  userId: string;
  workspaceId: string;
  type: 'task_assigned' | 'task_updated' | 'comment_added' | 'mention' | 'project_update' | 'message' | 'system';
  title: string;
  message: string;
  data?: {
    taskId?: string;
    projectId?: string;
    messageId?: string;
    channelId?: string;
    assignerId?: string;
    targetType?: string;
    targetId?: string;
  };
  isRead: boolean;
  isPinned: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  taskAssignments: boolean;
  taskUpdates: boolean;
  comments: boolean;
  mentions: boolean;
  projectUpdates: boolean;
  directMessages: boolean;
  channelMessages: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  isLoading: boolean;
  error: string | null;
  lastFetch: string | null;

  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearAll: () => void;
  pinNotification: (notificationId: string) => void;
  unpinNotification: (notificationId: string) => void;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed getters
  getUnreadNotifications: () => Notification[];
  getPinnedNotifications: () => Notification[];
  getNotificationsByType: (type: Notification['type']) => Notification[];
  getNotificationsByPriority: (priority: Notification['priority']) => Notification[];
}

const defaultPreferences: NotificationPreferences = {
  email: true,
  push: true,
  inApp: true,
  taskAssignments: true,
  taskUpdates: true,
  comments: true,
  mentions: true,
  projectUpdates: true,
  directMessages: true,
  channelMessages: false,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
};

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      preferences: defaultPreferences,
      isLoading: false,
      error: null,
      lastFetch: null,

      setNotifications: (notifications) => {
        const unreadCount = notifications.filter(n => !n.isRead).length;
        set({
          notifications: notifications.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ),
          unreadCount,
          lastFetch: new Date().toISOString()
        });
      },

      addNotification: (notification) => {
        const state = get();
        const existingIndex = state.notifications.findIndex(n => n.id === notification.id);

        let newNotifications;
        if (existingIndex >= 0) {
          // Update existing notification
          newNotifications = [...state.notifications];
          newNotifications[existingIndex] = notification;
        } else {
          // Add new notification at the beginning
          newNotifications = [notification, ...state.notifications];
        }

        const unreadCount = newNotifications.filter(n => !n.isRead).length;

        set({
          notifications: newNotifications,
          unreadCount
        });
      },

      markAsRead: (notificationId) => {
        const state = get();
        const updatedNotifications = state.notifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true, readAt: new Date().toISOString() }
            : notification
        );
        const unreadCount = updatedNotifications.filter(n => !n.isRead).length;

        set({
          notifications: updatedNotifications,
          unreadCount
        });
      },

      markAllAsRead: () => {
        const state = get();
        const now = new Date().toISOString();
        const updatedNotifications = state.notifications.map(notification =>
          ({ ...notification, isRead: true, readAt: now })
        );

        set({
          notifications: updatedNotifications,
          unreadCount: 0
        });
      },

      deleteNotification: (notificationId) => {
        const state = get();
        const updatedNotifications = state.notifications.filter(n => n.id !== notificationId);
        const unreadCount = updatedNotifications.filter(n => !n.isRead).length;

        set({
          notifications: updatedNotifications,
          unreadCount
        });
      },

      clearAll: () => {
        set({
          notifications: [],
          unreadCount: 0
        });
      },

      pinNotification: (notificationId) => {
        const state = get();
        const updatedNotifications = state.notifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, isPinned: true }
            : notification
        );

        set({ notifications: updatedNotifications });
      },

      unpinNotification: (notificationId) => {
        const state = get();
        const updatedNotifications = state.notifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, isPinned: false }
            : notification
        );

        set({ notifications: updatedNotifications });
      },

      updatePreferences: (newPreferences) => {
        const state = get();
        set({
          preferences: { ...state.preferences, ...newPreferences }
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      // Computed getters
      getUnreadNotifications: () => {
        return get().notifications.filter(n => !n.isRead);
      },

      getPinnedNotifications: () => {
        return get().notifications.filter(n => n.isPinned);
      },

      getNotificationsByType: (type) => {
        return get().notifications.filter(n => n.type === type);
      },

      getNotificationsByPriority: (priority) => {
        return get().notifications.filter(n => n.priority === priority);
      }
    }),
    {
      name: 'notification-store',
    }
  )
);

// Helper functions for notification utilities
export const createNotification = (
  type: Notification['type'],
  title: string,
  message: string,
  options?: {
    userId?: string;
    workspaceId?: string;
    priority?: Notification['priority'];
    data?: Notification['data'];
    expiresAt?: string;
  }
): Omit<Notification, 'id' | 'isRead' | 'isPinned' | 'createdAt'> => ({
  userId: options?.userId || '',
  workspaceId: options?.workspaceId || '',
  type,
  title,
  message,
  data: options?.data,
  priority: options?.priority || 'medium',
  expiresAt: options?.expiresAt,
});

// Notification type helpers
export const getNotificationIcon = (type: Notification['type']): string => {
  switch (type) {
    case 'task_assigned': return '👤';
    case 'task_updated': return '📝';
    case 'comment_added': return '💬';
    case 'mention': return '@';
    case 'project_update': return '📊';
    case 'message': return '💌';
    case 'system': return '⚙️';
    default: return '📢';
  }
};

export const getNotificationColor = (priority: Notification['priority']): string => {
  switch (priority) {
    case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};