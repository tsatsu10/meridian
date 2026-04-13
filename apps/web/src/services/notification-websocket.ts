import { io, Socket } from 'socket.io-client';
import { useNotificationStore, createNotification, type Notification } from '@/store/notifications';
import { WS_URL } from '@/constants/urls';
import { logger } from "../lib/logger";
import { buildChatDeeplink } from "@/lib/chat-deeplink";

interface NotificationWebSocketService {
  socket: Socket | null;
  isConnected: boolean;
  connect: (userEmail: string, workspaceId: string) => void;
  disconnect: () => void;
  sendNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'isPinned' | 'createdAt'>) => void;
  markAsReadOnServer: (notificationId: string) => void;
  deleteOnServer: (notificationId: string) => void;
}

class NotificationWebSocketManager implements NotificationWebSocketService {
  public socket: Socket | null = null;
  public isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 1000;
  private getSessionToken(): string | undefined {
    const localStorageToken = localStorage.getItem('sessionToken');
    if (localStorageToken) return localStorageToken.trim();
    const sessionCookie = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('session='));
    return sessionCookie ? sessionCookie.split('=')[1]?.trim() : undefined;
  }

  connect(userEmail: string, workspaceId: string): void {
    if (this.socket?.connected) {
      this.disconnect();
    }

    try {
      const token = this.getSessionToken();
      if (!token) {
        logger.warn('Notification WebSocket skipped: missing session token');
        return;
      }
      this.socket = io(WS_URL, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval,
        timeout: 10000,
        auth: {
          token,
          service: 'notifications'
        },
        query: { workspaceId },
        withCredentials: true,
      });

      this.setupEventHandlers();
      this.setupNotificationHandlers();
    } catch (error) {
      logger.error('Failed to initialize notification WebSocket', { error });
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
    }
  }

  sendNotification(notification: Omit<Notification, 'id' | 'isRead' | 'isPinned' | 'createdAt'>): void {
    if (this.socket?.connected) {
      this.socket.emit('notification:send', notification);
    }
  }

  markAsReadOnServer(notificationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('notification:mark_read', { notificationId });
    }
  }

  deleteOnServer(notificationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('notification:delete', { notificationId });
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info("📱 Notification WebSocket connected");
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      logger.info("📱 Notification WebSocket disconnected:");

      if (reason === 'io server disconnect') {
        // Server-side disconnect, attempt to reconnect
        this.attemptReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      logger.error('Notification WebSocket connection error', { error });
      this.attemptReconnection();
    });

    // Workspace and user management
    this.socket.on('user:joined_workspace', (data: { userEmail: string; workspaceId: string }) => {
      logger.info("📱 User joined workspace for notifications:");
    });

    this.socket.on('user:left_workspace', (data: { userEmail: string; workspaceId: string }) => {
      logger.info("📱 User left workspace for notifications:");
    });
  }

  private setupNotificationHandlers(): void {
    if (!this.socket) return;

    const notificationStore = useNotificationStore.getState();

    // Incoming notification
    this.socket.on('notification:new', (data: {
      notification: Notification;
      targetUsers?: string[];
    }) => {
      logger.info("📱 New notification received:");

      // Add notification to store
      notificationStore.addNotification(data.notification);

      // Show browser notification if permission is granted
      this.showBrowserNotification(data.notification);

      // Play notification sound (optional)
      this.playNotificationSound();
    });

    // Notification marked as read by another client/session
    this.socket.on('notification:marked_read', (data: { notificationId: string; userId: string }) => {
      logger.info("📱 Notification marked as read:");
      notificationStore.markAsRead(data.notificationId);
    });

    // Notification deleted by another client/session
    this.socket.on('notification:deleted', (data: { notificationId: string; userId: string }) => {
      logger.info("📱 Notification deleted:");
      notificationStore.deleteNotification(data.notificationId);
    });

    // Bulk notification update (e.g., mark all as read)
    this.socket.on('notification:bulk_update', (data: {
      action: 'mark_all_read' | 'clear_all';
      userId: string;
      workspaceId?: string;
    }) => {
      logger.info("📱 Bulk notification update:");

      switch (data.action) {
        case 'mark_all_read':
          notificationStore.markAllAsRead();
          break;
        case 'clear_all':
          notificationStore.clearAll();
          break;
      }
    });

    // Real-time activity that should generate notifications
    this.socket.on('activity:task_assigned', (data: any) => {
      if (data.assigneeEmail) {
        const notification = createNotification(
          'task_assigned',
          'Task Assigned',
          `You have been assigned to "${data.taskTitle}"`,
          {
            userId: data.assigneeId,
            workspaceId: data.workspaceId,
            priority: 'medium',
            data: {
              taskId: data.taskId,
              projectId: data.projectId,
              assignerId: data.assignerId
            }
          }
        );

        this.sendNotification(notification);
      }
    });

    this.socket.on('activity:comment_added', (data: any) => {
      // Generate notifications for task assignee and participants
      const notification = createNotification(
        'comment_added',
        'New Comment',
        `${data.authorName} commented on "${data.taskTitle}"`,
        {
          userId: data.targetUserId,
          workspaceId: data.workspaceId,
          priority: 'low',
          data: {
            taskId: data.taskId,
            projectId: data.projectId,
            messageId: data.commentId
          }
        }
      );

      this.sendNotification(notification);
    });

    this.socket.on('activity:mention', (data: any) => {
      const notification = createNotification(
        'mention',
        'You were mentioned',
        `${data.authorName} mentioned you in "${data.context}"`,
        {
          userId: data.mentionedUserId,
          workspaceId: data.workspaceId,
          priority: 'high',
          data: {
            taskId: data.taskId,
            projectId: data.projectId,
            messageId: data.messageId,
            channelId: data.channelId
          }
        }
      );

      this.sendNotification(notification);
    });

    this.socket.on('activity:project_update', (data: any) => {
      const notification = createNotification(
        'project_update',
        'Project Updated',
        `Project "${data.projectName}" has been updated`,
        {
          userId: data.targetUserId,
          workspaceId: data.workspaceId,
          priority: 'medium',
          data: {
            projectId: data.projectId
          }
        }
      );

      this.sendNotification(notification);
    });

    // Message notifications
    this.socket.on('message:direct', (data: any) => {
      const notification = createNotification(
        'message',
        'New Direct Message',
        `${data.senderName}: ${data.content.substring(0, 100)}${data.content.length > 100 ? '...' : ''}`,
        {
          userId: data.recipientId,
          workspaceId: data.workspaceId,
          priority: 'medium',
          data: {
            messageId: data.messageId,
            channelId: data.conversationId
          }
        }
      );

      this.sendNotification(notification);
    });

    this.socket.on('message:channel', (data: any) => {
      // Only notify if user is mentioned or it's an important channel
      if (data.mentions?.includes(data.targetUserId) || data.channelPriority === 'high') {
        const notification = createNotification(
          'message',
          `New message in #${data.channelName}`,
          `${data.senderName}: ${data.content.substring(0, 100)}${data.content.length > 100 ? '...' : ''}`,
          {
            userId: data.targetUserId,
            workspaceId: data.workspaceId,
            priority: data.mentions?.includes(data.targetUserId) ? 'high' : 'low',
            data: {
              messageId: data.messageId,
              channelId: data.channelId
            }
          }
        );

        this.sendNotification(notification);
      }
    });
  }

  private attemptReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.info("📱 Attempting to reconnect notification WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})");

      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          this.socket.connect();
        }
      }, this.reconnectInterval * this.reconnectAttempts);
    } else {
      logger.error('Max reconnection attempts reached for notification WebSocket');
    }
  }

  private showBrowserNotification(notification: Notification): void {
    // Check if browser notifications are supported and permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      const { preferences } = useNotificationStore.getState();

      // Check user preferences
      if (!preferences.push) return;

      // Check quiet hours
      if (preferences.quietHours.enabled) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        if (currentTime >= preferences.quietHours.start || currentTime <= preferences.quietHours.end) {
          return; // Don't show notifications during quiet hours
        }
      }

      // Check notification type preferences
      const typePreferences = {
        'task_assigned': preferences.taskAssignments,
        'task_updated': preferences.taskUpdates,
        'comment_added': preferences.comments,
        'mention': preferences.mentions,
        'project_update': preferences.projectUpdates,
        'message': preferences.directMessages || preferences.channelMessages,
        'system': true
      };

      if (!typePreferences[notification.type as keyof typeof typePreferences]) {
        return;
      }

      try {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/meridian-logomark.png',
          badge: '/meridian-logomark.png',
          tag: notification.id,
          requireInteraction: notification.priority === 'urgent',
          silent: notification.priority === 'low'
        });

        // Handle click to navigate to relevant page
        browserNotification.onclick = () => {
          window.focus();
          if (notification.data?.taskId) {
            window.location.href = `/dashboard/workspace/${notification.workspaceId}/project/${notification.data.projectId}/task/${notification.data.taskId}`;
          } else if (notification.data?.projectId) {
            window.location.href = `/dashboard/workspace/${notification.workspaceId}/project/${notification.data.projectId}`;
          } else if (notification.data?.channelId) {
            window.location.href = buildChatDeeplink({
              channelId: notification.data.channelId,
              messageId: notification.data.messageId,
            });
          }
          browserNotification.close();
        };

        // Auto-close after 5 seconds for non-urgent notifications
        if (notification.priority !== 'urgent') {
          setTimeout(() => browserNotification.close(), 5000);
        }
      } catch (error) {
        logger.error('Failed to show browser notification', { error });
      }
    }
  }

  private playNotificationSound(): void {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore audio play errors (user interaction required)
      });
    } catch (error) {
      // Ignore audio errors
    }
  }
}

// Export singleton instance
export const notificationWebSocket = new NotificationWebSocketManager();

// Hook for using notification WebSocket in components
export function useNotificationWebSocket() {
  return {
    connect: notificationWebSocket.connect.bind(notificationWebSocket),
    disconnect: notificationWebSocket.disconnect.bind(notificationWebSocket),
    isConnected: notificationWebSocket.isConnected,
    sendNotification: notificationWebSocket.sendNotification.bind(notificationWebSocket),
    markAsReadOnServer: notificationWebSocket.markAsReadOnServer.bind(notificationWebSocket),
    deleteOnServer: notificationWebSocket.deleteOnServer.bind(notificationWebSocket)
  };
}

// Request notification permission helper
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'default') {
    return await Notification.requestPermission();
  }

  return Notification.permission;
}