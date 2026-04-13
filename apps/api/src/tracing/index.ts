// Phase 8: Distributed Tracing Integration
// Middleware and utilities for request tracing

import { distributedTracing, TraceSpan, TraceContext } from './DistributedTracing';
import type { Context, Next } from 'hono';

export { distributedTracing, TraceSpan, TraceContext };

// Hono middleware for distributed tracing
export const tracingMiddleware = () => {
  return async (c: Context, next: Next) => {
    const method = c.req.method;
    const path = c.req.path;
    const userAgent = c.req.header('user-agent');
    
    // Extract trace context from headers
    const traceId = c.req.header('x-trace-id');
    const spanId = c.req.header('x-span-id');
    const parentSpanId = c.req.header('x-parent-span-id');
    
    let parentContext: TraceContext | undefined;
    if (traceId && spanId) {
      parentContext = {
        traceId,
        spanId: parentSpanId || spanId,
        baggage: {},
        samplingPriority: 1
      };
    }

    // Start trace span
    const span = distributedTracing.traceHttpRequest(method, path, {
      'user-agent': userAgent || ''
    });

    // Add request information
    distributedTracing.addTags(span.spanId, {
      'http.request_id': c.get('requestId') || span.spanId,
      'http.remote_addr': c.req.header('x-forwarded-for') || 'unknown',
      'http.host': c.req.header('host'),
      'http.scheme': c.req.header('x-forwarded-proto') || 'http'
    });

    // Store span in context for use in handlers
    c.set('traceSpan', span);
    c.set('traceContext', distributedTracing.getTraceContext(span.spanId));

    // Add tracing headers to response
    c.res.headers.set('x-trace-id', span.traceId);
    c.res.headers.set('x-span-id', span.spanId);

    try {
      await next();

      // Add response information
      distributedTracing.addTags(span.spanId, {
        'http.status_code': c.res.status,
        'http.response_size': c.res.headers.get('content-length') || '0'
      });

      // Finish span successfully
      distributedTracing.finishSpan(span.spanId);

    } catch (error) {
      // Add error information
      const errorMessage = error instanceof Error ? error.message : String(error);
      distributedTracing.addTags(span.spanId, {
        'http.status_code': 500,
        'error': true,
        'error.message': errorMessage,
        'error.stack': error instanceof Error ? error.stack : undefined
      });

      distributedTracing.addLog(span.spanId, 'error', errorMessage, {
        error: error instanceof Error ? error.stack : String(error)
      });

      // Finish span with error
      distributedTracing.finishSpan(span.spanId, errorMessage);

      throw error;
    }
  };
};

// Database tracing wrapper
export class TracedDatabase {
  constructor(private db: any, private dbType: string = 'postgresql') {}

  async query(sql: string, params?: any[]): Promise<any> {
    const span = distributedTracing.traceDatabaseQuery(sql, this.dbType, 'query');
    
    distributedTracing.addTags(span.spanId, {
      'db.params_count': params?.length || 0
    });

    try {
      const result = await this.db.query(sql, params);
      
      distributedTracing.addTags(span.spanId, {
        'db.rows_affected': Array.isArray(result) ? result.length : 1
      });

      distributedTracing.finishSpan(span.spanId);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      distributedTracing.finishSpan(span.spanId, errorMessage);
      throw error;
    }
  }

  async execute(sql: string, params?: any[]): Promise<any> {
    const span = distributedTracing.traceDatabaseQuery(sql, this.dbType, 'execute');
    
    try {
      const result = await this.db.execute(sql, params);
      distributedTracing.finishSpan(span.spanId);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      distributedTracing.finishSpan(span.spanId, errorMessage);
      throw error;
    }
  }
}

// HTTP client tracing wrapper
export class TracedHttpClient {
  constructor(private httpClient: any) {}

  async request(method: string, url: string, options?: any): Promise<any> {
    const serviceName = this.extractServiceName(url);
    const span = distributedTracing.traceExternalApi(method, url, serviceName);

    // Add request details
    distributedTracing.addTags(span.spanId, {
      'http.request_size': options?.body ? JSON.stringify(options.body).length : 0,
      'http.timeout': options?.timeout || 30000
    });

    // Propagate trace context in headers
    const traceContext = distributedTracing.getTraceContext(span.spanId);
    if (traceContext && options?.headers) {
      options.headers['x-trace-id'] = traceContext.traceId;
      options.headers['x-parent-span-id'] = span.spanId;
    }

    try {
      const startTime = Date.now();
      const response = await this.httpClient.request(method, url, options);
      const duration = Date.now() - startTime;

      distributedTracing.addTags(span.spanId, {
        'http.status_code': response.status,
        'http.response_size': response.headers?.['content-length'] || '0',
        'http.duration': duration
      });

      distributedTracing.finishSpan(span.spanId);
      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      distributedTracing.finishSpan(span.spanId, errorMessage);
      throw error;
    }
  }

