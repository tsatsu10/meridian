// @epic-4.1-direct-messaging: Hook for opening direct message conversations from anywhere
// @persona-sarah: PM needs quick access to team member DMs from various pages
// @persona-david: Team lead needs instant communication with team members

import { useNavigate } from '@tanstack/react-router';
import { useGetOrCreateConversation } from './use-direct-messaging';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import useWorkspaceStore from '@/store/workspace';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export function useOpenDirectMessage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  const getOrCreateConversation = useGetOrCreateConversation();

  /**
   * Opens a direct message conversation with a specific user
   * @param targetUserEmail - Email of the user to message
   * @param targetUserName - Optional name for better UX feedback
   */
  const openDirectMessage = async (targetUserEmail: string, targetUserName?: string) => {
    if (!user?.email || !workspace?.id) {
      toast.error('Please log in to send messages');
      return;
    }

    if (targetUserEmail === user.email) {
      toast.error('Cannot message yourself');
      return;
    }

    try {
      // Show loading toast
      const loadingToast = toast.loading(
        `Opening conversation${targetUserName ? ` with ${targetUserName}` : ''}...`
      );

      // Get or create the conversation
      const result = await getOrCreateConversation.mutateAsync({
        userEmail: user.email,
        targetUserEmail,
        workspaceId: workspace.id,
      });

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      const chatId = result.id ?? result.channelId;
      if (chatId) {
        navigate({
          to: '/dashboard/chat',
          search: { channel: chatId, message: undefined, userId: undefined },
        });

        toast.success(
          `Opening conversation${targetUserName ? ` with ${targetUserName}` : ''}`
        );
      } else {
        throw new Error('Failed to get conversation ID');
      }
    } catch (error) {
      logger.error('Failed to open direct message', { error });
      toast.error(
        `Failed to open conversation${targetUserName ? ` with ${targetUserName}` : ''}. Please try again.`
      );
    }
  };

  return {
    openDirectMessage,
    isLoading: getOrCreateConversation.isPending,
  };
}

