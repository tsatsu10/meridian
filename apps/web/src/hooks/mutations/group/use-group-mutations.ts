// @epic-4.1-direct-messaging: Group mutation hooks using Channel API with group semantics
// @persona-sarah: PM needs reactive group management for project teams
// @persona-david: Team lead needs reliable group operations

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createGroup, type CreateGroupRequest, type Group } from '@/fetchers/group/group-api';
import { logger } from "../../../lib/logger";

// Create group mutation
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGroupRequest) => createGroup(data),
    onSuccess: (newGroup: Group) => {
      // Invalidate and refetch channels list (since groups are stored as channels)
      queryClient.invalidateQueries({ queryKey: ['channels', newGroup.workspaceId] });
      
      // Optimistically add the new group to the cache
      queryClient.setQueryData(['channels', newGroup.workspaceId], (oldChannels: any[] = []) => {
        return [...oldChannels, newGroup];
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['channel-members'] });
      
      logger.info("✅ Group created successfully:");
    },
    onError: (error) => {
      console.error('❌ Failed to create group:', error);
    },
  });
}