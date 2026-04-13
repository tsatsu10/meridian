import { Context } from 'hono';
import { z } from 'zod';
import logger from '../../utils/logger';

// Performance metric schema
const PerformanceMetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  timestamp: z.number(),
  url: z.string(),
  userAgent: z.string(),
  userId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const PerformanceMetricsRequestSchema = z.object({
  metrics: z.array(PerformanceMetricSchema),
  sessionId: z.string(),
});

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
  userAgent: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface MetricAnalysis {
  slowQueries: PerformanceMetric[];
  memoryIssues: PerformanceMetric[];
  slowRenders: PerformanceMetric[];
  networkIssues: PerformanceMetric[];
  webVitalsIssues: PerformanceMetric[];
}

class PerformanceAnalyzer {
  private static analyzeMetrics(metrics: PerformanceMetric[]): MetricAnalysis {
    const analysis: MetricAnalysis = {
      slowQueries: [],
      memoryIssues: [],
      slowRenders: [],
      networkIssues: [],
      webVitalsIssues: [],
    };

    metrics.forEach(metric => {
      // Identify slow API calls
      if (metric.name === 'api_call_duration' && metric.value > 2000) {
        analysis.slowQueries.push(metric);
      }

      // Identify memory issues
      if (metric.name === 'memory_used_heap_size' && metric.value > 100 * 1024 * 1024) { // >100MB
        analysis.memoryIssues.push(metric);
      }

      // Identify slow React renders
      if ((metric.name === 'react_profiler_render' || metric.name === 'react_render_time') && metric.value > 50) {
        analysis.slowRenders.push(metric);
      }

      // Identify network issues
      if (metric.name === 'resource_load_time' && metric.value > 5000) { // >5s
        analysis.networkIssues.push(metric);
      }

      // Identify Web Vitals issues
      if (metric.name.startsWith('web_vital_') && metric.metadata?.rating === 'poor') {
        analysis.webVitalsIssues.push(metric);
      }
    });

    return analysis;
  }

  private static generateAlerts(analysis: MetricAnalysis): string[] {
    const alerts: string[] = [];

    if (analysis.slowQueries.length > 0) {
      alerts.push(`🐌 ${analysis.slowQueries.length} slow API calls detected (>2s)`);
    }

    if (analysis.memoryIssues.length > 0) {
      alerts.push(`🧠 ${analysis.memoryIssues.length} high memory usage instances detected (>100MB)`);
    }

    if (analysis.slowRenders.length > 0) {
      alerts.push(`⚛️ ${analysis.slowRenders.length} slow React renders detected (>50ms)`);
    }

    if (analysis.networkIssues.length > 0) {
      alerts.push(`🌐 ${analysis.networkIssues.length} slow resource loads detected (>5s)`);
    }

    if (analysis.webVitalsIssues.length > 0) {
      alerts.push(`📊 ${analysis.webVitalsIssues.length} poor Web Vitals scores detected`);
    }

    return alerts;
  }

  static processMetrics(metrics: PerformanceMetric[]): {
    analysis: MetricAnalysis;
    alerts: string[];
    summary: Record<string, { count: number; avg: number; p95: number }>;
  } {
    const analysis = this.analyzeMetrics(metrics);
    const alerts = this.generateAlerts(analysis);
    
    // Generate summary statistics
    const summary: Record<string, { count: number; avg: number; p95: number }> = {};
    
    // Group metrics by name
    const groupedMetrics: Record<string, number[]> = {};
    metrics.forEach(metric => {
      if (!groupedMetrics[metric.name]) {
        groupedMetrics[metric.name] = [];
      }
      groupedMetrics[metric.name].push(metric.value);
    });

    // Calculate statistics
    Object.entries(groupedMetrics).forEach(([name, values]) => {
      const sortedValues = values.sort((a, b) => a - b);
      const count = values.length;
      const avg = values.reduce((sum, val) => sum + val, 0) / count;
      const p95Index = Math.floor(count * 0.95);
      const p95 = sortedValues[p95Index] || 0;

      summary[name] = { count, avg, p95 };
    });

    return { analysis, alerts, summary };
  }
}

