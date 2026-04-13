/**
 * 👥 usePresence Hook
 * Real-time user presence tracking for workspace collaboration
 * 
 * Features:
 * - Fetch all user presence in workspace
 * - Real-time updates via WebSocket
 * - Helper functions for status checking
 * - Automatic polling fallback
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { API_URL } from '@/constants/urls';
import { useSocket } from './use-socket';

export interface PresenceData {
  userEmail: string;
  status: 'online' | 'offline' | 'away' | 'busy' | 'do_not_disturb';
  lastSeen?: Date;
  customStatusMessage?: string;
  customStatusEmoji?: string;
  isActive?: boolean;
  currentPage?: string;
}

export interface UsePresenceResult {
  presenceData: PresenceData[];
  isLoading: boolean;
  error: Error | null;
  getUserStatus: (userEmail: string) => string;
  isUserOnline: (userEmail: string) => boolean;
  getUserPresence: (userEmail: string) => PresenceData | undefined;
}

/**
 * Hook to track user presence in a workspace
 * 
 * @param workspaceId - The workspace to track presence for
 * @returns Presence data and helper functions
 * 
 * @example
 * ```tsx
 * const { presenceData, isUserOnline } = usePresence(workspaceId);
 * const online = isUserOnline('user@example.com');
 * ```
 */
export function usePresence(workspaceId?: string): UsePresenceResult {
  const queryClient = useQueryClient();
  const socket = useSocket();
  
  // Fetch all presence data for workspace
  const { data, isLoading, error } = useQuery<PresenceData[]>({
    queryKey: ['workspace-presence', workspaceId],
    queryFn: async () => {
      if (!workspaceId) {
        return [];
      }
      
      const res = await fetch(`${API_URL}/api/presence/workspace/${workspaceId}`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch presence: ${res.statusText}`);
      }
      
      const json = await res.json();
      return json.data || json.users || []; // Handle different response formats
    },
    enabled: !!workspaceId,
    refetchInterval: 30000, // Refresh every 30 seconds as fallback
    staleTime: 15000, // Consider data fresh for 15 seconds
  });
  
  // Subscribe to real-time WebSocket updates
  useEffect(() => {
    if (!socket || !workspaceId) return;
    
    const handlePresenceUpdate = (data: any) => {
      // Invalidate queries to trigger refetch with latest data
      queryClient.invalidateQueries({ queryKey: ['workspace-presence', workspaceId] });
      
      console.log('👥 Presence update received:', data);
    };
    
    // Listen to multiple event types for presence updates
    socket.on('presence:update', handlePresenceUpdate);
    socket.on('realtime:presence', handlePresenceUpdate);
    socket.on('user:online', handlePresenceUpdate);
    socket.on('user:offline', handlePresenceUpdate);
    
    return () => {
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('realtime:presence', handlePresenceUpdate);
      socket.off('user:online', handlePresenceUpdate);
      socket.off('user:offline', handlePresenceUpdate);
    };
  }, [socket, workspaceId, queryClient]);
  
  // Helper: Get user's current status
  const getUserStatus = (userEmail: string): string => {
    if (!data) return 'offline';
    const user = data.find((u) => u.userEmail === userEmail);
    return user?.status || 'offline';
  };
  
  // Helper: Check if user is online
  const isUserOnline = (userEmail: string): boolean => {
    if (!data) return false;
    const user = data.find((u) => u.userEmail === userEmail);
    return user?.status === 'online';
  };
  
  // Helper: Get full presence data for user
  const getUserPresence = (userEmail: string): PresenceData | undefined => {
    if (!data) return undefined;
    return data.find((u) => u.userEmail === userEmail);
  };
  
  return {
    presenceData: data || [],
    isLoading,
    error: error as Error | null,
    getUserStatus,
    isUserOnline,
    getUserPresence,
  };
}

/**
 * Hook to get online users only
 * 
 * @param workspaceId - The workspace to get online users for
 * @returns List of currently online users
 * 
 * @example
 * ```tsx
 * const { onlineUsers } = useOnlineUsers(workspaceId);
 * console.log(`${onlineUsers.length} users online`);
 * ```
 */
export function useOnlineUsers(workspaceId?: string) {
  const queryClient = useQueryClient();
  const socket = useSocket();
  
  const { data, isLoading, error } = useQuery<PresenceData[]>({
    queryKey: ['online-users', workspaceId],
    queryFn: async () => {
      if (!workspaceId) {
        return [];
      }
      
      const res = await fetch(`${API_URL}/api/presence/workspace/${workspaceId}/online`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch online users: ${res.statusText}`);
      }
      
      const json = await res.json();
      return json.data || json.users || [];
    },
    enabled: !!workspaceId,
    refetchInterval: 30000,
    staleTime: 15000,
  });
  
  // Subscribe to WebSocket updates
  useEffect(() => {
    if (!socket || !workspaceId) return;
    
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['online-users', workspaceId] });
    };
    
    socket.on('presence:update', handleUpdate);
    socket.on('realtime:presence', handleUpdate);
    socket.on('user:online', handleUpdate);
    socket.on('user:offline', handleUpdate);
    
    return () => {
      socket.off('presence:update', handleUpdate);
      socket.off('realtime:presence', handleUpdate);
      socket.off('user:online', handleUpdate);
      socket.off('user:offline', handleUpdate);
    };
  }, [socket, workspaceId, queryClient]);
  
  return {
    onlineUsers: data || [],
    onlineCount: data?.length || 0,
    isLoading,
    error: error as Error | null,
  };
}
