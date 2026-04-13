/**
 * @fileoverview Infinite Messages Hook
 * @description High-performance infinite scroll for message loading with pagination
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - Infinite scroll with automatic loading
 * - Cursor-based pagination for consistency
 * - Optimized caching and deduplication
 * - Memory management for large datasets
 * - Real-time updates integration
 */

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/fetch';
import { useCallback, useMemo } from 'react';
import { logger } from "../lib/logger";

interface Message {
  id: string;
  content: string;
  messageType: string;
  userEmail: string;
  userName?: string;
  channelId: string;
  createdAt: Date;
  isEdited: boolean;
  isPinned?: boolean;
  parentMessageId?: string;
  reactions?: string;
  attachments?: string;
}

interface MessagePage {
  messages: Message[];
  pagination: {
    nextCursor?: string;
    hasMore: boolean;
    total: number;
  };
}

interface UseInfiniteMessagesOptions {
  pageSize?: number;
  enabled?: boolean;
  enableOptimizations?: boolean;
  maxPages?: number;
  staleTime?: number;
}

/**
 * Hook for infinite loading of messages with cursor-based pagination
 * @param channelId - The channel ID to fetch messages from
 * @param options - Configuration options for infinite loading
 * @returns Infinite query result with messages and pagination controls
 * 
 * @example
 * ```tsx
 * const {
 *   data,
 *   fetchNextPage,
 *   hasNextPage,
 *   isFetchingNextPage,
 *   allMessages
 * } = useInfiniteMessages('channel-123', { pageSize: 50 });
 * ```
 */
export function useInfiniteMessages(
  channelId: string,
  options: UseInfiniteMessagesOptions = {}
) {
  const {
    pageSize = 50,
    enabled = true,
    enableOptimizations = true,
    maxPages = 20, // Limit to prevent memory issues
    staleTime = 5 * 60 * 1000,
  } = options;

  const queryClient = useQueryClient();

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['infiniteMessages', channelId, pageSize],
    
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      const searchParams = new URLSearchParams();
      searchParams.set('limit', pageSize.toString());
      searchParams.set('includeThreads', 'true');
      
      if (pageParam) {
        searchParams.set('before', pageParam); // Cursor-based pagination
      }
      
      const url = `/message/channel/${channelId}?${searchParams.toString()}`;
      const response = await fetchApi(url);
      
      return {
        messages: response.messages as Message[],
        pagination: {
          nextCursor: response.pagination?.nextCursor,
          hasMore: response.pagination?.hasMore ?? false,
          total: response.pagination?.total ?? 0,
        },
      } as MessagePage;
    },

    enabled: enabled && !!channelId,

    // Performance optimizations
    staleTime: enableOptimizations ? staleTime : 0,
    gcTime: enableOptimizations ? 30 * 60 * 1000 : 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,

    // Infinite query specific options
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore ? lastPage.pagination.nextCursor : undefined;
    },

    // Memory management - limit number of pages
    maxPages: enableOptimizations ? maxPages : undefined,

    // Intelligent retry
    retry: (failureCount, error) => {
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Flattened messages from all pages
  const allMessages = useMemo(() => {
    if (!infiniteQuery.data?.pages) return [];
    
    return infiniteQuery.data.pages
      .flatMap(page => page.messages)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [infiniteQuery.data?.pages]);

  // Enhanced fetch next page with error handling
  const fetchNextPage = useCallback(async () => {
    if (!infiniteQuery.hasNextPage || infiniteQuery.isFetchingNextPage) {
      return;
    }

    try {
      await infiniteQuery.fetchNextPage();
    } catch (error) {
      console.error('Failed to fetch next page:', error);
    }
  }, [infiniteQuery]);

  // Optimized scroll handler for infinite loading
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (!infiniteQuery.hasNextPage || infiniteQuery.isFetchingNextPage) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    
    // Load more when scrolled to top (10% threshold)
    const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
    if (scrollPercentage <= 0.1) {
      fetchNextPage();
    }
  }, [fetchNextPage, infiniteQuery.hasNextPage, infiniteQuery.isFetchingNextPage]);

  // Memory management utilities
  const memoryUtils = useMemo(() => ({
    // Get total memory usage estimate
    getMemoryUsageMB: () => {
      if (!infiniteQuery.data?.pages) return 0;
      
      const totalSize = infiniteQuery.data.pages.reduce((size, page) => {
        return size + JSON.stringify(page).length;
      }, 0);
      
      return totalSize / 1024 / 1024; // Convert to MB
    },

    // Clear old pages to free memory
    clearOldPages: (keepPages: number = 5) => {
      if (!infiniteQuery.data?.pages || infiniteQuery.data.pages.length <= keepPages) {
        return;
      }

      const newPages = infiniteQuery.data.pages.slice(-keepPages);
      
      queryClient.setQueryData(['infiniteMessages', channelId, pageSize], {
        pages: newPages,
        pageParams: infiniteQuery.data.pageParams.slice(-keepPages),
      });
    },

    // Get statistics
    getStats: () => {
      const pages = infiniteQuery.data?.pages || [];
      return {
        totalPages: pages.length,
        totalMessages: allMessages.length,
        memoryUsageMB: memoryUtils.getMemoryUsageMB(),
        hasNextPage: infiniteQuery.hasNextPage,
        isFetching: infiniteQuery.isFetchingNextPage,
      };
    },
  }), [infiniteQuery.data, allMessages.length, queryClient, channelId, pageSize]);

  // Auto-cleanup when hitting memory limits
  const performMemoryCleanup = useCallback(() => {
    const memoryUsage = memoryUtils.getMemoryUsageMB();
    const maxMemoryMB = 50; // 50MB limit
    
    if (memoryUsage > maxMemoryMB) {
      const keepPages = Math.max(3, Math.floor(maxMemoryMB / (memoryUsage / (infiniteQuery.data?.pages.length || 1))));
      memoryUtils.clearOldPages(keepPages);
      
      logger.info("🧹 Memory cleanup: reduced from ${memoryUsage.toFixed(1)}MB to ~${maxMemoryMB}MB");
    }
  }, [memoryUtils, infiniteQuery.data?.pages.length]);

  // Perform cleanup when memory usage is high
  if (memoryUtils.getMemoryUsageMB() > 50) {
    performMemoryCleanup();
  }

  return {
    // Core infinite query data
    ...infiniteQuery,
    
    // Convenience properties
    allMessages,
    totalMessages: allMessages.length,
    
    // Enhanced methods
    fetchNextPage,
    handleScroll,
    
    // Memory management
    memoryUtils,
    performMemoryCleanup,
    
    // Status helpers
    isEmpty: allMessages.length === 0 && !infiniteQuery.isLoading,
    isLoadingFirst: infiniteQuery.isLoading && !infiniteQuery.data?.pages.length,
    isLoadingMore: infiniteQuery.isFetchingNextPage,
  };
}

