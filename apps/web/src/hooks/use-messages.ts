import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";

export interface Message {
  id: string;
  content: string;
  messageType: 'text' | 'file' | 'system' | 'thread_reply';
  parentMessageId?: string;
  mentions?: string;
  reactions?: string;
  attachments?: string;
  isEdited: boolean;
  editedAt?: Date;
  isPinned?: boolean;
  createdAt: Date;
  userEmail: string;
  userName?: string;
}

export interface SendMessageData {
  content: string;
  messageType?: string;
  parentMessageId?: string;
  mentions?: string[];
  attachments?: any[];
}

export interface MessageReaction {
  emoji: string;
  users: string[];
}

// @epic-3.6-communication: Hook for fetching messages in a channel
export function useMessages(channelId: string, options?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["messages", channelId, options?.limit, options?.offset],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (options?.limit) searchParams.set("limit", options.limit.toString());
      if (options?.offset) searchParams.set("offset", options.offset.toString());
      
      const url = `/message/${channelId}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      const response = await fetchApi(url);
      return response.messages as Message[];
    },
    enabled: !!channelId,
  });
}

// @epic-3.6-communication: Hook for sending a new message
export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ channelId, ...messageData }: { channelId: string } & SendMessageData) => {
      return fetchApi(`/message/${channelId}`, {
        method: "POST",
        body: JSON.stringify(messageData),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: (_data, variables) => {
      // Invalidate messages query to refetch
      queryClient.invalidateQueries({ 
        queryKey: ["messages", variables.channelId] 
      });
    },
  });
}

// @epic-3.6-communication: Hook for editing a message
export function useEditMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      return fetchApi(`/message/${messageId}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      // Invalidate messages queries
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

// @epic-3.6-communication: Hook for deleting a message
export function useDeleteMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (messageId: string) => {
      return fetchApi(`/message/${messageId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      // Invalidate messages queries
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

// @epic-3.6-communication: Hook for adding/removing reactions
export function useMessageReaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      return fetchApi(`/message/${messageId}/reaction`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      // Invalidate messages queries to update reactions
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

// Export alias for compatibility with ChatInterface
export const useAddReaction = useMessageReaction;

// @epic-3.6-communication: Hook for pinning/unpinning messages
export function usePinMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (messageId: string) => {
      return fetchApi(`/message/${messageId}/pin`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      // Invalidate messages queries to update pin status
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["pinnedMessages"] });
    },
  });
}

// @epic-3.6-communication: Hook for fetching pinned messages
export function usePinnedMessages(channelId: string) {
  return useQuery({
    queryKey: ["pinnedMessages", channelId],
    queryFn: async () => {
      const response = await fetchApi(`/message/${channelId}/pinned`);
      return response.pinnedMessages as Message[];
    },
    enabled: !!channelId,
  });
} 