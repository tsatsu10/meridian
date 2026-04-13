/**
 * @fileoverview Optimized Query Client Configuration
 * @description High-performance React Query setup with intelligent caching and invalidation
 * @author Claude Code Assistant
 * @version 1.0.0
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { logger } from "logger";

// Performance-optimized defaults
const QUERY_DEFAULTS = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  retry: (failureCount: number, error: any) => {
    // Don't retry client errors (4xx)
    if (error?.status >= 400 && error?.status < 500) return false;
    return failureCount < 3;
  },
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
};

// Mutation defaults for better UX
const MUTATION_DEFAULTS = {
  retry: 1,
  retryDelay: 1000,
};

// Enhanced query cache with performance monitoring
const queryCache = new QueryCache({
  onError: (error, query) => {
    console.error(`🔥 Query error for ${JSON.stringify(query.queryKey)}:`, error);
    
    // Track performance metrics
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`query-error-${query.queryHash}`);
    }
  },
  onSuccess: (data, query) => {
    // Track successful queries for analytics
    if (process.env.NODE_ENV === 'development') {
      logger.info("✅ Query success for ${JSON.stringify(query.queryKey)}");
    }
    
    // Performance tracking
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`query-success-${query.queryHash}`);
    }
  },
});

// Enhanced mutation cache with optimistic updates
const mutationCache = new MutationCache({
  onError: (error, variables, context, mutation) => {
    console.error(`🔥 Mutation error:`, error);
    
    // Revert optimistic updates on error
    if (mutation.meta?.rollback) {
      mutation.meta.rollback();
    }
  },
  onSuccess: (data, variables, context, mutation) => {
    if (process.env.NODE_ENV === 'development') {
      logger.info("✅ Mutation success:");
    }
  },
});

// Create optimized query client
export const createOptimizedQueryClient = () => {
  return new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: QUERY_DEFAULTS,
      mutations: MUTATION_DEFAULTS,
    },
  });
};

// Cache invalidation strategies
export const CacheInvalidationStrategies = {
  // Invalidate all message-related queries
  invalidateMessages: (queryClient: QueryClient, channelId?: string) => {
    if (channelId) {
      queryClient.invalidateQueries({ 
        queryKey: ['messages', channelId],
        exact: false 
      });
    } else {
      queryClient.invalidateQueries({ 
        queryKey: ['messages'],
        exact: false 
      });
    }
  },

  // Smart invalidation for message operations
  invalidateAfterMessageOperation: (
    queryClient: QueryClient, 
    operation: 'create' | 'update' | 'delete',
    channelId: string,
    messageId?: string
  ) => {
    switch (operation) {
      case 'create':
        // Only invalidate the specific channel
        queryClient.invalidateQueries({ 
          queryKey: ['messages', channelId],
          exact: false 
        });
        break;
        
      case 'update':
        // Invalidate specific message and channel
        if (messageId) {
          queryClient.invalidateQueries({ 
            queryKey: ['message', messageId] 
          });
        }
        queryClient.invalidateQueries({ 
          queryKey: ['messages', channelId],
          exact: false 
        });
        break;
        
      case 'delete':
        // Remove from cache and invalidate channel
        if (messageId) {
          queryClient.removeQueries({ 
            queryKey: ['message', messageId] 
          });
        }
        queryClient.invalidateQueries({ 
          queryKey: ['messages', channelId],
          exact: false 
        });
        break;
    }
    
    // Also invalidate related queries
    queryClient.invalidateQueries({ 
      queryKey: ['pinnedMessages', channelId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['messageSearch'] 
    });
  },

  // Batch invalidation for multiple operations
  batchInvalidate: (queryClient: QueryClient, operations: Array<{
    type: 'messages' | 'search' | 'bookmarks' | 'pins';
    channelId?: string;
  }>) => {
    const promises = operations.map(op => {
      switch (op.type) {
        case 'messages':
          return queryClient.invalidateQueries({ 
            queryKey: ['messages', op.channelId].filter(Boolean),
            exact: false 
          });
        case 'search':
          return queryClient.invalidateQueries({ 
            queryKey: ['messageSearch'] 
          });
        case 'bookmarks':
          return queryClient.invalidateQueries({ 
            queryKey: ['bookmarkedMessages'] 
          });
        case 'pins':
          return queryClient.invalidateQueries({ 
            queryKey: ['pinnedMessages', op.channelId].filter(Boolean) 
          });
        default:
          return Promise.resolve();
      }
    });
    
    return Promise.all(promises);
  },
};

// Memory management utilities
export const MemoryManagement = {
  // Clear old cached data
  clearStaleCache: (queryClient: QueryClient, maxAge: number = 30 * 60 * 1000) => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    const now = Date.now();
    
    queries.forEach(query => {
      if (query.state.dataUpdatedAt && (now - query.state.dataUpdatedAt) > maxAge) {
        cache.remove(query);
      }
    });
  },

  // Get cache statistics
  getCacheStats: (queryClient: QueryClient) => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const stats = {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      estimatedMemoryMB: 0,
    };

    // Rough memory estimation
    stats.estimatedMemoryMB = queries.reduce((total, query) => {
      if (query.state.data) {
        const size = JSON.stringify(query.state.data).length / 1024 / 1024;
        return total + size;
      }
      return total;
    }, 0);

    return stats;
  },

  // Optimize cache by removing unused queries
  optimizeCache: (queryClient: QueryClient) => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    // Remove queries with no observers and older than 5 minutes
    queries.forEach(query => {
      if (
        query.getObserversCount() === 0 && 
        query.state.dataUpdatedAt &&
        (Date.now() - query.state.dataUpdatedAt) > 5 * 60 * 1000
      ) {
        cache.remove(query);
      }
    });
  },
};

// Performance monitoring
export const PerformanceMonitoring = {
  // Track query performance
  trackQueryPerformance: (queryKey: string, startTime: number) => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      logger.info("⏱️ Query ${queryKey} took ${duration.toFixed(2)}ms");
      
      // Mark performance for DevTools
      performance.mark(`query-${queryKey}-end`);
      performance.measure(
        `query-${queryKey}`,
        `query-${queryKey}-start`,
        `query-${queryKey}-end`
      );
    }
  },

  // Monitor cache hit rate
  getCacheHitRate: (queryClient: QueryClient): number => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    if (queries.length === 0) return 0;
    
    const cachedQueries = queries.filter(q => 
      q.state.status === 'success' && q.state.dataUpdatedAt
    ).length;
    
    return (cachedQueries / queries.length) * 100;
  },
};