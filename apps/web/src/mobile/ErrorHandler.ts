// Advanced Error Handling and Recovery System for Phase 7
import React from 'react';
import { logger } from "../lib/logger";

export interface ErrorContext {
  component: string;
  action: string;
  timestamp: Date;
  userAgent: string;
  networkType: string;
  deviceType: string;
  memoryInfo?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  stackTrace?: string;
  errorCode?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorRecovery {
  strategy: 'retry' | 'fallback' | 'degrade' | 'reset' | 'manual';
  maxAttempts: number;
  backoffDelay: number;
  conditions: {
    errorType: string[];
    networkType?: string;
    deviceType?: string;
    timeOfDay?: 'peak' | 'off-peak';
  };
  actions: string[];
}

export interface SyncError {
  id: string;
  error: Error;
  context: ErrorContext;
  recovery: ErrorRecovery;
  attempts: number;
  lastAttempt: Date;
  resolved: boolean;
  resolutionTime?: Date;
  resolutionStrategy?: string;
}

export interface ErrorPattern {
  pattern: string;
  frequency: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  suggestedFix: string;
  autoResolve: boolean;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: SyncError[] = [];
  private retryQueue: Map<string, { error: SyncError; attempts: number }> = new Map();
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private recoveryStrategies: Map<string, ErrorRecovery> = new Map();
  private isProcessing = false;
  private errorStats = {
    totalErrors: 0,
    resolvedErrors: 0,
    criticalErrors: 0,
    averageResolutionTime: 0,
    mostCommonError: '',
    errorRate: 0
  };

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  constructor() {
    this.initializeErrorPatterns();
    this.initializeRecoveryStrategies();
    this.startPeriodicErrorAnalysis();
  }

  // Initialize known error patterns for intelligent handling
  private initializeErrorPatterns(): void {
    this.errorPatterns.set('network-timeout', {
      pattern: 'timeout|network.*error|fetch.*failed',
      frequency: 0,
      impact: 'medium',
      suggestedFix: 'Retry with exponential backoff',
      autoResolve: true
    });

    this.errorPatterns.set('sync-conflict', {
      pattern: 'conflict|version.*mismatch|concurrent.*modification',
      frequency: 0,
      impact: 'high',
      suggestedFix: 'Merge changes or use last-writer-wins',
      autoResolve: true
    });

    this.errorPatterns.set('storage-quota', {
      pattern: 'quota.*exceeded|storage.*full|disk.*space',
      frequency: 0,
      impact: 'high',
      suggestedFix: 'Clear old data and optimize storage',
      autoResolve: true
    });

    this.errorPatterns.set('authentication', {
      pattern: 'unauthorized|forbidden|token.*expired|auth.*failed',
      frequency: 0,
      impact: 'critical',
      suggestedFix: 'Re-authenticate user',
      autoResolve: false
    });

    this.errorPatterns.set('memory-pressure', {
      pattern: 'memory.*pressure|heap.*overflow|out.*of.*memory',
      frequency: 0,
      impact: 'critical',
      suggestedFix: 'Clear caches and optimize memory usage',
      autoResolve: true
    });

    this.errorPatterns.set('service-worker', {
      pattern: 'service.*worker|sw.*error|cache.*error',
      frequency: 0,
      impact: 'medium',
      suggestedFix: 'Re-register service worker',
      autoResolve: true
    });
  }

