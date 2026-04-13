// Phase 2: Team Collaboration Hub - Team Notifications & Mentions Hooks
// React hooks for notification and mention system

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from '@/lib/toast';
import { fetchApi } from "@/lib/fetch";
import { useTeamWebSocket } from "./use-team-websocket";
import { useEffect, useCallback } from "react";
import { logger } from "../lib/logger";
import { buildChatDeeplink } from "@/lib/chat-deeplink";

// Types
export interface TeamNotification {
  id: string;
  userEmail: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, any>;
  isRead: boolean;
  priority: "low" | "medium" | "high";
  createdAt: string;
  readAt?: string;
}

export interface CreateMentionData {
  messageId: string;
  mentionedEmails: string[];
  mentionContext?: string;
  priority?: "low" | "medium" | "high";
}

export interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: TeamNotification[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    unreadCount: number;
  };
}

export interface SystemNotificationData {
  targetUserEmail: string;
  title: string;
  message: string;
  type?: string;
  priority?: "low" | "medium" | "high";
  metadata?: Record<string, any>;
}

// Hook for creating mention notifications
export function useCreateMentions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMentionData) => {
      const response = await fetchApi("/team/notifications/mention", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate notifications to refresh the list
      queryClient.invalidateQueries({ queryKey: ["team-notifications"] });
    },
    onError: (error: unknown) => {
      logger.error("Failed to create mentions", { error });
      toast.error("Failed to create mention notifications");
    },
  });
}

// Hook for getting team notifications
export function useTeamNotifications(
  options: {
    limit?: number;
    offset?: number;
    type?: "mention" | "team" | "all";
    read?: "true" | "false" | "all";
    enabled?: boolean;
  } = {}
) {
  const { limit = 50, offset = 0, type = "all", read = "all", enabled = true } = options;

  return useQuery({
    queryKey: ["team-notifications", { limit, offset, type, read }],
    queryFn: async (): Promise<NotificationsResponse> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        type,
        read,
      });
      
      const response = await fetchApi(`/team/notifications/team?${params}`);
      return response;
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook for marking notifications as read
export function useMarkNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const response = await fetchApi("/team/notifications/read", {
        method: "PUT",
        body: JSON.stringify({ notificationIds }),
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate notifications to refresh read status
      queryClient.invalidateQueries({ queryKey: ["team-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
    },
    onError: (error: any) => {
      console.error("Failed to mark notifications as read:", error);
      toast.error("Failed to update notification status");
    },
  });
}

// Hook for sending system notifications
export function useSendSystemNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SystemNotificationData) => {
      const response = await fetchApi("/team/notifications/system", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-notifications"] });
      toast.success("System notification sent successfully");
    },
    onError: (error: any) => {
      console.error("Failed to send system notification:", error);
      toast.error("Failed to send system notification");
    },
  });
}

