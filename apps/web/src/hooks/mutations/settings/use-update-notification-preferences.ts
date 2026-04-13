import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsAPI } from '@/lib/api/settings-api';
import { useAuth } from '@/components/providers/unified-context-provider';
import useWorkspaceStore from '@/store/workspace';

export function useUpdateNotificationPreferences() {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (preferences: any) => {
      if (!user?.id) throw new Error('No user');
      return await SettingsAPI.updateNotificationPreferences(user.id, preferences, workspace?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        'notificationPreferences',
        user?.id,
        workspace?.id,
      ]);
    },
  });
} 