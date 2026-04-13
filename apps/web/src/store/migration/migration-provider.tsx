import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { logger } from "../../lib/logger";
import { 
  migrationManager, 
  useDataMigration, 
  useMigrationStatus,
  type MigrationPhase,
  type MigrationConfig 
} from './compatibility-layer';

interface MigrationContextType {
  phase: MigrationPhase;
  config: MigrationConfig;
  isTransitioning: boolean;
  error: string | null;
  
  // Migration actions
  setPhase: (phase: MigrationPhase) => void;
  updateConfig: (config: Partial<MigrationConfig>) => void;
  startMigration: () => Promise<boolean>;
  rollbackMigration: () => Promise<boolean>;
  
  // Status helpers
  isLegacy: boolean;
  isConsolidated: boolean;
  canUseNewFeatures: boolean;
}

const MigrationContext = createContext<MigrationContextType | undefined>(undefined);

interface MigrationProviderProps {
  children: ReactNode;
  initialPhase?: MigrationPhase;
  autoMigrate?: boolean;
  onMigrationComplete?: (success: boolean) => void;
  onError?: (error: string) => void;
}

export function MigrationProvider({ 
  children, 
  initialPhase = 'transition',
  autoMigrate = false,
  onMigrationComplete,
  onError 
}: MigrationProviderProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<MigrationConfig>(migrationManager.getConfig());
  
  const { migrateAllData, clearLegacyData } = useDataMigration();
  const status = useMigrationStatus();

  // Initialize migration phase
  useEffect(() => {
    if (initialPhase !== config.phase) {
      migrationManager.setPhase(initialPhase);
    }
  }, [initialPhase]);

  // Listen for migration config changes
  useEffect(() => {
    const unsubscribe = migrationManager.onMigrationChange(() => {
      setConfig(migrationManager.getConfig());
    });
    return unsubscribe;
  }, []);

  // Auto-migrate if enabled
  useEffect(() => {
    if (autoMigrate && config.phase === 'transition') {
      startMigration();
    }
  }, [autoMigrate, config.phase]);

  const setPhase = (phase: MigrationPhase) => {
    try {
      migrationManager.setPhase(phase);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown migration error';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const updateConfig = (updates: Partial<MigrationConfig>) => {
    try {
      migrationManager.setConfig(updates);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown config error';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const startMigration = async (): Promise<boolean> => {
    setIsTransitioning(true);
    setError(null);

    try {
      logger.info("Starting store migration...");
      
      // Phase 1: Ensure we're in transition mode
      if (config.phase !== 'transition') {
        migrationManager.setPhase('transition');
      }

      // Phase 2: Migrate existing data
      const dataMigrated = migrateAllData();
      if (!dataMigrated) {
        throw new Error('Data migration failed');
      }

      // Phase 3: Gradually enable new stores
      const stores = ['ui', 'settings', 'cache', 'tasks', 'communication', 'teams'] as const;
      
      for (const store of stores) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for smooth transition
        
        migrationManager.setConfig({
          enabledStores: {
            ...migrationManager.getConfig().enabledStores,
            [store]: true,
          },
          featureFlags: {
            ...migrationManager.getConfig().featureFlags,
            [`useNew${store.charAt(0).toUpperCase() + store.slice(1)}System`]: true,
          },
        });
        
        logger.info("Enabled ${store} store");
      }

      // Phase 4: Switch to fully consolidated mode
      migrationManager.setPhase('consolidated');
      
      // Phase 5: Clean up legacy data
      clearLegacyData();

      logger.info("Store migration completed successfully");
      onMigrationComplete?.(true);
      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Migration failed';
      console.error('Migration failed:', errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
      onMigrationComplete?.(false);
      return false;
    } finally {
      setIsTransitioning(false);
    }
  };

  const rollbackMigration = async (): Promise<boolean> => {
    setIsTransitioning(true);
    setError(null);

    try {
      logger.info("Rolling back migration...");
      
      // Switch back to legacy mode
      migrationManager.setPhase('legacy');
      
      logger.info("Rollback completed");
      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Rollback failed';
      console.error('Rollback failed:', errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    } finally {
      setIsTransitioning(false);
    }
  };

  const contextValue: MigrationContextType = {
    phase: config.phase,
    config,
    isTransitioning,
    error,
    
    setPhase,
    updateConfig,
    startMigration,
    rollbackMigration,
    
    isLegacy: config.phase === 'legacy',
    isConsolidated: config.phase === 'consolidated',
    canUseNewFeatures: config.phase !== 'legacy',
  };

  return (
    <MigrationContext.Provider value={contextValue}>
      {children}
    </MigrationContext.Provider>
  );
}

export function useMigration(): MigrationContextType {
  const context = useContext(MigrationContext);
  if (context === undefined) {
    throw new Error('useMigration must be used within a MigrationProvider');
  }
  return context;
}

// Migration status indicator component
export function MigrationStatusIndicator() {
  const { phase, isTransitioning, error } = useMigration();

  if (!isTransitioning && phase === 'consolidated') {
    return null; // Don't show indicator when fully migrated
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`
        px-4 py-2 rounded-lg shadow-lg text-sm font-medium
        ${error 
          ? 'bg-red-100 text-red-800 border border-red-200' 
          : isTransitioning 
            ? 'bg-blue-100 text-blue-800 border border-blue-200'
            : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
        }
      `}>
        {error ? (
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>Migration Error: {error}</span>
          </div>
        ) : isTransitioning ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Migrating stores...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span>🔄</span>
            <span>Migration mode: {phase}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Migration control panel for development
export function MigrationControlPanel() {
  const { 
    phase, 
    isTransitioning, 
    error,
    setPhase, 
    startMigration, 
    rollbackMigration,
    config 
  } = useMigration();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
      <h3 className="text-lg font-semibold mb-3">Migration Control</h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Phase: <span className="font-mono text-blue-600">{phase}</span>
          </label>
          <select 
            value={phase}
            onChange={(e) => setPhase(e.target.value as MigrationPhase)}
            disabled={isTransitioning}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="legacy">Legacy</option>
            <option value="transition">Transition</option>
            <option value="consolidated">Consolidated</option>
          </select>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={startMigration}
            disabled={isTransitioning || phase === 'consolidated'}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isTransitioning ? 'Migrating...' : 'Start Migration'}
          </button>
          
          <button
            onClick={rollbackMigration}
            disabled={isTransitioning || phase === 'legacy'}
            className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:bg-gray-400"
          >
            Rollback
          </button>
        </div>
        
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
        
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-600">Store Status</summary>
          <div className="mt-2 space-y-1">
            {Object.entries(config.enabledStores).map(([store, enabled]) => (
              <div key={store} className="flex justify-between">
                <span>{store}:</span>
                <span className={enabled ? 'text-green-600' : 'text-red-600'}>
                  {enabled ? '✅' : '❌'}
                </span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}