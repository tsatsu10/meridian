/**
 * Store Migration Helper - Phase 3 Implementation
 * 
 * Provides compatibility layer and gradual migration utilities
 * for transitioning from legacy stores to consolidated stores
 */

import { useEffect, useState } from 'react';

// Import new consolidated stores
import { useAuthStore } from './auth';
import { useWorkspaceStore } from './workspace';

// Import legacy stores for compatibility
import useWorkspaceStoreLegacy from '../workspace';
import { useSettingsStore } from '../settings';
import { logger } from "../../lib/logger";

// ===== MIGRATION FLAGS =====

interface MigrationFlags {
  useConsolidatedAuth: boolean;
  useConsolidatedWorkspace: boolean;
  useConsolidatedUI: boolean;
  enableLegacyFallback: boolean;
}

const defaultFlags: MigrationFlags = {
  useConsolidatedAuth: true,      // Start with auth migration
  useConsolidatedWorkspace: true, // Workspace is ready
  useConsolidatedUI: false,       // UI store not implemented yet
  enableLegacyFallback: true,     // Keep fallback during transition
};

// Get migration flags from localStorage or use defaults
const getMigrationFlags = (): MigrationFlags => {
  if (typeof window === 'undefined') return defaultFlags;
  
  try {
    const saved = localStorage.getItem('meridian-migration-flags');
    if (saved) {
      return { ...defaultFlags, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.warn('Failed to load migration flags:', error);
  }
  
  return defaultFlags;
};

// Save migration flags
const setMigrationFlags = (flags: Partial<MigrationFlags>) => {
  if (typeof window === 'undefined') return;
  
  try {
    const current = getMigrationFlags();
    const updated = { ...current, ...flags };
    localStorage.setItem('meridian-migration-flags', JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save migration flags:', error);
  }
};

// ===== COMPATIBILITY HOOKS =====

/**
 * Compatibility hook for auth that can use either new or legacy auth
 */
export const useAuthCompatible = () => {
  const flags = getMigrationFlags();
  
  if (flags.useConsolidatedAuth) {
    // Use new consolidated auth store
    const store = useAuthStore();
    return {
      user: store.user,
      isAuthenticated: store.isAuthenticated,
      isLoading: store.isLoading,
      signIn: store.signIn,
      signOut: store.signOut,
      setUser: store.setUser,
      error: store.error,
      // Migration metadata
      __migrationStatus: 'consolidated',
    };
  } else {
    // Fallback to legacy auth (if needed)
    // This would import the legacy auth hooks
    throw new Error('Legacy auth fallback not implemented - consolidated auth is required');
  }
};

/**
 * Compatibility hook for workspace that can use either new or legacy workspace
 */
export const useWorkspaceCompatible = () => {
  const flags = getMigrationFlags();
  
  if (flags.useConsolidatedWorkspace) {
    // Use new consolidated workspace store
    const store = useWorkspaceStore();
    return {
      workspace: store.current,
      workspaces: store.workspaces,
      projects: store.projects,
      members: store.members,
      isLoading: store.isLoading,
      setWorkspace: store.setWorkspace,
      loadWorkspaces: store.loadWorkspaces,
      createWorkspace: store.createWorkspace,
      updateWorkspace: store.updateWorkspace,
      // Migration metadata
      __migrationStatus: 'consolidated',
    };
  } else if (flags.enableLegacyFallback) {
    // Use legacy workspace store
    const legacyStore = useWorkspaceStoreLegacy();
    return {
      workspace: legacyStore.workspace,
      workspaces: [legacyStore.workspace].filter(Boolean),
      projects: [],
      members: [],
      isLoading: false,
      setWorkspace: legacyStore.setWorkspace,
      loadWorkspaces: async () => {},
      createWorkspace: async () => { throw new Error('Not implemented in legacy store'); },
      updateWorkspace: async () => { throw new Error('Not implemented in legacy store'); },
      // Migration metadata
      __migrationStatus: 'legacy',
    };
  } else {
    throw new Error('No workspace store available');
  }
};

/**
 * Settings compatibility hook (uses existing settings store for now)
 */
export const useSettingsCompatible = () => {
  const store = useSettingsStore();
  return {
    settings: store.settings,
    updateSettings: store.updateSettings,
    isLoading: store.isLoading,
    // Migration metadata
    __migrationStatus: 'legacy', // Will be updated when consolidated settings store is ready
  };
};

// ===== MIGRATION UTILITIES =====

/**
 * Hook to monitor and report migration status
 */
export const useMigrationStatus = () => {
  const [flags, setFlags] = useState(getMigrationFlags());
  const [metrics, setMetrics] = useState({
    componentsUsingConsolidated: 0,
    componentsUsingLegacy: 0,
    lastUpdated: new Date(),
  });

  const updateFlags = (newFlags: Partial<MigrationFlags>) => {
    const updated = { ...flags, ...newFlags };
    setFlags(updated);
    setMigrationFlags(updated);
  };

  const getOverallProgress = () => {
    const totalStores = 3; // auth, workspace, ui (planned)
    const migratedStores = 
      (flags.useConsolidatedAuth ? 1 : 0) +
      (flags.useConsolidatedWorkspace ? 1 : 0) +
      (flags.useConsolidatedUI ? 1 : 0);
    
    return Math.round((migratedStores / totalStores) * 100);
  };

  return {
    flags,
    updateFlags,
    metrics,
    overallProgress: getOverallProgress(),
    isFullyMigrated: getOverallProgress() === 100,
  };
};

/**
 * Component-level migration tracker
 */
export const useMigrationTracker = (componentName: string, storeType: 'auth' | 'workspace' | 'ui') => {
  const flags = getMigrationFlags();
  
  useEffect(() => {
    const isUsingConsolidated = 
      (storeType === 'auth' && flags.useConsolidatedAuth) ||
      (storeType === 'workspace' && flags.useConsolidatedWorkspace) ||
      (storeType === 'ui' && flags.useConsolidatedUI);

    // Track migration usage (could be sent to analytics)
    logger.debug(`🔄 Migration: ${componentName} using ${isUsingConsolidated ? 'consolidated' : 'legacy'} ${storeType} store`);
  }, [componentName, storeType, flags]);
};

/**
 * Debug component for showing migration status
 */
export const MigrationDebugInfo = () => {
  const { flags, overallProgress, isFullyMigrated } = useMigrationStatus();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      zIndex: 9999,
      fontFamily: 'monospace',
    }}>
      <div>Migration: {overallProgress}% {isFullyMigrated ? '🎉' : '🚧'}</div>
      <div>Auth: {flags.useConsolidatedAuth ? '✅' : '❌'}</div>
      <div>Workspace: {flags.useConsolidatedWorkspace ? '✅' : '❌'}</div>
      <div>UI: {flags.useConsolidatedUI ? '✅' : '❌'}</div>
    </div>
  );
};

