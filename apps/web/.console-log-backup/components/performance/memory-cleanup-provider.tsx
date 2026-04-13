import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MemoryMonitor } from '@/utils/memory-optimization';

// @epic-3.2-time: Memory management provider for optimal performance
// @persona-mike: Developer needs automated memory management
//
// UPDATED 2025-01-29: Optimized to be less aggressive after fixing root causes:
// - WebSocket cleanup now proper
// - React Query cache settings optimized
// - Database connection pool fixed
// This provider now focuses on gentle periodic cleanup rather than emergency intervention.

interface MemoryCleanupContextType {
  performCleanup: () => void;
  getCurrentUsage: () => number;
  isHighMemory: boolean;
}

const MemoryCleanupContext = createContext<MemoryCleanupContextType | null>(null);

interface MemoryCleanupProviderProps {
  children: React.ReactNode;
}

export function MemoryCleanupProvider({ children }: MemoryCleanupProviderProps) {
  const queryClient = useQueryClient();
  const memoryMonitor = MemoryMonitor.getInstance();
  const isHighMemoryRef = useRef(false);
  const [isHighMemory, setIsHighMemory] = React.useState(false);
  const lastCleanupRef = useRef(Date.now());

  const performCleanup = React.useCallback(() => {
    const now = Date.now();

    // Prevent too frequent cleanups - increased from 30s to 2min
    if (now - lastCleanupRef.current < 120000) {
      return;
    }

    try {
      // Gentle cleanup: only remove truly stale queries (not aggressive)
      const cache = queryClient.getQueryCache();
      const allQueries = cache.getAll();

      // Only cleanup if we have excessive queries (100+, was 50+)
      if (allQueries.length > 100) {
        const staleQueries = allQueries.filter(query =>
          query.isStale() && !(query as any).isFetching && query.state.dataUpdatedAt < Date.now() - 10 * 60 * 1000 // 10min old
        );

        staleQueries.forEach(query => {
          cache.remove(query);
        });

        if (staleQueries.length > 0) {
          console.log(`🧹 Cleaned up ${staleQueries.length} stale queries`);
        }
      }

      // Clear localStorage if it's getting too large (10MB threshold, was 5MB)
      try {
        const storageSize = JSON.stringify(localStorage).length;
        if (storageSize > 10 * 1024 * 1024) {
          const keysToKeep = [
            'meridian-workspace-id',
            'meridian-user-preferences',
            'meridian-auth-token',
            'meridian-ui-theme'
          ];

          const itemsToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && !keysToKeep.includes(key) && key.includes('cache')) {
              itemsToRemove.push(key);
            }
          }

          if (itemsToRemove.length > 0) {
            itemsToRemove.forEach(key => localStorage.removeItem(key));
            console.log(`🧹 Cleaned up ${itemsToRemove.length} localStorage cache items`);
          }
        }
      } catch (e) {
        console.warn('Failed to clean localStorage:', e);
      }

      lastCleanupRef.current = now;
    } catch (error) {
      console.error('❌ Memory cleanup failed:', error);
    }
  }, [queryClient]);

  const getCurrentUsage = React.useCallback(() => {
    return memoryMonitor.getCurrentUsage();
  }, [memoryMonitor]);

  useEffect(() => {
    // Monitor high memory usage with even higher threshold (95%, was 92%)
    const unsubscribe = memoryMonitor.addObserver(0.95, () => {
      if (!isHighMemoryRef.current) {
        isHighMemoryRef.current = true;
        setIsHighMemory(true);
        console.warn('🧠 High memory usage detected (>95%), triggering cleanup');
        performCleanup();
      }
    });

    // Reset high memory flag when usage drops
    const resetMonitor = memoryMonitor.addObserver(0.85, () => {
      if (isHighMemoryRef.current && memoryMonitor.getCurrentUsage() < 0.85) {
        isHighMemoryRef.current = false;
        setIsHighMemory(false);
      }
    });

    // Gentle periodic cleanup - every 5 minutes (was 2 minutes)
    const cleanupInterval = setInterval(() => {
      const usage = memoryMonitor.getCurrentUsage();
      // Only cleanup if memory is truly high (>92%, was >90%)
      if (usage > 0.92) {
        console.log(`🧠 Periodic cleanup triggered (memory: ${Math.round(usage * 100)}%)`);
        performCleanup();
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      unsubscribe();
      resetMonitor();
      clearInterval(cleanupInterval);
    };
  }, [memoryMonitor, performCleanup]);

  const contextValue: MemoryCleanupContextType = {
    performCleanup,
    getCurrentUsage,
    isHighMemory
  };

  return (
    <MemoryCleanupContext.Provider value={contextValue}>
      {children}
      {/* DISABLED: Memory optimization UI notification to remove visual clutter
      {isHighMemory && (
        <div 
          className="fixed top-4 right-4 z-50 bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded-md text-sm"
          style={{ pointerEvents: 'none' }}
        >
          🧠 Optimizing memory usage...
        </div>
      )}
      */}
    </MemoryCleanupContext.Provider>
  );
}

export function useMemoryCleanup() {
  const context = useContext(MemoryCleanupContext);
  if (!context) {
    throw new Error('useMemoryCleanup must be used within a MemoryCleanupProvider');
  }
  return context;
} 