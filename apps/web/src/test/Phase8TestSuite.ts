// Phase 8: Performance & Scalability Test Suite
// Comprehensive testing for all Phase 8 components

import { performanceMonitor } from '../performance/PerformanceMonitor';
import { bundleOptimizer } from '../performance/BundleOptimizer';
import { imageOptimizer } from '../performance/ImageOptimizer';
import { lazyLoader } from '../performance/LazyLoader';
import { memoryManager } from '../performance/MemoryManager';
import { performanceManager } from '../performance';
import { logger } from "../lib/logger";

export interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
  details?: any;
  score?: number;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  overallScore: number;
}

export class Phase8TestSuite {
  private testResults: TestResult[] = [];
  private startTime: number = 0;

  // Run all Phase 8 tests
  async runAllTests(): Promise<TestSuite> {
    this.startTime = performance.now();
    this.testResults = [];// Core Performance System Tests
    await this.runPerformanceMonitorTests();
    await this.runBundleOptimizerTests();
    await this.runImageOptimizerTests();
    await this.runLazyLoaderTests();
    await this.runMemoryManagerTests();

    // Integration Tests
    await this.runPerformanceIntegrationTests();
    await this.runCrossSystemTests();

    // Load and Stress Tests
    await this.runLoadTests();
    await this.runStressTests();

    // Security Tests
    await this.runSecurityTests();

    // Performance Benchmark Tests
    await this.runBenchmarkTests();

    const endTime = performance.now();
    const duration = endTime - this.startTime;

    return this.generateTestSuite(duration);
  }

  // Performance Monitor Tests
  private async runPerformanceMonitorTests(): Promise<void> {// Test Web Vitals collection
    await this.runTest('Web Vitals Collection', async () => {
      performanceMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const webVitals = performanceMonitor.getWebVitals();
      if (!webVitals || typeof webVitals !== 'object') {
        throw new Error('Web Vitals not collected properly');
      }
      
      return { webVitals };
    });

    // Test threshold monitoring
    await this.runTest('Threshold Monitoring', async () => {
      const thresholds = performanceMonitor.getThresholds();
      if (!Array.isArray(thresholds) || thresholds.length === 0) {
        throw new Error('Performance thresholds not configured');
      }
      
      return { thresholdCount: thresholds.length };
    });

    // Test metric recording
    await this.runTest('Metric Recording', async () => {
      const testMetric = {
        name: 'test-metric',
        value: 100,
        unit: 'ms',
        context: {
          component: 'test-component',
          action: 'test-action'
        }
      };
      
      performanceMonitor.recordMetric(
        testMetric.name,
        testMetric.value,
        testMetric.unit,
        testMetric.context
      );
      
      const metrics = performanceMonitor.getMetrics();
      const recordedMetric = metrics.find(m => m.name === testMetric.name);
      
      if (!recordedMetric) {
        throw new Error('Metric not recorded properly');
      }
      
      return { metricsCount: metrics.length };
    });

    // Test optimization strategies
    await this.runTest('Optimization Strategies', async () => {
      const strategies = performanceMonitor.getOptimizationStrategies();
      if (!Array.isArray(strategies) || strategies.length === 0) {
        throw new Error('Optimization strategies not loaded');
      }
      
      return { strategiesCount: strategies.length };
    });
  }

  // Bundle Optimizer Tests
  private async runBundleOptimizerTests(): Promise<void> {// Test bundle analysis
    await this.runTest('Bundle Analysis', async () => {
      const analysis = await bundleOptimizer.analyzeBundles();
      if (!analysis || typeof analysis !== 'object') {
        throw new Error('Bundle analysis failed');
      }
      
      return { analysis };
    });

    // Test optimization recommendations
    await this.runTest('Optimization Recommendations', async () => {
      const report = bundleOptimizer.getOptimizationReport();
      if (!report || !report.recommendations) {
        throw new Error('Optimization recommendations not generated');
      }
      
      return { recommendationsCount: report.recommendations.length };
    });

    // Test preloading strategies
    await this.runTest('Preloading Strategies', async () => {
      const strategies = ['critical-path', 'user-centric', 'predictive'];
      
      for (const strategy of strategies) {
        bundleOptimizer.applyPreloadingStrategy(strategy);
      }
      
      return { strategiesApplied: strategies.length };
    });
  }