  // Initialize recovery strategies for different error types
  private initializeRecoveryStrategies(): void {
    // Network-related errors
    this.recoveryStrategies.set('network-error', {
      strategy: 'retry',
      maxAttempts: 5,
      backoffDelay: 1000,
      conditions: {
        errorType: ['network-timeout', 'fetch-failed'],
        networkType: 'slow'
      },
      actions: ['exponential-backoff', 'network-check', 'fallback-cache']
    });

    // Sync conflicts
    this.recoveryStrategies.set('sync-conflict', {
      strategy: 'fallback',
      maxAttempts: 3,
      backoffDelay: 500,
      conditions: {
        errorType: ['sync-conflict', 'version-mismatch']
      },
      actions: ['merge-changes', 'use-local-version', 'notify-user']
    });

    // Storage issues
    this.recoveryStrategies.set('storage-error', {
      strategy: 'degrade',
      maxAttempts: 2,
      backoffDelay: 2000,
      conditions: {
        errorType: ['storage-quota', 'disk-full']
      },
      actions: ['clear-old-data', 'compress-data', 'reduce-cache-size']
    });

    // Authentication errors
    this.recoveryStrategies.set('auth-error', {
      strategy: 'manual',
      maxAttempts: 1,
      backoffDelay: 0,
      conditions: {
        errorType: ['authentication', 'token-expired']
      },
      actions: ['redirect-login', 'clear-session', 'show-auth-modal']
    });

    // Critical system errors
    this.recoveryStrategies.set('critical-error', {
      strategy: 'reset',
      maxAttempts: 1,
      backoffDelay: 0,
      conditions: {
        errorType: ['memory-pressure', 'system-crash']
      },
      actions: ['clear-all-caches', 'restart-app', 'show-error-screen']
    });
  }

  // Enhanced sync error handling with intelligent recovery
  async handleSyncError(error: Error, context: Partial<ErrorContext>): Promise<void> {
    const errorId = this.generateErrorId();
    const fullContext: ErrorContext = {
      component: context.component || 'unknown',
      action: context.action || 'unknown',
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      networkType: this.getNetworkType(),
      deviceType: this.getDeviceType(),
      memoryInfo: this.getMemoryInfo(),
      stackTrace: error.stack,
      errorCode: this.extractErrorCode(error),
      severity: this.calculateSeverity(error, context)
    };

    // Identify error pattern
    const pattern = this.identifyErrorPattern(error);
    const recovery = this.determineRecoveryStrategy(error, pattern, fullContext);

    const syncError: SyncError = {
      id: errorId,
      error,
      context: fullContext,
      recovery,
      attempts: 0,
      lastAttempt: new Date(),
      resolved: false
    };

    this.errorLog.push(syncError);
    this.updateErrorStats();

    // Log error for debugging
    console.error(`[ErrorHandler] Sync error in ${fullContext.component}:`, {
      error: error.message,
      context: fullContext,
      pattern,
      recovery: recovery.strategy
    });

    // Attempt automatic recovery if possible
    if (recovery.strategy !== 'manual') {
      await this.attemptRecovery(syncError);
    } else {
      // For manual recovery, notify user and queue for manual intervention
      this.notifyUser(syncError);
    }
  }

  // Enhanced offline error handling
  async handleOfflineError(error: Error, context: Partial<ErrorContext>): Promise<void> {
    const errorId = this.generateErrorId();
    const fullContext: ErrorContext = {
      component: context.component || 'offline-manager',
      action: context.action || 'unknown',
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      networkType: 'offline',
      deviceType: this.getDeviceType(),
      memoryInfo: this.getMemoryInfo(),
      stackTrace: error.stack,
      errorCode: this.extractErrorCode(error),
      severity: this.calculateSeverity(error, context)
    };

    const pattern = this.identifyErrorPattern(error);
    const recovery = this.determineRecoveryStrategy(error, pattern, fullContext);

    const syncError: SyncError = {
      id: errorId,
      error,
      context: fullContext,
      recovery,
      attempts: 0,
      lastAttempt: new Date(),
      resolved: false
    };

    this.errorLog.push(syncError);
    this.updateErrorStats();

    // For offline errors, always attempt recovery when back online
    this.retryQueue.set(errorId, { error: syncError, attempts: 0 });

    console.warn(`[ErrorHandler] Offline error queued for retry:`, {
      error: error.message,
      context: fullContext
    });
  }

  // Enhanced PWA error handling
  async handlePWAError(error: Error, context: Partial<ErrorContext>): Promise<void> {
    const errorId = this.generateErrorId();
    const fullContext: ErrorContext = {
      component: context.component || 'pwa-manager',
      action: context.action || 'unknown',
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      networkType: this.getNetworkType(),
      deviceType: this.getDeviceType(),
      memoryInfo: this.getMemoryInfo(),
      stackTrace: error.stack,
      errorCode: this.extractErrorCode(error),
      severity: this.calculateSeverity(error, context)
    };

    const pattern = this.identifyErrorPattern(error);
    const recovery = this.determineRecoveryStrategy(error, pattern, fullContext);

    const syncError: SyncError = {
      id: errorId,
      error,
      context: fullContext,
      recovery,
      attempts: 0,
      lastAttempt: new Date(),
      resolved: false
    };

    this.errorLog.push(syncError);
    this.updateErrorStats();

    // PWA errors often require immediate attention
    if (recovery.strategy === 'reset') {
      await this.performReset(syncError);
    } else {
      await this.attemptRecovery(syncError);
    }
  }

