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
import { API_BASE_URL } from '@/constants/urls';
import { useSocket } from './use-socket';
import { logger } from "@/lib/logger";

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

/** Matches `GET /api/presence/online?workspaceId=` (apps/api/src/modules/presence/index.ts) */
interface PresenceOnlineApiRow {
  userEmail: string;
  userName?: string;
  userId?: string;
  lastSeen?: string | null;
  isOnline?: boolean;
}

function mapPresenceOnlineResponse(json: unknown): PresenceData[] {
  if (!json || typeof json !== "object") return [];
  const users = (json as { users?: unknown }).users;
  if (!Array.isArray(users)) return [];
  return users.map((raw) => {
    const u = raw as PresenceOnlineApiRow;
    return {
      userEmail: u.userEmail,
      status: u.isOnline === false ? "offline" : "online",
      lastSeen: u.lastSeen ? new Date(u.lastSeen) : undefined,
    };
  });
}

async function fetchPresenceOnline(workspaceId: string): Promise<PresenceData[]> {
  const res = await fetch(
    `${API_BASE_URL}/presence/online?workspaceId=${encodeURIComponent(workspaceId)}`,
    { credentials: "include" },
  );
  if (res.status === 404 || res.status === 401) {
    logger.debug("Presence online returned non-OK; treating as empty", {
      status: res.status,
      workspaceId,
    });
    return [];
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch presence: ${res.statusText}`);
  }
  const json: unknown = await res.json();
  return mapPresenceOnlineResponse(json);
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
  const { socket } = useSocket();
  
  // Fetch all presence data for workspace
  const { data, isLoading, error } = useQuery<PresenceData[]>({
    queryKey: ['workspace-presence', workspaceId],
    queryFn: async () => {
      if (!workspaceId) {
        return [];
      }
      return fetchPresenceOnline(workspaceId);
    },
    enabled: !!workspaceId,
    refetchInterval: 30000, // Refresh every 30 seconds as fallback
    staleTime: 15000, // Consider data fresh for 15 seconds
  });
  
  // Subscribe to real-time WebSocket updates
  useEffect(() => {
    if (!workspaceId || !socket || typeof socket.on !== 'function') return;
    
    const handlePresenceUpdate = (data: unknown) => {
      // Invalidate queries to trigger refetch with latest data
      queryClient.invalidateQueries({ queryKey: ['workspace-presence', workspaceId] });
      
      logger.debug('👥 Presence update received:', data);
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
 * logger.debug(`${onlineUsers.length} users online`);
 * ```
 */
export function useOnlineUsers(workspaceId?: string) {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  
  const { data, isLoading, error } = useQuery<PresenceData[]>({
    queryKey: ['online-users', workspaceId],
    queryFn: async () => {
      if (!workspaceId) {
        return [];
      }
      return fetchPresenceOnline(workspaceId);
    },
    enabled: !!workspaceId,
    refetchInterval: 30000,
    staleTime: 15000,
  });
  
  // Subscribe to WebSocket updates
  useEffect(() => {
    if (!workspaceId || !socket || typeof socket.on !== 'function') return;
    
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
