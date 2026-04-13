import { Context } from 'hono';
import { createError } from './errors';

// Performance optimization service
export class PerformanceService {
  private static instance: PerformanceService;
  private metrics: Map<string, any> = new Map();

  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  // Record API response time
  recordApiResponseTime(endpoint: string, duration: number) {
    const key = `api:${endpoint}`;
    const existing = this.metrics.get(key) || { count: 0, total: 0, avg: 0 };
    
    existing.count++;
    existing.total += duration;
    existing.avg = existing.total / existing.count;
    
    this.metrics.set(key, existing);
  }

  // Record database query time
  recordDbQueryTime(query: string, duration: number) {
    const key = `db:${query}`;
    const existing = this.metrics.get(key) || { count: 0, total: 0, avg: 0 };
    
    existing.count++;
    existing.total += duration;
    existing.avg = existing.total / existing.count;
    
    this.metrics.set(key, existing);
  }

  // Get performance metrics
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  // Get slow queries
  getSlowQueries(threshold: number = 1000) {
    const slowQueries: Array<{ query: string; avg: number; count: number }> = [];
    
    for (const [key, metrics] of this.metrics) {
      if (key.startsWith('db:') && metrics.avg > threshold) {
        slowQueries.push({
          query: key.replace('db:', ''),
          avg: metrics.avg,
          count: metrics.count,
        });
      }
    }
    
    return slowQueries.sort((a, b) => b.avg - a.avg);
  }

  // Get slow API endpoints
  getSlowEndpoints(threshold: number = 500) {
    const slowEndpoints: Array<{ endpoint: string; avg: number; count: number }> = [];
    
    for (const [key, metrics] of this.metrics) {
      if (key.startsWith('api:') && metrics.avg > threshold) {
        slowEndpoints.push({
          endpoint: key.replace('api:', ''),
          avg: metrics.avg,
          count: metrics.count,
        });
      }
    }
    
    return slowEndpoints.sort((a, b) => b.avg - a.avg);
  }

  // Clear metrics
  clearMetrics() {
    this.metrics.clear();
  }
}

// Performance middleware
export function performanceMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    const startTime = Date.now();
    const endpoint = c.req.path;
    
    try {
      await next();
    } finally {
      const duration = Date.now() - startTime;
      PerformanceService.getInstance().recordApiResponseTime(endpoint, duration);
    }
  };
}

// Database query performance wrapper
export function withDbPerformance<T>(
  queryFn: () => Promise<T>,
  queryName: string
): Promise<T> {
  const startTime = Date.now();
  
  return queryFn().finally(() => {
    const duration = Date.now() - startTime;
    PerformanceService.getInstance().recordDbQueryTime(queryName, duration);
  });
}

// Performance monitoring endpoint
export function createPerformanceRoutes() {
  return {
    // Get performance metrics
    async getMetrics(c: Context) {
      const metrics = PerformanceService.getInstance().getMetrics();
      return c.json({
        success: true,
        data: metrics,
      });
    },

    // Get slow queries
    async getSlowQueries(c: Context) {
      const threshold = parseInt(c.req.query('threshold') || '1000');
      const slowQueries = PerformanceService.getInstance().getSlowQueries(threshold);
      
      return c.json({
        success: true,
        data: slowQueries,
      });
    },

    // Get slow endpoints
    async getSlowEndpoints(c: Context) {
      const threshold = parseInt(c.req.query('threshold') || '500');
      const slowEndpoints = PerformanceService.getInstance().getSlowEndpoints(threshold);
      
      return c.json({
        success: true,
        data: slowEndpoints,
      });
    },

    // Clear metrics
    async clearMetrics(c: Context) {
      PerformanceService.getInstance().clearMetrics();
      
      return c.json({
        success: true,
        message: 'Performance metrics cleared',
      });
    },
  };
}

