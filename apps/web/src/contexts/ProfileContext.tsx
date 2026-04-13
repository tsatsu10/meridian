/**
 * Unified Profile Context
 * Centralized profile state management with caching and optimistic updates
 */
"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import type { UserProfile, ProfileUpdateData } from '@/types/profile';
import { normalizeProfile, isValidProfile } from '@/types/profile';
import { getUserProfile, updateProfile as updateProfileAPI, uploadAvatar } from '@/lib/api/profile';
import { toast } from 'sonner';
import { CACHE_KEYS, isOnline, setupOnlineListeners, saveToCache, getFromCache, queuePendingUpdate, processPendingUpdates, getPendingUpdates, getCacheAge, formatCacheAge } from '@/lib/offline-storage';

interface ProfileContextValue {
  // Current profile data
  profile: UserProfile | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  
  // Actions
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  uploadProfileAvatar: (file: File) => Promise<string>;
  refreshProfile: () => Promise<void>;
  
  // Optimistic updates
  setOptimisticProfile: (data: Partial<UserProfile>) => void;
  
  // Cache management
  invalidateCache: () => void;
  clearCache: () => void;
  
  // Offline support
  isOnline: boolean;
  hasPendingUpdates: boolean;
  cacheAge: string | null;
  syncPendingUpdates: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

interface ProfileProviderProps {
  children: React.ReactNode;
  userId?: string; // Optional: load specific user's profile
  initialData?: UserProfile; // Optional: SSR or prefetched data
}

export function ProfileProvider({ children, userId, initialData }: ProfileProviderProps) {
  const queryClient = useQueryClient();
  const [optimisticData, setOptimisticData] = useState<Partial<UserProfile> | null>(null);
  const [isOnlineState, setIsOnlineState] = useState(isOnline());
  const [cacheAgeMs, setCacheAgeMs] = useState<number | null>(null);
  
  // Fetch profile data
  const { 
    data: profileData, 
    isLoading, 
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['profile', userId || 'current'],
    queryFn: () => userId ? getUserProfile(userId) : getUserProfile('current'),
    enabled: !!userId || true, // Always enabled if no userId (fetch current user)
    initialData: initialData ? { user: initialData } : undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
  });

  // Normalize profile data
  const profile: UserProfile | null = optimisticData 
    ? { ...normalizeProfile(profileData?.user || profileData?.profile || profileData || {}), ...optimisticData }
    : normalizeProfile(profileData?.user || profileData?.profile || profileData || {});

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: (data: ProfileUpdateData) => updateProfileAPI(data),
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['profile', userId || 'current'] });
      
      // Snapshot previous value
      const previousProfile = queryClient.getQueryData(['profile', userId || 'current']);
      
      // Optimistically update
      setOptimisticData(newData);
      
      return { previousProfile };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(['profile', userId || 'current'], context.previousProfile);
      }
      setOptimisticData(null);
      
      toast.error('Failed to update profile. Please try again.');
    },
    onSuccess: () => {
      // Clear optimistic data
      setOptimisticData(null);
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['profile', userId || 'current'] });
      
      toast.success('Profile updated successfully!');
    },
  });

  // Upload avatar mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['profile', userId || 'current'] });
    },
    onSuccess: (avatarUrl) => {
      // Update profile with new avatar
      setOptimisticData({ avatar: avatarUrl });
      
      // Invalidate to refetch full profile
      queryClient.invalidateQueries({ queryKey: ['profile', userId || 'current'] });
      
      toast.success('Profile picture uploaded successfully!');
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload profile picture';
      toast.error(errorMessage);
      throw err; // Re-throw for caller to handle
    },
  });

  // Actions
  const updateProfileAction = useCallback(async (data: ProfileUpdateData) => {
    await updateMutation.mutateAsync(data);
  }, [updateMutation]);

  const uploadProfileAvatar = useCallback(async (file: File): Promise<string> => {
    return await uploadMutation.mutateAsync(file);
  }, [uploadMutation]);

  const refreshProfile = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const setOptimisticProfile = useCallback((data: Partial<UserProfile>) => {
    setOptimisticData(prev => ({ ...prev, ...data }));
  }, []);

  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['profile', userId || 'current'] });
  }, [queryClient, userId]);

  const clearCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: ['profile', userId || 'current'] });
    setOptimisticData(null);
  }, [queryClient, userId]);

  // Sync pending updates when coming back online
  const syncPendingUpdates = useCallback(async () => {
    const pending = getPendingUpdates();
    if (pending.length === 0) return;

    try {
      await processPendingUpdates(async (update) => {
        if (update.type === 'update' && update.data) {
          await updateProfileAction(update.data);
        }
      });
      toast.success(`Synced ${pending.length} pending changes`);
    } catch (error) {
      console.error('Failed to sync pending updates:', error);
      toast.error('Some changes failed to sync. Will retry later.');
    }
  }, [updateProfileAction]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnlineState(true);
      toast.success('Back online! Syncing changes...');
      syncPendingUpdates();
      refreshProfile();
    };

    const handleOffline = () => {
      setIsOnlineState(false);
      toast.warning('You\'re offline. Changes will sync when connection is restored.');
    };

    const cleanup = setupOnlineListeners(handleOnline, handleOffline);
    return cleanup;
  }, [syncPendingUpdates, refreshProfile]);

  // Update cache age periodically
  useEffect(() => {
    if (profile) {
      const age = getCacheAge(CACHE_KEYS.PROFILE);
      setCacheAgeMs(age);
      
      // Update every minute
      const interval = setInterval(() => {
        setCacheAgeMs(getCacheAge(CACHE_KEYS.PROFILE));
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [profile]);

  // Validate profile data on load
  useEffect(() => {
    if (profile && !isLoading && !isValidProfile(profile)) {
      console.warn('Invalid profile data detected:', profile);
    }
  }, [profile, isLoading]);

  const value: ProfileContextValue = {
    profile,
    isLoading,
    isError,
    error: error as Error | null,
    updateProfile: updateProfileAction,
    uploadProfileAvatar,
    refreshProfile,
    setOptimisticProfile,
    invalidateCache,
    clearCache,
    isOnline: isOnlineState,
    hasPendingUpdates: getPendingUpdates().length > 0,
    cacheAge: cacheAgeMs ? formatCacheAge(cacheAgeMs) : null,
    syncPendingUpdates,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

/**
 * Hook to use profile context
 * @throws Error if used outside ProfileProvider
 */
export function useProfile() {
  const context = useContext(ProfileContext);
  
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  
  return context;
}

/**
 * Hook to get profile without requiring ProfileProvider
 * Useful for components that might not have the provider in their tree
 */
export function useProfileQuery(userId?: string) {
  const { 
    data: profileData, 
    isLoading, 
    isError,
    error 
  } = useQuery({
    queryKey: ['profile', userId || 'current'],
    queryFn: () => userId ? getUserProfile(userId) : getUserProfile('current'),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const profile = normalizeProfile(profileData?.user || profileData?.profile || profileData || {});

  return {
    profile,
    isLoading,
    isError,
    error: error as Error | null,
  };
}

/**
 * Hook for profile mutations without requiring ProfileProvider
 */
export function useProfileMutations() {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: ProfileUpdateData) => updateProfileAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated successfully!');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile picture uploaded!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to upload picture');
    },
  });

  return {
    updateProfile: updateMutation.mutateAsync,
    uploadAvatar: uploadMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    isUploading: uploadMutation.isPending,
  };
}