  // Image Optimizer Tests
  private async runImageOptimizerTests(): Promise<void> {// Test image format support
    await this.runTest('Image Format Support', async () => {
      const supportedFormats = imageOptimizer.getSupportedFormats();
      const expectedFormats = ['webp', 'avif', 'jpeg', 'png'];
      
      const hasAllFormats = expectedFormats.every(format => 
        supportedFormats.includes(format)
      );
      
      if (!hasAllFormats) {
        throw new Error('Not all expected image formats supported');
      }
      
      return { supportedFormats };
    });

    // Test optimization metrics
    await this.runTest('Optimization Metrics', async () => {
      const metrics = imageOptimizer.getMetrics();
      if (!metrics || typeof metrics !== 'object') {
        throw new Error('Image optimization metrics not available');
      }
      
      return { metrics };
    });

    // Test lazy loading integration
    await this.runTest('Lazy Loading Integration', async () => {
      const isEnabled = imageOptimizer.isLazyLoadingEnabled();
      if (!isEnabled) {
        throw new Error('Lazy loading not enabled for images');
      }
      
      return { lazyLoadingEnabled: isEnabled };
    });
  }

  // Lazy Loader Tests
  private async runLazyLoaderTests(): Promise<void> {// Test component creation
    await this.runTest('Lazy Component Creation', async () => {
      const LazyTestComponent = lazyLoader.createLazyComponent(
        () => Promise.resolve({ default: () => null }),
        { name: 'TestComponent', preload: false }
      );
      
      if (!LazyTestComponent) {
        throw new Error('Lazy component not created');
      }
      
      return { componentCreated: true };
    });

    // Test preload strategies
    await this.runTest('Preload Strategies', async () => {
      const strategies = ['hover', 'intersection', 'idle', 'immediate'];
      
      for (const strategy of strategies) {
        lazyLoader.applyPreloadStrategy(strategy);
      }
      
      return { strategiesApplied: strategies.length };
    });

    // Test metrics collection
    await this.runTest('Lazy Load Metrics', async () => {
      const metrics = lazyLoader.getMetrics();
      if (!metrics || typeof metrics !== 'object') {
        throw new Error('Lazy loading metrics not available');
      }
      
      return { metrics };
    });
  }

  // Memory Manager Tests
  private async runMemoryManagerTests(): Promise<void> {// Test memory monitoring
    await this.runTest('Memory Monitoring', async () => {
      memoryManager.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = memoryManager.getMetrics();
      if (!metrics || typeof metrics.percentage !== 'number') {
        throw new Error('Memory metrics not collected');
      }
      
      return { memoryPercentage: metrics.percentage };
    });

    // Test cleanup tasks
    await this.runTest('Cleanup Tasks', async () => {
      const testCleanupTask = {
        id: 'test-cleanup',
        name: 'Test Cleanup',
        priority: 1,
        cleanup: async () => { /* test cleanup */ }
      };
      
      memoryManager.addCleanupTask(testCleanupTask);
      const tasks = memoryManager.getCleanupTasks();
      
      const addedTask = tasks.find(task => task.id === testCleanupTask.id);
      if (!addedTask) {
        throw new Error('Cleanup task not added properly');
      }
      
      return { cleanupTasksCount: tasks.length };
    });

    // Test leak detection
    await this.runTest('Memory Leak Detection', async () => {
      const leakDetection = memoryManager.isLeakDetectionEnabled();
      if (!leakDetection) {
        throw new Error('Memory leak detection not enabled');
      }
      
      return { leakDetectionEnabled: leakDetection };
    });
  }

  // Performance Integration Tests
  private async runPerformanceIntegrationTests(): Promise<void> {// Test system initialization
    await this.runTest('System Initialization', async () => {
      await performanceManager.initialize();
      const systems = performanceManager.getSystems();
      
      if (!systems || !systems.monitor || !systems.bundleOptimizer) {
        throw new Error('Performance systems not properly initialized');
      }
      
      return { systemsInitialized: true };
    });

    // Test dashboard generation
    await this.runTest('Dashboard Generation', async () => {
      const dashboard = performanceManager.getDashboard();
      if (!dashboard || !dashboard.metrics || !dashboard.status) {
        throw new Error('Performance dashboard not generated');
      }
      
      return { dashboard };
    });

    // Test performance scoring
    await this.runTest('Performance Scoring', async () => {
      const score = performanceManager.getPerformanceScore();
      if (typeof score !== 'number' || score < 0 || score > 100) {
        throw new Error('Invalid performance score');
      }
      
      return { performanceScore: score };
    });

    // Test optimization triggers
    await this.runTest('Optimization Triggers', async () => {
      await performanceManager.optimizeNow({
        includeBundle: true,
        includeImages: true,
        includeMemory: true,
        aggressive: false
      });
      
      return { optimizationTriggered: true };
    });
  }

