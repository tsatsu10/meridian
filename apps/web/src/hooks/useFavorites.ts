/**
 * useFavorites Hook
 * Manages favorites state and actions with React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFavorites,
  addUserToFavorites,
  addChannelToFavorites,
  removeUserFromFavorites,
  removeFavorite,
  isUserInFavorites,
  type Favorite,
} from '@/lib/api/favorites';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

/**
 * Main favorites hook
 */
export function useFavorites() {
  const queryClient = useQueryClient();

  // Fetch all favorites
  const {
    data: favorites = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['favorites'],
    queryFn: getFavorites,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Add user to favorites
  const addUserMutation = useMutation({
    mutationFn: addUserToFavorites,
    onMutate: async (userId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['favorites'] });

      // Snapshot previous value
      const previousFavorites = queryClient.getQueryData<Favorite[]>(['favorites']);

      // Optimistically update
      queryClient.setQueryData<Favorite[]>(['favorites'], (old = []) => [
        ...old,
        {
          id: `temp-${Date.now()}`,
          userId: 'current-user', // This will be replaced by server
          favoriteUserId: userId,
          type: 'user' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      return { previousFavorites };
    },
    onError: (error, userId, context) => {
      // Rollback on error
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites'], context.previousFavorites);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to add to favorites';
      toast.error(errorMessage);
      logger.error('Add to favorites error:', error);
    },
    onSuccess: () => {
      toast.success('Added to favorites! ⭐');
    },
    onSettled: () => {
      // Refetch to get server data
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  // Add channel to favorites
  const addChannelMutation = useMutation({
    mutationFn: addChannelToFavorites,
    onMutate: async (channelId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const previousFavorites = queryClient.getQueryData<Favorite[]>(['favorites']);

      queryClient.setQueryData<Favorite[]>(['favorites'], (old = []) => [
        ...old,
        {
          id: `temp-${Date.now()}`,
          userId: 'current-user',
          favoriteChannelId: channelId,
          type: 'channel' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      return { previousFavorites };
    },
    onError: (error, channelId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites'], context.previousFavorites);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to add to favorites';
      toast.error(errorMessage);
      logger.error('Add channel to favorites error:', error);
    },
    onSuccess: () => {
      toast.success('Channel added to favorites! ⭐');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  // Remove user from favorites
  const removeUserMutation = useMutation({
    mutationFn: removeUserFromFavorites,
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const previousFavorites = queryClient.getQueryData<Favorite[]>(['favorites']);

      queryClient.setQueryData<Favorite[]>(['favorites'], (old = []) =>
        old.filter((fav) => !(fav.type === 'user' && fav.favoriteUserId === userId))
      );

      return { previousFavorites };
    },
    onError: (error, userId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites'], context.previousFavorites);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove from favorites';
      toast.error(errorMessage);
      logger.error('Remove from favorites error:', error);
    },
    onSuccess: () => {
      toast.success('Removed from favorites');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  // Remove favorite by ID
  const removeFavoriteMutation = useMutation({
    mutationFn: removeFavorite,
    onMutate: async (favoriteId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const previousFavorites = queryClient.getQueryData<Favorite[]>(['favorites']);

      queryClient.setQueryData<Favorite[]>(['favorites'], (old = []) =>
        old.filter((fav) => fav.id !== favoriteId)
      );

      return { previousFavorites };
    },
    onError: (error, favoriteId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites'], context.previousFavorites);
      }
      toast.error('Failed to remove from favorites');
      logger.error('Remove favorite error:', error);
    },
    onSuccess: () => {
      toast.success('Removed from favorites');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  // Helper functions
  const isUserFavorited = (userId: string): boolean => {
    return favorites.some(
      (fav) => fav.type === 'user' && fav.favoriteUserId === userId
    );
  };

  const isChannelFavorited = (channelId: string): boolean => {
    return favorites.some(
      (fav) => fav.type === 'channel' && fav.favoriteChannelId === channelId
    );
  };

  const toggleUserFavorite = async (userId: string) => {
    if (isUserFavorited(userId)) {
      await removeUserMutation.mutateAsync(userId);
    } else {
      await addUserMutation.mutateAsync(userId);
    }
  };

  return {
    favorites,
    isLoading,
    isError,
    error,
    addUser: addUserMutation.mutate,
    addUserAsync: addUserMutation.mutateAsync,
    addChannel: addChannelMutation.mutate,
    addChannelAsync: addChannelMutation.mutateAsync,
    removeUser: removeUserMutation.mutate,
    removeUserAsync: removeUserMutation.mutateAsync,
    removeFavorite: removeFavoriteMutation.mutate,
    removeFavoriteAsync: removeFavoriteMutation.mutateAsync,
    isUserFavorited,
    isChannelFavorited,
    toggleUserFavorite,
    isPending:
      addUserMutation.isPending ||
      addChannelMutation.isPending ||
      removeUserMutation.isPending ||
      removeFavoriteMutation.isPending,
  };
}

/**
 * Simplified hook to check if a user is favorited
 */
export function useIsUserFavorited(userId: string) {
  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: getFavorites,
    staleTime: 5 * 60 * 1000,
  });

  return favorites.some(
    (fav) => fav.type === 'user' && fav.favoriteUserId === userId
  );
}

