// @epic-3.6-communication: Send message mutation
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import { API_BASE_URL } from '@/constants/urls';

export interface SendMessageData {
  channelId: string;
  content: string;
  messageType?: string;
  referencedTaskId?: string;
}

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: SendMessageData) => {
      const response = await fetch(`${API_BASE_URL}/message/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          userEmail: user?.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate messages query to refetch
      queryClient.invalidateQueries({ queryKey: ['messages', variables.channelId] });
      // Also invalidate conversations to update last message
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

