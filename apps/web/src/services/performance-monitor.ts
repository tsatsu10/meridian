/**
 * Client-side performance telemetry to a backend metrics API is not wired.
 * This module keeps a stable API for callers (hooks, profiler) as no-ops.
 */

type MetricMetadata = Record<string, unknown>;

class PerformanceMonitorStub {
  recordMetric(
    _name: string,
    _value: number,
    _unit?: string,
    _metadata?: MetricMetadata,
  ): void {}

  recordUserInteraction(_action: string, _target?: string): void {}

  recordAPICall(_endpoint: string, _duration: number, _success: boolean): void {}

  recordRouteChange(_path: string): void {}

  async flush(): Promise<void> {}

  destroy(): void {}

  configure(_options: {
    enabled?: boolean;
    batchSize?: number;
    flushInterval?: number;
  }): void {}

  getMetricsSummary(): Record<string, never> {
    return {};
  }
}

export const performanceMonitor = new PerformanceMonitorStub();

export const usePerformanceMonitor = () => ({
  recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
  recordUserInteraction: performanceMonitor.recordUserInteraction.bind(
    performanceMonitor,
  ),
  recordAPICall: performanceMonitor.recordAPICall.bind(performanceMonitor),
  recordRouteChange: performanceMonitor.recordRouteChange.bind(performanceMonitor),
});
