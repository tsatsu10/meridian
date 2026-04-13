// useInfiniteMessages - Infinite scroll for message history

import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/fetch';
import type { MessagesResponse } from '../types';

interface UseInfiniteMessagesOptions {
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook for fetching messages with infinite scroll support
 * 
 * @param teamId - Team identifier
 * @param options - Query options
 * @returns Infinite query with message pages
 */
export function useInfiniteMessages(
  teamId: string,
  options: UseInfiniteMessagesOptions = {}
) {
  const { limit = 50, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: ['team-messages-infinite', teamId, limit],
    
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: pageParam.toString(),
        messageType: 'all',
      });

      const response = await fetchApi(`/team/${teamId}/messages?${params}`);
      return response as MessagesResponse;
    },
    
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage.data;
      
      if (pagination.hasMore) {
        return pagination.offset + pagination.limit;
      }
      
      return undefined;
    },
    
    initialPageParam: 0,
    enabled: enabled && !!teamId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

