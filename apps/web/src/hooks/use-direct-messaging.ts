// @epic-4.1-direct-messaging: Direct messaging hooks with React Query integration
// @persona-sarah: PM needs direct communication with team members
// @persona-david: Team lead needs private conversations with team members

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnifiedWebSocket } from './useUnifiedWebSocket';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import useWorkspaceStore from '@/store/workspace';
import { logger } from '@/lib/logger';
import {
  getDirectMessageConversations,
  getOrCreateConversation,
  getDirectMessageHistory,
  getOnlineUsers,
  getUserPresence,
  searchUsersForDirectMessage,
  sendDirectMessage,
  markDirectMessagesAsRead,
  archiveDirectMessageConversation,
  deleteDirectMessage,
  editDirectMessage,
  updateUserPresence,
  type DirectMessageConversation,
  type DirectMessage,
  type UserPresence,
  type SendDirectMessageData,
  type MarkAsReadData,
} from '@/fetchers/direct-messaging';

// @epic-4.1-direct-messaging: Hook for managing direct message conversations
export function useDirectMessageConversations() {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();

  return useQuery({
    queryKey: ['direct-message-conversations', user?.email, workspace?.id],
    queryFn: () => getDirectMessageConversations(user?.email || '', workspace?.id || ''),
    enabled: Boolean(user?.email && workspace?.id),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
}

// @epic-4.1-direct-messaging: Hook for getting or creating a conversation
export function useGetOrCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userEmail, targetUserEmail, workspaceId }: {
      userEmail: string;
      targetUserEmail: string;
      workspaceId: string;
    }) => getOrCreateConversation(userEmail, targetUserEmail, workspaceId),
    onSuccess: () => {
      // Invalidate conversations list
      queryClient.invalidateQueries({ queryKey: ['direct-message-conversations'] });
    },
  });
}

// @epic-4.1-direct-messaging: Hook for getting message history
export function useDirectMessageHistory(conversationId: string, options?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['direct-message-history', conversationId, options?.limit, options?.offset],
    queryFn: () => getDirectMessageHistory(conversationId, options?.limit, options?.offset),
    enabled: Boolean(conversationId),
    staleTime: 10000, // 10 seconds
  });
}

// @epic-4.1-direct-messaging: Hook for online users
export function useOnlineUsers() {
  const { workspace } = useWorkspaceStore();

  return useQuery({
    queryKey: ['online-users', workspace?.id],
    queryFn: () => getOnlineUsers(workspace?.id || ''),
    enabled: Boolean(workspace?.id),
    staleTime: 15000, // 15 seconds
    refetchInterval: 30000, // 30 seconds
  });
}

// @epic-4.1-direct-messaging: Hook for user presence
export function useUserPresence(userEmail: string) {
  return useQuery({
    queryKey: ['user-presence', userEmail],
    queryFn: () => getUserPresence(userEmail),
    enabled: Boolean(userEmail),
    staleTime: 10000, // 10 seconds
    refetchInterval: 20000, // 20 seconds
  });
}

// @epic-4.1-direct-messaging: Hook for searching users
export function useSearchUsersForDirectMessage() {
  return useMutation({
    mutationFn: ({ query, workspaceId, excludeUserEmail }: {
      query: string;
      workspaceId: string;
      excludeUserEmail?: string;
    }) => searchUsersForDirectMessage(query, workspaceId, excludeUserEmail),
  });
}

// @epic-4.1-direct-messaging: Hook for sending direct messages
export function useSendDirectMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendDirectMessageData) => sendDirectMessage(data),
    onSuccess: (message, variables) => {
      // Invalidate message history for the conversation
      queryClient.invalidateQueries({ queryKey: ['direct-message-history', variables.conversationId] });
      // Invalidate conversations list to update last message
      queryClient.invalidateQueries({ queryKey: ['direct-message-conversations'] });
    },
  });
}

// @epic-4.1-direct-messaging: Hook for marking messages as read
export function useMarkDirectMessagesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MarkAsReadData) => markDirectMessagesAsRead(data),
    onSuccess: (_, variables) => {
      // Invalidate conversations to update unread counts
      queryClient.invalidateQueries({ queryKey: ['direct-message-conversations'] });
    },
  });
}

// @epic-4.1-direct-messaging: Hook for archiving conversations
export function useArchiveDirectMessageConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, userEmail }: { conversationId: string; userEmail: string }) =>
      archiveDirectMessageConversation(conversationId, userEmail),
    onSuccess: () => {
      // Invalidate conversations list
      queryClient.invalidateQueries({ queryKey: ['direct-message-conversations'] });
    },
  });
}

// @epic-4.1-direct-messaging: Hook for deleting messages
export function useDeleteDirectMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, userEmail }: { messageId: string; userEmail: string }) =>
      deleteDirectMessage(messageId, userEmail),
    onSuccess: () => {
      // Invalidate all message-related queries
      queryClient.invalidateQueries({ queryKey: ['direct-message-history'] });
      queryClient.invalidateQueries({ queryKey: ['direct-message-conversations'] });
    },
  });
}