export const receivePerformanceMetrics = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { metrics, sessionId } = PerformanceMetricsRequestSchema.parse(body);

    // Process and analyze metrics
    const { analysis, alerts, summary } = PerformanceAnalyzer.processMetrics(metrics);

    // Log critical alerts
    if (alerts.length > 0) {
      logger.warn('Performance Alerts:', {
        sessionId,
        alerts,
        metricsCount: metrics.length,
        url: metrics[0]?.url,
        userAgent: metrics[0]?.userAgent,
        userId: metrics[0]?.userId,
      });
    }

    // Log summary for monitoring
    logger.info('Performance Metrics Received:', {
      sessionId,
      metricsCount: metrics.length,
      uniqueMetricTypes: Object.keys(summary).length,
      alertCount: alerts.length,
      summary: Object.fromEntries(
        Object.entries(summary)
          .filter(([_, stats]) => stats.count > 0)
          .slice(0, 10) // Top 10 metrics
      ),
    });

    // Store metrics (in a real app, you'd store in database)
    // For now, we'll use in-memory storage for development
    const metricsStore = (global as any).__PERFORMANCE_METRICS__ || [];
    metricsStore.push(...metrics.map(metric => ({
      ...metric,
      sessionId,
      receivedAt: new Date().toISOString(),
    })));
    (global as any).__PERFORMANCE_METRICS__ = metricsStore.slice(-1000); // Keep last 1000 metrics

    // Return response with analysis
    return c.json({
      success: true,
      received: metrics.length,
      alerts: alerts.length,
      analysis: {
        slowQueries: analysis.slowQueries.length,
        memoryIssues: analysis.memoryIssues.length,
        slowRenders: analysis.slowRenders.length,
        networkIssues: analysis.networkIssues.length,
        webVitalsIssues: analysis.webVitalsIssues.length,
      },
      recommendations: generateRecommendations(analysis),
    });

  } catch (error) {
    logger.error('Error processing performance metrics:', error);
    
    return c.json({
      success: false,
      error: 'Failed to process performance metrics',
    }, 400);
  }
};

function generateRecommendations(analysis: MetricAnalysis): string[] {
  const recommendations: string[] = [];

  if (analysis.slowQueries.length > 0) {
    recommendations.push('Consider implementing API response caching or optimizing database queries');
  }

  if (analysis.memoryIssues.length > 0) {
    recommendations.push('Review component unmounting and data cleanup to prevent memory leaks');
  }

  if (analysis.slowRenders.length > 0) {
    recommendations.push('Consider using React.memo, useMemo, or useCallback to optimize renders');
  }

  if (analysis.networkIssues.length > 0) {
    recommendations.push('Optimize resource loading with compression, CDN, or lazy loading');
  }

  if (analysis.webVitalsIssues.length > 0) {
    recommendations.push('Focus on improving Core Web Vitals for better user experience');
  }

  return recommendations;
}

export const getPerformanceMetrics = async (c: Context) => {
  try {
    const metricsStore = (global as any).__PERFORMANCE_METRICS__ || [];
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');
    const metricType = c.req.query('type');

    let filteredMetrics = metricsStore;
    
    if (metricType) {
      filteredMetrics = metricsStore.filter((metric: any) => 
        metric.name === metricType || metric.name.includes(metricType)
      );
    }

    const paginatedMetrics = filteredMetrics
      .slice(offset, offset + limit)
      .sort((a: any, b: any) => b.timestamp - a.timestamp);

    return c.json({
      metrics: paginatedMetrics,
      total: filteredMetrics.length,
      limit,
      offset,
    });

  } catch (error) {
    logger.error('Error fetching performance metrics:', error);
    
    return c.json({
      success: false,
      error: 'Failed to fetch performance metrics',
    }, 500);
  }
};