  // Enhanced retry mechanism with exponential backoff
  async scheduleRetry(errorId: string, delay?: number): Promise<void> {
    const retryItem = this.retryQueue.get(errorId);
    if (!retryItem) return;

    const { error, attempts } = retryItem;
    const recovery = error.recovery;

    if (attempts >= recovery.maxAttempts) {
      console.error(`[ErrorHandler] Max retry attempts reached for error ${errorId}`);
      this.markErrorAsUnresolved(error);
      return;
    }

    const backoffDelay = delay || recovery.backoffDelay * Math.pow(2, attempts);
    
    setTimeout(async () => {
      try {
        await this.attemptRecovery(error);
        retryItem.attempts++;
        error.attempts = retryItem.attempts;
        error.lastAttempt = new Date();
      } catch (retryError) {
        console.error(`[ErrorHandler] Retry failed for error ${errorId}:`, retryError);
        this.scheduleRetry(errorId, backoffDelay * 2);
      }
    }, backoffDelay);
  }

  // Enhanced error recovery attempt
  private async attemptRecovery(syncError: SyncError): Promise<void> {
    const { recovery } = syncError;
    
    try {
      switch (recovery.strategy) {
        case 'retry':
          await this.performRetry(syncError);
          break;
        case 'fallback':
          await this.performFallback(syncError);
          break;
        case 'degrade':
          await this.performDegrade(syncError);
          break;
        case 'reset':
          await this.performReset(syncError);
          break;
        default:
          console.warn(`[ErrorHandler] Unknown recovery strategy: ${recovery.strategy}`);
      }
    } catch (recoveryError) {
      console.error(`[ErrorHandler] Recovery failed for error ${syncError.id}:`, recoveryError);
      this.scheduleRetry(syncError.id);
    }
  }

  // Perform retry recovery
  private async performRetry(syncError: SyncError): Promise<void> {
    const { error, context } = syncError;
    
    // Simulate retry logic based on context
    if (context.component === 'sync-manager') {
      // Retry sync operation
      logger.error("[ErrorHandler] Retrying sync operation for error ${syncError.id}");
      // Implementation would retry the actual sync operation
    } else if (context.component === 'offline-manager') {
      // Retry offline operation
      logger.error("[ErrorHandler] Retrying offline operation for error ${syncError.id}");
      // Implementation would retry the actual offline operation
    }
  }

  // Perform fallback recovery
  private async performFallback(syncError: SyncError): Promise<void> {
    const { error, context } = syncError;
    
    logger.error("[ErrorHandler] Performing fallback for error ${syncError.id}");
    
    // Implement fallback logic based on error type
    if (this.isRetryableError(error)) {
      await this.performRetry(syncError);
    } else {
      // Use cached data or alternative approach
      this.useCachedData(syncError);
    }
  }

  // Perform degrade recovery
  private async performDegrade(syncError: SyncError): Promise<void> {
    const { error, context } = syncError;
    
    logger.error("[ErrorHandler] Performing degradation for error ${syncError.id}");
    
    // Reduce functionality gracefully
    if (context.component === 'sync-manager') {
      this.disableAutoSync();
    } else if (context.component === 'offline-manager') {
      this.reduceOfflineCapabilities();
    }
  }

  // Perform reset recovery
  private async performReset(syncError: SyncError): Promise<void> {
    const { error, context } = syncError;
    
    logger.error("[ErrorHandler] Performing reset for error ${syncError.id}");
    
    // Clear caches and restart components
    await this.clearAllCaches();
    this.restartComponents(context.component);
  }

