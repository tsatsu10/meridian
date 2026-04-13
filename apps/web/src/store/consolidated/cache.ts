// Consolidated Cache Store
// Combines cacheManager.ts, cacheInvalidation.ts, and event-driven caching
// into a single Zustand store with comprehensive caching, invalidation, and event management

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { logger } from "../../lib/logger";

// Core cache types
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  dependencies?: string[];
  version: number;
  compressed?: boolean;
}

export interface CachePolicy {
  name: string;
  evict: (entries: Map<string, CacheEntry>, newEntry: CacheEntry) => string[];
  priority: number;
}

export interface CacheStrategy {
  name: string;
  shouldCache: (key: string, value: any, context?: any) => boolean;
  getTTL: (key: string, value: any, context?: any) => number;
  getPriority: (key: string, value: any, context?: any) => CacheEntry['priority'];
  getTags: (key: string, value: any, context?: any) => string[];
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  totalSize: number;
  totalEntries: number;
  hitRate: number;
  avgAccessTime: number;
  compressionRatio: number;
  lastCleanup: number;
  policyUsage: Record<string, number>;
}

// Event system types
export interface MeridianEvent {
  id: string;
  type: string;
  category: 'user' | 'system' | 'network' | 'ui' | 'data' | 'error' | 'performance';
  payload: any;
  timestamp: number;
  source: string;
  target?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  persistent?: boolean;
  retryable?: boolean;
  maxRetries?: number;
  currentRetries?: number;
  ttl?: number;
}

export interface EventListener<T = any> {
  id: string;
  eventType: string | RegExp;
  handler: (event: MeridianEvent<T>) => void | Promise<void>;
  filter?: (event: MeridianEvent<T>) => boolean;
  once?: boolean;
  priority: number;
  source?: string;
  category?: MeridianEvent['category'];
  active: boolean;
  errorHandler?: (error: Error, event: MeridianEvent<T>) => void;
}

export interface EventMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByCategory: Record<string, number>;
  processingTimes: Record<string, number[]>;
  errors: number;
  retries: number;
  queueSize: number;
  lastProcessed: number;
}

// Invalidation rule types
export interface InvalidationRule {
  id: string;
  name: string;
  trigger: {
    eventType: string | RegExp;
    condition?: (event: MeridianEvent) => boolean;
  };
  action: {
    type: 'key' | 'tag' | 'pattern' | 'dependency' | 'custom';
    target: string | RegExp | ((event: MeridianEvent) => string | string[]);
    options?: {
      cascade?: boolean;
      delay?: number;
      batch?: boolean;
    };
  };
  priority: number;
  enabled: boolean;
  metadata?: Record<string, any>;
}

export interface InvalidationMetrics {
  totalInvalidations: number;
  invalidationsByRule: Record<string, number>;
  invalidationsByType: Record<string, number>;
  cascadeInvalidations: number;
  batchedInvalidations: number;
  averageInvalidationTime: number;
  lastInvalidation: number;
}

// Configuration interfaces
export interface CacheConfig {
  maxSize: number;
  maxEntries: number;
  defaultTTL: number;
  enableCompression: boolean;
  enablePersistence: boolean;
  enableMetrics: boolean;
  enableDebugLogging: boolean;
  cleanupInterval: number;
  compressionThreshold: number;
  persistenceKey: string;
}

export interface EventConfig {
  maxListeners: number;
  maxQueueSize: number;
  enablePersistence: boolean;
  enableMetrics: boolean;
  enableDebugLogging: boolean;
  retryInterval: number;
  defaultTTL: number;
  performanceThreshold: number;
}

export interface InvalidationConfig {
  enableBatching: boolean;
  batchInterval: number;
  enableCascading: boolean;
  maxCascadeDepth: number;
  enableMetrics: boolean;
  enableDebugLogging: boolean;
}

// State interface
export interface ConsolidatedCacheState {
  // Cache Storage
  cache: Record<string, CacheEntry>;
  
  // Event System
  eventQueue: MeridianEvent[];
  eventListeners: Record<string, EventListener[]>;
  eventHistory: MeridianEvent[];
  
  // Invalidation System
  invalidationRules: Record<string, InvalidationRule>;
  invalidationQueue: Array<{ rule: InvalidationRule; event: MeridianEvent }>;
  
  // Metrics
  cacheMetrics: CacheMetrics;
  eventMetrics: EventMetrics;
  invalidationMetrics: InvalidationMetrics;
  
  // Configuration
  cacheConfig: CacheConfig;
  eventConfig: EventConfig;
  invalidationConfig: InvalidationConfig;
  
  // Policies and Strategies
  cachePolicies: Record<string, CachePolicy>;
  cacheStrategies: Record<string, CacheStrategy>;
  
  // Runtime State
  isProcessingEvents: boolean;
  isProcessingInvalidation: boolean;
  cleanupIntervalId: number | null;
  batchTimeoutId: number | null;
  accessTimes: number[];
  cascadeDepth: number;
  
  // Loading and Error States
  loading: {
    cache: boolean;
    events: boolean;
    invalidation: boolean;
  };
  
  errors: {
    cache: string | null;
    events: string | null;
    invalidation: string | null;
  };
  
  lastUpdated: string | null;
}

// Store interface with actions
export interface ConsolidatedCacheStore extends ConsolidatedCacheState {
  // Core Cache Operations
  get: <T = any>(key: string) => T | null;
  set: <T = any>(key: string, value: T, options?: {
    ttl?: number;
    priority?: CacheEntry['priority'];
    tags?: string[];
    context?: any;
    dependencies?: string[];
  }) => boolean;
  delete: (key: string) => boolean;
  has: (key: string) => boolean;
  keys: () => string[];
  size: () => number;
  clear: () => void;
  
  // Advanced Cache Operations
  invalidateByTag: (tag: string) => number;
  invalidateByDependency: (dependencyKey: string) => number;
  invalidateByPattern: (pattern: RegExp) => number;
  
  // Cache Management
  cleanup: () => void;
  evictEntries: (newEntry: CacheEntry) => void;
  getStats: () => {
    entries: number;
    size: string;
    hitRate: string;
    avgAccessTime: string;
    compression: string;
  };
  