  // Cross-System Tests
  private async runCrossSystemTests(): Promise<void> {// Test event coordination
    await this.runTest('Event Coordination', async () => {
      let eventReceived = false;
      
      performanceMonitor.on('test-event', () => {
        eventReceived = true;
      });
      
      performanceMonitor.emit('test-event');
      
      if (!eventReceived) {
        throw new Error('Cross-system events not working');
      }
      
      return { eventCoordination: true };
    });

    // Test resource sharing
    await this.runTest('Resource Sharing', async () => {
      const memoryMetrics = memoryManager.getMetrics();
      const performanceMetrics = performanceMonitor.getMetrics();
      
      if (!memoryMetrics || !performanceMetrics) {
        throw new Error('Resource sharing between systems failed');
      }
      
      return { resourceSharing: true };
    });
  }

  // Load Tests
  private async runLoadTests(): Promise<void> {// Test concurrent operations
    await this.runTest('Concurrent Operations', async () => {
      const operations = Array.from({ length: 100 }, (_, i) => 
        performanceMonitor.recordMetric(`load-test-${i}`, Math.random() * 1000, 'ms', {
          component: 'load-test',
          action: 'concurrent-operation'
        })
      );
      
      await Promise.all(operations);
      
      const metrics = performanceMonitor.getMetrics();
      const loadTestMetrics = metrics.filter(m => m.name.startsWith('load-test-'));
      
      if (loadTestMetrics.length !== 100) {
        throw new Error('Not all concurrent operations completed');
      }
      
      return { concurrentOperations: loadTestMetrics.length };
    });

    // Test memory under load
    await this.runTest('Memory Under Load', async () => {
      const initialMemory = memoryManager.getMetrics().percentage;
      
      // Simulate memory-intensive operations
      const heavyOperations = Array.from({ length: 50 }, () => 
        new Promise(resolve => {
          const data = new Array(10000).fill('test-data');
          setTimeout(() => {
            data.length = 0;
            resolve(data);
          }, 10);
        })
      );
      
      await Promise.all(heavyOperations);
      
      const finalMemory = memoryManager.getMetrics().percentage;
      
      return { 
        initialMemory, 
        finalMemory, 
        memoryIncrease: finalMemory - initialMemory 
      };
    });
  }

  // Stress Tests
  private async runStressTests(): Promise<void> {// Test system limits
    await this.runTest('System Limits', async () => {
      const startTime = performance.now();
      
      // Stress test with rapid operations
      const rapidOperations = Array.from({ length: 1000 }, (_, i) => 
        performanceMonitor.recordMetric(`stress-test-${i}`, i, 'ms', {
          component: 'stress-test',
          action: 'rapid-operation'
        })
      );
      
      await Promise.all(rapidOperations);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (duration > 5000) { // Should complete within 5 seconds
        throw new Error('System too slow under stress');
      }
      
      return { stressDuration: duration };
    });

    // Test error recovery
    await this.runTest('Error Recovery', async () => {
      try {
        // Intentionally trigger an error
        performanceMonitor.recordMetric('invalid-metric', NaN, '', {
          component: 'error-test',
          action: 'invalid-operation'
        });
      } catch (error) {
        // Expected error - system should recover
      }
      
      // Test that system still works after error
      performanceMonitor.recordMetric('recovery-test', 100, 'ms', {
        component: 'recovery-test',
        action: 'post-error-operation'
      });
      
      const metrics = performanceMonitor.getMetrics();
      const recoveryMetric = metrics.find(m => m.name === 'recovery-test');
      
      if (!recoveryMetric) {
        throw new Error('System did not recover from error');
      }
      
      return { errorRecovery: true };
    });
  }

