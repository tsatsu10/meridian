// Chat Context Provider
// Provides chat state and actions to all child components

import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import { chatReducer, initialChatState } from './chatReducer';
import { useTeamMessages, useSendTeamMessage, useSendTeamAnnouncement, useTeamMessagingRealtime } from '@/hooks/use-team-messaging';
import { useEditMessage, useDeleteMessage, useAddReaction, useRemoveReaction } from '../hooks';
import { toast } from 'sonner';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import type { ChatContextValue, ChatState, TeamMessage, NotificationState, ConnectionStatus } from '../types';
import useWorkspaceStore from '@/store/workspace';

const ChatContext = createContext<ChatContextValue | null>(null);

interface ChatProviderProps {
  children: React.ReactNode;
  teamId: string;
  teamName: string;
  initialState?: Partial<ChatState>;
}

export function ChatProvider({ children, teamId, teamName, initialState: customInitialState }: ChatProviderProps) {
  const [state, dispatch] = useReducer(
    chatReducer,
    customInitialState ? { ...initialChatState, ...customInitialState } : initialChatState
  );

  // Get current user
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();

  // React Query hooks
  const messagesQuery = useTeamMessages(teamId, { limit: 50 });
  const sendMessageMutation = useSendTeamMessage(teamId);
  const sendAnnouncementMutation = useSendTeamAnnouncement(teamId);
  const editMessageMutation = useEditMessage(teamId);
  const deleteMessageMutation = useDeleteMessage(teamId);
  const addReactionMutation = useAddReaction(teamId);
  const removeReactionMutation = useRemoveReaction(teamId);

  const { connectionState: realtimeConnectionState } = useTeamMessagingRealtime(
    teamId,
    workspace?.id || '',
    user?.email
  );

  React.useEffect(() => {
    if (!realtimeConnectionState) return;

    let status: ConnectionStatus = 'disconnected';
    if (realtimeConnectionState.isConnected) {
      status = 'connected';
    } else if (realtimeConnectionState.isConnecting) {
      status = 'connecting';
    } else if (realtimeConnectionState.reconnectAttempts > 0) {
      status = 'reconnecting';
    }

    if (state.realtime.connectionStatus !== status) {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
    }
  }, [realtimeConnectionState, state.realtime.connectionStatus]);

  // Sync messages from query to state
  React.useEffect(() => {
    if (messagesQuery.data?.data?.messages) {
      dispatch({ type: 'SET_MESSAGES', payload: messagesQuery.data.data.messages });
      dispatch({ type: 'SET_HAS_MORE', payload: messagesQuery.data.data.pagination.hasMore });
    }
  }, [messagesQuery.data]);

  // Handle query loading and errors
  React.useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: messagesQuery.isLoading });
  }, [messagesQuery.isLoading]);

  React.useEffect(() => {
    if (messagesQuery.error) {
      const error = messagesQuery.error as Error;
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, [messagesQuery.error]);

  // Create optimistic message
  const createOptimisticMessage = useCallback((content: string, userEmail: string): TeamMessage => {
    return {
      id: `temp-${Date.now()}`,
      teamId,
      userId: 'temp',
      userEmail,
      content,
      messageType: state.composing.isAnnouncement ? 'announcement' : 'text',
      replyTo: state.composing.replyTo?.id,
      mentions: state.composing.mentions,
      metadata: state.composing.replyTo ? {
        replyToContent: state.composing.replyTo.content.substring(0, 100),
      } : undefined,
      isEdited: false,
      isDeleted: false,
      reactions: [],
      readBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [teamId, state.composing]);

  // Action creators
  const actions = useMemo(() => ({
    // ============ Message Operations ============
    
    sendMessage: async (content: string) => {
      const userEmail = user?.email;
      
      if (!userEmail) {
        toast.error('You must be logged in to send messages');
        return;
      }
      
      // Optimistic update
      const optimisticMessage = createOptimisticMessage(content, userEmail);
      dispatch({ type: 'ADD_MESSAGE', payload: optimisticMessage });
      dispatch({ type: 'RESET_COMPOSING' });

      try {
      const messageData = {
        content,
        messageType: state.composing.isAnnouncement ? 'announcement' as const : 'text' as const,
        replyTo: state.composing.replyTo?.id,
        mentions: state.composing.mentions,
        metadata: state.composing.replyTo ? {
          replyToContent: state.composing.replyTo.content.substring(0, 100),
          replyToAuthor: state.composing.replyTo.authorName || state.composing.replyTo.userEmail,
        } : {},
      };

        const result = state.composing.isAnnouncement
          ? await sendAnnouncementMutation.mutateAsync(messageData)
          : await sendMessageMutation.mutateAsync(messageData);

        // Replace optimistic message with real one
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            id: optimisticMessage.id,
            updates: result.data,
          },
        });
      } catch (error) {
        // Remove optimistic message on error
        dispatch({ type: 'DELETE_MESSAGE', payload: optimisticMessage.id });
        
        dispatch({
          type: 'SHOW_NOTIFICATION',
          payload: {
            type: 'error',
            message: 'Failed to send message',
            duration: 3000,
          },
        });
        
        throw error;
      }
    },

    editMessage: async (messageId: string, content: string) => {
      // Find original message for rollback
      const originalMessage = state.messages.find(m => m.id === messageId);
      
      // Optimistic update
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          id: messageId,
          updates: {
            content,
            isEdited: true,
            editedAt: new Date().toISOString(),
          },
        },
      });

      try {
        // Call real API
        await editMessageMutation.mutateAsync({ messageId, content });
        
        dispatch({ type: 'SET_EDITING_MESSAGE', payload: null });
        
        dispatch({
          type: 'SHOW_NOTIFICATION',
          payload: {
            type: 'success',
            message: 'Message updated',
            duration: 2000,
          },
        });
      } catch (error) {
        // Rollback on error
        if (originalMessage) {
          dispatch({
            type: 'UPDATE_MESSAGE',
            payload: { id: messageId, updates: originalMessage },
          });
        }
        
        dispatch({
          type: 'SHOW_NOTIFICATION',
          payload: {
            type: 'error',
            message: 'Failed to update message',
            duration: 3000,
          },
        });
        
        throw error;
      }
    },

    deleteMessage: async (messageId: string) => {
      // Find original for rollback
      const originalMessage = state.messages.find(m => m.id === messageId);
      
      // Optimistic delete
      dispatch({ type: 'DELETE_MESSAGE', payload: messageId });

      try {
        // Call real API
        await deleteMessageMutation.mutateAsync(messageId);
        
        dispatch({ type: 'SET_DELETING_MESSAGE', payload: null });
        
        dispatch({
          type: 'SHOW_NOTIFICATION',
          payload: {
            type: 'success',
            message: 'Message deleted',
            duration: 2000,
          },
        });
      } catch (error) {
        // Rollback on error
        if (originalMessage) {
          dispatch({ type: 'ADD_MESSAGE', payload: originalMessage });
        }
        
        dispatch({
          type: 'SHOW_NOTIFICATION',
          payload: {
            type: 'error',
            message: 'Failed to delete message',
            duration: 3000,
          },
        });
        
        throw error;
      }
    },

    addReaction: async (messageId: string, emoji: string) => {
      const userEmail = 'current@user.com'; // TODO: Get from auth
      
      // Optimistic update
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          id: messageId,
          updates: {
            reactions: [
              ...(state.messages.find(m => m.id === messageId)?.reactions || []),
              {
                id: `temp-${Date.now()}`,
                userId: 'temp',
                userEmail,
                emoji,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        },
      });

      try {
        // Call real API
        await addReactionMutation.mutateAsync({ messageId, emoji });
        
        dispatch({ type: 'SET_EMOJI_PICKER', payload: null });
      } catch (error) {
        // Rollback reaction on error
        const message = state.messages.find(m => m.id === messageId);
        if (message) {
          dispatch({
            type: 'UPDATE_MESSAGE',
            payload: {
              id: messageId,
              updates: { reactions: message.reactions },
            },
          });
        }
        toast.error('Failed to add reaction');
        throw error;
      }
    },

    removeReaction: async (messageId: string, emoji: string) => {
      const userEmail = 'current@user.com'; // TODO: Get from auth
      
      // Optimistic remove
      const message = state.messages.find(m => m.id === messageId);
      if (message) {
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            id: messageId,
            updates: {
              reactions: message.reactions.filter(
                r => !(r.userEmail === userEmail && r.emoji === emoji)
              ),
            },
          },
        });
      }

      try {
        // Call real API
        await removeReactionMutation.mutateAsync({ messageId, emoji });
      } catch (error) {
        // Rollback on error
        const message = state.messages.find(m => m.id === messageId);
        if (message) {
          dispatch({
            type: 'UPDATE_MESSAGE',
            payload: {
              id: messageId,
              updates: { reactions: message.reactions },
            },
          });
        }
        toast.error('Failed to remove reaction');
        throw error;
      }
    },

    loadMoreMessages: async () => {
      // TODO: Implement infinite scroll
      // const olderMessages = await fetchOlderMessages(offset);
      // dispatch({ type: 'PREPEND_MESSAGES', payload: olderMessages });
    },

    // ============ Composition Actions ============
    
    setComposingContent: (content: string) => {
      dispatch({ type: 'SET_COMPOSING_CONTENT', payload: content });
    },

    setReplyTo: (message: TeamMessage | null) => {
      dispatch({ type: 'SET_REPLY_TO', payload: message });
    },

    addFiles: (files: File[]) => {
      dispatch({ type: 'ADD_FILES', payload: files });
    },

    removeFile: (index: number) => {
      dispatch({ type: 'REMOVE_FILE', payload: index });
    },

    toggleAnnouncementMode: () => {
      dispatch({ type: 'TOGGLE_ANNOUNCEMENT_MODE' });
    },

    resetComposing: () => {
      dispatch({ type: 'RESET_COMPOSING' });
    },

    // ============ UI Actions ============
    
    startEditingMessage: (messageId: string, content: string) => {
      dispatch({ type: 'SET_EDITING_MESSAGE', payload: { id: messageId, content } });
    },

    cancelEditing: () => {
      dispatch({ type: 'SET_EDITING_MESSAGE', payload: null });
    },

    startDeletingMessage: (messageId: string) => {
      dispatch({ type: 'SET_DELETING_MESSAGE', payload: messageId });
    },

    cancelDeleting: () => {
      dispatch({ type: 'SET_DELETING_MESSAGE', payload: null });
    },

    showEmojiPicker: (messageId: string | null) => {
      dispatch({ type: 'SET_EMOJI_PICKER', payload: messageId });
    },

    showNotification: (notification: NotificationState) => {
      dispatch({ type: 'SHOW_NOTIFICATION', payload: notification });
      
      // Auto-clear notification after duration
      if (notification.duration) {
        setTimeout(() => {
          dispatch({ type: 'CLEAR_NOTIFICATION' });
        }, notification.duration);
      }
    },
  }), [state, teamId, user, sendMessageMutation, sendAnnouncementMutation, createOptimisticMessage, editMessageMutation, deleteMessageMutation, addReactionMutation, removeReactionMutation]);

  const value: ChatContextValue = {
    state,
    dispatch,
    actions,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * Hook to access chat context
 * Must be used within ChatProvider
 */
export function useChat() {
  const context = useContext(ChatContext);
  
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  
  return context;
}

/**
 * Hook to access only chat state (no actions)
 * Useful for read-only components
 */
export function useChatState() {
  const { state } = useChat();
  return state;
}

/**
 * Hook to access only chat actions (no state)
 * Useful to avoid unnecessary re-renders
 */
export function useChatActions() {
  const { actions } = useChat();
  return actions;
}