  // Event System
  emit: (eventType: string, payload: any, options?: {
    category?: MeridianEvent['category'];
    priority?: MeridianEvent['priority'];
    source?: string;
    persistent?: boolean;
    retryable?: boolean;
    ttl?: number;
  }) => void;
  
  on: <T = any>(eventType: string | RegExp, handler: (event: MeridianEvent<T>) => void | Promise<void>, options?: {
    once?: boolean;
    priority?: number;
    filter?: (event: MeridianEvent<T>) => boolean;
    errorHandler?: (error: Error, event: MeridianEvent<T>) => void;
  }) => string;
  
  off: (listenerId: string) => boolean;
  once: <T = any>(eventType: string | RegExp, handler: (event: MeridianEvent<T>) => void | Promise<void>) => string;
  
  // Event Management
  processEventQueue: () => Promise<void>;
  retryFailedEvents: () => void;
  getEventHistory: (limit?: number) => MeridianEvent[];
  clearEventHistory: () => void;
  
  // Invalidation System
  addInvalidationRule: (rule: InvalidationRule) => void;
  removeInvalidationRule: (ruleId: string) => boolean;
  updateInvalidationRule: (ruleId: string, updates: Partial<InvalidationRule>) => boolean;
  enableInvalidationRule: (ruleId: string) => boolean;
  disableInvalidationRule: (ruleId: string) => boolean;
  
  // Manual Invalidation
  invalidate: (options: {
    type: 'key' | 'tag' | 'pattern' | 'dependency';
    target: string | RegExp;
    reason?: string;
  }) => number;
  
  // Cache Warming
  warmCache: (keys: string[], strategy?: string) => Promise<void>;
  
  // Strategy and Policy Management
  addCacheStrategy: (strategy: CacheStrategy) => void;
  removeCacheStrategy: (strategyName: string) => boolean;
  addCachePolicy: (policy: CachePolicy) => void;
  removeCachePolicy: (policyName: string) => boolean;
  
  // Configuration
  updateCacheConfig: (updates: Partial<CacheConfig>) => void;
  updateEventConfig: (updates: Partial<EventConfig>) => void;
  updateInvalidationConfig: (updates: Partial<InvalidationConfig>) => void;
  
  // Metrics and Monitoring
  getCacheMetrics: () => CacheMetrics;
  getEventMetrics: () => EventMetrics;
  getInvalidationMetrics: () => InvalidationMetrics;
  resetMetrics: () => void;
  
  // Persistence
  saveToPersistence: () => void;
  loadFromPersistence: () => void;
  clearPersistence: () => void;
  
  // Lifecycle
  startCleanupInterval: () => void;
  stopCleanupInterval: () => void;
  destroy: () => void;
  reset: () => void;
}

