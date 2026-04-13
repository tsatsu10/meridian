// Error boundary and recovery patterns for Redux slices

import { Middleware, createAction, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// Error types and interfaces
export interface SliceError {
  id: string;
  sliceName: string;
  actionType: string;
  error: Error;
  timestamp: number;
  context: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  retryCount: number;
  maxRetries: number;
}

export interface ErrorRecoveryStrategy {
  name: string;
  condition: (error: SliceError) => boolean;
  execute: (error: SliceError, state: any) => Promise<any> | any;
  priority: number;
  maxExecutions?: number;
  cooldownMs?: number;
}

export interface ErrorBoundaryConfig {
  sliceName: string;
  maxErrors: number;
  timeWindowMs: number;
  recoveryStrategies: ErrorRecoveryStrategy[];
  fallbackState?: any;
  onError?: (error: SliceError) => void;
  onRecovery?: (error: SliceError, strategy: ErrorRecoveryStrategy) => void;
  onFallback?: (errors: SliceError[]) => void;
}

// Global error actions
export const globalErrorActions = {
  recordError: createAction<SliceError>('error/recordError'),
  recoverFromError: createAction<{ errorId: string; strategy: string }>('error/recoverFromError'),
  clearErrors: createAction<{ sliceName?: string }>('error/clearErrors'),
  triggerFallback: createAction<{ sliceName: string; reason: string }>('error/triggerFallback'),
};

// Error boundary manager
export class ErrorBoundaryManager {
  private boundaries = new Map<string, ErrorBoundary>();
  private globalErrors: SliceError[] = [];
  private strategyExecutions = new Map<string, { count: number; lastExecution: number }>();

  createBoundary(config: ErrorBoundaryConfig): ErrorBoundary {
    const boundary = new ErrorBoundary(config, this);
    this.boundaries.set(config.sliceName, boundary);
    return boundary;
  }

  getBoundary(sliceName: string): ErrorBoundary | undefined {
    return this.boundaries.get(sliceName);
  }

  recordGlobalError(error: SliceError): void {
    this.globalErrors.push(error);
    
    // Keep only last 100 errors
    if (this.globalErrors.length > 100) {
      this.globalErrors = this.globalErrors.slice(-100);
    }
  }

  getGlobalErrors(): SliceError[] {
    return [...this.globalErrors];
  }

  getErrorsBySlice(sliceName: string): SliceError[] {
    return this.globalErrors.filter(error => error.sliceName === sliceName);
  }

  canExecuteStrategy(strategyName: string, maxExecutions?: number, cooldownMs?: number): boolean {
    const execution = this.strategyExecutions.get(strategyName);
    
    if (!execution) return true;
    
    if (maxExecutions && execution.count >= maxExecutions) {
      return false;
    }
    
    if (cooldownMs && Date.now() - execution.lastExecution < cooldownMs) {
      return false;
    }
    
    return true;
  }

  recordStrategyExecution(strategyName: string): void {
    const execution = this.strategyExecutions.get(strategyName) || { count: 0, lastExecution: 0 };
    execution.count++;
    execution.lastExecution = Date.now();
    this.strategyExecutions.set(strategyName, execution);
  }

  clearStrategyExecutions(strategyName?: string): void {
    if (strategyName) {
      this.strategyExecutions.delete(strategyName);
    } else {
      this.strategyExecutions.clear();
    }
  }

  getHealthStatus(): {
    totalErrors: number;
    errorsBySlice: Record<string, number>;
    criticalErrors: number;
    recoverableErrors: number;
    boundaryStatus: Record<string, { active: boolean; errorCount: number; lastError: number | null }>;
  } {
    const errorsBySlice: Record<string, number> = {};
    let criticalErrors = 0;
    let recoverableErrors = 0;

    for (const error of this.globalErrors) {
      errorsBySlice[error.sliceName] = (errorsBySlice[error.sliceName] || 0) + 1;
      
      if (error.severity === 'critical') {
        criticalErrors++;
      }
      
      if (error.recoverable) {
        recoverableErrors++;
      }
    }

    const boundaryStatus: Record<string, { active: boolean; errorCount: number; lastError: number | null }> = {};
    for (const [sliceName, boundary] of this.boundaries) {
      const sliceErrors = this.getErrorsBySlice(sliceName);
      boundaryStatus[sliceName] = {
        active: boundary.isActive(),
        errorCount: sliceErrors.length,
        lastError: sliceErrors.length > 0 ? Math.max(...sliceErrors.map(e => e.timestamp)) : null,
      };
    }

    return {
      totalErrors: this.globalErrors.length,
      errorsBySlice,
      criticalErrors,
      recoverableErrors,
      boundaryStatus,
    };
  }
}

// Individual error boundary for a slice
export class ErrorBoundary {
  private config: ErrorBoundaryConfig;
  private manager: ErrorBoundaryManager;
  private errors: SliceError[] = [];
  private active = true;
  private fallbackTriggered = false;

  constructor(config: ErrorBoundaryConfig, manager: ErrorBoundaryManager) {
    this.config = config;
    this.manager = manager;
  }

  async handleError(error: Error, actionType: string, context: Record<string, any>): Promise<{
    recovered: boolean;
    strategy?: ErrorRecoveryStrategy;
    fallbackTriggered: boolean;
  }> {
    const sliceError: SliceError = {
      id: `${this.config.sliceName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sliceName: this.config.sliceName,
      actionType,
      error,
      timestamp: Date.now(),
      context,
      severity: this.determineSeverity(error, actionType),
      recoverable: this.isRecoverable(error, actionType),
      retryCount: 0,
      maxRetries: this.getMaxRetries(error, actionType),
    };

    this.errors.push(sliceError);
    this.manager.recordGlobalError(sliceError);

    // Call error callback
    if (this.config.onError) {
      this.config.onError(sliceError);
    }

    // Check if we should trigger fallback
    if (this.shouldTriggerFallback()) {
      this.fallbackTriggered = true;
      if (this.config.onFallback) {
        this.config.onFallback(this.errors);
      }
      return { recovered: false, fallbackTriggered: true };
    }

    // Try recovery strategies
    const recoveryResult = await this.attemptRecovery(sliceError);
    
    return {
      recovered: recoveryResult.success,
      strategy: recoveryResult.strategy,
      fallbackTriggered: false,
    };
  }

  private async attemptRecovery(error: SliceError): Promise<{
    success: boolean;
    strategy?: ErrorRecoveryStrategy;
  }> {
    if (!error.recoverable) {
      return { success: false };
    }

    // Sort strategies by priority
    const strategies = [...this.config.recoveryStrategies].sort((a, b) => b.priority - a.priority);

    for (const strategy of strategies) {
      if (!strategy.condition(error)) {
        continue;
      }

      if (!this.manager.canExecuteStrategy(
        `${this.config.sliceName}_${strategy.name}`,
        strategy.maxExecutions,
        strategy.cooldownMs
      )) {
        continue;
      }

      try {
        await strategy.execute(error, this.getCurrentState());
        
        this.manager.recordStrategyExecution(`${this.config.sliceName}_${strategy.name}`);
        
        if (this.config.onRecovery) {
          this.config.onRecovery(error, strategy);
        }

        return { success: true, strategy };
      } catch (recoveryError) {
        console.error(`Recovery strategy ${strategy.name} failed:`, recoveryError);
      }
    }

    return { success: false };
  }

  private shouldTriggerFallback(): boolean {
    if (this.fallbackTriggered) {
      return false;
    }

    const recentErrors = this.getRecentErrors();
    return recentErrors.length >= this.config.maxErrors;
  }

  private getRecentErrors(): SliceError[] {
    const cutoff = Date.now() - this.config.timeWindowMs;
    return this.errors.filter(error => error.timestamp > cutoff);
  }

  private determineSeverity(error: Error, actionType: string): SliceError['severity'] {
    // Network errors are usually medium severity
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'medium';
    }

    // Authentication errors are high severity
    if (error.message.includes('401') || error.message.includes('403')) {
      return 'high';
    }

    // System errors are critical
    if (error.message.includes('500') || error.message.includes('system')) {
      return 'critical';
    }

    // Validation errors are low severity
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return 'low';
    }

    return 'medium';
  }

  private isRecoverable(error: Error, actionType: string): boolean {
    // Network errors are usually recoverable
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return true;
    }

    // Timeout errors are recoverable
    if (error.message.includes('timeout')) {
      return true;
    }

    // Rate limit errors are recoverable
    if (error.message.includes('rate limit') || error.message.includes('too many')) {
      return true;
    }

    // Authentication errors might be recoverable
    if (error.message.includes('401')) {
      return true;
    }

    // System errors are usually not recoverable
    if (error.message.includes('500') || error.message.includes('system')) {
      return false;
    }

    return true;
  }

  private getMaxRetries(error: Error, actionType: string): number {
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return 3;
    }

    if (error.message.includes('rate limit')) {
      return 5;
    }

    if (error.message.includes('401')) {
      return 1;
    }

    return 2;
  }

  private getCurrentState(): any {
    // This would need to be injected from the store
    return null;
  }

  getFallbackState(): any {
    return this.config.fallbackState || null;
  }

  isActive(): boolean {
    return this.active;
  }

  isFallbackTriggered(): boolean {
    return this.fallbackTriggered;
  }

  getErrors(): SliceError[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
    this.fallbackTriggered = false;
  }

  reset(): void {
    this.errors = [];
    this.active = true;
    this.fallbackTriggered = false;
  }

  disable(): void {
    this.active = false;
  }

  enable(): void {
    this.active = true;
  }
}

// Common recovery strategies
export const commonRecoveryStrategies: Record<string, ErrorRecoveryStrategy> = {
  retry: {
    name: 'retry',
    condition: (error) => error.retryCount < error.maxRetries,
    execute: async (error) => {
      error.retryCount++;
      // This would re-dispatch the original action
      return Promise.resolve();
    },
    priority: 100,
    maxExecutions: 3,
    cooldownMs: 1000,
  },

  retryWithBackoff: {
    name: 'retryWithBackoff',
    condition: (error) => error.retryCount < error.maxRetries && error.recoverable,
    execute: async (error) => {
      const backoffDelay = Math.min(1000 * Math.pow(2, error.retryCount), 10000);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      error.retryCount++;
      return Promise.resolve();
    },
    priority: 90,
    maxExecutions: 5,
  },

  refreshAuth: {
    name: 'refreshAuth',
    condition: (error) => error.error.message.includes('401') || error.error.message.includes('unauthorized'),
    execute: async (error) => {
      // This would dispatch a refresh auth action
      return Promise.resolve();
    },
    priority: 95,
    maxExecutions: 2,
    cooldownMs: 5000,
  },

  clearCache: {
    name: 'clearCache',
    condition: (error) => error.severity === 'medium' && error.actionType.includes('fetch'),
    execute: async (error) => {
      // This would clear relevant cache
      return Promise.resolve();
    },
    priority: 70,
    maxExecutions: 1,
    cooldownMs: 30000,
  },

  fallbackToCache: {
    name: 'fallbackToCache',
    condition: (error) => error.error.message.includes('network') || error.error.message.includes('fetch'),
    execute: async (error) => {
      // This would return cached data
      return Promise.resolve();
    },
    priority: 60,
  },

  resetSliceState: {
    name: 'resetSliceState',
    condition: (error) => error.severity === 'critical',
    execute: async (error, state) => {
      // This would reset slice to initial state
      return Promise.resolve();
    },
    priority: 10,
    maxExecutions: 1,
    cooldownMs: 60000,
  },
};

// Error boundary middleware
export function createErrorBoundaryMiddleware(
  manager: ErrorBoundaryManager
): Middleware {
  return (store) => (next) => (action) => {
    try {
      const result = next(action);
      
      // Handle async action errors
      if (action.type.endsWith('/rejected')) {
        const sliceName = action.type.split('/')[0];
        const boundary = manager.getBoundary(sliceName);
        
        if (boundary && boundary.isActive()) {
          boundary.handleError(
            action.error || new Error('Unknown async error'),
            action.type,
            { meta: action.meta, payload: action.payload }
          );
        }
      }
      
      return result;
    } catch (error) {
      const actionType = action.type;
      const sliceName = actionType.split('/')[0];
      const boundary = manager.getBoundary(sliceName);
      
      if (boundary && boundary.isActive()) {
        boundary.handleError(
          error as Error,
          actionType,
          { action, state: store.getState() }
        );
        
        // Return fallback state if boundary is triggered
        if (boundary.isFallbackTriggered()) {
          const fallbackState = boundary.getFallbackState();
          if (fallbackState) {
            return { ...store.getState(), [sliceName]: fallbackState };
          }
        }
      }
      
      throw error;
    }
  };
}

// Pre-configured error boundaries for each slice
export const sliceErrorBoundaryConfigs: Record<string, ErrorBoundaryConfig> = {
  auth: {
    sliceName: 'auth',
    maxErrors: 3,
    timeWindowMs: 60000, // 1 minute
    recoveryStrategies: [
      commonRecoveryStrategies.refreshAuth,
      commonRecoveryStrategies.retryWithBackoff,
      commonRecoveryStrategies.clearCache,
    ],
    fallbackState: {
      user: null,
      session: null,
      isAuthenticated: false,
      loading: false,
      error: 'Authentication service unavailable',
    },
  },

  workspace: {
    sliceName: 'workspace',
    maxErrors: 5,
    timeWindowMs: 120000, // 2 minutes
    recoveryStrategies: [
      commonRecoveryStrategies.retryWithBackoff,
      commonRecoveryStrategies.fallbackToCache,
      commonRecoveryStrategies.clearCache,
    ],
    fallbackState: {
      current: null,
      list: [],
      members: [],
      loading: { workspace: false, members: false },
      errors: { workspace: 'Workspace service unavailable' },
    },
  },

  project: {
    sliceName: 'project',
    maxErrors: 5,
    timeWindowMs: 120000,
    recoveryStrategies: [
      commonRecoveryStrategies.retryWithBackoff,
      commonRecoveryStrategies.fallbackToCache,
      commonRecoveryStrategies.clearCache,
    ],
    fallbackState: {
      list: [],
      active: null,
      members: [],
      tasks: [],
      loading: { projects: false, project: false },
      errors: { projects: 'Project service unavailable' },
    },
  },

  task: {
    sliceName: 'task',
    maxErrors: 7,
    timeWindowMs: 180000, // 3 minutes
    recoveryStrategies: [
      commonRecoveryStrategies.retryWithBackoff,
      commonRecoveryStrategies.fallbackToCache,
      commonRecoveryStrategies.clearCache,
    ],
    fallbackState: {
      list: [],
      active: null,
      boards: [],
      loading: { tasks: false, task: false },
      errors: { tasks: 'Task service unavailable' },
    },
  },

  team: {
    sliceName: 'team',
    maxErrors: 5,
    timeWindowMs: 120000,
    recoveryStrategies: [
      commonRecoveryStrategies.retryWithBackoff,
      commonRecoveryStrategies.fallbackToCache,
      commonRecoveryStrategies.clearCache,
    ],
    fallbackState: {
      list: [],
      active: null,
      members: [],
      loading: { teams: false, team: false },
      errors: { teams: 'Team service unavailable' },
    },
  },

  communication: {
    sliceName: 'communication',
    maxErrors: 10,
    timeWindowMs: 300000, // 5 minutes - more tolerant for real-time features
    recoveryStrategies: [
      commonRecoveryStrategies.retry,
      commonRecoveryStrategies.fallbackToCache,
      commonRecoveryStrategies.clearCache,
    ],
    fallbackState: {
      messages: [],
      channels: [],
      activeChannel: null,
      onlineUsers: [],
      typingUsers: [],
      loading: { messages: false, channels: false },
      errors: { messages: 'Communication service unavailable' },
    },
  },

  ui: {
    sliceName: 'ui',
    maxErrors: 3,
    timeWindowMs: 60000,
    recoveryStrategies: [
      commonRecoveryStrategies.resetSliceState,
    ],
    fallbackState: {
      theme: 'light',
      sidebar: { collapsed: false, width: 280 },
      modals: {},
      loading: {},
      errors: {},
    },
  },
};

// Global error boundary manager instance
export const errorBoundaryManager = new ErrorBoundaryManager();

// Initialize boundaries for all slices
for (const [sliceName, config] of Object.entries(sliceErrorBoundaryConfigs)) {
  errorBoundaryManager.createBoundary(config);
}

// Export middleware
export const errorBoundaryMiddleware = createErrorBoundaryMiddleware(errorBoundaryManager);

// React hooks for error boundary monitoring
export function useErrorBoundaryStats(sliceName?: string) {
  const [stats, setStats] = useState(() => errorBoundaryManager.getHealthStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(errorBoundaryManager.getHealthStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (sliceName) {
    const sliceErrors = errorBoundaryManager.getErrorsBySlice(sliceName);
    const boundary = errorBoundaryManager.getBoundary(sliceName);
    
    return {
      errors: sliceErrors,
      isActive: boundary?.isActive() || false,
      isFallbackTriggered: boundary?.isFallbackTriggered() || false,
      errorCount: sliceErrors.length,
    };
  }

  return stats;
}

export default ErrorBoundaryManager;