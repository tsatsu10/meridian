import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private';
  memberCount: number;
  unreadCount?: number;
  lastMessage?: {
    content: string;
    timestamp: string;
    userId: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CreateChannelParams {
  name: string;
  description?: string;
  isPrivate: boolean;
  workspaceId: string;
}

interface UpdateChannelParams {
  id: string;
  name?: string;
  description?: string;
  isPrivate?: boolean;
}

export const useChannels = (workspaceId?: string) => {
  const queryClient = useQueryClient();

  // Query key for channels
  const queryKey = ['channels', workspaceId];

  // Fetch channels
  const { data: channels, isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<Channel[]> => {
      if (!workspaceId) {
        return [];
      }

      // TODO: Replace with actual API call
      // For now, return mock data
      return [
        {
          id: '1',
          name: 'general',
          description: 'General discussion for the team',
          type: 'public' as const,
          memberCount: 12,
          unreadCount: 3,
          lastMessage: {
            content: 'Great work everyone!',
            timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
            userId: 'user1'
          },
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 1 week ago
          updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString()
        },
        {
          id: '2',
          name: 'announcements',
          description: 'Important announcements and updates',
          type: 'public' as const,
          memberCount: 12,
          lastMessage: {
            content: 'New feature release coming next week!',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
            userId: 'user2'
          },
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), // 2 weeks ago
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
        },
        {
          id: '3',
          name: 'random',
          description: 'Random conversations and fun stuff',
          type: 'public' as const,
          memberCount: 8,
          lastMessage: {
            content: 'Anyone up for a game night?',
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
            userId: 'user3'
          },
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
          updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        },
        {
          id: '4',
          name: 'project-alpha',
          description: 'Discussion for Project Alpha',
          type: 'private' as const,
          memberCount: 5,
          unreadCount: 1,
          lastMessage: {
            content: 'Meeting scheduled for tomorrow',
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
            userId: 'user1'
          },
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
          updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
        }
      ];
    },
    enabled: !!workspaceId,
    staleTime: 0, // Always fetch fresh channels
    refetchOnMount: 'always', // Refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: async (params: CreateChannelParams): Promise<Channel> => {
      // TODO: Replace with actual API call
      const newChannel: Channel = {
        id: `channel_${Date.now()}`,
        name: params.name,
        description: params.description,
        type: params.isPrivate ? 'private' : 'public',
        memberCount: 1, // Creator is automatically added
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      return newChannel;
    },
    onSuccess: (newChannel) => {
      // Optimistically update the channels list
      queryClient.setQueryData(queryKey, (oldChannels: Channel[] = []) => {
        return [...oldChannels, newChannel];
      });

      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error('Failed to create channel:', error);
      // TODO: Show error toast
    }
  });

  // Create channel function
  const createChannel = async (params: CreateChannelParams) => {
    return createChannelMutation.mutateAsync(params);
  };

  // Update channel mutation
  const updateChannelMutation = useMutation({
    mutationFn: async (params: UpdateChannelParams): Promise<Channel> => {
      // TODO: Replace with actual API call
      const updatedChannel: Channel = {
        id: params.id,
        name: params.name || 'unknown',
        description: params.description,
        type: params.isPrivate ? 'private' : 'public',
        memberCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return updatedChannel;
    },
    onSuccess: (updatedChannel) => {
      // Update the channel in the list
      queryClient.setQueryData(queryKey, (oldChannels: Channel[] = []) => {
        return oldChannels.map(channel => 
          channel.id === updatedChannel.id ? updatedChannel : channel
        );
      });

      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error('Failed to update channel:', error);
      // TODO: Show error toast
    }
  });

  // Update channel function
  const updateChannel = async (params: UpdateChannelParams) => {
    return updateChannelMutation.mutateAsync(params);
  };

  // Delete channel mutation
  const deleteChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return channelId;
    },
    onSuccess: (channelId) => {
      // Remove the channel from the list
      queryClient.setQueryData(queryKey, (oldChannels: Channel[] = []) => {
        return oldChannels.filter(channel => channel.id !== channelId);
      });

      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error('Failed to delete channel:', error);
      // TODO: Show error toast
    }
  });

  // Delete channel function
  const deleteChannel = async (channelId: string) => {
    return deleteChannelMutation.mutateAsync(channelId);
  };

  // Join channel mutation
  const joinChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));
      return channelId;
    },
    onSuccess: (channelId) => {
      // Update the member count for the channel
      queryClient.setQueryData(queryKey, (oldChannels: Channel[] = []) => {
        return oldChannels.map(channel => 
          channel.id === channelId 
            ? { ...channel, memberCount: channel.memberCount + 1 }
            : channel
        );
      });
    }
  });

  // Join channel function
  const joinChannel = async (channelId: string) => {
    return joinChannelMutation.mutateAsync(channelId);
  };

  // Leave channel mutation
  const leaveChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));
      return channelId;
    },
    onSuccess: (channelId) => {
      // Update the member count for the channel
      queryClient.setQueryData(queryKey, (oldChannels: Channel[] = []) => {
        return oldChannels.map(channel => 
          channel.id === channelId 
            ? { ...channel, memberCount: Math.max(0, channel.memberCount - 1) }
            : channel
        );
      });
    }
  });

  // Leave channel function
  const leaveChannel = async (channelId: string) => {
    return leaveChannelMutation.mutateAsync(channelId);
  };

  return {
    // Query data
    data: channels,
    isLoading,
    error,
    
    // Mutations
    createChannel,
    updateChannel,
    deleteChannel,
    joinChannel,
    leaveChannel,
    
    // Mutation states
    isCreating: createChannelMutation.isPending,
    isUpdating: updateChannelMutation.isPending,
    isDeleting: deleteChannelMutation.isPending,
    isJoining: joinChannelMutation.isPending,
    isLeaving: leaveChannelMutation.isPending
  };
}; 