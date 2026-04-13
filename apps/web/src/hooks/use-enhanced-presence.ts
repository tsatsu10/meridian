// @epic-4.2-presence: Enhanced presence system React hook
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWorkspacePresence,
  getOnlineUsers,
  updateUserPresence,
  setCustomStatus,
  clearCustomStatus,
  setDoNotDisturb,
  updateWorkingHours,
  getPresenceHistory,
  UserPresence,
  PresenceHistoryItem,
  UpdatePresenceData,
  CustomStatusData,
} from '@/lib/api/presence-api';

interface UseEnhancedPresenceProps {
  workspaceId: string;
  userEmail: string;
  enableRealtime?: boolean;
  refetchInterval?: number;
}

export function useEnhancedPresence({
  workspaceId,
  userEmail,
  enableRealtime = true,
  refetchInterval = 30000, // 30 seconds
}: UseEnhancedPresenceProps) {
  const queryClient = useQueryClient();
  const [localStatus, setLocalStatus] = useState<Partial<UserPresence>>({});

  // Query keys
  const workspacePresenceKey = ['presence', 'workspace', workspaceId];
  const onlineUsersKey = ['presence', 'online', workspaceId];
  const presenceHistoryKey = ['presence', 'history', workspaceId, userEmail];

  // Get workspace presence
  const {
    data: workspacePresence = [],
    isLoading: isLoadingPresence,
    error: presenceError,
  } = useQuery({
    queryKey: workspacePresenceKey,
    queryFn: () => getWorkspacePresence(workspaceId),
    refetchInterval: enableRealtime ? refetchInterval : false,
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Get online users
  const {
    data: onlineUsers = [],
    isLoading: isLoadingOnlineUsers,
  } = useQuery({
    queryKey: onlineUsersKey,
    queryFn: () => getOnlineUsers(workspaceId),
    refetchInterval: enableRealtime ? refetchInterval : false,
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  // Get current user's presence
  const currentUserPresence = workspacePresence.find(p => p.userEmail === userEmail);

  // Get presence history
  const {
    data: presenceHistory = [],
    isLoading: isLoadingHistory,
  } = useQuery({
    queryKey: presenceHistoryKey,
    queryFn: () => getPresenceHistory(workspaceId, userEmail, 20),
    enabled: !!userEmail,
    staleTime: 60000, // Consider data stale after 1 minute
  });

  // Update presence mutation
  const updatePresenceMutation = useMutation({
    mutationFn: (data: UpdatePresenceData) => 
      updateUserPresence(workspaceId, userEmail, data),
    onSuccess: (updatedPresence) => {
      // Update local state immediately
      setLocalStatus(updatedPresence);
      
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: workspacePresenceKey });
      queryClient.invalidateQueries({ queryKey: onlineUsersKey });
      queryClient.invalidateQueries({ queryKey: presenceHistoryKey });
    },
    onError: (error) => {
      console.error('Failed to update presence:', error);
    },
  });

  // Set custom status mutation
  const setCustomStatusMutation = useMutation({
    mutationFn: (data: CustomStatusData) => 
      setCustomStatus(workspaceId, userEmail, data),
    onSuccess: (updatedPresence) => {
      setLocalStatus(updatedPresence);
      queryClient.invalidateQueries({ queryKey: workspacePresenceKey });
      queryClient.invalidateQueries({ queryKey: onlineUsersKey });
    },
    onError: (error) => {
      console.error('Failed to set custom status:', error);
    },
  });

  // Clear custom status mutation
  const clearCustomStatusMutation = useMutation({
    mutationFn: () => clearCustomStatus(workspaceId, userEmail),
    onSuccess: (updatedPresence) => {
      setLocalStatus(updatedPresence);
      queryClient.invalidateQueries({ queryKey: workspacePresenceKey });
      queryClient.invalidateQueries({ queryKey: onlineUsersKey });
    },
    onError: (error) => {
      console.error('Failed to clear custom status:', error);
    },
  });

  // Set do not disturb mutation
  const setDoNotDisturbMutation = useMutation({
    mutationFn: (until?: string) => setDoNotDisturb(workspaceId, userEmail, until),
    onSuccess: (updatedPresence) => {
      setLocalStatus(updatedPresence);
      queryClient.invalidateQueries({ queryKey: workspacePresenceKey });
      queryClient.invalidateQueries({ queryKey: onlineUsersKey });
    },
    onError: (error) => {
      console.error('Failed to set do not disturb:', error);
    },
  });

  // Update working hours mutation
  const updateWorkingHoursMutation = useMutation({
    mutationFn: ({ workingHours, timezone }: { workingHours: string; timezone?: string }) =>
      updateWorkingHours(workspaceId, userEmail, workingHours, timezone),
    onSuccess: (updatedPresence) => {
      setLocalStatus(updatedPresence);
      queryClient.invalidateQueries({ queryKey: workspacePresenceKey });
    },
    onError: (error) => {
      console.error('Failed to update working hours:', error);
    },
  });

  // Convenience functions
  const updateStatus = useCallback((status: UserPresence['status'], options?: Partial<UpdatePresenceData>) => {
    updatePresenceMutation.mutate({
      status,
      changeReason: 'manual',
      ...options,
    });
  }, [updatePresenceMutation]);

  const setCustomUserStatus = useCallback((customStatus: CustomStatusData) => {
    setCustomStatusMutation.mutate(customStatus);
  }, [setCustomStatusMutation]);

  const clearUserCustomStatus = useCallback(() => {
    clearCustomStatusMutation.mutate();
  }, [clearCustomStatusMutation]);

  const setUserDoNotDisturb = useCallback((until?: Date) => {
    const untilString = until ? until.toISOString() : undefined;
    setDoNotDisturbMutation.mutate(untilString);
  }, [setDoNotDisturbMutation]);

  const updateUserWorkingHours = useCallback((workingHours: string, timezone?: string) => {
    updateWorkingHoursMutation.mutate({ workingHours, timezone });
  }, [updateWorkingHoursMutation]);

  // Activity tracking
  const updateActivity = useCallback((activityType: string, details?: string) => {
    if (currentUserPresence?.status === 'online') {
      updatePresenceMutation.mutate({
        status: currentUserPresence.status,
        lastActivityType: activityType,
        lastActivityDetails: details,
        changeReason: 'activity_update',
      });
    }
  }, [currentUserPresence?.status, updatePresenceMutation]);

  // Auto-update presence based on page visibility
  useEffect(() => {
    if (!enableRealtime) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, set to away
        updatePresenceMutation.mutate({
          status: 'away',
          changeReason: 'auto_away',
        });
      } else {
        // Page is visible, set to online
        updatePresenceMutation.mutate({
          status: 'online',
          changeReason: 'auto_online',
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enableRealtime, updatePresenceMutation]);

  // Auto-cleanup expired statuses
  useEffect(() => {
    if (!currentUserPresence) return;

    const checkExpiredStatus = () => {
      const now = new Date();
      
      // Check if custom status has expired
      if (currentUserPresence.statusExpiresAt && new Date(currentUserPresence.statusExpiresAt) < now) {
        updatePresenceMutation.mutate({
          status: 'online',
          customStatusMessage: undefined,
          customStatusEmoji: undefined,
          statusExpiresAt: undefined,
          changeReason: 'status_expired',
        });
      }
      
      // Check if DND has expired
      if (currentUserPresence.doNotDisturbUntil && new Date(currentUserPresence.doNotDisturbUntil) < now) {
        updatePresenceMutation.mutate({
          status: 'online',
          doNotDisturbUntil: undefined,
          changeReason: 'dnd_expired',
        });
      }
    };

    const interval = setInterval(checkExpiredStatus, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [currentUserPresence, updatePresenceMutation]);

  // Combined current user presence (server + local updates)
  const effectiveCurrentPresence = {
    ...currentUserPresence,
    ...localStatus,
  };

  return {
    // Data
    workspacePresence,
    onlineUsers,
    currentUserPresence: effectiveCurrentPresence,
    presenceHistory,

    // Loading states
    isLoadingPresence,
    isLoadingOnlineUsers,
    isLoadingHistory,

    // Error states
    presenceError,

    // Mutation states
    isUpdatingPresence: updatePresenceMutation.isPending,
    isSettingCustomStatus: setCustomStatusMutation.isPending,
    isClearingCustomStatus: clearCustomStatusMutation.isPending,
    isSettingDoNotDisturb: setDoNotDisturbMutation.isPending,
    isUpdatingWorkingHours: updateWorkingHoursMutation.isPending,

    // Actions
    updateStatus,
    setCustomUserStatus,
    clearUserCustomStatus,
    setUserDoNotDisturb,
    updateUserWorkingHours,
    updateActivity,

    // Raw mutations for advanced usage
    updatePresenceMutation,
    setCustomStatusMutation,
    clearCustomStatusMutation,
    setDoNotDisturbMutation,
    updateWorkingHoursMutation,

    // Utility functions
    getUserPresence: useCallback((email: string) => 
      workspacePresence.find(p => p.userEmail === email), [workspacePresence]),
    
    isUserOnline: useCallback((email: string) => 
      onlineUsers.some(u => u.userEmail === email), [onlineUsers]),
    
    refreshPresence: useCallback(() => {
      queryClient.invalidateQueries({ queryKey: workspacePresenceKey });
      queryClient.invalidateQueries({ queryKey: onlineUsersKey });
    }, [queryClient, workspacePresenceKey, onlineUsersKey]),
  };
}

export default useEnhancedPresence;