  private extractServiceName(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown-service';
    }
  }
}

// Background job tracing wrapper
export function traceBackgroundJob<T>(
  jobName: string,
  jobFunction: () => Promise<T>,
  jobId?: string
): Promise<T> {
  const span = distributedTracing.traceBackgroundJob(jobName, jobId);

  return jobFunction()
    .then(result => {
      distributedTracing.addTags(span.spanId, {
        'job.result': 'success',
        'job.result_size': JSON.stringify(result).length
      });
      distributedTracing.finishSpan(span.spanId);
      return result;
    })
    .catch(error => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      distributedTracing.addTags(span.spanId, {
        'job.result': 'error'
      });
      distributedTracing.finishSpan(span.spanId, errorMessage);
      throw error;
    });
}

// Helper to get current trace context from Hono context
export function getCurrentTraceContext(c: Context): TraceContext | undefined {
  return c.get('traceContext');
}

// Helper to get current trace span from Hono context
export function getCurrentTraceSpan(c: Context): TraceSpan | undefined {
  return c.get('traceSpan');
}

// Helper to add tags to current span
export function addCurrentSpanTags(c: Context, tags: Record<string, any>): void {
  const span = getCurrentTraceSpan(c);
  if (span) {
    distributedTracing.addTags(span.spanId, tags);
  }
}

// Helper to add log to current span
export function addCurrentSpanLog(
  c: Context, 
  level: 'info' | 'warn' | 'error' | 'debug', 
  message: string, 
  fields?: Record<string, any>
): void {
  const span = getCurrentTraceSpan(c);
  if (span) {
    distributedTracing.addLog(span.spanId, level, message, fields);
  }
}

// Helper to create child span from current context
export function createChildSpan(c: Context, operationName: string): TraceSpan {
  const currentSpan = getCurrentTraceSpan(c);
  if (currentSpan) {
    return distributedTracing.createChildSpan(currentSpan.spanId, operationName);
  }
  return distributedTracing.startTrace(operationName);
}

// Tracing utilities for common operations
export const TracingUtils = {
  // Trace function execution
  trace<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
    const span = distributedTracing.startTrace(operationName);
    
    return fn()
      .then(result => {
        distributedTracing.finishSpan(span.spanId);
        return result;
      })
      .catch(error => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        distributedTracing.finishSpan(span.spanId, errorMessage);
        throw error;
      });
  },

  // Trace with custom span configuration
  traceWithConfig<T>(
    operationName: string,
    tags: Record<string, any>,
    fn: (span: TraceSpan) => Promise<T>
  ): Promise<T> {
    const span = distributedTracing.startTrace(operationName);
    distributedTracing.addTags(span.spanId, tags);
    
    return fn(span)
      .then(result => {
        distributedTracing.finishSpan(span.spanId);
        return result;
      })
      .catch(error => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        distributedTracing.finishSpan(span.spanId, errorMessage);
        throw error;
      });
  },

  // Get tracing statistics
  getStats() {
    return distributedTracing.getStatistics();
  },

  // Get span metrics
  getMetrics() {
    return distributedTracing.getSpanMetrics();
  },

  // Export trace data
  exportTraceData() {
    const stats = distributedTracing.getStatistics();
    const metrics = distributedTracing.getSpanMetrics();
    const recentSpans = distributedTracing.getCompletedSpans(100);

    return {
      timestamp: new Date().toISOString(),
      statistics: stats,
      metrics,
      recentSpans: recentSpans.map(span => ({
        traceId: span.traceId,
        spanId: span.spanId,
        operationName: span.operationName,
        duration: span.duration,
        status: span.status,
        tags: span.tags,
        startTime: span.startTime.toISOString(),
        endTime: span.endTime?.toISOString()
      }))
    };
  }
};

// Initialize tracing on module load
if (process.env.NODE_ENV === 'development') {
  distributedTracing.initialize({
    samplingRate: 1.0, // 100% sampling in development
    enableConsoleExporter: true,
    exportInterval: 10000 // 10 seconds
  });
}

export default {
  distributedTracing,
  tracingMiddleware,
  TracedDatabase,
  TracedHttpClient,
  traceBackgroundJob,
  getCurrentTraceContext,
  getCurrentTraceSpan,
  addCurrentSpanTags,
  addCurrentSpanLog,
  createChildSpan,
  TracingUtils
};

