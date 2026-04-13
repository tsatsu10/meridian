// useDeleteMessage - Hook for deleting messages with real API

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/fetch';
import { toast } from 'sonner';

/**
 * Hook for deleting team messages
 * 
 * @param teamId - Team identifier
 * @returns Mutation for deleting messages
 */
export function useDeleteMessage(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const response = await fetchApi(`/team/${teamId}/messages/${messageId}`, {
        method: 'DELETE',
      });
      return response;
    },
    
    onSuccess: (_, messageId) => {
      // Invalidate all queries for this team's messages to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['team-messages', teamId] });
      
      toast.success('Message deleted');
    },
    
    onError: (error: any) => {
      console.error('Failed to delete message:', error);
      toast.error(error.message || 'Failed to delete message');
    },
  });
}

