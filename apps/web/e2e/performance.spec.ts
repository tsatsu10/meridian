import { test, expect } from '@playwright/test';

test.describe('Performance Metrics', () => {
  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Measure performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        ttfb: navigation.responseStart - navigation.requestStart,
      };
    });
    
    // Assertions for performance budgets
    expect(performanceMetrics.ttfb).toBeLessThan(800); // TTFB under 800ms
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000); // DCL under 2s
  });

  test('should load dashboard within performance budget', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // Full load under 5s
  });
});
