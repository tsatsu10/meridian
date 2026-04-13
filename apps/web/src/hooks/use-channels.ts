import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'project' | 'team' | 'dm' | 'announcement' | 'private';
  workspaceId: string;
  teamId?: string;
  projectId?: string;
  createdBy: string;
  archived: boolean;
  createdAt: Date;
  memberRole?: string;
  // Enhanced properties for better UX
  isPrivate?: boolean;
  memberCount?: number;
  unreadCount?: number;
  lastActivity?: Date;
  lastMessage?: string;
  avatarUrl?: string;
}

export interface CreateChannelData {
  name: string;
  description?: string;
  type?: string;
  workspaceId: string;
  teamId?: string;
  projectId?: string;
  isPrivate?: boolean;
}

// @epic-3.6-communication: Hook for fetching channels in a workspace
export function useChannels(workspaceId: string) {
  return useQuery({
    queryKey: ["channels", workspaceId],
    queryFn: async () => {
      const response = await fetchApi(`/channel/${workspaceId}`);
      return response.channels as Channel[];
    },
    enabled: !!workspaceId,
  });
}

// @epic-3.6-communication: Hook for creating a new channel
export function useCreateChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (channelData: CreateChannelData) => {
      return fetchApi("/channel", {
        method: "POST",
        body: JSON.stringify(channelData),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate channels query to refetch
      queryClient.invalidateQueries({ 
        queryKey: ["channels", variables.workspaceId] 
      });
    },
  });
}

// @epic-3.6-communication: Hook for updating a channel
export function useUpdateChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ channelId, ...updateData }: { channelId: string } & Partial<CreateChannelData>) => {
      return fetchApi(`/channel/${channelId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate channels queries
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

// @epic-3.6-communication: Hook for archiving a channel
export function useArchiveChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (channelId: string) => {
      return fetchApi(`/channel/${channelId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      // Invalidate channels queries
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

// @epic-3.6-communication: Hook for joining a channel
export function useJoinChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (channelId: string) => {
      return fetchApi(`/channel/${channelId}/join`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      // Invalidate channels queries
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
} 