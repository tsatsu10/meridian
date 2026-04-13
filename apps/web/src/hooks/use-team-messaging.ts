// Phase 2: Team Collaboration Hub - Team Messaging Hooks
// React hooks for team messaging functionality

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from '@/lib/toast';
import { fetchApi } from "@/lib/fetch";
import { useTeamWebSocket } from "./use-team-websocket";
import { useCallback, useEffect, useState } from "react";
import { logger } from "../lib/logger";

// Types
export interface TeamMessage {
  id: string;
  teamId: string;
  userEmail: string;
  content: string;
  messageType: "text" | "file" | "announcement";
  mentions: string[];
  metadata: Record<string, any>;
  isReadBy: string[];
  replyTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageData {
  content: string;
  messageType?: "text" | "file" | "announcement";
  mentions?: string[];
  metadata?: Record<string, any>;
  replyTo?: string;
}

export interface MessagesResponse {
  success: boolean;
  data: {
    messages: TeamMessage[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

// Hook for sending team messages
export function useSendTeamMessage(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SendMessageData) => {
      const response = await fetchApi(`/team/${teamId}/messages`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (response) => {
      // Invalidate messages query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["team-messages", teamId] });
      
      // Log activity
      queryClient.invalidateQueries({ queryKey: ["team-activities", teamId] });
      
      toast.success("Message sent successfully");
    },
    onError: (error: any) => {
      console.error("Failed to send message:", error);
      toast.error(error.message || "Failed to send message");
    },
  });
}

// Hook for sending team announcements
export function useSendTeamAnnouncement(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<SendMessageData, "messageType">) => {
      const response = await fetchApi(`/team/${teamId}/broadcast`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-messages", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-activities", teamId] });
      toast.success("Team announcement sent successfully");
    },
    onError: (error: any) => {
      console.error("Failed to send announcement:", error);
      toast.error(error.message || "Failed to send announcement");
    },
  });
}

// Hook for getting team messages
export function useTeamMessages(
  teamId: string,
  options: {
    limit?: number;
    offset?: number;
    messageType?: "text" | "file" | "announcement" | "all";
    enabled?: boolean;
  } = {}
) {
  const { limit = 50, offset = 0, messageType = "all", enabled = true } = options;

  return useQuery({
    queryKey: ["team-messages", teamId, { limit, offset, messageType }],
    queryFn: async (): Promise<MessagesResponse> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        messageType,
      });
      
      const response = await fetchApi(`/team/${teamId}/messages?${params}`);
      return response;
    },
    enabled: enabled && !!teamId,
    staleTime: 0, // Always refetch to get latest messages
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus (too aggressive)
  });
}

// Hook for marking messages as read
export function useMarkMessagesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageIds: string[]) => {
      const response = await fetchApi("/team/messages/read", {
        method: "PUT",
        body: JSON.stringify({ messageIds }),
      });
      return response;
    },
    onSuccess: (_, messageIds) => {
      // Invalidate all team messages queries to update read status
      queryClient.invalidateQueries({ queryKey: ["team-messages"] });
      
      logger.info("Marked ${messageIds.length} messages as read");
    },
    onError: (error: any) => {
      console.error("Failed to mark messages as read:", error);
      toast.error("Failed to update read status");
    },
  });
}

// Hook for real-time team messaging with WebSocket integration
export function useTeamMessagingRealtime(teamId: string, workspaceId: string, userEmail?: string) {
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // WebSocket connection for real-time updates
  const { isConnected, connectionState } = useTeamWebSocket(workspaceId || "", teamId, userEmail);

  // Handle real-time message events
  useEffect(() => {
    if (!isConnected || !teamId) return;

    const handleNewMessage = (event: any) => {
      if (event.data.teamId === teamId) {
        // Invalidate messages to show new message
        queryClient.invalidateQueries({ queryKey: ["team-messages", teamId] });
        
        // Show notification for other users' messages
        if (event.data.userEmail !== userEmail) {
          const isAnnouncement = event.data.messageType === "announcement";
          toast.info(
            isAnnouncement 
              ? `📢 Team announcement from ${event.data.userEmail}`
              : `💬 New message from ${event.data.userEmail}`,
            {
              description: event.data.content.substring(0, 100) + "...",
            }
          );
        }
      }
    };

    const handleTyping = (event: any) => {
      if (event.data.teamId === teamId && event.data.userEmail !== userEmail) {
        setTypingUsers(prev => {
          if (!prev.includes(event.data.userEmail)) {
            return [...prev, event.data.userEmail];
          }
          return prev;
        });
        
        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(user => user !== event.data.userEmail));
        }, 3000);
      }
    };

    const handleStopTyping = (event: any) => {
      if (event.data.teamId === teamId) {
        setTypingUsers(prev => prev.filter(user => user !== event.data.userEmail));
      }
    };

    const handleMessageDelivered = (event: any) => {
      // Update read status in cache
      queryClient.invalidateQueries({ queryKey: ["team-messages", teamId] });
    };

    // TODO: Add actual WebSocket event listeners when WebSocket integration is complete
    // For now, we'll use periodic polling as fallback
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["team-messages", teamId] });
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [isConnected, teamId, userEmail, queryClient]);

  // Function to send typing indicator
  const sendTypingIndicator = useCallback((typing: boolean) => {
    setIsTyping(typing);
    // TODO: Emit typing event via WebSocket
    // wsConnection?.emit("typing", { teamId, userEmail, isTyping: typing });
  }, [teamId, userEmail]);

  return {
    typingUsers,
    isTyping,
    sendTypingIndicator,
    isConnected,
    connectionState,
  };
}

// Hook for team message analytics
export function useTeamMessageAnalytics(teamId: string) {
  return useQuery({
    queryKey: ["team-message-analytics", teamId],
    queryFn: async () => {
      // This would be a separate analytics endpoint
      const response = await fetchApi(`/team/${teamId}/analytics`);
      return response.data;
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}