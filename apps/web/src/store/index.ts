/**
 * Meridian State Management - Zustand Edition
 * 
 * Centralized exports for all application stores.
 * Migrated from Redux Toolkit to Zustand for better performance and simpler API.
 */

// Re-export all Zustand stores
export * from './consolidated/auth';
export * from './consolidated/workspace';
export * from './consolidated/tasks';
export * from './consolidated/communication';
export * from './consolidated/teams';
export * from './consolidated/ui';
export * from './consolidated/settings';
export * from './consolidated/cache';

// Re-export standalone stores
export { useProjectStore } from '../stores/projectStore';
export { useTaskStore } from '../stores/taskStore';
export { useWorkspaceStore } from '../stores/workspace-store';
export { useCommunicationStore } from '../stores/communication-store';
export { useNotificationsStore } from './notifications';
export { useProjectFiltersStore } from './project-filters';
export { useUserPreferencesStore } from './user-preferences';
export { useTipsStore } from './tips';

// Export event system (Zustand-compatible)
export { eventBus, emit, on, once, off } from './events/eventBus';
export type { MeridianEvent, EventListener } from './events/eventBus';

// Export cache system (Zustand-compatible)
export { cacheManager, cache } from './cache/cacheManager';
export { cacheInvalidation, invalidateCache, warmCache } from './cache/cacheInvalidation';

// Export migration utilities (for reference, can be removed after verification)
export { setupForDevelopment, setupForProduction, setupForTesting } from './migration/setup';

// Export utility hooks (Zustand-based)
// Note: Legacy Redux-based hooks removed - use consolidated stores directly
// export * from './hooks/useAuth';
// export * from './hooks/useWorkspace';
// export * from './hooks/useProject';
// export * from './hooks/useTask';
// export * from './hooks/useTeam';
// export * from './hooks/useCommunication';
// export * from './hooks/useUI';

/**
 * Store Utilities
 */
export const storeUtils = {
  // Reset all stores
  reset: () => {
    // Each Zustand store can export its own reset method
    logger.debug('Store reset triggered');
  },
  
  // Clear persisted state
  clearPersistedState: () => {
    localStorage.removeItem('auth-storage');
    localStorage.removeItem('workspace-storage');
    localStorage.removeItem('communication-storage');
    localStorage.removeItem('settings-storage');
    logger.debug('Persisted state cleared');
  },
};

/**
 * Development helpers
 */
export const devUtils = {
  // Get all store states (for debugging)
  getAllStates: () => ({
    // Note: This would require each store to export a getState method
    // For now, stores can be inspected via React DevTools
    info: 'Use React DevTools to inspect Zustand stores',
  }),
};
