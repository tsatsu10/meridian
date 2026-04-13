// @epic-4.1-direct-messaging: Channel mutation hooks with React Query integration
// @persona-sarah: PM needs reactive channel management with real-time updates
// @persona-david: Team lead needs reliable channel operations with error handling

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from "../../../lib/logger";
import {
  createChannel,
  updateChannel,
  deleteChannel,
  joinChannel,
  leaveChannel,
  addChannelMember,
  removeChannelMember,
  type CreateChannelRequest,
  type UpdateChannelRequest,
  type Channel
} from '@/fetchers/channel/channel-api';

// Create channel mutation
export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateChannelRequest) => {
      logger.debug("🔍 Creating channel with data:");
      const result = await createChannel(data);
      logger.debug("🔍 Channel creation result:");
      return result;
    },
    onSuccess: (newChannel: Channel, variables: CreateChannelRequest) => {
      // Always use workspaceId from the original request variables
      const workspaceId = variables.workspaceId;
      
      if (!workspaceId) {
        console.warn('No workspaceId available for cache update');
        return;
      }

      // Invalidate and refetch channels list
      queryClient.invalidateQueries({ queryKey: ['channels', workspaceId] });
      
      // Optimistically add the new channel to the cache
      queryClient.setQueryData(['channels', workspaceId], (oldChannels: Channel[] = []) => {
        return [...oldChannels, newChannel];
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['channel-members'] });
      
      logger.info("✅ Channel cache updated successfully");
    },
    onError: (error) => {
      console.error('❌ Failed to create channel:', error);
    },
  });
}

// Update channel mutation
export function useUpdateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateChannelRequest) => updateChannel(data),
    onSuccess: (updatedChannel: Channel) => {
      // Update the specific channel in cache
      queryClient.setQueryData(['channel', updatedChannel.id], updatedChannel);
      
      // Update the channel in the channels list
      queryClient.setQueryData(['channels', updatedChannel.workspaceId], (oldChannels: Channel[] = []) => {
        return oldChannels.map(channel => 
          channel.id === updatedChannel.id ? updatedChannel : channel
        );
      });

      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['channels', updatedChannel.workspaceId] });
    },
    onError: (error) => {
      console.error('Failed to update channel:', error);
    },
  });
}

// Delete channel mutation
export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, workspaceId }: { channelId: string; workspaceId: string }) => 
      deleteChannel(channelId),
    onSuccess: (_, { channelId, workspaceId }) => {
      // Remove the channel from the cache
      queryClient.setQueryData(['channels', workspaceId], (oldChannels: Channel[] = []) => {
        return oldChannels.filter(channel => channel.id !== channelId);
      });

      // Remove the specific channel data
      queryClient.removeQueries({ queryKey: ['channel', channelId] });
      queryClient.removeQueries({ queryKey: ['channel-members', channelId] });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['channels', workspaceId] });
    },
    onError: (error) => {
      console.error('Failed to delete channel:', error);
    },
  });
}

// Join channel mutation
export function useJoinChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, userEmail }: { channelId: string; userEmail: string }) => 
      joinChannel(channelId, userEmail),
    onSuccess: (_, { channelId }) => {
      // Invalidate channel members to reflect the new member
      queryClient.invalidateQueries({ queryKey: ['channel-members', channelId] });
      
      // Invalidate channels list to update member counts
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      
      // Invalidate the specific channel
      queryClient.invalidateQueries({ queryKey: ['channel', channelId] });
    },
    onError: (error) => {
      console.error('Failed to join channel:', error);
    },
  });
}

// Leave channel mutation
export function useLeaveChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, userEmail }: { channelId: string; userEmail: string }) => 
      leaveChannel(channelId, userEmail),
    onSuccess: (_, { channelId }) => {
      // Invalidate channel members to reflect the removal
      queryClient.invalidateQueries({ queryKey: ['channel-members', channelId] });
      
      // Invalidate channels list to update member counts
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      
      // Invalidate the specific channel
      queryClient.invalidateQueries({ queryKey: ['channel', channelId] });
    },
    onError: (error) => {
      console.error('Failed to leave channel:', error);
    },
  });
}

// Add channel member mutation
export function useAddChannelMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      channelId, 
      userEmail, 
      role = 'member' 
    }: { 
      channelId: string; 
      userEmail: string; 
      role?: 'owner' | 'admin' | 'moderator' | 'member' | 'viewer';
    }) => addChannelMember(channelId, userEmail, role),
    onSuccess: (_, { channelId }) => {
      // Invalidate channel members
      queryClient.invalidateQueries({ queryKey: ['channel-members', channelId] });
      
      // Invalidate channels list to update member counts
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
    onError: (error) => {
      console.error('Failed to add channel member:', error);
    },
  });
}

// Remove channel member mutation
export function useRemoveChannelMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, memberEmail }: { channelId: string; memberEmail: string }) => 
      removeChannelMember(channelId, memberEmail),
    onSuccess: (_, { channelId }) => {
      // Invalidate channel members
      queryClient.invalidateQueries({ queryKey: ['channel-members', channelId] });
      
      // Invalidate channels list to update member counts
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
    onError: (error) => {
      console.error('Failed to remove channel member:', error);
    },
  });
}