  // Enhanced error pattern identification
  private identifyErrorPattern(error: Error): string | null {
    const errorMessage = error.message.toLowerCase();
    
    for (const [patternName, pattern] of this.errorPatterns) {
      const regex = new RegExp(pattern.pattern, 'i');
      if (regex.test(errorMessage)) {
        pattern.frequency++;
        return patternName;
      }
    }
    
    return null;
  }

  // Enhanced recovery strategy determination
  private determineRecoveryStrategy(error: Error, pattern: string | null, context: ErrorContext): ErrorRecovery {
    // Check for specific error patterns first
    if (pattern && this.recoveryStrategies.has(pattern)) {
      return this.recoveryStrategies.get(pattern)!;
    }

    // Check for network conditions
    if (context.networkType === 'slow' || context.networkType === 'offline') {
      return this.recoveryStrategies.get('network-error')!;
    }

    // Check for memory pressure
    if (context.memoryInfo && context.memoryInfo.usedJSHeapSize > context.memoryInfo.jsHeapSizeLimit * 0.8) {
      return this.recoveryStrategies.get('critical-error')!;
    }

    // Default to retry strategy
    return this.recoveryStrategies.get('network-error')!;
  }

  // Enhanced error severity calculation
  private calculateSeverity(error: Error, context: Partial<ErrorContext>): 'low' | 'medium' | 'high' | 'critical' {
    const errorMessage = error.message.toLowerCase();
    
    // Critical errors
    if (errorMessage.includes('memory') || errorMessage.includes('crash') || errorMessage.includes('fatal')) {
      return 'critical';
    }
    
    // High severity errors
    if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      return 'high';
    }
    
    // Medium severity errors
    if (errorMessage.includes('timeout') || errorMessage.includes('network') || errorMessage.includes('sync')) {
      return 'medium';
    }
    
    // Low severity errors
    return 'low';
  }