// Hook for unread notification count
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notification-count"],
    queryFn: async () => {
      const response = await fetchApi("/team/notifications/team?limit=1");
      return response.data.unreadCount;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

// Hook for real-time notification updates
export function useTeamNotificationsRealtime(userEmail?: string, workspaceId?: string) {
  const queryClient = useQueryClient();
  
  // WebSocket connection for real-time updates
  const { isConnected } = useTeamWebSocket(workspaceId || "", undefined, userEmail);

  // Handle real-time notification events
  useEffect(() => {
    if (!isConnected || !userEmail) return;

    const handleMentionCreated = (event: any) => {
      // Invalidate notifications to show new mention
      queryClient.invalidateQueries({ queryKey: ["team-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
      
      // Show toast notification for mentions
      toast.info(
        `@️⃣ You were mentioned`,
        {
          description: event.data.title,
          action: {
            label: "View",
            onClick: () => {
              // TODO: Navigate to the message/team where mention occurred
              logger.info("Navigate to mention:");
            },
          },
        }
      );
    };

    const handleSystemNotification = (event: any) => {
      // Invalidate notifications to show new notification
      queryClient.invalidateQueries({ queryKey: ["team-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
      
      // Show toast for system notifications based on priority
      const message = `${event.data.title}: ${event.data.message}`;

      switch (event.data.priority) {
        case "high":
          toast.error(message);
          break;
        case "medium":
          toast.info(message);
          break;
        default:
          toast(message);
          break;
      }
    };

    // TODO: Add actual WebSocket event listeners when WebSocket integration is complete
    // For now, we'll use periodic polling as fallback
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["team-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [isConnected, userEmail, queryClient]);

  return {
    isConnected,
  };
}

// Hook for mention utilities
export function useMentionUtils() {
  const createMentions = useCreateMentions();

  // Extract mentions from text content
  const extractMentions = useCallback((content: string): string[] => {
    const mentionRegex = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      if (!mentions.includes(match[1])) {
        mentions.push(match[1]);
      }
    }
    
    return mentions;
  }, []);

  // Process mentions in message content
  const processMentions = useCallback(async (
    messageId: string, 
    content: string, 
    context?: string
  ) => {
    const mentions = extractMentions(content);
    
    if (mentions.length > 0) {
      try {
        await createMentions.mutateAsync({
          messageId,
          mentionedEmails: mentions,
          mentionContext: context,
          priority: "medium",
        });
      } catch (error) {
        console.error("Failed to process mentions:", error);
      }
    }
    
    return mentions;
  }, [createMentions, extractMentions]);

  // Format text with mention highlighting
  const formatTextWithMentions = useCallback((
    content: string, 
    currentUserEmail?: string
  ): any => {
    const mentionRegex = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const parts = content.split(mentionRegex);
    
    // Return a render function instead of JSX directly
    return parts.map((part, index) => {
      // Check if this part is a mention (odd indices after split)
      if (index % 2 === 1) {
        const isCurrentUser = part === currentUserEmail;
        return {
          type: 'mention',
          key: index,
          content: `@${part}`,
          isCurrentUser,
          className: isCurrentUser
            ? "bg-blue-100 text-blue-800 border border-blue-200"
            : "bg-gray-100 text-gray-800 border border-gray-200"
        };
      }
      return {
        type: 'text',
        key: index,
        content: part
      };
    });
  }, []);

  return {
    extractMentions,
    processMentions,
    formatTextWithMentions,
    isProcessing: createMentions.isPending,
  };
}

// Hook for notification management shortcuts
export function useNotificationManager() {
  const markAsRead = useMarkNotificationsAsRead();
  const sendSystemNotification = useSendSystemNotification();

  // TODO: Navigate to the message/team where mention occurred
  const handleNotificationClick = (notification: TeamNotification & {
    teamId?: string;
    projectId?: string;
    taskId?: string;
  }) => {
    const meta = notification.metadata ?? {};
    const channelId =
      typeof meta.channelId === "string" ? meta.channelId : undefined;
    const messageId =
      typeof meta.messageId === "string" ? meta.messageId : undefined;

    if (notification.type === 'mention') {
      // Navigate to the specific message or team context
      if (notification.teamId) {
        // Navigate to team dashboard
        window.location.href = `/dashboard/teams?team=${notification.teamId}`;
      } else if (messageId && channelId) {
        window.location.href = buildChatDeeplink({ channelId, messageId });
      } else if (messageId) {
        window.location.href = buildChatDeeplink({ messageId });
      } else if (notification.projectId) {
        // Navigate to project context
        window.location.href = `/dashboard/projects/${notification.projectId}`;
      }
    } else if (notification.type === 'team_update') {
      // Navigate to team settings or dashboard
      if (notification.teamId) {
        window.location.href = `/dashboard/teams?team=${notification.teamId}`;
      }
    } else if (notification.type === 'task_assignment') {
      // Navigate to task details
      if (notification.taskId) {
        window.location.href = `/dashboard/tasks/${notification.taskId}`;
      }
    }
    
    // Mark notification as read
    markAsRead.mutate(notification.id);
  };

  return {
    markAllAsRead: async (notifications: TeamNotification[]) => {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      if (unreadIds.length > 0) {
        await markAsRead.mutateAsync(unreadIds);
      }
    },

    markAsRead: (notificationIds: string[]) => 
      markAsRead.mutate(notificationIds),

    sendWelcomeNotification: (userEmail: string, teamName: string) =>
      sendSystemNotification.mutate({
        targetUserEmail: userEmail,
        title: "Welcome to the team!",
        message: `You've been added to ${teamName}. Start collaborating with your teammates.`,
        type: "welcome",
        priority: "medium",
        metadata: { teamName },
      }),

    sendTaskAssignmentNotification: (userEmail: string, taskTitle: string, assignedBy: string) =>
      sendSystemNotification.mutate({
        targetUserEmail: userEmail,
        title: "New task assigned",
        message: `${assignedBy} assigned you a new task: "${taskTitle}"`,
        type: "task_assignment",
        priority: "high",
        metadata: { taskTitle, assignedBy },
      }),

    sendDeadlineReminder: (userEmail: string, taskTitle: string, dueDate: string) =>
      sendSystemNotification.mutate({
        targetUserEmail: userEmail,
        title: "Task deadline approaching",
        message: `"${taskTitle}" is due on ${dueDate}`,
        type: "deadline_reminder",
        priority: "high",
        metadata: { taskTitle, dueDate },
      }),

    isProcessing: markAsRead.isPending || sendSystemNotification.isPending,
  };
}