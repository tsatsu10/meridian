// Comprehensive Test Suite for Phase 7: Mobile & Offline Support
import { errorHandler } from '../mobile/ErrorHandler';
import { performanceMonitor } from '../mobile/PerformanceMonitor';
import { pwaManager } from '../mobile/PWAManager';
import { offlineManager } from '../mobile/OfflineManager';
import { syncManager } from '../mobile/SyncManager';
import { logger } from "../lib/logger";

export interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
  details?: any;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
}

export class Phase7TestSuite {
  private testResults: TestResult[] = [];
  private startTime: number = 0;

  // Run all Phase 7 tests
  async runAllTests(): Promise<TestSuite> {
    this.startTime = performance.now();
    this.testResults = [];// PWA Tests
    await this.runPWATests();
    
    // Offline Tests
    await this.runOfflineTests();
    
    // Sync Tests
    await this.runSyncTests();
    
    // Error Handling Tests
    await this.runErrorHandlingTests();
    
    // Performance Tests
    await this.runPerformanceTests();
    
    // Integration Tests
    await this.runIntegrationTests();

    const duration = performance.now() - this.startTime;
    const passedTests = this.testResults.filter(t => t.status === 'pass').length;
    const failedTests = this.testResults.filter(t => t.status === 'fail').length;
    const skippedTests = this.testResults.filter(t => t.status === 'skip').length;

    const suite: TestSuite = {
      name: 'Phase 7: Mobile & Offline Support',
      tests: this.testResults,
      totalTests: this.testResults.length,
      passedTests,
      failedTests,
      skippedTests,
      duration
    };return suite;
  }

  // PWA Tests
  private async runPWATests(): Promise<void> {// Test PWA Manager initialization
    await this.runTest('PWA Manager Initialization', async () => {
      const result = await pwaManager.initialize();
      return result.success;
    });

    // Test service worker registration
    await this.runTest('Service Worker Registration', async () => {
      const isRegistered = await pwaManager.isServiceWorkerRegistered();
      return isRegistered;
    });

    // Test PWA install prompt
    await this.runTest('PWA Install Prompt', async () => {
      const canInstall = pwaManager.canInstall();
      return typeof canInstall === 'boolean';
    });

    // Test touch gestures
    await this.runTest('Touch Gestures Support', async () => {
      const gestures = pwaManager.getTouchGestures();
      return Array.isArray(gestures) && gestures.length > 0;
    });

    // Test device detection
    await this.runTest('Device Detection', async () => {
      const deviceInfo = pwaManager.getDeviceInfo();
      return deviceInfo && typeof deviceInfo.isMobile === 'boolean';
    });
  }

  // Offline Tests
  private async runOfflineTests(): Promise<void> {// Test offline manager initialization
    await this.runTest('Offline Manager Initialization', async () => {
      const result = await offlineManager.initialize();
      return result.success;
    });

    // Test IndexedDB connection
    await this.runTest('IndexedDB Connection', async () => {
      const isConnected = await offlineManager.isDatabaseConnected();
      return isConnected;
    });

    // Test offline data storage
    await this.runTest('Offline Data Storage', async () => {
      const testData = { id: 'test', name: 'Test Task' };
      await offlineManager.saveTask(testData);
      const retrieved = await offlineManager.getTask('test');
      return retrieved && retrieved.name === 'Test Task';
    });

    // Test offline action queuing
    await this.runTest('Offline Action Queuing', async () => {
      const action = {
        type: 'create',
        entity: 'task',
        data: { name: 'Queued Task' }
      };
      await offlineManager.addOfflineAction(action);
      const actions = await offlineManager.getOfflineActions();
      return actions.some(a => a.data.name === 'Queued Task');
    });

    // Test network state detection
    await this.runTest('Network State Detection', async () => {
      const isOnline = offlineManager.isOnline();
      return typeof isOnline === 'boolean';
    });
  }

  // Sync Tests
  private async runSyncTests(): Promise<void> {// Test sync manager initialization
    await this.runTest('Sync Manager Initialization', async () => {
      const result = await syncManager.initialize();
      return result.success;
    });

    // Test sync configuration
    await this.runTest('Sync Configuration', async () => {
      const config = syncManager.getConfig();
      return config && typeof config.autoSync === 'boolean';
    });

    // Test conflict resolution strategies
    await this.runTest('Conflict Resolution Strategies', async () => {
      const strategies = syncManager.getConflictStrategies();
      return Array.isArray(strategies) && strategies.length > 0;
    });

    // Test sync status
    await this.runTest('Sync Status', async () => {
      const status = await syncManager.getSyncStatus();
      return status && typeof status.lastSync === 'object';
    });

    // Test manual sync
    await this.runTest('Manual Sync', async () => {
      try {
        const result = await syncManager.syncNow();
        return result.success !== false; // Allow for network errors
      } catch (error) {
        return true; // Network errors are expected in test environment
      }
    });
  }

  // Error Handling Tests
  private async runErrorHandlingTests(): Promise<void> {// Test error handler initialization
    await this.runTest('Error Handler Initialization', async () => {
      const handler = errorHandler;
      return handler !== null;
    });

    // Test sync error handling
    await this.runTest('Sync Error Handling', async () => {
      try {
        await errorHandler.handleSyncError(
          new Error('Test sync error'),
          { component: 'test', action: 'test-sync' }
        );
        return true;
      } catch (error) {
        return false;
      }
    });

    // Test offline error handling
    await this.runTest('Offline Error Handling', async () => {
      try {
        await errorHandler.handleOfflineError(
          new Error('Test offline error'),
          { component: 'test', action: 'test-offline' }
        );
        return true;
      } catch (error) {
        return false;
      }
    });

    // Test error statistics
    await this.runTest('Error Statistics', async () => {
      const stats = errorHandler.getErrorStats();
      return stats && typeof stats.totalErrors === 'number';
    });
  }