// Built-in cache policies
const defaultCachePolicies: Record<string, CachePolicy> = {
  LRU: {
    name: 'Least Recently Used',
    priority: 1,
    evict: (entries, newEntry) => {
      const sortedEntries = Array.from(entries.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      return [sortedEntries[0][0]];
    },
  },
  LFU: {
    name: 'Least Frequently Used',
    priority: 2,
    evict: (entries, newEntry) => {
      const sortedEntries = Array.from(entries.entries())
        .sort(([, a], [, b]) => a.accessCount - b.accessCount);
      return [sortedEntries[0][0]];
    },
  },
  FIFO: {
    name: 'First In First Out',
    priority: 3,
    evict: (entries, newEntry) => {
      const sortedEntries = Array.from(entries.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      return [sortedEntries[0][0]];
    },
  },
  TTL: {
    name: 'Time To Live',
    priority: 4,
    evict: (entries, newEntry) => {
      const now = Date.now();
      const expiredEntries = Array.from(entries.entries())
        .filter(([, entry]) => now - entry.timestamp > entry.ttl)
        .map(([key]) => key);
      
      if (expiredEntries.length > 0) {
        return expiredEntries;
      }
      
      // Fall back to LRU
      return defaultCachePolicies.LRU.evict(entries, newEntry);
    },
  },
  PRIORITY: {
    name: 'Priority Based',
    priority: 5,
    evict: (entries, newEntry) => {
      const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      
      const sortedEntries = Array.from(entries.entries())
        .sort(([, a], [, b]) => {
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.lastAccessed - b.lastAccessed;
        });
      
      return [sortedEntries[0][0]];
    },
  },
};

// Built-in cache strategies
const defaultCacheStrategies: Record<string, CacheStrategy> = {
  USER_DATA: {
    name: 'User Data Strategy',
    shouldCache: (key, value) => {
      return key.includes('user:') || key.includes('profile:') || key.includes('preference:');
    },
    getTTL: () => 30 * 60 * 1000, // 30 minutes
    getPriority: () => 'high',
    getTags: (key) => ['user', key.split(':')[0]],
  },
  API_RESPONSE: {
    name: 'API Response Strategy',
    shouldCache: (key, value, context) => {
      return context?.type === 'api_response' && value && typeof value === 'object';
    },
    getTTL: (key, value, context) => {
      if (key.includes('real-time') || key.includes('live')) return 30 * 1000;
      if (key.includes('static') || key.includes('config')) return 60 * 60 * 1000;
      return 5 * 60 * 1000;
    },
    getPriority: (key) => {
      if (key.includes('critical')) return 'critical';
      if (key.includes('important')) return 'high';
      return 'medium';
    },
    getTags: (key, value, context) => ['api', context?.endpoint || 'unknown'],
  },
  COMPUTED_DATA: {
    name: 'Computed Data Strategy',
    shouldCache: (key, value, context) => {
      return context?.type === 'computed' || key.includes('computed:');
    },
    getTTL: () => 15 * 60 * 1000, // 15 minutes
    getPriority: () => 'low',
    getTags: (key) => ['computed', 'derived'],
  },
  STATIC_ASSETS: {
    name: 'Static Assets Strategy',
    shouldCache: (key, value) => {
      return key.includes('asset:') || key.includes('image:') || key.includes('file:');
    },
    getTTL: () => 24 * 60 * 60 * 1000, // 24 hours
    getPriority: () => 'low',
    getTags: (key) => ['static', 'asset'],
  },
};

// Default invalidation rules
const defaultInvalidationRules: Record<string, InvalidationRule> = {
  user_logout: {
    id: 'user_logout',
    name: 'User Logout Invalidation',
    trigger: {
      eventType: 'auth:logout',
    },
    action: {
      type: 'tag',
      target: 'user',
      options: { cascade: true },
    },
    priority: 1,
    enabled: true,
  },
  user_profile_update: {
    id: 'user_profile_update',
    name: 'User Profile Update',
    trigger: {
      eventType: 'user:profile_updated',
    },
    action: {
      type: 'pattern',
      target: /^user:/,
      options: { delay: 100 },
    },
    priority: 2,
    enabled: true,
  },
  workspace_switch: {
    id: 'workspace_switch',
    name: 'Workspace Switch Invalidation',
    trigger: {
      eventType: 'workspace:switched',
    },
    action: {
      type: 'custom',
      target: (event) => {
        const patterns = [
          `workspace:${event.payload.fromWorkspaceId}:`,
          `project:workspace:${event.payload.fromWorkspaceId}`,
          `task:workspace:${event.payload.fromWorkspaceId}`,
        ];
        return patterns;
      },
      options: { batch: true },
    },
    priority: 1,
    enabled: true,
  },
  task_update: {
    id: 'task_update',
    name: 'Task Update Invalidation',
    trigger: {
      eventType: /^task:(updated|completed|assigned|moved)$/,
    },
    action: {
      type: 'custom',
      target: (event) => {
        const patterns = [
          `task:${event.payload.taskId}`,
          `project:${event.payload.projectId}:tasks`,
          `user:${event.payload.assigneeId || event.payload.userId}:tasks`,
        ].filter(Boolean);
        return patterns;
      },
      options: { batch: true, cascade: true },
    },
    priority: 2,
    enabled: true,
  },
  message_sent: {
    id: 'message_sent',
    name: 'Message Sent Invalidation',
    trigger: {
      eventType: 'message:sent',
    },
    action: {
      type: 'custom',
      target: (event) => [
        `channel:${event.payload.channelId}:messages`,
        `channel:${event.payload.channelId}:activity`,
        `user:${event.payload.senderId}:activity`,
      ],
      options: { delay: 50 },
    },
    priority: 3,
    enabled: true,
  },
};

// Utility functions
const calculateSize = (value: any): number => {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return JSON.stringify(value).length * 2;
  }
};

const compress = (data: any): string => {
  try {
    const jsonString = JSON.stringify(data);
    return btoa(jsonString);
  } catch (error) {
    console.error('Compression failed:', error);
    return JSON.stringify(data);
  }
};

const decompress = (compressed: string): any => {
  try {
    const decompressed = atob(compressed);
    return JSON.parse(decompressed);
  } catch (error) {
    console.error('Decompression failed:', error);
    return null;
  }
};

// Initial state
const initialState: ConsolidatedCacheState = {
  // Cache Storage
  cache: {},
  
  // Event System
  eventQueue: [],
  eventListeners: {},
  eventHistory: [],
  
  // Invalidation System
  invalidationRules: defaultInvalidationRules,
  invalidationQueue: [],
  
  // Metrics
  cacheMetrics: {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    totalSize: 0,
    totalEntries: 0,
    hitRate: 0,
    avgAccessTime: 0,
    compressionRatio: 1,
    lastCleanup: Date.now(),
    policyUsage: {},
  },
  eventMetrics: {
    totalEvents: 0,
    eventsByType: {},
    eventsByCategory: {},
    processingTimes: {},
    errors: 0,
    retries: 0,
    queueSize: 0,
    lastProcessed: 0,
  },
  invalidationMetrics: {
    totalInvalidations: 0,
    invalidationsByRule: {},
    invalidationsByType: {},
    cascadeInvalidations: 0,
    batchedInvalidations: 0,
    averageInvalidationTime: 0,
    lastInvalidation: 0,
  },
  
  // Configuration
  cacheConfig: {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxEntries: 1000,
    defaultTTL: 15 * 60 * 1000, // 15 minutes
    enableCompression: true,
    enablePersistence: true,
    enableMetrics: true,
    enableDebugLogging: false,
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    compressionThreshold: 1024, // 1KB
    persistenceKey: 'meridian_cache',
  },
  eventConfig: {
    maxListeners: 100,
    maxQueueSize: 1000,
    enablePersistence: false,
    enableMetrics: true,
    enableDebugLogging: false,
    retryInterval: 1000,
    defaultTTL: 60000,
    performanceThreshold: 100,
  },
  invalidationConfig: {
    enableBatching: true,
    batchInterval: 100,
    enableCascading: true,
    maxCascadeDepth: 3,
    enableMetrics: true,
    enableDebugLogging: false,
  },
  
  // Policies and Strategies
  cachePolicies: defaultCachePolicies,
  cacheStrategies: defaultCacheStrategies,
  
  // Runtime State
  isProcessingEvents: false,
  isProcessingInvalidation: false,
  cleanupIntervalId: null,
  batchTimeoutId: null,
  accessTimes: [],
  cascadeDepth: 0,
  
  // Loading and Error States
  loading: {
    cache: false,
    events: false,
    invalidation: false,
  },
  
  errors: {
    cache: null,
    events: null,
    invalidation: null,
  },
  
  lastUpdated: null,
};

export const useConsolidatedCacheStore = create<ConsolidatedCacheStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // Core Cache Operations
          get: <T = any>(key: string): T | null => {
            const startTime = performance.now();

            try {
              const entry = get().cache[key];

              if (!entry) {
                set((state) => {
                  state.cacheMetrics.misses++;
                });
                return null;
              }

              // Check TTL
              const now = Date.now();
              if (now - entry.timestamp > entry.ttl) {
                get().delete(key);
                set((state) => {
                  state.cacheMetrics.misses++;
                });
                return null;
              }

              // Update access stats
              set((state) => {
                const cacheEntry = state.cache[key];
                if (cacheEntry) {
                  cacheEntry.lastAccessed = now;
                  cacheEntry.accessCount++;
                }
                state.cacheMetrics.hits++;
              });

              // Decompress if needed
              let value = entry.value;
              if (get().cacheConfig.enableCompression && entry.compressed) {
                value = decompress(entry.value);
              }

              if (get().cacheConfig.enableDebugLogging) {
                logger.info("Cache hit: ${key}");
              }

              return value;

            } finally {
              const accessTime = performance.now() - startTime;
              set((state) => {
                state.accessTimes.push(accessTime);
                if (state.accessTimes.length > 1000) {
                  state.accessTimes = state.accessTimes.slice(-1000);
                }
                
                // Update average access time
                const avgTime = state.accessTimes.reduce((a, b) => a + b, 0) / state.accessTimes.length;
                state.cacheMetrics.avgAccessTime = avgTime;
                state.cacheMetrics.hitRate = state.cacheMetrics.hits / Math.max(1, state.cacheMetrics.hits + state.cacheMetrics.misses);
              });
            }
          },

          set: <T = any>(key: string, value: T, options: {
            ttl?: number;
            priority?: CacheEntry['priority'];
            tags?: string[];
            context?: any;
            dependencies?: string[];
          } = {}): boolean => {
            try {
              const state = get();
              
              // Find applicable strategy
              const strategy = Object.values(state.cacheStrategies).find(s => 
                s.shouldCache(key, value, options.context)
              );
              
              if (!strategy && !options.ttl) {
                return false;
              }

              const now = Date.now();
              const ttl = options.ttl || strategy?.getTTL(key, value, options.context) || state.cacheConfig.defaultTTL;
              const priority = options.priority || strategy?.getPriority(key, value, options.context) || 'medium';
              const tags = options.tags || strategy?.getTags(key, value, options.context) || [];

              let processedValue = value;
              let compressed = false;
              let size = calculateSize(value);

              // Compress if enabled and value is large enough
              if (state.cacheConfig.enableCompression && size > state.cacheConfig.compressionThreshold) {
                const compressedValue = compress(value);
                const compressedSize = calculateSize(compressedValue);
                
                if (compressedSize < size) {
                  processedValue = compressedValue;
                  compressed = true;
                  size = compressedSize;
                }
              }

              const entry: CacheEntry<T> = {
                key,
                value: processedValue,
                timestamp: now,
                ttl,
                accessCount: 0,
                lastAccessed: now,
                size,
                tags,
                priority,
                metadata: {
                  compressed,
                  strategy: strategy?.name,
                  ...options.context,
                },
                dependencies: options.dependencies,
                version: 1,
                compressed,
              };

              // Check if we need to evict entries
              const cacheMap = new Map(Object.entries(state.cache));
              if (cacheMap.size >= state.cacheConfig.maxEntries || 
                  state.cacheMetrics.totalSize + size > state.cacheConfig.maxSize) {
                get().evictEntries(entry);
              }

              // Set the entry
              set((state) => {
                state.cache[key] = entry;
                state.cacheMetrics.sets++;
                state.cacheMetrics.totalEntries = Object.keys(state.cache).length;
                state.cacheMetrics.totalSize += size;
                state.lastUpdated = new Date().toISOString();
              });

              if (state.cacheConfig.enableDebugLogging) {
                logger.info("Cache set: ${key} (${size} bytes, TTL: ${ttl}ms)");
              }

              // Persist if enabled
              if (state.cacheConfig.enablePersistence) {
                get().saveToPersistence();
              }

              return true;

            } catch (error) {
              console.error('Cache set error:', error);
              set((state) => {
                state.errors.cache = error instanceof Error ? error.message : 'Cache set error';
              });
              return false;
            }
          },

          delete: (key: string): boolean => {
            const state = get();
            const entry = state.cache[key];
            if (!entry) {
              return false;
            }

            set((state) => {
              delete state.cache[key];
              state.cacheMetrics.deletes++;
              state.cacheMetrics.totalEntries = Object.keys(state.cache).length;
              state.cacheMetrics.totalSize -= entry.size;
              state.lastUpdated = new Date().toISOString();
            });

            if (state.cacheConfig.enableDebugLogging) {
              logger.info("Cache delete: ${key}");
            }

            // Update persistence
            if (state.cacheConfig.enablePersistence) {
              get().saveToPersistence();
            }

            return true;
          },

          has: (key: string): boolean => {
            const entry = get().cache[key];
            if (!entry) return false;

            // Check TTL
            const now = Date.now();
            if (now - entry.timestamp > entry.ttl) {
              get().delete(key);
              return false;
            }

            return true;
          },

          keys: (): string[] => {
            const state = get();
            const validKeys: string[] = [];
            const now = Date.now();

            for (const [key, entry] of Object.entries(state.cache)) {
              if (now - entry.timestamp <= entry.ttl) {
                validKeys.push(key);
              }
            }

            return validKeys;
          },

          size: (): number => {
            return Object.keys(get().cache).length;
          },

          clear: (): void => {
            set((state) => {
              state.cache = {};
              state.cacheMetrics.totalEntries = 0;
              state.cacheMetrics.totalSize = 0;
              state.lastUpdated = new Date().toISOString();
            });
            
            const state = get();
            if (state.cacheConfig.enablePersistence) {
              get().clearPersistence();
            }
          },

          // Advanced Cache Operations
          invalidateByTag: (tag: string): number => {
            let invalidated = 0;
            const state = get();
            
            for (const [key, entry] of Object.entries(state.cache)) {
              if (entry.tags.includes(tag)) {
                get().delete(key);
                invalidated++;
              }
            }

            if (state.cacheConfig.enableDebugLogging) {
              logger.info("Invalidated ${invalidated} entries with tag: ${tag}");
            }

            return invalidated;
          },

          invalidateByDependency: (dependencyKey: string): number => {
            let invalidated = 0;
            const state = get();
            
            for (const [key, entry] of Object.entries(state.cache)) {
              if (entry.dependencies?.includes(dependencyKey)) {
                get().delete(key);
                invalidated++;
              }
            }

            if (state.cacheConfig.enableDebugLogging) {
              logger.info("Invalidated ${invalidated} entries dependent on: ${dependencyKey}");
            }

            return invalidated;
          },

          invalidateByPattern: (pattern: RegExp): number => {
            let invalidated = 0;
            const state = get();
            
            for (const key of Object.keys(state.cache)) {
              if (pattern.test(key)) {
                get().delete(key);
                invalidated++;
              }
            }

            return invalidated;
          },

          // Cache Management
          cleanup: (): void => {
            const now = Date.now();
            const keysToDelete: string[] = [];
            const state = get();

            // Find expired entries
            for (const [key, entry] of Object.entries(state.cache)) {
              if (now - entry.timestamp > entry.ttl) {
                keysToDelete.push(key);
              }
            }

            // Delete expired entries
            keysToDelete.forEach(key => get().delete(key));

            set((state) => {
              state.cacheMetrics.lastCleanup = now;
            });

            if (state.cacheConfig.enableDebugLogging && keysToDelete.length > 0) {
              logger.info("Cleaned up ${keysToDelete.length} expired cache entries");
            }
          },

          evictEntries: (newEntry: CacheEntry): void => {
            const state = get();
            const cacheMap = new Map(Object.entries(state.cache));
            const policies = Object.values(state.cachePolicies).sort((a, b) => a.priority - b.priority);
            
            let evicted = 0;
            
            for (const policy of policies) {
              if (cacheMap.size < state.cacheConfig.maxEntries && 
                  state.cacheMetrics.totalSize + newEntry.size <= state.cacheConfig.maxSize) {
                break;
              }

              try {
                const keysToEvict = policy.evict(cacheMap, newEntry);
                
                for (const key of keysToEvict) {
                  if (get().delete(key)) {
                    evicted++;
                    set((state) => {
                      state.cacheMetrics.evictions++;
                      state.cacheMetrics.policyUsage[policy.name] = 
                        (state.cacheMetrics.policyUsage[policy.name] || 0) + 1;
                    });
                    cacheMap.delete(key);
                  }
                }

                if (state.cacheConfig.enableDebugLogging) {
                  logger.info("Evicted ${keysToEvict.length} entries using ${policy.name} policy");
                }

              } catch (error) {
                console.error(`Error in ${policy.name} eviction policy:`, error);
              }
            }
          },

          getStats: () => {
            const state = get();
            return {
              entries: Object.keys(state.cache).length,
              size: `${(state.cacheMetrics.totalSize / 1024 / 1024).toFixed(2)} MB`,
              hitRate: `${(state.cacheMetrics.hitRate * 100).toFixed(2)}%`,
              avgAccessTime: `${state.cacheMetrics.avgAccessTime.toFixed(2)}ms`,
              compression: `${((1 - state.cacheMetrics.compressionRatio) * 100).toFixed(2)}%`,
            };
          },

          // Event System
          emit: (eventType: string, payload: any, options: {
            category?: MeridianEvent['category'];
            priority?: MeridianEvent['priority'];
            source?: string;
            persistent?: boolean;
            retryable?: boolean;
            ttl?: number;
          } = {}): void => {
            const event: MeridianEvent = {
              id: `${eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: eventType,
              category: options.category || 'system',
              payload,
              timestamp: Date.now(),
              source: options.source || 'cache-store',
              priority: options.priority || 'medium',
              persistent: options.persistent,
              retryable: options.retryable,
              ttl: options.ttl || get().eventConfig.defaultTTL,
              currentRetries: 0,
            };

            set((state) => {
              // Add to queue with priority ordering
              const priorities = { critical: 0, high: 1, medium: 2, low: 3 };
              const eventPriority = priorities[event.priority];
              
              let insertIndex = state.eventQueue.length;
              for (let i = 0; i < state.eventQueue.length; i++) {
                if (priorities[state.eventQueue[i].priority] > eventPriority) {
                  insertIndex = i;
                  break;
                }
              }

              state.eventQueue.splice(insertIndex, 0, event);
              
              // Limit queue size
              if (state.eventQueue.length > state.eventConfig.maxQueueSize) {
                state.eventQueue = state.eventQueue.filter(e => e.priority !== 'low').slice(-(state.eventConfig.maxQueueSize - 1));
              }
              
              // Update metrics
              state.eventMetrics.totalEvents++;
              state.eventMetrics.eventsByType[eventType] = (state.eventMetrics.eventsByType[eventType] || 0) + 1;
              state.eventMetrics.eventsByCategory[event.category] = (state.eventMetrics.eventsByCategory[event.category] || 0) + 1;
              state.eventMetrics.queueSize = state.eventQueue.length;
              
              // Add to history
              state.eventHistory.unshift(event);
              if (state.eventHistory.length > 100) {
                state.eventHistory.splice(100);
              }
            });

            // Process event queue asynchronously
            setTimeout(() => get().processEventQueue(), 0);
          },

          on: <T = any>(eventType: string | RegExp, handler: (event: MeridianEvent<T>) => void | Promise<void>, options: {
            once?: boolean;
            priority?: number;
            filter?: (event: MeridianEvent<T>) => boolean;
            errorHandler?: (error: Error, event: MeridianEvent<T>) => void;
          } = {}): string => {
            const listener: EventListener<T> = {
              id: `listener-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              eventType,
              handler,
              once: options.once,
              priority: options.priority || 5,
              filter: options.filter,
              active: true,
              errorHandler: options.errorHandler,
            };

            set((state) => {
              const typeKey = typeof eventType === 'string' ? eventType : eventType.toString();
              if (!state.eventListeners[typeKey]) {
                state.eventListeners[typeKey] = [];
              }
              state.eventListeners[typeKey].push(listener);
              
              // Sort by priority
              state.eventListeners[typeKey].sort((a, b) => a.priority - b.priority);
            });

            return listener.id;
          },

          off: (listenerId: string): boolean => {
            let found = false;
            
            set((state) => {
              for (const typeKey of Object.keys(state.eventListeners)) {
                const index = state.eventListeners[typeKey].findIndex(l => l.id === listenerId);
                if (index !== -1) {
                  state.eventListeners[typeKey].splice(index, 1);
                  if (state.eventListeners[typeKey].length === 0) {
                    delete state.eventListeners[typeKey];
                  }
                  found = true;
                  break;
                }
              }
            });

            return found;
          },

          once: <T = any>(eventType: string | RegExp, handler: (event: MeridianEvent<T>) => void | Promise<void>): string => {
            return get().on(eventType, handler, { once: true });
          },

          // Event Management
          processEventQueue: async (): Promise<void> => {
            const state = get();
            
            if (state.isProcessingEvents || state.eventQueue.length === 0) {
              return;
            }

            set((state) => {
              state.isProcessingEvents = true;
            });

            try {
              const event = state.eventQueue.shift();
              if (!event) return;

              set((state) => {
                state.eventMetrics.queueSize = state.eventQueue.length;
              });

              // Process invalidation rules first
              await get().processInvalidationRules(event);

              // Find matching listeners
              const matchingListeners: EventListener[] = [];
              
              for (const [typeKey, listeners] of Object.entries(state.eventListeners)) {
                for (const listener of listeners) {
                  if (!listener.active) continue;

                  const matches = typeof listener.eventType === 'string'
                    ? listener.eventType === event.type || listener.eventType === '*'
                    : listener.eventType.test(event.type);

                  if (matches && (!listener.filter || listener.filter(event))) {
                    matchingListeners.push(listener);
                  }
                }
              }

              // Execute listeners
              const startTime = performance.now();
              
              for (const listener of matchingListeners) {
                try {
                  await listener.handler(event);
                  
                  // Remove one-time listeners
                  if (listener.once) {
                    get().off(listener.id);
                  }
                } catch (error) {
                  set((state) => {
                    state.eventMetrics.errors++;
                  });
                  
                  if (listener.errorHandler) {
                    listener.errorHandler(error as Error, event);
                  } else {
                    console.error('Event handler error:', error, event);
                  }
                }
              }

              const processingTime = performance.now() - startTime;
              
              set((state) => {
                if (!state.eventMetrics.processingTimes[event.type]) {
                  state.eventMetrics.processingTimes[event.type] = [];
                }
                state.eventMetrics.processingTimes[event.type].push(processingTime);
                
                // Keep only last 10 times per event type
                if (state.eventMetrics.processingTimes[event.type].length > 10) {
                  state.eventMetrics.processingTimes[event.type].splice(0, 1);
                }
                
                state.eventMetrics.lastProcessed = Date.now();
              });

            } finally {
              set((state) => {
                state.isProcessingEvents = false;
              });
              
              // Continue processing if there are more events
              if (get().eventQueue.length > 0) {
                setTimeout(() => get().processEventQueue(), 0);
              }
            }
          },

          processInvalidationRules: async (event: MeridianEvent): Promise<void> => {
            const state = get();
            const matchingRules: InvalidationRule[] = [];

            // Find matching rules
            for (const rule of Object.values(state.invalidationRules)) {
              if (!rule.enabled) continue;

              const eventTypeMatch = typeof rule.trigger.eventType === 'string'
                ? rule.trigger.eventType === event.type
                : rule.trigger.eventType.test(event.type);

              if (!eventTypeMatch) continue;

              if (rule.trigger.condition && !rule.trigger.condition(event)) {
                continue;
              }

              matchingRules.push(rule);
            }

            if (matchingRules.length === 0) return;

            // Sort by priority
            matchingRules.sort((a, b) => a.priority - b.priority);

            for (const rule of matchingRules) {
              if (state.invalidationConfig.enableBatching && rule.action.options?.batch) {
                set((state) => {
                  state.invalidationQueue.push({ rule, event });
                });
                
                // Setup batch processing
                if (!state.batchTimeoutId) {
                  const timeoutId = setTimeout(() => {
                    get().processBatchedInvalidation();
                  }, state.invalidationConfig.batchInterval);
                  
                  set((state) => {
                    state.batchTimeoutId = timeoutId as any;
                  });
                }
              } else {
                await get().executeInvalidationRule(rule, event);
              }
            }
          },

          processBatchedInvalidation: (): void => {
            const state = get();
            
            if (state.invalidationQueue.length === 0) return;

            const batch = [...state.invalidationQueue];
            set((state) => {
              state.invalidationQueue = [];
              state.batchTimeoutId = null;
            });

            // Group by rule
            const ruleGroups = new Map<string, Array<{ rule: InvalidationRule; event: MeridianEvent }>>();
            
            for (const item of batch) {
              if (!ruleGroups.has(item.rule.id)) {
                ruleGroups.set(item.rule.id, []);
              }
              ruleGroups.get(item.rule.id)!.push(item);
            }

            // Process each rule group
            for (const items of ruleGroups.values()) {
              get().executeBatchedInvalidationRule(items);
            }

            set((state) => {
              state.invalidationMetrics.batchedInvalidations += batch.length;
            });
          },

          executeBatchedInvalidationRule: (items: Array<{ rule: InvalidationRule; event: MeridianEvent }>): void => {
            const rule = items[0].rule;
            const events = items.map(item => item.event);

            try {
              const startTime = performance.now();
              const allTargets = new Set<string>();

              for (const event of events) {
                const targets = get().getInvalidationTargets(rule, event);
                targets.forEach(target => allTargets.add(target));
              }

              for (const target of allTargets) {
                get().executeInvalidation(rule.action.type, target, rule.action.options);
              }

              const duration = performance.now() - startTime;
              get().updateInvalidationMetrics(rule, duration, allTargets.size);

            } catch (error) {
              console.error(`Error executing batched invalidation rule ${rule.name}:`, error);
            }
          },

          executeInvalidationRule: async (rule: InvalidationRule, event: MeridianEvent): Promise<void> => {
            try {
              const startTime = performance.now();
              
              const executeRule = () => {
                const targets = get().getInvalidationTargets(rule, event);
                
                for (const target of targets) {
                  get().executeInvalidation(rule.action.type, target, rule.action.options);
                }

                const duration = performance.now() - startTime;
                get().updateInvalidationMetrics(rule, duration, targets.length);
              };
              
              if (rule.action.options?.delay) {
                setTimeout(executeRule, rule.action.options.delay);
              } else {
                executeRule();
              }

            } catch (error) {
              console.error(`Error executing invalidation rule ${rule.name}:`, error);
            }
          },

          getInvalidationTargets: (rule: InvalidationRule, event: MeridianEvent): string[] => {
            const { target } = rule.action;

            if (typeof target === 'string') {
              return [target];
            }

            if (target instanceof RegExp) {
              return get().keys().filter(key => target.test(key));
            }

            if (typeof target === 'function') {
              const result = target(event);
              return Array.isArray(result) ? result : [result];
            }

            return [];
          },

          executeInvalidation: (
            type: InvalidationRule['action']['type'],
            target: string | RegExp,
            options?: InvalidationRule['action']['options']
          ): void => {
            switch (type) {
              case 'key':
                if (typeof target === 'string') {
                  get().delete(target);
                }
                break;

              case 'tag':
                if (typeof target === 'string') {
                  get().invalidateByTag(target);
                }
                break;

              case 'pattern':
                if (target instanceof RegExp) {
                  get().invalidateByPattern(target);
                } else if (typeof target === 'string') {
                  get().invalidateByPattern(new RegExp(target));
                }
                break;

              case 'dependency':
                if (typeof target === 'string') {
                  get().invalidateByDependency(target);
                }
                break;

              case 'custom':
                if (typeof target === 'string') {
                  get().delete(target);
                }
                break;
            }
          },

          updateInvalidationMetrics: (rule: InvalidationRule, duration: number, targetCount: number): void => {
            const state = get();
            if (!state.invalidationConfig.enableMetrics) return;

            set((state) => {
              state.invalidationMetrics.totalInvalidations += targetCount;
              state.invalidationMetrics.invalidationsByRule[rule.id] = 
                (state.invalidationMetrics.invalidationsByRule[rule.id] || 0) + targetCount;
              state.invalidationMetrics.invalidationsByType[rule.action.type] = 
                (state.invalidationMetrics.invalidationsByType[rule.action.type] || 0) + targetCount;
              state.invalidationMetrics.lastInvalidation = Date.now();

              // Update average time (moving average)
              const currentAvg = state.invalidationMetrics.averageInvalidationTime;
              const newAvg = currentAvg === 0 ? duration : (currentAvg * 0.9 + duration * 0.1);
              state.invalidationMetrics.averageInvalidationTime = newAvg;
            });
          },

          retryFailedEvents: (): void => {
            // Implementation for retrying failed events
            logger.error("Retrying failed events");
          },

          getEventHistory: (limit = 50): MeridianEvent[] => {
            return get().eventHistory.slice(0, limit);
          },

          clearEventHistory: (): void => {
            set((state) => {
              state.eventHistory = [];
            });
          },

          // Invalidation System
          addInvalidationRule: (rule: InvalidationRule): void => {
            set((state) => {
              state.invalidationRules[rule.id] = rule;
            });
          },

          removeInvalidationRule: (ruleId: string): boolean => {
            const exists = !!get().invalidationRules[ruleId];
            if (exists) {
              set((state) => {
                delete state.invalidationRules[ruleId];
              });
            }
            return exists;
          },

          updateInvalidationRule: (ruleId: string, updates: Partial<InvalidationRule>): boolean => {
            const rule = get().invalidationRules[ruleId];
            if (!rule) return false;

            set((state) => {
              Object.assign(state.invalidationRules[ruleId], updates);
            });
            
            return true;
          },

          enableInvalidationRule: (ruleId: string): boolean => {
            return get().updateInvalidationRule(ruleId, { enabled: true });
          },

          disableInvalidationRule: (ruleId: string): boolean => {
            return get().updateInvalidationRule(ruleId, { enabled: false });
          },

          // Manual Invalidation
          invalidate: (options: {
            type: 'key' | 'tag' | 'pattern' | 'dependency';
            target: string | RegExp;
            reason?: string;
          }): number => {
            const startTime = performance.now();
            let invalidated = 0;

            switch (options.type) {
              case 'key':
                invalidated = get().delete(options.target as string) ? 1 : 0;
                break;
              case 'tag':
                invalidated = get().invalidateByTag(options.target as string);
                break;
              case 'pattern':
                invalidated = get().invalidateByPattern(
                  options.target instanceof RegExp ? options.target : new RegExp(options.target as string)
                );
                break;
              case 'dependency':
                invalidated = get().invalidateByDependency(options.target as string);
                break;
            }

            const duration = performance.now() - startTime;

            // Emit invalidation event
            get().emit('cache:manual_invalidation', {
              type: options.type,
              target: options.target,
              reason: options.reason,
              invalidated,
              duration,
            }, { category: 'system', priority: 'low' });

            return invalidated;
          },

          // Cache Warming
          warmCache: async (keys: string[], strategy?: string): Promise<void> => {
            get().emit('cache:warm_requested', {
              keys,
              strategy,
              timestamp: Date.now(),
            }, { category: 'system', priority: 'low' });
          },

          // Strategy and Policy Management
          addCacheStrategy: (strategy: CacheStrategy): void => {
            set((state) => {
              state.cacheStrategies[strategy.name] = strategy;
            });
          },

          removeCacheStrategy: (strategyName: string): boolean => {
            const exists = !!get().cacheStrategies[strategyName];
            if (exists) {
              set((state) => {
                delete state.cacheStrategies[strategyName];
              });
            }
            return exists;
          },

          addCachePolicy: (policy: CachePolicy): void => {
            set((state) => {
              state.cachePolicies[policy.name] = policy;
            });
          },

          removeCachePolicy: (policyName: string): boolean => {
            const exists = !!get().cachePolicies[policyName];
            if (exists) {
              set((state) => {
                delete state.cachePolicies[policyName];
              });
            }
            return exists;
          },

          // Configuration
          updateCacheConfig: (updates: Partial<CacheConfig>): void => {
            set((state) => {
              Object.assign(state.cacheConfig, updates);
            });
          },

          updateEventConfig: (updates: Partial<EventConfig>): void => {
            set((state) => {
              Object.assign(state.eventConfig, updates);
            });
          },

          updateInvalidationConfig: (updates: Partial<InvalidationConfig>): void => {
            set((state) => {
              Object.assign(state.invalidationConfig, updates);
            });
          },

          // Metrics and Monitoring
          getCacheMetrics: (): CacheMetrics => {
            return { ...get().cacheMetrics };
          },

          getEventMetrics: (): EventMetrics => {
            return { ...get().eventMetrics };
          },

          getInvalidationMetrics: (): InvalidationMetrics => {
            return { ...get().invalidationMetrics };
          },

          resetMetrics: (): void => {
            set((state) => {
              state.cacheMetrics = {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0,
                evictions: 0,
                totalSize: state.cacheMetrics.totalSize,
                totalEntries: state.cacheMetrics.totalEntries,
                hitRate: 0,
                avgAccessTime: 0,
                compressionRatio: 1,
                lastCleanup: Date.now(),
                policyUsage: {},
              };
              
              state.eventMetrics = {
                totalEvents: 0,
                eventsByType: {},
                eventsByCategory: {},
                processingTimes: {},
                errors: 0,
                retries: 0,
                queueSize: state.eventQueue.length,
                lastProcessed: 0,
              };
              
              state.invalidationMetrics = {
                totalInvalidations: 0,
                invalidationsByRule: {},
                invalidationsByType: {},
                cascadeInvalidations: 0,
                batchedInvalidations: 0,
                averageInvalidationTime: 0,
                lastInvalidation: 0,
              };
            });
          },

          // Persistence
          saveToPersistence: (): void => {
            try {
              const state = get();
              const data = {
                cache: state.cache,
                metrics: state.cacheMetrics,
                lastUpdated: state.lastUpdated,
              };
              localStorage.setItem(state.cacheConfig.persistenceKey, JSON.stringify(data));
            } catch (error) {
              console.error('Failed to save cache to persistence:', error);
            }
          },

          loadFromPersistence: (): void => {
            try {
              const state = get();
              const data = localStorage.getItem(state.cacheConfig.persistenceKey);
              if (data) {
                const parsed = JSON.parse(data);
                const now = Date.now();

                // Load non-expired entries
                const validCache: Record<string, CacheEntry> = {};
                let totalSize = 0;
                
                for (const [key, entry] of Object.entries(parsed.cache || {})) {
                  const cacheEntry = entry as CacheEntry;
                  if (now - cacheEntry.timestamp <= cacheEntry.ttl) {
                    validCache[key] = cacheEntry;
                    totalSize += cacheEntry.size;
                  }
                }

                set((state) => {
                  state.cache = validCache;
                  state.cacheMetrics.totalEntries = Object.keys(validCache).length;
                  state.cacheMetrics.totalSize = totalSize;
                  state.lastUpdated = parsed.lastUpdated;
                });
              }
            } catch (error) {
              console.error('Failed to load cache from persistence:', error);
            }
          },

          clearPersistence: (): void => {
            try {
              const state = get();
              localStorage.removeItem(state.cacheConfig.persistenceKey);
            } catch (error) {
              console.error('Failed to clear cache persistence:', error);
            }
          },

          // Lifecycle
          startCleanupInterval: (): void => {
            const state = get();
            
            if (state.cleanupIntervalId) {
              clearInterval(state.cleanupIntervalId);
            }

            const intervalId = setInterval(() => {
              get().cleanup();
            }, state.cacheConfig.cleanupInterval);

            set((state) => {
              state.cleanupIntervalId = intervalId as any;
            });
          },

          stopCleanupInterval: (): void => {
            const state = get();
            if (state.cleanupIntervalId) {
              clearInterval(state.cleanupIntervalId);
              set((state) => {
                state.cleanupIntervalId = null;
              });
            }
          },

          destroy: (): void => {
            const state = get();
            
            get().stopCleanupInterval();
            
            if (state.batchTimeoutId) {
              clearTimeout(state.batchTimeoutId);
            }

            get().processBatchedInvalidation(); // Process any remaining batched items
            
            if (state.cacheConfig.enablePersistence) {
              get().saveToPersistence();
            }

            set((state) => {
              state.cache = {};
              state.eventQueue = [];
              state.eventListeners = {};
              state.invalidationQueue = [];
            });
          },

          reset: (): void => {
            set(() => ({ ...initialState }));
          },
        }))
      ),
      {
        name: 'consolidated-cache-store',
        partialize: (state) => ({
          // Persist cache data and configuration
          cache: state.cache,
          cacheConfig: state.cacheConfig,
          cacheStrategies: state.cacheStrategies,
          cachePolicies: state.cachePolicies,
          invalidationRules: state.invalidationRules,
          invalidationConfig: state.invalidationConfig,
          // Don't persist runtime state, events, or metrics
        }),
        version: 1,
      }
    ),
    {
      name: 'consolidated-cache-store',
    }
  )
);

