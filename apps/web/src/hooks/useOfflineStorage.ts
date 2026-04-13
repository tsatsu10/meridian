/**
 * useOfflineStorage Hook
 * React hook for managing offline storage and sync
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isOnline,
  setupOnlineListeners,
  getFromCache,
  saveToCache,
  queuePendingUpdate,
  processPendingUpdates,
  getPendingUpdates,
  getCacheAge,
  getStorageUsage,
} from '@/lib/offline-storage';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export interface UseOfflineStorageOptions<T> {
  cacheKey: string;
  fetchFn: () => Promise<T>;
  updateFn?: (data: T) => Promise<void>;
  onOnline?: () => void;
  onOffline?: () => void;
  maxCacheAge?: number;
}

export function useOfflineStorage<T>({
  cacheKey,
  fetchFn,
  updateFn,
  onOnline,
  onOffline,
  maxCacheAge,
}: UseOfflineStorageOptions<T>) {
  const [isOnlineState, setIsOnlineState] = useState(isOnline());
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  // Fetch data with caching
  const fetchData = useCallback(async (force = false) => {
    setIsLoading(true);

    try {
      // Try cache first if offline or not forcing
      if (!force && !isOnlineState) {
        const cached = getFromCache<T>(cacheKey, maxCacheAge);
        if (cached) {
          setData(cached);
          setCacheAge(getCacheAge(cacheKey));
          setIsLoading(false);
          return cached;
        }
      }

      // Fetch fresh data if online
      if (isOnlineState) {
        const freshData = await fetchFn();
        setData(freshData);
        saveToCache(cacheKey, freshData);
        setCacheAge(0);
        setIsLoading(false);
        return freshData;
      }

      // Offline and no cache
      const cached = getFromCache<T>(cacheKey, Infinity); // Get even expired cache
      if (cached) {
        setData(cached);
        setCacheAge(getCacheAge(cacheKey));
        toast.info('Showing cached data (offline)');
      }
      
      setIsLoading(false);
      return cached;
    } catch (error) {
      logger.error('Failed to fetch data:', error);
      
      // Try cache on error
      const cached = getFromCache<T>(cacheKey, Infinity);
      if (cached) {
        setData(cached);
        setCacheAge(getCacheAge(cacheKey));
        toast.info('Showing cached data (network error)');
      } else {
        toast.error('Failed to load data and no cache available');
      }
      
      setIsLoading(false);
      return cached;
    }
  }, [cacheKey, maxCacheAge, isOnlineState, fetchFn]);

  // Sync pending updates
  const syncPendingUpdates = useCallback(async () => {
    if (!updateFn || !isOnlineState) return;

    const pending = getPendingUpdates();
    if (pending.length === 0) return;

    setIsSyncing(true);

    try {
      await processPendingUpdates(async (update) => {
        if (update.type === 'update') {
          await updateFn(update.data);
        }
      });

      toast.success(`Synced ${pending.length} pending changes`);
      
      // Refresh data after sync
      await fetchData(true);
    } catch (error) {
      logger.error('Failed to sync pending updates:', error);
      toast.error('Some changes failed to sync. Will retry later.');
    } finally {
      setIsSyncing(false);
    }
  }, [updateFn, isOnlineState, fetchData]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnlineState(true);
      logger.info('Connection restored');
      toast.success('Back online! Syncing data...');
      
      if (onOnline) onOnline();
      
      // Sync pending updates
      syncPendingUpdates();
      
      // Refresh data
      fetchData(true);
    };

    const handleOffline = () => {
      setIsOnlineState(false);
      logger.warn('Connection lost - working offline');
      toast.warning('You\'re offline. Changes will sync when connection is restored.');
      
      if (onOffline) onOffline();
    };

    const cleanup = setupOnlineListeners(handleOnline, handleOffline);
    return cleanup;
  }, [onOnline, onOffline, syncPendingUpdates, fetchData]);

  // Update data with offline queueing
  const updateData = useCallback(async (newData: T) => {
    if (!updateFn) {
      throw new Error('updateFn not provided');
    }

    try {
      if (isOnlineState) {
        // Online: update immediately
        await updateFn(newData);
        setData(newData);
        saveToCache(cacheKey, newData);
        toast.success('Changes saved');
      } else {
        // Offline: queue for later
        queuePendingUpdate({
          type: 'update',
          data: newData,
          timestamp: Date.now(),
        });
        setData(newData);
        saveToCache(cacheKey, newData);
        toast.info('Changes saved locally. Will sync when online.');
      }
    } catch (error) {
      logger.error('Failed to update data:', error);
      
      // Queue update even on error (might be network issue)
      queuePendingUpdate({
        type: 'update',
        data: newData,
        timestamp: Date.now(),
      });
      
      toast.error('Failed to save. Will retry when online.');
      throw error;
    }
  }, [updateFn, isOnlineState, cacheKey]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    isSyncing,
    isOnline: isOnlineState,
    cacheAge,
    hasPendingUpdates: getPendingUpdates().length > 0,
    storageUsage: getStorageUsage(),
    refetch: () => fetchData(true),
    updateData,
    syncPendingUpdates,
  };
}

/**
 * Simpler hook for read-only offline caching
 */
export function useOfflineCache<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  maxCacheAge?: number
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  const fetchData = useCallback(async (force = false) => {
    setIsLoading(true);

    try {
      // Try cache first
      if (!force) {
        const cached = getFromCache<T>(cacheKey, maxCacheAge);
        if (cached) {
          setData(cached);
          setCacheAge(getCacheAge(cacheKey));
          setIsLoading(false);
          return;
        }
      }

      // Fetch fresh data
      const freshData = await fetchFn();
      setData(freshData);
      saveToCache(cacheKey, freshData);
      setCacheAge(0);
    } catch (error) {
      logger.error('Failed to fetch data:', error);
      
      // Try cache on error
      const cached = getFromCache<T>(cacheKey, Infinity);
      if (cached) {
        setData(cached);
        setCacheAge(getCacheAge(cacheKey));
      }
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, maxCacheAge, fetchFn]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    cacheAge,
    refetch: () => fetchData(true),
  };
}