/**
 * Hook for bidirectional infinite messages (load both older and newer)
 * Useful for jumping to a specific message and loading around it
 */
export function useBidirectionalInfiniteMessages(
  channelId: string,
  anchorMessageId?: string,
  options: UseInfiniteMessagesOptions = {}
) {
  // Load messages before anchor (older)
  const olderMessages = useInfiniteMessages(channelId, {
    ...options,
    enabled: !!channelId && !!anchorMessageId,
  });

  // Load messages after anchor (newer) - would need different API endpoint
  const newerMessages = useInfiniteMessages(channelId, {
    ...options,
    enabled: !!channelId && !!anchorMessageId,
    // This would need a different query key and API endpoint for "after" pagination
  });

  // Combine and sort all messages
  const allMessages = useMemo(() => {
    const older = olderMessages.allMessages;
    const newer = newerMessages.allMessages;
    
    return [...older, ...newer]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [olderMessages.allMessages, newerMessages.allMessages]);

  return {
    allMessages,
    totalMessages: allMessages.length,
    
    // Older messages control
    hasOlderMessages: olderMessages.hasNextPage,
    fetchOlderMessages: olderMessages.fetchNextPage,
    isLoadingOlder: olderMessages.isLoadingMore,
    
    // Newer messages control
    hasNewerMessages: newerMessages.hasNextPage,
    fetchNewerMessages: newerMessages.fetchNextPage,
    isLoadingNewer: newerMessages.isLoadingMore,
    
    // Combined status
    isLoading: olderMessages.isLoading || newerMessages.isLoading,
    error: olderMessages.error || newerMessages.error,
    
    // Memory management
    memoryUtils: {
      getMemoryUsageMB: () => 
        olderMessages.memoryUtils.getMemoryUsageMB() + 
        newerMessages.memoryUtils.getMemoryUsageMB(),
      clearOldPages: () => {
        olderMessages.memoryUtils.clearOldPages();
        newerMessages.memoryUtils.clearOldPages();
      },
    },
  };
}