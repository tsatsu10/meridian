import { useQuery } from '@tanstack/react-query';
import { SettingsAPI } from '@/lib/api/settings-api';
import { useAuth } from '@/components/providers/unified-context-provider';
import useWorkspaceStore from '@/store/workspace';

export function useNotificationPreferences() {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  return useQuery([
    'notificationPreferences',
    user?.id,
    workspace?.id,
  ], async () => {
    if (!user?.id) throw new Error('No user');
    return await SettingsAPI.getNotificationPreferences(user.id, workspace?.id);
  }, {
    enabled: !!user?.id,
  });
} 