  // Security Tests
  private async runSecurityTests(): Promise<void> {// Test data sanitization
    await this.runTest('Data Sanitization', async () => {
      const maliciousData = {
        component: '<script>alert("xss")</script>',
        action: 'javascript:void(0)',
        route: '../../etc/passwd'
      };
      
      performanceMonitor.recordMetric('security-test', 100, 'ms', maliciousData);
      
      const metrics = performanceMonitor.getMetrics();
      const securityMetric = metrics.find(m => m.name === 'security-test');
      
      // Check if malicious content was sanitized
      const contextStr = JSON.stringify(securityMetric?.context);
      if (contextStr.includes('<script>') || contextStr.includes('javascript:')) {
        throw new Error('Malicious data not properly sanitized');
      }
      
      return { dataSanitized: true };
    });

    // Test memory data protection
    await this.runTest('Memory Data Protection', async () => {
      const memoryMetrics = memoryManager.getMetrics();
      
      // Ensure sensitive data is not exposed
      const sensitiveFields = ['heap', 'stack', 'address', 'pointer'];
      const metricsStr = JSON.stringify(memoryMetrics);
      
      const hasSensitiveData = sensitiveFields.some(field => 
        metricsStr.toLowerCase().includes(field)
      );
      
      if (hasSensitiveData) {
        throw new Error('Sensitive memory data potentially exposed');
      }
      
      return { memoryDataProtected: true };
    });
  }

  // Benchmark Tests
  private async runBenchmarkTests(): Promise<void> {// Test performance targets
    await this.runTest('Performance Targets', async () => {
      const dashboard = performanceManager.getDashboard();
      const webVitals = dashboard?.metrics?.webVitals;
      
      if (!webVitals) {
        throw new Error('Web Vitals not available for benchmarking');
      }
      
      const benchmarks = {
        LCP: webVitals.LCP < 2500, // Target: <2.5s
        FID: webVitals.FID < 100,  // Target: <100ms
        CLS: webVitals.CLS < 0.1   // Target: <0.1
      };
      
      const passedBenchmarks = Object.values(benchmarks).filter(Boolean).length;
      const totalBenchmarks = Object.keys(benchmarks).length;
      
      return { 
        benchmarks, 
        passed: passedBenchmarks, 
        total: totalBenchmarks,
        score: (passedBenchmarks / totalBenchmarks) * 100
      };
    });

    // Test scalability metrics
    await this.runTest('Scalability Metrics', async () => {
      const performanceScore = performanceManager.getPerformanceScore();
      
      if (performanceScore < 80) {
        throw new Error(`Performance score ${performanceScore} below scalability target (80)`);
      }
      
      return { scalabilityScore: performanceScore };
    });
  }

  // Helper method to run individual tests
  private async runTest(
    name: string, 
    testFunction: () => Promise<any>
  ): Promise<void> {
    const startTime = performance.now();
    
    try {
      const result = await testFunction();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.testResults.push({
        name,
        status: 'pass',
        duration,
        details: result,
        score: result?.score || 100
      });
      
      logger.info("✅ ${name} - PASSED (${duration.toFixed(2)}ms)");
      
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.testResults.push({
        name,
        status: 'fail',
        duration,
        error: error instanceof Error ? error.message : String(error),
        score: 0
      });
      
      console.error(`❌ ${name} - FAILED: ${error}`);
    }
  }

  // Generate test suite summary
  private generateTestSuite(duration: number): TestSuite {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.status === 'pass').length;
    const failedTests = this.testResults.filter(t => t.status === 'fail').length;
    const skippedTests = this.testResults.filter(t => t.status === 'skip').length;
    
    const totalScore = this.testResults.reduce((sum, test) => sum + (test.score || 0), 0);
    const overallScore = totalTests > 0 ? totalScore / totalTests : 0;
    
    const testSuite: TestSuite = {
      name: 'Phase 8: Performance & Scalability Test Suite',
      tests: this.testResults,
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      duration,
      overallScore
    };logger.info("Duration: ${duration.toFixed(2)}ms");
    logger.info("Overall Score: ${overallScore.toFixed(1)}/100");
    
    return testSuite;
  }

  // Export test results
  exportResults(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      testSuite: this.generateTestSuite(performance.now() - this.startTime),
      environment: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
        platform: typeof navigator !== 'undefined' ? navigator.platform : process.platform,
        memory: typeof performance !== 'undefined' && (performance as any).memory ? 
          (performance as any).memory : null
      }
    }, null, 2);
  }
}

// Create singleton instance
export const phase8TestSuite = new Phase8TestSuite();

// Auto-run tests in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Add global test API
  (window as any).runPhase8Tests = () => phase8TestSuite.runAllTests();}