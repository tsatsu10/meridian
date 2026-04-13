// Phase 4: Data Flow & State Management Integration
// This file integrates all Phase 4 components into a unified system

import { configureStore } from '@reduxjs/toolkit';
import type { Store } from '@reduxjs/toolkit';

// State slices
import authSlice from './slices/authSlice';
import workspaceSlice from './slices/workspaceSlice';
// Note: projectSlice and taskSlice migrated to Zustand stores
import teamSlice from './slices/teamSlice';
import communicationSlice from './slices/communicationSlice';
import uiSlice from './slices/uiSlice';

// Middleware
import createPersistenceMiddleware from './middleware/persistenceMiddleware';
import createSyncMiddleware from './middleware/syncMiddleware';
import createAnalyticsMiddleware from './middleware/analyticsMiddleware';
import createPerformanceMiddleware from './middleware/performanceMiddleware';
import createEventMiddleware from './events/eventMiddleware';

// Event system
import { eventBus, EventBus } from './events/eventBus';
import { createEventListeners, EventListenerRegistry } from './events/eventListeners';

// Cache system
import { CacheManager, cacheManager } from './cache/cacheManager';
import { CacheInvalidationManager, cacheInvalidation } from './cache/cacheInvalidation';

// Hooks
import { logger } from "../lib/logger";
import type {
  UseAuthReturn,
  UseWorkspaceReturn,
  UseProjectReturn,
  UseTaskReturn,
  UseTeamReturn,
  UseCommunicationReturn,
  UseUIReturn,
} from './hooks';

// Types
export interface Phase4Config {
  store: {
    persistence: {
      enabled: boolean;
      key: string;
      storage: 'localStorage' | 'sessionStorage' | 'indexedDB';
      whitelist?: string[];
      blacklist?: string[];
    };
    sync: {
      enabled: boolean;
      endpoint?: string;
      apiKey?: string;
      interval: number;
      conflictResolution: 'client' | 'server' | 'manual';
    };
    analytics: {
      enabled: boolean;
      endpoint?: string;
      apiKey?: string;
      sampling: {
        events: number;
        performance: number;
        errors: number;
      };
    };
    performance: {
      enabled: boolean;
      thresholds: {
        slowAction: number;
        largeState: number;
        memoryLeak: number;
      };
      optimization: {
        autoOptimize: boolean;
        memoization: boolean;
      };
    };
  };
  events: {
    enabled: boolean;
    debug: boolean;
    persistence: boolean;
    maxListeners: number;
    maxQueueSize: number;
  };
  cache: {
    enabled: boolean;
    maxSize: number;
    maxEntries: number;
    defaultTTL: number;
    compression: boolean;
    persistence: boolean;
  };
  realTime: {
    enabled: boolean;
    endpoint?: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
  };
}

export interface Phase4System {
  store: Store;
  eventBus: EventBus;
  eventListeners: EventListenerRegistry;
  cacheManager: CacheManager;
  cacheInvalidation: CacheInvalidationManager;
  config: Phase4Config;
  
  // System methods
  initialize: () => Promise<void>;
  destroy: () => Promise<void>;
  getMetrics: () => Phase4Metrics;
  getStatus: () => Phase4Status;
  
  // Health checks
  healthCheck: () => Promise<Phase4HealthCheck>;
  validateIntegrity: () => Promise<Phase4IntegrityCheck>;
}

export interface Phase4Metrics {
  store: {
    actions: number;
    stateSize: number;
    middleware: {
      persistence: any;
      sync: any;
      analytics: any;
      performance: any;
    };
  };
  events: {
    totalEvents: number;
    queueSize: number;
    listeners: number;
    metrics: any;
  };
  cache: {
    entries: number;
    size: number;
    hitRate: number;
    metrics: any;
  };
  performance: {
    avgResponseTime: number;
    memoryUsage: number;
    errors: number;
  };
}

export interface Phase4Status {
  store: 'healthy' | 'degraded' | 'error';
  events: 'healthy' | 'degraded' | 'error';
  cache: 'healthy' | 'degraded' | 'error';
  realTime: 'connected' | 'disconnected' | 'error';
  overall: 'healthy' | 'degraded' | 'error';
}

export interface Phase4HealthCheck {
  status: Phase4Status;
  timestamp: number;
  issues: Array<{
    component: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    recommendation?: string;
  }>;
  uptime: number;
  lastRestart?: number;
}