// @epic-4.1-direct-messaging: Hook for editing messages
export function useEditDirectMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, content, userEmail }: { messageId: string; content: string; userEmail: string }) =>
      editDirectMessage(messageId, content, userEmail),
    onSuccess: () => {
      // Invalidate message history
      queryClient.invalidateQueries({ queryKey: ['direct-message-history'] });
    },
  });
}

// @epic-4.1-direct-messaging: Hook for updating presence
export function useUpdateUserPresence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userEmail, status, currentPage }: {
      userEmail: string;
      status: 'online' | 'away' | 'busy';
      currentPage?: string;
    }) => updateUserPresence(userEmail, status, currentPage),
    onSuccess: (_, variables) => {
      // Invalidate user presence queries
      queryClient.invalidateQueries({ queryKey: ['user-presence', variables.userEmail] });
      queryClient.invalidateQueries({ queryKey: ['online-users'] });
    },
  });
}

// @epic-4.1-direct-messaging: Comprehensive direct messaging hook with WebSocket integration
export function useDirectMessaging() {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  const queryClient = useQueryClient();

  // WebSocket connection for real-time messaging
  const unifiedWS = useUnifiedWebSocket({
    userEmail: user?.email || '',
    workspaceId: workspace?.id || '',
    enabled: Boolean(user?.email && workspace?.id),
    onMessage: (message) => {
      // Handle incoming direct messages
      if (message.type === 'direct_message') {// Update message history cache
        if (message.channelId) {
          queryClient.invalidateQueries({ queryKey: ['direct-message-history'] });
        }
        
        // Update conversations cache
        queryClient.invalidateQueries({ queryKey: ['direct-message-conversations'] });
      }
    },
    onConnect: () => {},
    onDisconnect: () => {},
    onError: (error) => {
      logger.error('Direct messaging WebSocket error', { error });
    }
  });

  // API hooks
  const conversations = useDirectMessageConversations();
  const onlineUsers = useOnlineUsers();
  const sendMessage = useSendDirectMessage();
  const markAsRead = useMarkDirectMessagesAsRead();
  const archiveConversation = useArchiveDirectMessageConversation();
  const deleteMessage = useDeleteDirectMessage();
  const editMessage = useEditDirectMessage();
  const updatePresence = useUpdateUserPresence();
  const searchUsers = useSearchUsersForDirectMessage();
  const getOrCreateConversation = useGetOrCreateConversation();

  // Send direct message with WebSocket integration
  const sendDirectMessage = async (conversationId: string, content: string, options?: {
    messageType?: 'text' | 'file' | 'system';
    attachments?: string[];
    parentMessageId?: string;
  }) => {
    try {
      // Persist via API only. DM websocket events are not fully supported server-side.
      await sendMessage.mutateAsync({
        conversationId,
        content,
        messageType: options?.messageType || 'text',
        attachments: options?.attachments,
        parentMessageId: options?.parentMessageId,
      });
    } catch (error) {
      logger.error('Failed to send direct message', { error });
      throw error;
    }
  };

  // Mark conversation as read
  const markConversationAsRead = async (conversationId: string) => {
    if (!user?.email) return;
    
    try {
      await markAsRead.mutateAsync({
        conversationId,
        userEmail: user.email,
      });
    } catch (error) {
      logger.error('Failed to mark conversation as read', { error });
    }
  };

  return {
    // Data
    conversations: conversations.data || [],
    onlineUsers: onlineUsers.data || [],
    isLoading: conversations.isLoading || onlineUsers.isLoading,
    error: conversations.error || onlineUsers.error,
    
    // Connection state
    isConnected: unifiedWS.connectionState.isConnected,
    connectionState: unifiedWS.connectionState,
    
    // Actions
    sendDirectMessage,
    markConversationAsRead,
    archiveConversation: archiveConversation.mutateAsync,
    deleteMessage: deleteMessage.mutateAsync,
    editMessage: editMessage.mutateAsync,
    updatePresence: updatePresence.mutateAsync,
    searchUsers: searchUsers.mutateAsync,
    getOrCreateConversation: getOrCreateConversation.mutateAsync,
    
    // Individual hooks for specific use cases
    useDirectMessageHistory,
    useUserPresence,
    
    // Mutation states
    isSending: sendMessage.isPending,
    isMarkingRead: markAsRead.isPending,
    isArchiving: archiveConversation.isPending,
    isDeleting: deleteMessage.isPending,
    isEditing: editMessage.isPending,
    isUpdatingPresence: updatePresence.isPending,
    isSearching: searchUsers.isPending,
    isCreatingConversation: getOrCreateConversation.isPending,
  };
} 