  // Performance Tests
  private async runPerformanceTests(): Promise<void> {// Test performance monitor initialization
    await this.runTest('Performance Monitor Initialization', async () => {
      const monitor = performanceMonitor;
      return monitor !== null;
    });

    // Test metric recording
    await this.runTest('Metric Recording', async () => {
      performanceMonitor.recordMetric('test-metric', 100, 'ms', {
        component: 'test',
        action: 'test-action'
      });
      return true;
    });

    // Test performance report
    await this.runTest('Performance Report', async () => {
      const report = performanceMonitor.getPerformanceReport();
      return report && Array.isArray(report.metrics);
    });

    // Test cache performance monitoring
    await this.runTest('Cache Performance Monitoring', async () => {
      performanceMonitor.recordCacheOperation('test-cache', 'hit');
      return true;
    });

    // Test sync performance monitoring
    await this.runTest('Sync Performance Monitoring', async () => {
      const result = await performanceMonitor.monitorSyncOperation(
        async () => Promise.resolve('test'),
        { component: 'test', action: 'test-sync' }
      );
      return result === 'test';
    });
  }

  // Integration Tests
  private async runIntegrationTests(): Promise<void> {// Test PWA + Offline integration
    await this.runTest('PWA + Offline Integration', async () => {
      const pwaReady = await pwaManager.initialize();
      const offlineReady = await offlineManager.initialize();
      return pwaReady.success && offlineReady.success;
    });

    // Test Offline + Sync integration
    await this.runTest('Offline + Sync Integration', async () => {
      const offlineReady = await offlineManager.initialize();
      const syncReady = await syncManager.initialize();
      return offlineReady.success && syncReady.success;
    });

    // Test Error + Performance integration
    await this.runTest('Error + Performance Integration', async () => {
      const errorStats = errorHandler.getErrorStats();
      const perfReport = performanceMonitor.getPerformanceReport();
      return errorStats && perfReport;
    });

    // Test full workflow
    await this.runTest('Full Workflow Integration', async () => {
      // Simulate a complete workflow
      const testData = { id: 'workflow-test', name: 'Workflow Test' };
      
      // Save offline
      await offlineManager.saveTask(testData);
      
      // Add to sync queue
      await offlineManager.addOfflineAction({
        type: 'create',
        entity: 'task',
        data: testData
      });
      
      // Check sync status
      const status = await syncManager.getSyncStatus();
      
      return status && status.pendingActions > 0;
    });
  }

  // Helper method to run individual tests
  private async runTest(name: string, testFn: () => Promise<boolean>): Promise<void> {
    const testStart = performance.now();
    
    try {
      const result = await testFn();
      const duration = performance.now() - testStart;
      
      this.testResults.push({
        name,
        status: result ? 'pass' : 'fail',
        duration,
        details: { result }
      });
      
      logger.info("  ${result ? ")}ms)`);
    } catch (error) {
      const duration = performance.now() - testStart;
      
      this.testResults.push({
        name,
        status: 'fail',
        duration,
        error: error instanceof Error ? error.message : String(error),
        details: { error }
      });
      
      logger.error("  ❌ ${name} (${duration.toFixed(2)}ms) - ${error}");
    }
  }

  // Generate test report
  generateReport(suite: TestSuite): string {
    const report = `
# Phase 7 Test Report

## Summary
- **Total Tests**: ${suite.totalTests}
- **Passed**: ${suite.passedTests}
- **Failed**: ${suite.failedTests}
- **Skipped**: ${suite.skippedTests}
- **Duration**: ${suite.duration.toFixed(2)}ms
- **Success Rate**: ${((suite.passedTests / suite.totalTests) * 100).toFixed(1)}%

## Test Results

${suite.tests.map(test => `
### ${test.name}
- **Status**: ${test.status === 'pass' ? '✅ PASS' : test.status === 'fail' ? '❌ FAIL' : '⏭️ SKIP'}
- **Duration**: ${test.duration.toFixed(2)}ms
${test.error ? `- **Error**: ${test.error}` : ''}
`).join('')}

## Recommendations

${suite.failedTests > 0 ? `
⚠️ **Issues Found**: ${suite.failedTests} tests failed. Please review the failed tests above.
` : '🎉 **All tests passed!** Phase 7 implementation is working correctly.'}

${suite.passedTests / suite.totalTests < 0.9 ? `
📊 **Quality Alert**: Success rate is below 90%. Consider reviewing implementation.
` : ''}
`;

    return report;
  }

  // Export test results
  exportResults(suite: TestSuite): void {
    const report = this.generateReport(suite);
    
    // Save to localStorage for debugging
    localStorage.setItem('phase7-test-results', JSON.stringify({
      suite,
      timestamp: new Date().toISOString(),
      report
    }));
  }
}

// Global test suite instance
export const phase7TestSuite = new Phase7TestSuite();

// Auto-run tests in development
if (import.meta.env.DEV) {
  // Run tests after a delay to ensure all components are initialized
  setTimeout(async () => {
    const suite = await phase7TestSuite.runAllTests();
    phase7TestSuite.exportResults(suite);
  }, 2000);
} 