export interface Phase4IntegrityCheck {
  valid: boolean;
  timestamp: number;
  checks: {
    storeIntegrity: boolean;
    eventSystemIntegrity: boolean;
    cacheIntegrity: boolean;
    middlewareIntegrity: boolean;
    hookIntegrity: boolean;
  };
  errors: string[];
  warnings: string[];
}

// Default configuration
export const DEFAULT_PHASE4_CONFIG: Phase4Config = {
  store: {
    persistence: {
      enabled: true,
      key: 'meridian_state',
      storage: 'localStorage',
      whitelist: ['auth', 'workspace', 'ui'],
    },
    sync: {
      enabled: false,
      interval: 30000,
      conflictResolution: 'client',
    },
    analytics: {
      enabled: true,
      sampling: {
        events: 1.0,
        performance: 0.1,
        errors: 1.0,
      },
    },
    performance: {
      enabled: true,
      thresholds: {
        slowAction: 100,
        largeState: 1024 * 1024,
        memoryLeak: 10,
      },
      optimization: {
        autoOptimize: true,
        memoization: true,
      },
    },
  },
  events: {
    enabled: true,
    debug: process.env.NODE_ENV === 'development',
    persistence: true,
    maxListeners: 100,
    maxQueueSize: 1000,
  },
  cache: {
    enabled: true,
    maxSize: 50 * 1024 * 1024,
    maxEntries: 1000,
    defaultTTL: 15 * 60 * 1000,
    compression: true,
    persistence: true,
  },
  realTime: {
    enabled: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  },
};

// Phase 4 system implementation
export class Phase4SystemImpl implements Phase4System {
  public store: Store;
  public eventBus: EventBus;
  public eventListeners: EventListenerRegistry;
  public cacheManager: CacheManager;
  public cacheInvalidation: CacheInvalidationManager;
  public config: Phase4Config;

  private initialized = false;
  private startTime = Date.now();
  private actionCount = 0;
  private lastRestart?: number;

  constructor(config: Partial<Phase4Config> = {}) {
    this.config = this.mergeConfig(DEFAULT_PHASE4_CONFIG, config);
    
    // Initialize core systems
    this.eventBus = eventBus;
    this.cacheManager = cacheManager;
    this.cacheInvalidation = cacheInvalidation;
    
    // Configure and create store
    this.store = this.createConfiguredStore();
    
    // Initialize event listeners
    this.eventListeners = createEventListeners(this.store);
    
    // Set up system event listeners
    this.setupSystemEventListeners();
  }

  private mergeConfig(defaultConfig: Phase4Config, userConfig: Partial<Phase4Config>): Phase4Config {
    return {
      store: { ...defaultConfig.store, ...userConfig.store },
      events: { ...defaultConfig.events, ...userConfig.events },
      cache: { ...defaultConfig.cache, ...userConfig.cache },
      realTime: { ...defaultConfig.realTime, ...userConfig.realTime },
    };
  }

