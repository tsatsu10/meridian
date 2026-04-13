// Core migration functionality
export {
  migrationManager,
  useUIStore,
  useTasksStore,
  useCommunicationStore,
  useSettingsStore,
  useCacheStore,
  useTeamsStore,
  useDataMigration,
  useMigrationStatus,
  DEFAULT_MIGRATION_CONFIG,
  type MigrationPhase,
  type MigrationConfig,
} from './compatibility-layer';

// Legacy hook compatibility
export {
  useUI,
  useTasks,
  useCommunication,
  useSettings,
  useCache,
  useTeam,
  useTeams,
  useTheme,
  useSidebar,
  useModals,
  useToasts,
  useTaskFilters,
  useTaskComments,
  useMessages,
  useChannels,
  usePresence,
  useUserPreferences,
  useNotificationSettings,
  useTeamMembers,
  useTeamAnalytics,
  useLegacyCompat,
  selectTheme,
  selectTasks,
  selectCurrentChannel,
  selectTeams,
} from './legacy-hooks';

// Migration provider and components
export {
  MigrationProvider,
  useMigration,
  MigrationStatusIndicator,
  MigrationControlPanel,
} from './migration-provider';

// Migration utilities
export const MigrationUtils = {
  // Quick migration helpers
  enableConsolidatedMode: () => {
    migrationManager.setPhase('consolidated');
  },
  
  enableLegacyMode: () => {
    migrationManager.setPhase('legacy');
  },
  
  enableTransitionMode: () => {
    migrationManager.setPhase('transition');
  },
  
  // Feature flag helpers
  enableStore: (store: keyof MigrationConfig['enabledStores']) => {
    const config = migrationManager.getConfig();
    migrationManager.setConfig({
      enabledStores: {
        ...config.enabledStores,
        [store]: true,
      },
    });
  },
  
  disableStore: (store: keyof MigrationConfig['enabledStores']) => {
    const config = migrationManager.getConfig();
    migrationManager.setConfig({
      enabledStores: {
        ...config.enabledStores,
        [store]: false,
      },
    });
  },
  
  // Batch operations
  enableAllStores: () => {
    const config = migrationManager.getConfig();
    migrationManager.setConfig({
      enabledStores: Object.keys(config.enabledStores).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as typeof config.enabledStores
      ),
    });
  },
  
  disableAllStores: () => {
    const config = migrationManager.getConfig();
    migrationManager.setConfig({
      enabledStores: Object.keys(config.enabledStores).reduce(
        (acc, key) => ({ ...acc, [key]: false }),
        {} as typeof config.enabledStores
      ),
    });
  },
  
  // Status checks
  isFullyMigrated: () => {
    const config = migrationManager.getConfig();
    return config.phase === 'consolidated' && 
           Object.values(config.enabledStores).every(enabled => enabled);
  },
  
  isFullyLegacy: () => {
    const config = migrationManager.getConfig();
    return config.phase === 'legacy' && 
           Object.values(config.enabledStores).every(enabled => !enabled);
  },
  
  getMigrationProgress: () => {
    const config = migrationManager.getConfig();
    const enabledCount = Object.values(config.enabledStores).filter(Boolean).length;
    const totalCount = Object.keys(config.enabledStores).length;
    return (enabledCount / totalCount) * 100;
  },
  
  // Debugging
  logMigrationStatus: () => {
    const config = migrationManager.getConfig();
    logger.info("=== Migration Status ===");
    logger.info(`Phase: ${config.currentPhase}`);
    logger.info(`Progress: ${config.progress}%`);
    logger.info("Enabled Stores:");
    logger.info("Feature Flags:");
    logger.info("=======================");
  },
};

// Import the migrationManager to make it available
import { migrationManager, type MigrationConfig } from './compatibility-layer';
import { logger } from "../../lib/logger";