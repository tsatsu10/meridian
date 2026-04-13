/**
 * 📊 Web Vitals Monitoring
 * 
 * Tracks Core Web Vitals and sends metrics to analytics.
 * Essential for monitoring real-world user experience.
 * 
 * @see https://web.dev/vitals/
 */

import { onCLS, onFID, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { logger } from "@/lib/logger";

/**
 * Send metric to analytics service
 */
function sendToAnalytics(metric: Metric) {
  // Log in development
  if (import.meta.env.DEV) {
    logger.debug('📊 Web Vital:', metric);
  }

  // Send to Google Analytics if configured
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
      metric_rating: metric.rating,
    });
  }

  // Send to custom analytics endpoint
  if (import.meta.env.PROD && import.meta.env.VITE_API_URL) {
    const analyticsUrl = `${import.meta.env.VITE_API_URL}/api/analytics/web-vitals`;
    
    // Use sendBeacon for reliability (doesn't block page unload)
    if (navigator.sendBeacon) {
      const blob = new Blob(
        [JSON.stringify({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id,
          navigationType: metric.navigationType,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })],
        { type: 'application/json' }
      );
      navigator.sendBeacon(analyticsUrl, blob);
    } else {
      // Fallback to fetch
      fetch(analyticsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
        keepalive: true
      }).catch(() => {
        // Silently fail - analytics shouldn't break the app
      });
    }
  }
}

/**
 * Initialize Web Vitals tracking
 * Call this once when the app starts
 */
export function initWebVitals() {
  // Track Cumulative Layout Shift (CLS)
  // Good: < 0.1, Needs Improvement: 0.1-0.25, Poor: > 0.25
  onCLS(sendToAnalytics);

  // Track First Input Delay (FID)
  // Good: < 100ms, Needs Improvement: 100-300ms, Poor: > 300ms
  onFID(sendToAnalytics);

  // Track First Contentful Paint (FCP)
  // Good: < 1.8s, Needs Improvement: 1.8-3s, Poor: > 3s
  onFCP(sendToAnalytics);

  // Track Largest Contentful Paint (LCP)
  // Good: < 2.5s, Needs Improvement: 2.5-4s, Poor: > 4s
  onLCP(sendToAnalytics);

  // Track Time to First Byte (TTFB)
  // Good: < 800ms, Needs Improvement: 800-1800ms, Poor: > 1800ms
  onTTFB(sendToAnalytics);

  logger.debug('📊 Web Vitals monitoring initialized');
}

/**
 * Get performance metrics summary
 */
export async function getPerformanceMetrics(): Promise<{
  navigation?: PerformanceNavigationTiming;
  resources?: PerformanceResourceTiming[];
  memory?: any;
}> {
  if (typeof window === 'undefined' || !window.performance) {
    return {};
  }

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const memory = (performance as any).memory;

  return {
    navigation,
    resources,
    memory
  };
}

/**
 * Log performance metrics to console (development only)
 */
export function logPerformanceMetrics() {
  if (!import.meta.env.DEV) return;

  getPerformanceMetrics().then(metrics => {
    if (metrics.navigation) {
      const nav = metrics.navigation;
      console.group('📊 Performance Metrics');
      logger.debug('DNS Lookup:', `${nav.domainLookupEnd - nav.domainLookupStart}ms`);
      logger.debug('TCP Connection:', `${nav.connectEnd - nav.connectStart}ms`);
      logger.debug('Request Time:', `${nav.responseStart - nav.requestStart}ms`);
      logger.debug('Response Time:', `${nav.responseEnd - nav.responseStart}ms`);
      logger.debug('DOM Interactive:', `${nav.domInteractive - nav.fetchStart}ms`);
      logger.debug('DOM Complete:', `${nav.domComplete - nav.fetchStart}ms`);
      logger.debug('Load Complete:', `${nav.loadEventEnd - nav.fetchStart}ms`);
      console.groupEnd();
    }

    if (metrics.memory) {
      console.group('💾 Memory Usage');
      logger.debug('Used:', `${(metrics.memory.usedJSHeapSize / 1048576).toFixed(2)} MB`);
      logger.debug('Total:', `${(metrics.memory.totalJSHeapSize / 1048576).toFixed(2)} MB`);
      logger.debug('Limit:', `${(metrics.memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`);
      console.groupEnd();
    }
  });
}

/**
 * Export performance data for debugging
 */
export function exportPerformanceData(): string {
  const entries = performance.getEntries();
  return JSON.stringify(entries, null, 2);
}


