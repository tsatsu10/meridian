import { migrationManager, MigrationUtils } from './index';
import { logger } from "../../lib/logger";

// Migration setup configuration
interface MigrationSetupConfig {
  phase: 'legacy' | 'transition' | 'consolidated';
  autoMigrate: boolean;
  enableDevTools: boolean;
  stores: {
    ui: boolean;
    tasks: boolean;
    communication: boolean;
    settings: boolean;
    cache: boolean;
    teams: boolean;
  };
  features: {
    enableProgressiveLoad: boolean;
    enableDataMigration: boolean;
    enableLegacyFallback: boolean;
  };
}

const DEFAULT_SETUP_CONFIG: MigrationSetupConfig = {
  phase: 'transition',
  autoMigrate: false,
  enableDevTools: process.env.NODE_ENV === 'development',
  stores: {
    ui: true,
    tasks: true,
    communication: true,
    settings: true,
    cache: true,
    teams: true,
  },
  features: {
    enableProgressiveLoad: true,
    enableDataMigration: true,
    enableLegacyFallback: true,
  },
};

// Initialize migration system
export function setupMigration(config: Partial<MigrationSetupConfig> = {}) {
  const finalConfig = { ...DEFAULT_SETUP_CONFIG, ...config };
  
  logger.info("🔄 Initializing store migration system...");
  
  // Set initial phase
  migrationManager.setPhase(finalConfig.phase);
  
  // Configure enabled stores
  migrationManager.setConfig({
    enabledStores: finalConfig.stores,
    featureFlags: {
      useNewUISystem: finalConfig.stores.ui,
      useNewTasksSystem: finalConfig.stores.tasks,
      useNewCommunicationSystem: finalConfig.stores.communication,
      useNewSettingsSystem: finalConfig.stores.settings,
      useNewCacheSystem: finalConfig.stores.cache,
      useNewTeamsSystem: finalConfig.stores.teams,
    },
  });
  
  // Log setup status
  if (finalConfig.enableDevTools) {
    MigrationUtils.logMigrationStatus();
  }
  
  logger.info("✅ Store migration system initialized");
  
  return {
    config: finalConfig,
    manager: migrationManager,
    utils: MigrationUtils,
  };
}

// Auto-setup for different environments
export function setupForDevelopment() {
  return setupMigration({
    phase: 'transition',
    autoMigrate: false,
    enableDevTools: true,
    stores: {
      ui: true,
      tasks: true,
      communication: true,
      settings: true,
      cache: true,
      teams: true,
    },
    features: {
      enableProgressiveLoad: true,
      enableDataMigration: true,
      enableLegacyFallback: true,
    },
  });
}

export function setupForProduction() {
  return setupMigration({
    phase: 'consolidated',
    autoMigrate: true,
    enableDevTools: false,
    stores: {
      ui: true,
      tasks: true,
      communication: true,
      settings: true,
      cache: true,
      teams: true,
    },
    features: {
      enableProgressiveLoad: false,
      enableDataMigration: true,
      enableLegacyFallback: false,
    },
  });
}

export function setupForTesting() {
  return setupMigration({
    phase: 'consolidated',
    autoMigrate: false,
    enableDevTools: false,
    stores: {
      ui: true,
      tasks: true,
      communication: true,
      settings: true,
      cache: true,
      teams: true,
    },
    features: {
      enableProgressiveLoad: false,
      enableDataMigration: false,
      enableLegacyFallback: false,
    },
  });
}

// Migration health check
export function checkMigrationHealth() {
  const config = migrationManager.getConfig();
  const issues: string[] = [];
  
  // Check for inconsistent state
  if (config.phase === 'legacy' && Object.values(config.enabledStores).some(Boolean)) {
    issues.push('Legacy phase has enabled stores');
  }
  
  if (config.phase === 'consolidated' && Object.values(config.enabledStores).some(enabled => !enabled)) {
    issues.push('Consolidated phase has disabled stores');
  }
  
  // Check for feature flag consistency
  const storeFlags = Object.entries(config.enabledStores);
  const featureFlags = Object.entries(config.featureFlags);
  
  storeFlags.forEach(([store, enabled]) => {
    const flagName = `useNew${store.charAt(0).toUpperCase() + store.slice(1)}System`;
    const flag = featureFlags.find(([name]) => name === flagName);
    
    if (flag && flag[1] !== enabled) {
      issues.push(`Store ${store} flag mismatch: store=${enabled}, flag=${flag[1]}`);
    }
  });
  
  return {
    healthy: issues.length === 0,
    issues,
    config,
    progress: MigrationUtils.getMigrationProgress(),
  };
}

// Performance monitoring
export function createPerformanceMonitor() {
  let metrics = {
    storeReads: 0,
    storeWrites: 0,
    legacyFallbacks: 0,
    migrationTime: 0,
  };
  
  const startTime = performance.now();
  
  return {
    incrementReads: () => metrics.storeReads++,
    incrementWrites: () => metrics.storeWrites++,
    incrementFallbacks: () => metrics.legacyFallbacks++,
    recordMigrationTime: () => {
      metrics.migrationTime = performance.now() - startTime;
    },
    getMetrics: () => ({ ...metrics }),
    reset: () => {
      metrics = {
        storeReads: 0,
        storeWrites: 0,
        legacyFallbacks: 0,
        migrationTime: 0,
      };
    },
  };
}

export type { MigrationSetupConfig };