// ===== COMPONENT MIGRATION HELPERS =====

/**
 * Higher-order component for gradual component migration
 */
export const withMigration = <P extends object>(
  Component: React.ComponentType<P>,
  options: {
    stores: ('auth' | 'workspace' | 'ui')[];
    componentName: string;
  }
) => {
  return (props: P) => {
    // Track migration usage for each store this component uses
    options.stores.forEach(store => {
      useMigrationTracker(options.componentName, store);
    });

    return <Component {...props} />;
  };
};

/**
 * Development helper to force migration flags
 */
export const forceMigrationMode = (mode: 'full-legacy' | 'full-consolidated' | 'mixed') => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('forceMigrationMode only works in development');
    return;
  }

  switch (mode) {
    case 'full-legacy':
      setMigrationFlags({
        useConsolidatedAuth: false,
        useConsolidatedWorkspace: false,
        useConsolidatedUI: false,
        enableLegacyFallback: true,
      });
      break;
    case 'full-consolidated':
      setMigrationFlags({
        useConsolidatedAuth: true,
        useConsolidatedWorkspace: true,
        useConsolidatedUI: true,
        enableLegacyFallback: false,
      });
      break;
    case 'mixed':
      setMigrationFlags({
        useConsolidatedAuth: true,
        useConsolidatedWorkspace: true,
        useConsolidatedUI: false,
        enableLegacyFallback: true,
      });
      break;
  }

  logger.info("🔄 Migration mode set to: ${mode}");
  window.location.reload();
};

// Make migration utilities available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__MERIDIAN_MIGRATION__ = {
    forceMigrationMode,
    getMigrationFlags,
    setMigrationFlags,
  };

  logger.info("🔄 Migration utilities available:");
  logger.info("   window.__MERIDIAN_MIGRATION__.forceMigrationMode()");
  logger.info("   window.__MERIDIAN_MIGRATION__.getMigrationFlags()");
}

export default {
  useAuthCompatible,
  useWorkspaceCompatible,
  useSettingsCompatible,
  useMigrationStatus,
  useMigrationTracker,
  withMigration,
  MigrationDebugInfo,
  forceMigrationMode,
};