// @epic-4.1-direct-messaging: Channel unread counts hook
// @persona-sarah: PM needs to see unread messages to stay updated
// @persona-david: Team lead needs unread indicators for team management

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/fetch';

export interface ChannelUnreadCount {
  channelId: string;
  unreadCount: number;
  lastReadAt: string | null;
}

// Hook to get unread counts for all channels in a workspace
export function useChannelUnreadCounts(workspaceId: string) {
  return useQuery({
    queryKey: ['channel-unread-counts', workspaceId],
    queryFn: async () => {
      try {
        const response = await fetchApi(`/channel/${workspaceId}/unread-counts`);
        return (response.unreadCounts as ChannelUnreadCount[]) || [];
      } catch (error) {
        console.error('Failed to fetch channel unread counts:', error);
        return [];
      }
    },
    enabled: !!workspaceId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
}

// Hook to get unread count for a specific channel
export function useChannelUnreadCount(channelId: string) {
  return useQuery({
    queryKey: ['channel-unread-count', channelId],
    queryFn: async () => {
      try {
        const response = await fetchApi(`/channel/channel/${channelId}/unread-count`);
        return response.unreadCount as number || 0;
      } catch (error) {
        console.error('Failed to fetch channel unread count:', error);
        return 0;
      }
    },
    enabled: !!channelId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
}

// Hook to mark messages as read in a channel
export function useMarkChannelAsRead() {
  const queryClient = useQueryClient();
  
  return async (channelId: string) => {
    try {
      await fetchApi(`/channel/channel/${channelId}/mark-read`, {
        method: 'POST',
      });
      
      // Invalidate unread counts to refresh them
      queryClient.invalidateQueries({ queryKey: ['channel-unread-counts'] });
      queryClient.invalidateQueries({ queryKey: ['channel-unread-count', channelId] });
      
      return channelId;
    } catch (error) {
      console.error('Failed to mark channel as read:', error);
      throw error;
    }
  };
}