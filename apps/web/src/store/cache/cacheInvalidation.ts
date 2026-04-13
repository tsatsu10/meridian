// Cache invalidation policies and strategies

import { cacheManager } from './cacheManager';
import { eventBus } from '../events/eventBus';
import { logger } from "../../lib/logger";

// Invalidation rule types
export interface InvalidationRule {
  id: string;
  name: string;
  trigger: {
    eventType: string | RegExp;
    condition?: (event: any) => boolean;
  };
  action: {
    type: 'key' | 'tag' | 'pattern' | 'dependency' | 'custom';
    target: string | RegExp | ((event: any) => string | string[]);
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

export interface CacheInvalidationConfig {
  enableBatching: boolean;
  batchInterval: number;
  enableCascading: boolean;
  maxCascadeDepth: number;
  enableMetrics: boolean;
  enableDebugLogging: boolean;
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

// Pre-defined invalidation rules
export const DEFAULT_INVALIDATION_RULES: InvalidationRule[] = [
  // User data invalidation
  {
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

  {
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

  // Workspace invalidation
  {
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

  {
    id: 'workspace_member_change',
    name: 'Workspace Member Change',
    trigger: {
      eventType: /^workspace:(member_added|member_removed|member_role_updated)$/,
    },
    action: {
      type: 'tag',
      target: 'workspace_members',
      options: { cascade: false },
    },
    priority: 3,
    enabled: true,
  },

  // Project invalidation
  {
    id: 'project_update',
    name: 'Project Update Invalidation',
    trigger: {
      eventType: 'project:updated',
    },
    action: {
      type: 'dependency',
      target: (event) => `project:${event.payload.projectId}`,
    },
    priority: 2,
    enabled: true,
  },

  {
    id: 'project_status_change',
    name: 'Project Status Change',
    trigger: {
      eventType: 'project:status_changed',
    },
    action: {
      type: 'custom',
      target: (event) => [
        `project:${event.payload.projectId}`,
        `project:${event.payload.projectId}:status`,
        `project:${event.payload.projectId}:analytics`,
      ],
    },
    priority: 2,
    enabled: true,
  },

  // Task invalidation
  {
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

  {
    id: 'task_comment_added',
    name: 'Task Comment Added',
    trigger: {
      eventType: 'task:commented',
    },
    action: {
      type: 'pattern',
      target: (event) => new RegExp(`^task:${event.payload.taskId}:(comments|activity)`),
    },
    priority: 4,
    enabled: true,
  },

  // Team invalidation
  {
    id: 'team_member_change',
    name: 'Team Member Change',
    trigger: {
      eventType: /^team:(member_added|member_removed|member_role_updated)$/,
    },
    action: {
      type: 'custom',
      target: (event) => [
        `team:${event.payload.teamId}:members`,
        `team:${event.payload.teamId}:permissions`,
        `user:${event.payload.userId}:teams`,
      ],
      options: { cascade: true },
    },
    priority: 2,
    enabled: true,
  },

  // Communication invalidation
  {
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

  {
    id: 'channel_update',
    name: 'Channel Update Invalidation',
    trigger: {
      eventType: /^channel:(created|updated|deleted)$/,
    },
    action: {
      type: 'tag',
      target: 'channels',
    },
    priority: 2,
    enabled: true,
  },

  // API response invalidation
  {
    id: 'api_error',
    name: 'API Error Invalidation',
    trigger: {
      eventType: 'system:error',
      condition: (event) => event.payload.context?.includes('api') && event.payload.severity === 'high',
    },
    action: {
      type: 'tag',
      target: 'api_response',
      options: { delay: 1000 },
    },
    priority: 5,
    enabled: true,
  },

  // Cache warming rules
  {
    id: 'warm_user_data',
    name: 'Warm User Data on Login',
    trigger: {
      eventType: 'auth:login',
    },
    action: {
      type: 'custom',
      target: (event) => {
        // This would trigger cache warming instead of invalidation
        setTimeout(() => {
          // Warm up user-related caches
          logger.info("Warming user caches for:");
        }, 100);
        return [];
      },
    },
    priority: 10,
    enabled: true,
  },
];

// Cache invalidation manager
export class CacheInvalidationManager {
  private rules: Map<string, InvalidationRule> = new Map();
  private config: CacheInvalidationConfig;
  private metrics: InvalidationMetrics;
  private batchQueue: Array<{ rule: InvalidationRule; event: any }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private cascadeDepth = 0;

  constructor(config: Partial<CacheInvalidationConfig> = {}) {
    this.config = {
      enableBatching: true,
      batchInterval: 100,
      enableCascading: true,
      maxCascadeDepth: 3,
      enableMetrics: true,
      enableDebugLogging: false,
      ...config,
    };

    this.metrics = {
      totalInvalidations: 0,
      invalidationsByRule: {},
      invalidationsByType: {},
      cascadeInvalidations: 0,
      batchedInvalidations: 0,
      averageInvalidationTime: 0,
      lastInvalidation: 0,
    };

    // Register default rules
    this.registerDefaultRules();

    // Set up event listeners
    this.setupEventListeners();
  }

  private registerDefaultRules(): void {
    DEFAULT_INVALIDATION_RULES.forEach(rule => {
      this.addRule(rule);
    });
  }

  private setupEventListeners(): void {
    // Listen to all events and check for invalidation rules
    eventBus.on('*', (event) => {
      this.processEvent(event);
    }, {
      priority: 8, // Lower priority to ensure other listeners run first
      errorHandler: (error, event) => {
        console.error('Cache invalidation error:', error, event);
      },
    });
  }

  // Rule management
  addRule(rule: InvalidationRule): void {
    this.rules.set(rule.id, rule);
    
    if (this.config.enableDebugLogging) {
      logger.info("Added invalidation rule:");
    }
  }

  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    
    if (this.config.enableDebugLogging && removed) {
      logger.info("Removed invalidation rule:");
    }
    
    return removed;
  }

  updateRule(ruleId: string, updates: Partial<InvalidationRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    
    if (this.config.enableDebugLogging) {
      logger.info("Updated invalidation rule:");
    }
    
    return true;
  }

  enableRule(ruleId: string): boolean {
    return this.updateRule(ruleId, { enabled: true });
  }

  disableRule(ruleId: string): boolean {
    return this.updateRule(ruleId, { enabled: false });
  }

  getRules(): InvalidationRule[] {
    return Array.from(this.rules.values());
  }

  getRule(ruleId: string): InvalidationRule | undefined {
    return this.rules.get(ruleId);
  }

  // Event processing
  private processEvent(event: any): void {
    const matchingRules = this.findMatchingRules(event);
    
    if (matchingRules.length === 0) return;

    // Sort rules by priority
    matchingRules.sort((a, b) => a.priority - b.priority);

    for (const rule of matchingRules) {
      if (this.config.enableBatching && rule.action.options?.batch) {
        this.addToBatch(rule, event);
      } else {
        this.executeRule(rule, event);
      }
    }
  }

  private findMatchingRules(event: any): InvalidationRule[] {
    const matching: InvalidationRule[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check event type match
      const eventTypeMatch = typeof rule.trigger.eventType === 'string'
        ? rule.trigger.eventType === event.type
        : rule.trigger.eventType.test(event.type);

      if (!eventTypeMatch) continue;

      // Check condition if provided
      if (rule.trigger.condition && !rule.trigger.condition(event)) {
        continue;
      }

      matching.push(rule);
    }

    return matching;
  }

  private addToBatch(rule: InvalidationRule, event: any): void {
    this.batchQueue.push({ rule, event });

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.config.batchInterval);
  }

  private processBatch(): void {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];
    this.batchTimeout = null;

    if (this.config.enableDebugLogging) {
      logger.info("Processing batch of ${batch.length} invalidations");
    }

    // Group by rule for efficient processing
    const ruleGroups = new Map<string, Array<{ rule: InvalidationRule; event: any }>>();
    
    for (const item of batch) {
      const key = item.rule.id;
      if (!ruleGroups.has(key)) {
        ruleGroups.set(key, []);
      }
      ruleGroups.get(key)!.push(item);
    }

    // Process each rule group
    for (const items of ruleGroups.values()) {
      this.executeBatchedRule(items);
    }

    if (this.config.enableMetrics) {
      this.metrics.batchedInvalidations += batch.length;
    }
  }

  private executeBatchedRule(items: Array<{ rule: InvalidationRule; event: any }>): void {
    const rule = items[0].rule;
    const events = items.map(item => item.event);

    try {
      const startTime = performance.now();

      // Collect all targets from all events
      const allTargets = new Set<string>();

      for (const event of events) {
        const targets = this.getInvalidationTargets(rule, event);
        targets.forEach(target => allTargets.add(target));
      }

      // Execute invalidations
      for (const target of allTargets) {
        this.executeInvalidation(rule.action.type, target, rule.action.options);
      }

      const duration = performance.now() - startTime;
      this.updateInvalidationMetrics(rule, duration, allTargets.size);

      if (this.config.enableDebugLogging) {
        logger.info("Batched invalidation rule ${rule.name} processed ${allTargets.size} targets in ${duration.toFixed(2)}ms");
      }

    } catch (error) {
      console.error(`Error executing batched invalidation rule ${rule.name}:`, error);
    }
  }

  private executeRule(rule: InvalidationRule, event: any): void {
    try {
      const startTime = performance.now();
      
      if (rule.action.options?.delay) {
        setTimeout(() => {
          this.doExecuteRule(rule, event, startTime);
        }, rule.action.options.delay);
      } else {
        this.doExecuteRule(rule, event, startTime);
      }

    } catch (error) {
      console.error(`Error executing invalidation rule ${rule.name}:`, error);
    }
  }

  private doExecuteRule(rule: InvalidationRule, event: any, startTime: number): void {
    const targets = this.getInvalidationTargets(rule, event);
    
    for (const target of targets) {
      this.executeInvalidation(rule.action.type, target, rule.action.options);
    }

    const duration = performance.now() - startTime;
    this.updateInvalidationMetrics(rule, duration, targets.length);

    if (this.config.enableDebugLogging) {
      logger.info("Invalidation rule ${rule.name} processed ${targets.length} targets in ${duration.toFixed(2)}ms");
    }

    // Handle cascading invalidations
    if (this.config.enableCascading && 
        rule.action.options?.cascade && 
        this.cascadeDepth < this.config.maxCascadeDepth) {
      
      this.cascadeDepth++;
      
      targets.forEach(target => {
        eventBus.emit('cache:invalidated', {
          target,
          rule: rule.id,
          event: event.type,
          cascade: true,
        }, { category: 'system', priority: 'low' });
      });
      
      setTimeout(() => {
        this.cascadeDepth--;
      }, 100);

      if (this.config.enableMetrics) {
        this.metrics.cascadeInvalidations += targets.length;
      }
    }
  }

  private getInvalidationTargets(rule: InvalidationRule, event: any): string[] {
    const { target } = rule.action;

    if (typeof target === 'string') {
      return [target];
    }

    if (target instanceof RegExp) {
      // Find cache keys matching the pattern
      return cacheManager.keys().filter(key => target.test(key));
    }

    if (typeof target === 'function') {
      const result = target(event);
      return Array.isArray(result) ? result : [result];
    }

    return [];
  }

  private executeInvalidation(
    type: InvalidationRule['action']['type'],
    target: string | RegExp,
    options?: InvalidationRule['action']['options']
  ): void {
    switch (type) {
      case 'key':
        if (typeof target === 'string') {
          cacheManager.delete(target);
        }
        break;

      case 'tag':
        if (typeof target === 'string') {
          cacheManager.invalidateByTag(target);
        }
        break;

      case 'pattern':
        if (target instanceof RegExp) {
          cacheManager.invalidateByPattern(target);
        } else if (typeof target === 'string') {
          cacheManager.invalidateByPattern(new RegExp(target));
        }
        break;

      case 'dependency':
        if (typeof target === 'string') {
          cacheManager.invalidateByDependency(target);
        }
        break;

      case 'custom':
        // Custom invalidation logic handled in getInvalidationTargets
        if (typeof target === 'string') {
          cacheManager.delete(target);
        }
        break;
    }
  }

  private updateInvalidationMetrics(rule: InvalidationRule, duration: number, targetCount: number): void {
    if (!this.config.enableMetrics) return;

    this.metrics.totalInvalidations += targetCount;
    this.metrics.invalidationsByRule[rule.id] = (this.metrics.invalidationsByRule[rule.id] || 0) + targetCount;
    this.metrics.invalidationsByType[rule.action.type] = (this.metrics.invalidationsByType[rule.action.type] || 0) + targetCount;
    this.metrics.lastInvalidation = Date.now();

    // Update average time (moving average)
    const currentAvg = this.metrics.averageInvalidationTime;
    const newAvg = currentAvg === 0 ? duration : (currentAvg * 0.9 + duration * 0.1);
    this.metrics.averageInvalidationTime = newAvg;
  }

  // Cache warming
  warmCache(keys: string[], strategy?: string): Promise<void> {
    return new Promise((resolve) => {
      // Emit cache warming event
      eventBus.emit('cache:warm_requested', {
        keys,
        strategy,
        timestamp: Date.now(),
      }, { category: 'system', priority: 'low' });

      resolve();
    });
  }

  // Manual invalidation
  invalidate(options: {
    type: 'key' | 'tag' | 'pattern' | 'dependency';
    target: string | RegExp;
    reason?: string;
  }): number {
    const startTime = performance.now();
    let invalidated = 0;

    switch (options.type) {
      case 'key':
        invalidated = cacheManager.delete(options.target as string) ? 1 : 0;
        break;
      case 'tag':
        invalidated = cacheManager.invalidateByTag(options.target as string);
        break;
      case 'pattern':
        invalidated = cacheManager.invalidateByPattern(
          options.target instanceof RegExp ? options.target : new RegExp(options.target as string)
        );
        break;
      case 'dependency':
        invalidated = cacheManager.invalidateByDependency(options.target as string);
        break;
    }

    const duration = performance.now() - startTime;

    // Emit invalidation event
    eventBus.emit('cache:manual_invalidation', {
      type: options.type,
      target: options.target,
      reason: options.reason,
      invalidated,
      duration,
    }, { category: 'system', priority: 'low' });

    return invalidated;
  }

  // Metrics and status
  getMetrics(): InvalidationMetrics {
    return { ...this.metrics };
  }

  getStats(): {
    totalRules: number;
    enabledRules: number;
    totalInvalidations: number;
    averageTime: string;
    topRules: Array<{ rule: string; count: number }>;
  } {
    const enabledRules = this.getRules().filter(r => r.enabled).length;
    const topRules = Object.entries(this.metrics.invalidationsByRule)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([rule, count]) => ({ rule, count }));

    return {
      totalRules: this.rules.size,
      enabledRules,
      totalInvalidations: this.metrics.totalInvalidations,
      averageTime: `${this.metrics.averageInvalidationTime.toFixed(2)}ms`,
      topRules,
    };
  }

  // Lifecycle
  destroy(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    this.processBatch(); // Process any remaining batched items
    this.rules.clear();
  }
}

// Global invalidation manager instance
export const cacheInvalidation = new CacheInvalidationManager({
  enableDebugLogging: process.env.NODE_ENV === 'development',
});

// Convenience functions
export const invalidateCache = cacheInvalidation.invalidate.bind(cacheInvalidation);
export const warmCache = cacheInvalidation.warmCache.bind(cacheInvalidation);

// Default export
export default CacheInvalidationManager;