// Initialize store
useConsolidatedCacheStore.getState().loadFromPersistence();
useConsolidatedCacheStore.getState().startCleanupInterval();

// Selector hooks for optimized re-renders
export const useCacheStore = useConsolidatedCacheStore;

// Specialized selector hooks
export const useCacheMetrics = () => useConsolidatedCacheStore((state) => state.cacheMetrics);
export const useEventMetrics = () => useConsolidatedCacheStore((state) => state.eventMetrics);
export const useInvalidationMetrics = () => useConsolidatedCacheStore((state) => state.invalidationMetrics);
export const useCacheConfig = () => useConsolidatedCacheStore((state) => state.cacheConfig);
export const useCacheStats = () => useConsolidatedCacheStore((state) => state.getStats());

// Convenience hooks
export const useCache = <T = any>(key: string, defaultValue?: T) => {
  const store = useConsolidatedCacheStore();
  const value = store.get<T>(key);
  
  return {
    value: value ?? defaultValue,
    set: (newValue: T, options?: Parameters<typeof store.set>[2]) => store.set(key, newValue, options),
    delete: () => store.delete(key),
    has: () => store.has(key),
  };
};

export const useEventEmitter = () => {
  const store = useConsolidatedCacheStore();
  
  return {
    emit: store.emit,
    on: store.on,
    off: store.off,
    once: store.once,
  };
};

export const useCacheInvalidation = () => {
  const store = useConsolidatedCacheStore();
  
  return {
    invalidate: store.invalidate,
    invalidateByTag: store.invalidateByTag,
    invalidateByPattern: store.invalidateByPattern,
    invalidateByDependency: store.invalidateByDependency,
    warmCache: store.warmCache,
  };
};

export default useConsolidatedCacheStore;