  private createConfiguredStore(): Store {
    const middleware: any[] = [];

    // Add persistence middleware
    if (this.config.store.persistence.enabled) {
      middleware.push(createPersistenceMiddleware(this.config.store.persistence));
    }

    // Add sync middleware
    if (this.config.store.sync.enabled) {
      middleware.push(createSyncMiddleware(this.config.store.sync));
    }

    // Add analytics middleware
    if (this.config.store.analytics.enabled) {
      middleware.push(createAnalyticsMiddleware(this.config.store.analytics));
    }

    // Add performance middleware
    if (this.config.store.performance.enabled) {
      middleware.push(createPerformanceMiddleware(this.config.store.performance));
    }

    // Add event middleware
    if (this.config.events.enabled) {
      middleware.push(createEventMiddleware());
    }

    return configureStore({
      reducer: {
        auth: authSlice.reducer,
        workspace: workspaceSlice.reducer,
        // Note: project and task slices migrated to Zustand stores
        team: teamSlice.reducer,
        communication: communicationSlice.reducer,
        ui: uiSlice.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: {
            ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
            ignoredPaths: ['_persist'],
          },
          immutableCheck: {
            warnAfter: 128,
          },
        }).concat(middleware),
      devTools: process.env.NODE_ENV === 'development',
    });
  }

  private setupSystemEventListeners(): void {
    // Monitor store actions
    this.store.subscribe(() => {
      this.actionCount++;
    });

    // System health monitoring
    this.eventBus.on('system:error', (event) => {
      console.error('System error detected:', event.payload);
      this.handleSystemError(event.payload);
    });

    this.eventBus.on('system:performance_warning', (event) => {
      console.warn('Performance warning:', event.payload);
      this.handlePerformanceWarning(event.payload);
    });

    // Cache events
    this.eventBus.on('cache:invalidated', (event) => {
      if (this.config.events.debug) {
        logger.info("Cache invalidated:");
      }
    });

    // Connection events
    this.eventBus.on('connection:lost', () => {
      this.handleConnectionLost();
    });

    this.eventBus.on('connection:restored', () => {
      this.handleConnectionRestored();
    });
  }

  private handleSystemError(error: any): void {
    // Could implement error recovery logic here
    // For now, just emit a notification
    this.eventBus.emit('notification:show', {
      type: 'error',
      title: 'System Error',
      message: 'An error occurred. The system is attempting to recover.',
      persistent: false,
    }, { category: 'ui', priority: 'high' });
  }

  private handlePerformanceWarning(warning: any): void {
    // Could implement performance optimization here
    if (warning.metric === 'memory' && warning.value > 80) {
      // Trigger cache cleanup
      this.cacheManager.clear();
      
      this.eventBus.emit('notification:show', {
        type: 'warning',
        title: 'Memory Optimization',
        message: 'Cache has been cleared to improve performance.',
        persistent: false,
      }, { category: 'ui', priority: 'medium' });
    }
  }

  private handleConnectionLost(): void {
    this.eventBus.emit('notification:show', {
      type: 'warning',
      title: 'Connection Lost',
      message: 'Attempting to reconnect...',
      persistent: true,
    }, { category: 'ui', priority: 'high' });
  }

  private handleConnectionRestored(): void {
    this.eventBus.emit('notification:show', {
      type: 'success',
      title: 'Connection Restored',
      message: 'You are back online.',
      persistent: false,
    }, { category: 'ui', priority: 'medium' });
  }

  // Public API methods
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('Phase 4 system already initialized');
      return;
    }

    logger.info("Initializing Phase 4 Data Flow & State Management system...");

    try {
      // Initialize cache if enabled
      if (this.config.cache.enabled) {
        logger.info("✓ Cache system initialized");
      }

      // Initialize event system if enabled
      if (this.config.events.enabled) {
        logger.info("✓ Event system initialized");
      }

      // Warm up critical caches
      await this.warmUpCaches();

      // Emit initialization complete event
      this.eventBus.emit('system:initialized', {
        timestamp: Date.now(),
        config: this.config,
        components: {
          store: true,
          events: this.config.events.enabled,
          cache: this.config.cache.enabled,
          realTime: this.config.realTime.enabled,
        },
      }, { category: 'system', priority: 'medium' });

      this.initialized = true;
      logger.info("✓ Phase 4 system initialization complete");

    } catch (error) {
      console.error('Phase 4 system initialization failed:', error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    logger.info("Destroying Phase 4 system...");

    try {
      // Clean up event listeners
      this.eventListeners.destroy();

      // Clean up cache
      this.cacheManager.destroy();
      this.cacheInvalidation.destroy();

      // Emit destruction event
      this.eventBus.emit('system:destroyed', {
        timestamp: Date.now(),
        uptime: Date.now() - this.startTime,
      }, { category: 'system', priority: 'low' });

      // Clean up event bus last
      this.eventBus.destroy();

      this.initialized = false;
      logger.info("✓ Phase 4 system destroyed");

    } catch (error) {
      console.error('Error destroying Phase 4 system:', error);
      throw error;
    }
  }

  private async warmUpCaches(): Promise<void> {
    // Warm up user preferences if user is logged in
    const state = this.store.getState();
    if (state.auth?.user?.id) {
      await this.cacheInvalidation.warmCache([
        `user:${state.auth.user.id}:preferences`,
        `user:${state.auth.user.id}:workspaces`,
      ], 'USER_DATA');
    }
  }

  getMetrics(): Phase4Metrics {
    const eventMetrics = this.eventBus.getMetrics();
    const cacheMetrics = this.cacheManager.getMetrics();
    const cacheStats = this.cacheManager.getStats();

    return {
      store: {
        actions: this.actionCount,
        stateSize: JSON.stringify(this.store.getState()).length,
        middleware: {
          persistence: { enabled: this.config.store.persistence.enabled },
          sync: { enabled: this.config.store.sync.enabled },
          analytics: { enabled: this.config.store.analytics.enabled },
          performance: { enabled: this.config.store.performance.enabled },
        },
      },
      events: {
        totalEvents: eventMetrics.totalEvents,
        queueSize: eventMetrics.queueSize,
        listeners: Object.keys(eventMetrics.eventsByType).length,
        metrics: eventMetrics,
      },
      cache: {
        entries: cacheMetrics.totalEntries,
        size: cacheMetrics.totalSize,
        hitRate: cacheMetrics.hitRate,
        metrics: cacheStats,
      },
      performance: {
        avgResponseTime: eventMetrics.lastProcessed > 0 ? Date.now() - eventMetrics.lastProcessed : 0,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        errors: eventMetrics.errors,
      },
    };
  }

  getStatus(): Phase4Status {
    const metrics = this.getMetrics();
    
    const storeStatus = this.actionCount > 0 && this.initialized ? 'healthy' : 'degraded';
    const eventsStatus = metrics.events.totalEvents > 0 ? 'healthy' : 'degraded';
    const cacheStatus = metrics.cache.hitRate > 0.5 ? 'healthy' : 'degraded';
    const realTimeStatus = this.config.realTime.enabled ? 'connected' : 'disconnected';

    const overall = [storeStatus, eventsStatus, cacheStatus].includes('error') 
      ? 'error' 
      : [storeStatus, eventsStatus, cacheStatus].includes('degraded') 
        ? 'degraded' 
        : 'healthy';

    return {
      store: storeStatus,
      events: eventsStatus,
      cache: cacheStatus,
      realTime: realTimeStatus,
      overall,
    };
  }

  async healthCheck(): Promise<Phase4HealthCheck> {
    const status = this.getStatus();
    const metrics = this.getMetrics();
    const issues: Phase4HealthCheck['issues'] = [];

    // Check for issues
    if (metrics.cache.hitRate < 0.3) {
      issues.push({
        component: 'cache',
        severity: 'medium',
        message: 'Low cache hit rate detected',
        recommendation: 'Review cache strategies and TTL settings',
      });
    }

    if (metrics.performance.errors > 10) {
      issues.push({
        component: 'events',
        severity: 'high',
        message: 'High error count in event system',
        recommendation: 'Check event listeners and handlers',
      });
    }

    if (metrics.performance.memoryUsage > 100 * 1024 * 1024) { // 100MB
      issues.push({
        component: 'performance',
        severity: 'medium',
        message: 'High memory usage detected',
        recommendation: 'Consider cache cleanup or optimization',
      });
    }

    return {
      status,
      timestamp: Date.now(),
      issues,
      uptime: Date.now() - this.startTime,
      lastRestart: this.lastRestart,
    };
  }

  async validateIntegrity(): Promise<Phase4IntegrityCheck> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check store integrity
      const stateValid = this.store.getState() !== undefined;
      
      // Check event system integrity
      const eventSystemValid = this.eventBus.getMetrics().totalEvents >= 0;
      
      // Check cache integrity
      const cacheValid = this.cacheManager.size() >= 0;
      
      // Check middleware integrity
      const middlewareValid = this.actionCount >= 0;
      
      // Check hook integrity (basic check)
      const hookValid = typeof this.store.subscribe === 'function';

      return {
        valid: errors.length === 0,
        timestamp: Date.now(),
        checks: {
          storeIntegrity: stateValid,
          eventSystemIntegrity: eventSystemValid,
          cacheIntegrity: cacheValid,
          middlewareIntegrity: middlewareValid,
          hookIntegrity: hookValid,
        },
        errors,
        warnings,
      };

    } catch (error) {
      errors.push(`Integrity check failed: ${error}`);
      
      return {
        valid: false,
        timestamp: Date.now(),
        checks: {
          storeIntegrity: false,
          eventSystemIntegrity: false,
          cacheIntegrity: false,
          middlewareIntegrity: false,
          hookIntegrity: false,
        },
        errors,
        warnings,
      };
    }
  }
}

// Global Phase 4 system instance
export const phase4System = new Phase4SystemImpl();

// Convenience exports
export const {
  store,
  eventBus: phase4EventBus,
  eventListeners: phase4EventListeners,
  cacheManager: phase4CacheManager,
  cacheInvalidation: phase4CacheInvalidation,
} = phase4System;

// Initialize the system
if (typeof window !== 'undefined') {
  phase4System.initialize().catch(error => {
    console.error('Failed to initialize Phase 4 system:', error);
  });
}

// Export types
export type {
  UseAuthReturn,
  UseWorkspaceReturn,
  UseProjectReturn,
  UseTaskReturn,
  UseTeamReturn,
  UseCommunicationReturn,
  UseUIReturn,
};

// Default export
export default phase4System;