  // Enhanced retryable error detection
  isRetryableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    
    // Network errors are usually retryable
    if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
      return true;
    }
    
    // Server errors (5xx) are retryable
    if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
      return true;
    }
    
    // Client errors (4xx) are usually not retryable
    if (errorMessage.includes('400') || errorMessage.includes('401') || errorMessage.includes('403')) {
      return false;
    }
    
    return false;
  }

  // Enhanced recovery strategy selection
  getRecoveryStrategy(error: Error, context: ErrorContext): ErrorRecovery {
    return this.determineRecoveryStrategy(error, this.identifyErrorPattern(error), context);
  }

  // Enhanced user notification
  notifyUser(syncError: SyncError): void {
    const { error, context, recovery } = syncError;
    
    // Create user-friendly error message
    const message = this.createUserFriendlyMessage(error, context);
    
    // Show notification based on severity
    if (context.severity === 'critical') {
      this.showCriticalErrorModal(message);
    } else if (context.severity === 'high') {
      this.showErrorNotification(message);
    } else {
      this.showWarningNotification(message);
    }
  }

  // Enhanced error statistics
  getErrorStats(): typeof this.errorStats {
    return { ...this.errorStats };
  }

  // Enhanced error log management
  clearErrorLog(): void {
    this.errorLog = [];
    this.retryQueue.clear();
    this.updateErrorStats();
  }

  // Enhanced error log export
  exportErrorLog(): string {
    const logData = {
      timestamp: new Date().toISOString(),
      totalErrors: this.errorStats.totalErrors,
      resolvedErrors: this.errorStats.resolvedErrors,
      errorRate: this.errorStats.errorRate,
      errors: this.errorLog.map(error => ({
        id: error.id,
        message: error.error.message,
        component: error.context.component,
        severity: error.context.severity,
        timestamp: error.context.timestamp,
        resolved: error.resolved,
        attempts: error.attempts
      }))
    };
    
    return JSON.stringify(logData, null, 2);
  }

  // Utility methods
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractErrorCode(error: Error): string {
    // Extract error code from error message or stack trace
    const codeMatch = error.message.match(/\[(\w+)\]/);
    return codeMatch ? codeMatch[1] : 'UNKNOWN';
  }

  private getNetworkType(): string {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection?.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
      return 'mobile';
    }
    if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet';
    }
    return 'desktop';
  }

  private getMemoryInfo(): any {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    };
  }

  private updateErrorStats(): void {
    const totalErrors = this.errorLog.length;
    const resolvedErrors = this.errorLog.filter(e => e.resolved).length;
    const criticalErrors = this.errorLog.filter(e => e.context.severity === 'critical').length;
    
    // Calculate average resolution time
    const resolvedErrorsWithTime = this.errorLog.filter(e => e.resolved && e.resolutionTime);
    const totalResolutionTime = resolvedErrorsWithTime.reduce((sum, e) => {
      return sum + (e.resolutionTime!.getTime() - e.context.timestamp.getTime());
    }, 0);
    const averageResolutionTime = resolvedErrorsWithTime.length > 0 ? totalResolutionTime / resolvedErrorsWithTime.length : 0;
    
    // Find most common error
    const errorCounts = new Map<string, number>();
    this.errorLog.forEach(e => {
      const pattern = this.identifyErrorPattern(e.error);
      if (pattern) {
        errorCounts.set(pattern, (errorCounts.get(pattern) || 0) + 1);
      }
    });
    const mostCommonError = Array.from(errorCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
    
    // Calculate error rate (errors per hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentErrors = this.errorLog.filter(e => e.context.timestamp.getTime() > oneHourAgo).length;
    const errorRate = recentErrors; // errors per hour
    
    this.errorStats = {
      totalErrors,
      resolvedErrors,
      criticalErrors,
      averageResolutionTime,
      mostCommonError,
      errorRate
    };
  }

  private markErrorAsUnresolved(error: SyncError): void {
    error.resolved = false;
    this.retryQueue.delete(error.id);
    this.updateErrorStats();
  }

  private useCachedData(syncError: SyncError): void {
    logger.error("[ErrorHandler] Using cached data for error ${syncError.id}");
    // Implementation would use cached data instead of fresh data
  }

  private disableAutoSync(): void {
    logger.error("[ErrorHandler] Disabling auto sync due to errors");
    // Implementation would disable automatic synchronization
  }

  private reduceOfflineCapabilities(): void {
    logger.error("[ErrorHandler] Reducing offline capabilities due to errors");
    // Implementation would reduce offline functionality
  }

  private async clearAllCaches(): Promise<void> {
    logger.error("[ErrorHandler] Clearing all caches");
    // Implementation would clear all application caches
  }

  private restartComponents(component: string): void {
    logger.error("[ErrorHandler] Restarting component: ${component}");
    // Implementation would restart the specified component
  }

  private createUserFriendlyMessage(error: Error, context: ErrorContext): string {
    const pattern = this.identifyErrorPattern(error);
    
    switch (pattern) {
      case 'network-timeout':
        return 'Connection timeout. Please check your internet connection and try again.';
      case 'sync-conflict':
        return 'Data conflict detected. Your changes have been saved locally and will sync when resolved.';
      case 'storage-quota':
        return 'Storage space is running low. Some features may be limited.';
      case 'authentication':
        return 'Authentication required. Please log in again.';
      case 'memory-pressure':
        return 'System memory is low. The app will optimize performance automatically.';
      default:
        return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
    }
  }

  private showCriticalErrorModal(message: string): void {
    console.error('[ErrorHandler] Critical error modal:', message);
    // Implementation would show a critical error modal
  }

  private showErrorNotification(message: string): void {
    console.error('[ErrorHandler] Error notification:', message);
    // Implementation would show an error notification
  }

  private showWarningNotification(message: string): void {
    console.warn('[ErrorHandler] Warning notification:', message);
    // Implementation would show a warning notification
  }

  private startPeriodicErrorAnalysis(): void {
    setInterval(() => {
      this.analyzeErrorPatterns();
    }, 60000); // Every minute
  }

  private analyzeErrorPatterns(): void {
    // Analyze error patterns and update strategies
    logger.debug("[ErrorHandler] Analyzing error patterns...");
    this.updateErrorStats();
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance();

// Error Boundary for React components
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorHandler.handlePWAError(error, {
      component: 'react-component',
      action: 'render',
      severity: 'medium'
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || React.createElement('div', { className: 'error-boundary' },
        React.createElement('h2', null, 'Something went wrong'),
        React.createElement('p', null, 'Please refresh the page or contact support if the problem persists.')
      );
    }

    return this.props.children;
  }
} 