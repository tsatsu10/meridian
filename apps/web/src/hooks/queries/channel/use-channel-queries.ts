// @epic-4.1-direct-messaging: Channel query hooks with React Query integration
// @persona-sarah: PM needs to efficiently load and cache channel data
// @persona-david: Team lead needs real-time channel information

import { useQuery } from '@tanstack/react-query';
import { 
  getChannels, 
  getChannel, 
  getChannelMembers,
  type Channel,
  type ChannelMember 
} from '@/fetchers/channel/channel-api';

// Get all channels for a workspace
export function useChannels(workspaceId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['channels', workspaceId],
    queryFn: () => getChannels(workspaceId),
    enabled: Boolean(workspaceId) && (options?.enabled !== false),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute - channels don't change frequently
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Get a single channel by ID
export function useChannel(channelId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['channel', channelId],
    queryFn: () => getChannel(channelId),
    enabled: Boolean(channelId) && (options?.enabled !== false),
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes - individual channel data is quite stable
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Get channel members
export function useChannelMembers(channelId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['channel-members', channelId],
    queryFn: () => getChannelMembers(channelId),
    enabled: Boolean(channelId) && (options?.enabled !== false),
    staleTime: 45000, // 45 seconds
    refetchInterval: 120000, // 2 minutes - membership changes less frequently
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Combined hook for channel with its members (useful for channel management UI)
export function useChannelWithMembers(channelId: string, options?: { enabled?: boolean }) {
  const channelQuery = useChannel(channelId, options);
  const membersQuery = useChannelMembers(channelId, { 
    enabled: options?.enabled !== false && Boolean(channelId) 
  });

  return {
    channel: channelQuery.data,
    members: membersQuery.data,
    isLoading: channelQuery.isLoading || membersQuery.isLoading,
    isError: channelQuery.isError || membersQuery.isError,
    error: channelQuery.error || membersQuery.error,
    refetch: () => {
      channelQuery.refetch();
      membersQuery.refetch();
    },
  };
}

// Helper hook to get channels grouped by type
export function useChannelsByType(workspaceId: string, options?: { enabled?: boolean }) {
  const channelsQuery = useChannels(workspaceId, options);

  const channelsByType = channelsQuery.data?.reduce((acc, channel) => {
    const type = channel.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(channel);
    return acc;
  }, {} as Record<Channel['type'], Channel[]>);

  return {
    ...channelsQuery,
    channelsByType,
    publicChannels: channelsByType?.team?.filter(ch => !ch.isPrivate) || [],
    privateChannels: channelsByType?.private || channelsByType?.team?.filter(ch => ch.isPrivate) || [],
    announcementChannels: channelsByType?.announcement || [],
    projectChannels: channelsByType?.project || [],
  };
}