// useMessageReactions - Hooks for adding/removing reactions

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/fetch';
import { toast } from 'sonner';
import type { MessageReaction } from '../types';

interface AddReactionParams {
  messageId: string;
  emoji: string;
}

interface ReactionResponse {
  success: boolean;
  data: {
    reactions: MessageReaction[];
  };
}

/**
 * Hook for adding reactions to messages
 */
export function useAddReaction(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: AddReactionParams) => {
      const response = await fetchApi(`/team/${teamId}/messages/${messageId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });
      return response as ReactionResponse;
    },
    
    onSuccess: (data, { messageId }) => {
      // Update reactions in cache
      queryClient.setQueryData(
        ['team-messages', teamId],
        (old: any) => {
          if (!old?.data?.messages) return old;

          return {
            ...old,
            data: {
              ...old.data,
              messages: old.data.messages.map((msg: any) =>
                msg.id === messageId
                  ? { ...msg, reactions: data.data.reactions }
                  : msg
              ),
            },
          };
        }
      );
    },
    
    onError: (error: any) => {
      console.error('Failed to add reaction:', error);
      toast.error('Failed to add reaction');
    },
  });
}

/**
 * Hook for removing reactions from messages
 */
export function useRemoveReaction(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: AddReactionParams) => {
      const response = await fetchApi(
        `/team/${teamId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
        { method: 'DELETE' }
      );
      return response as ReactionResponse;
    },
    
    onSuccess: (data, { messageId }) => {
      // Update reactions in cache
      queryClient.setQueryData(
        ['team-messages', teamId],
        (old: any) => {
          if (!old?.data?.messages) return old;

          return {
            ...old,
            data: {
              ...old.data,
              messages: old.data.messages.map((msg: any) =>
                msg.id === messageId
                  ? { ...msg, reactions: data.data.reactions }
                  : msg
              ),
            },
          };
        }
      );
    },
    
    onError: (error: any) => {
      console.error('Failed to remove reaction:', error);
      toast.error('Failed to remove reaction');
    },
  });
}

