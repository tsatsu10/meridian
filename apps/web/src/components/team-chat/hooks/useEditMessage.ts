// useEditMessage - Hook for editing messages with real API

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/fetch';
import { toast } from 'sonner';

interface EditMessageParams {
  messageId: string;
  content: string;
}

interface EditMessageResponse {
  success: boolean;
  data: {
    id: string;
    content: string;
    isEdited: boolean;
    editedAt: string;
    updatedAt: string;
  };
}

/**
 * Hook for editing team messages
 * 
 * @param teamId - Team identifier
 * @returns Mutation for editing messages
 */
export function useEditMessage(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, content }: EditMessageParams) => {
      const response = await fetchApi(`/team/${teamId}/messages/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      });
      return response as EditMessageResponse;
    },
    
    onSuccess: (data, { messageId }) => {
      // Invalidate all queries for this team's messages to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['team-messages', teamId] });
      
      toast.success('Message updated');
    },
    
    onError: (error: any) => {
      console.error('Failed to edit message:', error);
      toast.error(error.message || 'Failed to update message');
    },
  });
}

