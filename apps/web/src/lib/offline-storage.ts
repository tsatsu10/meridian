/**
 * Offline Storage Utilities
 * Provides localStorage/IndexedDB caching for offline support
 */

// Note: logger import removed - using console for offline utilities to avoid circular dependencies

// Cache keys
export const CACHE_KEYS = {
  PROFILE: 'meridian_profile_cache',
  PROFILE_TIMESTAMP: 'meridian_profile_timestamp',
  PENDING_UPDATES: 'meridian_pending_updates',
  FAVORITES: 'meridian_favorites_cache',
  ONLINE_STATUS: 'meridian_online_status',
} as const;

// Cache expiration (5 minutes)
const CACHE_EXPIRATION_MS = 5 * 60 * 1000;

/**
 * Check if we're online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Set up online/offline event listeners
 */
export function setupOnlineListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/**
 * Save data to localStorage with timestamp
 */
export function saveToCache<T>(key: string, data: T): void {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`Failed to save to cache (${key}):`, error);
  }
}

/**
 * Get data from localStorage cache
 */
export function getFromCache<T>(key: string, maxAge: number = CACHE_EXPIRATION_MS): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    const age = Date.now() - cacheData.timestamp;

    // Check if cache is expired
    if (age > maxAge) {
      localStorage.removeItem(key);
      return null;
    }

    return cacheData.data;
  } catch (error) {
    console.error(`Failed to get from cache (${key}):`, error);
    return null;
  }
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to clear cache (${key}):`, error);
  }
}

/**
 * Clear all app caches
 */
export function clearAllCaches(): void {
  try {
    Object.values(CACHE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Failed to clear all caches:', error);
  }
}

/**
 * Queue an update for when connection is restored
 */
export function queuePendingUpdate(update: {
  type: string;
  data: any;
  timestamp: number;
}): void {
  try {
    const pending = getPendingUpdates();
    pending.push(update);
    localStorage.setItem(CACHE_KEYS.PENDING_UPDATES, JSON.stringify(pending));
  } catch (error) {
    console.error('Failed to queue pending update:', error);
  }
}

/**
 * Get all pending updates
 */
export function getPendingUpdates(): Array<{
  type: string;
  data: any;
  timestamp: number;
}> {
  try {
    const pending = localStorage.getItem(CACHE_KEYS.PENDING_UPDATES);
    return pending ? JSON.parse(pending) : [];
  } catch (error) {
    console.error('Failed to get pending updates:', error);
    return [];
  }
}

/**
 * Clear pending updates after successful sync
 */
export function clearPendingUpdates(): void {
  try {
    localStorage.removeItem(CACHE_KEYS.PENDING_UPDATES);
  } catch (error) {
    console.error('Failed to clear pending updates:', error);
  }
}

/**
 * Process pending updates when connection is restored
 */
export async function processPendingUpdates(
  updateHandler: (update: any) => Promise<void>
): Promise<void> {
  const pending = getPendingUpdates();
  
  if (pending.length === 0) return;

  console.log(`Processing ${pending.length} pending updates...`);

  const results = await Promise.allSettled(
    pending.map((update) => updateHandler(update))
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`Sync complete: ${succeeded} succeeded, ${failed} failed`);

  // Clear successfully processed updates
  if (succeeded > 0) {
    clearPendingUpdates();
  }
}

/**
 * Check if cache is valid
 */
export function isCacheValid(key: string, maxAge: number = CACHE_EXPIRATION_MS): boolean {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return false;

    const cacheData = JSON.parse(cached);
    const age = Date.now() - cacheData.timestamp;

    return age <= maxAge;
  } catch {
    return false;
  }
}

/**
 * Get cache age in milliseconds
 */
export function getCacheAge(key: string): number | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    return Date.now() - cacheData.timestamp;
  } catch {
    return null;
  }
}

/**
 * Format cache age for display
 */
export function formatCacheAge(ageMs: number): string {
  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

/**
 * Get storage usage
 */
export function getStorageUsage(): { used: number; total: number; percentage: number } {
  try {
    let used = 0;
    // Iterate localStorage safely (avoid prototype properties)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          used += value.length + key.length;
        }
      }
    }

    // Most browsers allow 5-10MB for localStorage
    const total = 5 * 1024 * 1024; // 5MB estimate
    const percentage = (used / total) * 100;

    return {
      used,
      total,
      percentage: Math.round(percentage * 100) / 100,
    };
  } catch {
    return { used: 0, total: 0, percentage: 0 };
  }
}

/**
 * Hook for React components to use offline storage
 */
export interface UseOfflineStorageResult {
  isOnline: boolean;
  hasPendingUpdates: boolean;
  cacheAge: number | null;
  storageUsage: ReturnType<typeof getStorageUsage>;
}

