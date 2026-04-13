/**
 * 💬 Communication Hook
 * 
 * React hook for managing communication with optimistic updates:
 * - Send messages with instant UI feedback
 * - Handle failures gracefully
 * - Sync with WebSocket
 * - Cache management
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCommunicationStore } from '@/stores/communication-store';
import { useUnifiedWebSocket } from '@/hooks/use-unified-websocket';
import { useAuth } from '@/hooks/use-auth';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

interface SendMessageData {
  channelId: string;
  content: string;
  messageType?: string;
  parentMessageId?: string;
  mentions?: string[];
  attachments?: any[];
}

export function useCommunication(channelId?: string) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  const queryClient = useQueryClient();
  
  const {
    messages,
    addMessage,
    addOptimisticMessage,
    confirmOptimisticMessage,
    failOptimisticMessage,
    setActiveChannel,
    markAsRead,
    addTypingUser,
    removeTypingUser,
  } = useCommunicationStore();

  const { socket, connectionState } = useUnifiedWebSocket({
    enabled: !!user?.email && !!workspace?.id,
    userEmail: user?.email || '',
    workspaceId: workspace?.id || '',
  });

  // Set active channel
  useEffect(() => {
    if (channelId) {
      setActiveChannel(channelId);
    }
  }, [channelId, setActiveChannel]);

  // Listen for new messages via WebSocket
  useEffect(() => {
    if (!socket || !connectionState.isConnected) return;

    const handleNewMessage = (message: any) => {
      addMessage(message.channelId, message);
      
      // Invalidate queries to sync with server
      queryClient.invalidateQueries({ 
        queryKey: ['messages', message.channelId] 
      });
    };

    const handleMessageUpdated = (message: any) => {
      addMessage(message.channelId, message);
    };

    const handleMessageDeleted = (data: { channelId: string; messageId: string }) => {
      useCommunicationStore.getState().deleteMessage(data.channelId, data.messageId);
    };

    const handleTyping = (data: { channelId: string; userEmail: string }) => {
      if (data.userEmail !== user?.email) {
        addTypingUser(data.channelId, data.userEmail);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
          removeTypingUser(data.channelId, data.userEmail);
        }, 3000);
      }
    };

    const handleStopTyping = (data: { channelId: string; userEmail: string }) => {
      removeTypingUser(data.channelId, data.userEmail);
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:message_updated', handleMessageUpdated);
    socket.on('chat:message_deleted', handleMessageDeleted);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:stop_typing', handleStopTyping);

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:message_updated', handleMessageUpdated);
      socket.off('chat:message_deleted', handleMessageDeleted);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:stop_typing', handleStopTyping);
    };
  }, [socket, connectionState.isConnected, user?.email, addMessage, queryClient]);

  // Send message with optimistic update
  const sendMessageMutation = useMutation({
    mutationFn: async (data: SendMessageData) => {
      const response = await fetch(`/api/messages/channel/${data.channelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: data.content,
          messageType: data.messageType,
          parentMessageId: data.parentMessageId,
          mentions: data.mentions,
          attachments: data.attachments,
          userEmail: user?.email,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      return response.json();
    },
    onMutate: async (data) => {
      // Add optimistic message
      const tempId = addOptimisticMessage(data.channelId, {
        content: data.content,
        messageType: data.messageType,
        parentMessageId: data.parentMessageId,
        mentions: data.mentions,
        attachments: data.attachments,
        userEmail: user?.email,
      });
      
      return { tempId };
    },
    onSuccess: (response, variables, context) => {
      // Confirm optimistic message with actual message from server
      if (context?.tempId && response.message) {
        confirmOptimisticMessage(context.tempId, response.message);
      }
      
      // Invalidate queries
      queryClient.invalidateQueries({ 
        queryKey: ['messages', variables.channelId] 
      });
    },
    onError: (error, variables, context) => {
      // Mark optimistic message as failed
      if (context?.tempId) {
        failOptimisticMessage(
          context.tempId,
          error instanceof Error ? error.message : 'Failed to send'
        );
      }
      
      toast({
        title: 'Message Failed',
        description: 'Failed to send message. Click to retry.',
        variant: 'destructive',
      });
    },
  });

  // Mark channel as read
  const markAsReadMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const response = await fetch(`/api/messages/channel/${channelId}/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user?.email,
        }),
      });
      return response.json();
    },
    onMutate: async (channelId) => {
      // Optimistically mark as read
      markAsRead(channelId);
    },
    onError: (error, channelId) => {
      // Revert on error (would need to fetch actual count)
      toast({
        title: 'Failed to mark as read',
        description: 'Could not update read status',
        variant: 'destructive',
      });
    },
  });

  return {
    // State
    messages: channelId ? messages[channelId] || [] : [],
    channels: Object.values(useCommunicationStore.getState().channels),
    unreadCount: channelId ? useCommunicationStore.getState().unreadCounts[channelId] || 0 : 0,
    
    // Actions
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    markAsRead: markAsReadMutation.mutate,
    
    // WebSocket status
    isConnected: connectionState.isConnected,
  };
}

