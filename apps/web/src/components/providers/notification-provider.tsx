import React, { useEffect, createContext, useContext } from 'react';
import { useAuth } from './unified-context-provider';
import useWorkspaceStore from '@/store/workspace';
import { useNotificationStore } from '@/store/notifications';
import { notificationWebSocket, useNotificationWebSocket, requestNotificationPermission } from '@/services/notification-websocket';
import { toast } from 'sonner';
import { logger } from "../../lib/logger";

interface NotificationContextType {
  isConnected: boolean;
  sendNotification: (notification: any) => void;
  markAsReadOnServer: (notificationId: string) => void;
  deleteOnServer: (notificationId: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  isConnected: false,
  sendNotification: () => {},
  markAsReadOnServer: () => {},
  deleteOnServer: () => {},
});

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  const { preferences } = useNotificationStore();
  const notificationWebSocketService = useNotificationWebSocket();

  // Initialize WebSocket connection when user and workspace are available
  useEffect(() => {
    if (user?.email && workspace?.id) {
      logger.info("🔔 Initializing notification WebSocket for:");
      notificationWebSocketService.connect(user.email, workspace.id);

      return () => {
        logger.info("🔔 Disconnecting notification WebSocket");
        notificationWebSocketService.disconnect();
      };
    }
  }, [user?.email, workspace?.id, notificationWebSocketService]);

  // Request browser notification permission on first load
  useEffect(() => {
    if (preferences.push && 'Notification' in window) {
      requestNotificationPermission().then(permission => {
        if (permission === 'granted') {
          logger.info("🔔 Browser notifications enabled");
        } else if (permission === 'denied') {
          logger.info("🔔 Browser notifications denied");
          toast.warning('Browser notifications are disabled. You can enable them in your browser settings.');
        }
      });
    }
  }, [preferences.push]);

  // Sync notification store actions with server
  const { markAsRead, deleteNotification, clearAll } = useNotificationStore();

  const handleMarkAsRead = (notificationId: string) => {
    // Update local state immediately for responsive UI
    markAsRead(notificationId);
    // Sync with server
    notificationWebSocketService.markAsReadOnServer(notificationId);
  };

  const handleDeleteNotification = (notificationId: string) => {
    // Update local state immediately for responsive UI
    deleteNotification(notificationId);
    // Sync with server
    notificationWebSocketService.deleteOnServer(notificationId);
  };

  const contextValue: NotificationContextType = {
    isConnected: notificationWebSocketService.isConnected,
    sendNotification: notificationWebSocketService.sendNotification,
    markAsReadOnServer: handleMarkAsRead,
    deleteOnServer: handleDeleteNotification,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook for components to easily create notifications for specific actions
export function useCreateNotification() {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  const { sendNotification } = useNotificationContext();

  const createTaskNotification = (type: 'assigned' | 'updated' | 'completed', data: {
    taskId: string;
    taskTitle: string;
    assigneeEmail?: string;
    assignerId?: string;
    projectId?: string;
  }) => {
    const notification = {
      userId: data.assigneeEmail || user?.email || '',
      workspaceId: workspace?.id || '',
      type: `task_${type}` as const,
      title: type === 'assigned' ? 'Task Assigned' : type === 'updated' ? 'Task Updated' : 'Task Completed',
      message: type === 'assigned'
        ? `You have been assigned to "${data.taskTitle}"`
        : type === 'updated'
        ? `Task "${data.taskTitle}" has been updated`
        : `Task "${data.taskTitle}" has been completed`,
      data: {
        taskId: data.taskId,
        projectId: data.projectId,
        assignerId: data.assignerId
      },
      priority: type === 'assigned' ? 'medium' : 'low' as const,
    };

    sendNotification(notification);
  };

  const createCommentNotification = (data: {
    taskId: string;
    taskTitle: string;
    commentAuthor: string;
    targetUserEmail: string;
    projectId?: string;
  }) => {
    const notification = {
      userId: data.targetUserEmail,
      workspaceId: workspace?.id || '',
      type: 'comment_added' as const,
      title: 'New Comment',
      message: `${data.commentAuthor} commented on "${data.taskTitle}"`,
      data: {
        taskId: data.taskId,
        projectId: data.projectId,
      },
      priority: 'low' as const,
    };

    sendNotification(notification);
  };

  const createMentionNotification = (data: {
    mentionedUserEmail: string;
    mentionAuthor: string;
    context: string;
    taskId?: string;
    projectId?: string;
    channelId?: string;
    messageId?: string;
  }) => {
    const notification = {
      userId: data.mentionedUserEmail,
      workspaceId: workspace?.id || '',
      type: 'mention' as const,
      title: 'You were mentioned',
      message: `${data.mentionAuthor} mentioned you in "${data.context}"`,
      data: {
        taskId: data.taskId,
        projectId: data.projectId,
        channelId: data.channelId,
        messageId: data.messageId,
      },
      priority: 'high' as const,
    };

    sendNotification(notification);
  };

  const createProjectNotification = (type: 'created' | 'updated', data: {
    projectId: string;
    projectName: string;
    targetUserEmails: string[];
  }) => {
    data.targetUserEmails.forEach(email => {
      const notification = {
        userId: email,
        workspaceId: workspace?.id || '',
        type: 'project_update' as const,
        title: type === 'created' ? 'New Project Created' : 'Project Updated',
        message: type === 'created'
          ? `Project "${data.projectName}" has been created`
          : `Project "${data.projectName}" has been updated`,
        data: {
          projectId: data.projectId,
        },
        priority: 'medium' as const,
      };

      sendNotification(notification);
    });
  };

  const createMessageNotification = (data: {
    type: 'direct' | 'channel';
    senderName: string;
    recipientEmail?: string;
    channelName?: string;
    content: string;
    messageId: string;
    channelId?: string;
    conversationId?: string;
  }) => {
    if (data.type === 'direct' && data.recipientEmail) {
      const notification = {
        userId: data.recipientEmail,
        workspaceId: workspace?.id || '',
        type: 'message' as const,
        title: 'New Direct Message',
        message: `${data.senderName}: ${data.content.substring(0, 100)}${data.content.length > 100 ? '...' : ''}`,
        data: {
          messageId: data.messageId,
          channelId: data.conversationId,
        },
        priority: 'medium' as const,
      };

      sendNotification(notification);
    }
  };

  return {
    createTaskNotification,
    createCommentNotification,
    createMentionNotification,
    createProjectNotification,
    createMessageNotification,
  };
}
