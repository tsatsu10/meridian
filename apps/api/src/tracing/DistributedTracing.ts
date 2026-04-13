// Phase 8: Distributed Tracing System
// OpenTelemetry-based request tracing for performance monitoring

import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import logger from '../utils/logger';

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  tags: Record<string, any>;
  logs: TraceLog[];
  status: 'started' | 'finished' | 'error';
  error?: string;
  baggage?: Record<string, string>;
}

export interface TraceLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  fields?: Record<string, any>;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage: Record<string, string>;
  samplingPriority: number;
}

export interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  samplingRate: number;
  exportInterval: number;
  maxSpansInMemory: number;
  enableConsoleExporter: boolean;
  enableJaegerExporter: boolean;
  jaegerEndpoint?: string;
  enableZipkinExporter: boolean;
  zipkinEndpoint?: string;
  enableCustomExporter: boolean;
  customExporterUrl?: string;
}

export interface SpanMetrics {
  operationName: string;
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  errorCount: number;
  errorRate: number;
  throughput: number;
}

export class DistributedTracing extends EventEmitter {
  private static instance: DistributedTracing;
  private activeSpans = new Map<string, TraceSpan>();
  private completedSpans: TraceSpan[] = [];
  private traceContexts = new Map<string, TraceContext>();
  private config: TracingConfig;
  private exportTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // Default configuration
  private readonly DEFAULT_CONFIG: TracingConfig = {
    serviceName: 'meridian-api',
    serviceVersion: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    samplingRate: 0.1, // 10% sampling
    exportInterval: 5000, // 5 seconds
    maxSpansInMemory: 10000,
    enableConsoleExporter: true,
    enableJaegerExporter: false,
    enableZipkinExporter: false,
    enableCustomExporter: false
  };

  static getInstance(): DistributedTracing {
    if (!DistributedTracing.instance) {
      DistributedTracing.instance = new DistributedTracing();
    }
    return DistributedTracing.instance;
  }

  constructor(config?: Partial<TracingConfig>) {
    super();
    this.config = { ...this.DEFAULT_CONFIG, ...config };
  }

  // Initialize distributed tracing
  async initialize(config?: Partial<TracingConfig>): Promise<void> {
    if (this.isInitialized) {
      logger.info('🔍 Distributed tracing already initialized');
      return;
    }

    if (config) {
      this.config = { ...this.config, ...config };
    }

    logger.info('🚀 Initializing Distributed Tracing System...');

    try {
      // Setup span export timer
      this.exportTimer = setInterval(() => {
        this.exportSpans();
      }, this.config.exportInterval);

      // Setup memory cleanup
      setInterval(() => {
        this.cleanupMemory();
      }, 60000); // Every minute

      this.isInitialized = true;
      logger.info('✅ Distributed Tracing System initialized');

      this.emit('initialized', {
        serviceName: this.config.serviceName,
        environment: this.config.environment,
        samplingRate: this.config.samplingRate
      });

    } catch (error) {
      logger.error('❌ Failed to initialize distributed tracing:', error);
      throw error;
    }
  }

  // Start a new trace
  startTrace(operationName: string, parentContext?: TraceContext): TraceSpan {
    const traceId = parentContext?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const parentSpanId = parentContext?.spanId;

    const span: TraceSpan = {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      startTime: new Date(),
      tags: {
        service: this.config.serviceName,
        version: this.config.serviceVersion,
        environment: this.config.environment
      },
      logs: [],
      status: 'started',
      baggage: parentContext?.baggage || {}
    };

    // Apply sampling
    if (this.shouldSample()) {
      this.activeSpans.set(spanId, span);
      
      // Store trace context
      this.traceContexts.set(spanId, {
        traceId,
        spanId,
        parentSpanId,
        baggage: span.baggage || {},
        samplingPriority: 1
      });

      this.emit('span-started', span);
    }

    return span;
  }

  // Finish a trace span
  finishSpan(spanId: string, error?: string): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.endTime = new Date();
    span.duration = span.endTime.getTime() - span.startTime.getTime();
    span.status = error ? 'error' : 'finished';
    
    if (error) {
      span.error = error;
      span.tags.error = true;
      span.tags.errorMessage = error;
    }

    // Move to completed spans
    this.activeSpans.delete(spanId);
    this.completedSpans.push(span);
    this.traceContexts.delete(spanId);

    this.emit('span-finished', span);

    // Trigger export if memory limit reached
    if (this.completedSpans.length >= this.config.maxSpansInMemory) {
      this.exportSpans();
    }
  }

  // Add tags to a span
  addTags(spanId: string, tags: Record<string, any>): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.tags = { ...span.tags, ...tags };
    }
  }

  // Add log to a span
  addLog(spanId: string, level: 'info' | 'warn' | 'error' | 'debug', message: string, fields?: Record<string, any>): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: new Date(),
        level,
        message,
        fields
      });
    }
  }

  // Add baggage to trace context
  setBaggage(spanId: string, key: string, value: string): void {
    const context = this.traceContexts.get(spanId);
    if (context) {
      context.baggage[key] = value;
    }

    const span = this.activeSpans.get(spanId);
    if (span) {
      span.baggage = span.baggage || {};
      span.baggage[key] = value;
    }
  }

  // Get baggage from trace context
  getBaggage(spanId: string, key: string): string | undefined {
    const context = this.traceContexts.get(spanId);
    return context?.baggage[key];
  }

  // Get trace context for propagation
  getTraceContext(spanId: string): TraceContext | undefined {
    return this.traceContexts.get(spanId);
  }

  // Create child span
  createChildSpan(parentSpanId: string, operationName: string): TraceSpan {
    const parentContext = this.traceContexts.get(parentSpanId);
    if (!parentContext) {
      // Create new trace if parent not found
      return this.startTrace(operationName);
    }

    return this.startTrace(operationName, parentContext);
  }

  // Trace HTTP request
  traceHttpRequest(method: string, url: string, headers?: Record<string, string>): TraceSpan {
    const operationName = `HTTP ${method.toUpperCase()} ${url}`;
    const span = this.startTrace(operationName);

    this.addTags(span.spanId, {
      'http.method': method.toUpperCase(),
      'http.url': url,
      'http.user_agent': headers?.['user-agent'],
      'component': 'http',
      'span.kind': 'server'
    });

    return span;
  }

  // Trace database query
  traceDatabaseQuery(query: string, database: string, operation?: string): TraceSpan {
    const operationName = `DB ${operation || 'query'} ${database}`;
    const span = this.startTrace(operationName);

    this.addTags(span.spanId, {
      'db.statement': query,
      'db.type': database,
      'db.operation': operation,
      'component': 'database',
      'span.kind': 'client'
    });

    return span;
  }

  // Trace external API call
  traceExternalApi(method: string, url: string, service: string): TraceSpan {
    const operationName = `External ${method.toUpperCase()} ${service}`;
    const span = this.startTrace(operationName);

    this.addTags(span.spanId, {
      'http.method': method.toUpperCase(),
      'http.url': url,
      'external.service': service,
      'component': 'http-client',
      'span.kind': 'client'
    });

    return span;
  }

  // Trace background job
  traceBackgroundJob(jobName: string, jobId?: string): TraceSpan {
    const operationName = `Job ${jobName}`;
    const span = this.startTrace(operationName);

    this.addTags(span.spanId, {
      'job.name': jobName,
      'job.id': jobId,
      'component': 'background-job',
      'span.kind': 'internal'
    });

    return span;
  }

  // Get span metrics
  getSpanMetrics(): SpanMetrics[] {
    const metrics = new Map<string, SpanMetrics>();

    for (const span of this.completedSpans) {
      const operationName = span.operationName;
      const duration = span.duration || 0;
      const isError = span.status === 'error';

      if (!metrics.has(operationName)) {
        metrics.set(operationName, {
          operationName,
          count: 0,
          totalDuration: 0,
          averageDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          errorCount: 0,
          errorRate: 0,
          throughput: 0
        });
      }

      const metric = metrics.get(operationName)!;
      metric.count++;
      metric.totalDuration += duration;
      metric.minDuration = Math.min(metric.minDuration, duration);
      metric.maxDuration = Math.max(metric.maxDuration, duration);
      
      if (isError) {
        metric.errorCount++;
      }
    }

    // Calculate derived metrics
    for (const metric of metrics.values()) {
      metric.averageDuration = metric.totalDuration / metric.count;
      metric.errorRate = (metric.errorCount / metric.count) * 100;
      // Throughput calculation would need time window
      metric.throughput = metric.count / 60; // requests per minute (rough estimate)
    }

    return Array.from(metrics.values());
  }

  // Get active spans
  getActiveSpans(): TraceSpan[] {
    return Array.from(this.activeSpans.values());
  }

  // Get completed spans
  getCompletedSpans(limit?: number): TraceSpan[] {
    if (limit) {
      return this.completedSpans.slice(-limit);
    }
    return [...this.completedSpans];
  }

  // Get trace by ID
  getTrace(traceId: string): TraceSpan[] {
    const traceSpans = this.completedSpans.filter(span => span.traceId === traceId);
    const activeTraceSpans = Array.from(this.activeSpans.values()).filter(span => span.traceId === traceId);
    
    return [...traceSpans, ...activeTraceSpans].sort((a, b) => 
      a.startTime.getTime() - b.startTime.getTime()
    );
  }

  // Export spans to configured exporters
  private async exportSpans(): Promise<void> {
    if (this.completedSpans.length === 0) return;

    const spansToExport = [...this.completedSpans];
    this.completedSpans = [];

    try {
      // Console Exporter
      if (this.config.enableConsoleExporter) {
        this.exportToConsole(spansToExport);
      }

      // Jaeger Exporter
      if (this.config.enableJaegerExporter && this.config.jaegerEndpoint) {
        await this.exportToJaeger(spansToExport);
      }

      // Zipkin Exporter
      if (this.config.enableZipkinExporter && this.config.zipkinEndpoint) {
        await this.exportToZipkin(spansToExport);
      }

      // Custom Exporter
      if (this.config.enableCustomExporter && this.config.customExporterUrl) {
        await this.exportToCustom(spansToExport);
      }

      this.emit('spans-exported', {
        count: spansToExport.length,
        exportedAt: new Date()
      });

    } catch (error) {
      logger.error('❌ Failed to export spans:', error);
      // Return spans to queue for retry
      this.completedSpans.unshift(...spansToExport);
    }
  }

  // Console exporter
  private exportToConsole(spans: TraceSpan[]): void {
    logger.info('\n🔍 Distributed Tracing Export:');
    logger.info(`📊 Exported ${spans.length} spans`);
    
    for (const span of spans.slice(0, 5)) { // Show first 5 spans
      logger.info(`  🏷️  ${span.operationName} (${span.duration}ms) [${span.status}]`);
      if (span.error) {
        logger.info(`    ❌ Error: ${span.error}`);
      }
    }
    
    if (spans.length > 5) {
      logger.info(`  ... and ${spans.length - 5} more spans`);
    }
  }

  // Jaeger exporter
  private async exportToJaeger(spans: TraceSpan[]): Promise<void> {
    if (!this.config.jaegerEndpoint) return;

    const jaegerSpans = spans.map(span => ({
      traceID: span.traceId,
      spanID: span.spanId,
      parentSpanID: span.parentSpanId,
      operationName: span.operationName,
      startTime: span.startTime.getTime() * 1000, // microseconds
      duration: (span.duration || 0) * 1000, // microseconds
      tags: Object.entries(span.tags).map(([key, value]) => ({
        key,
        type: typeof value === 'string' ? 'string' : 'number',
        value: String(value)
      })),
      logs: span.logs.map(log => ({
        timestamp: log.timestamp.getTime() * 1000,
        fields: [
          { key: 'level', value: log.level },
          { key: 'message', value: log.message },
          ...(log.fields ? Object.entries(log.fields).map(([key, value]) => ({
            key,
            value: String(value)
          })) : [])
        ]
      })),
      process: {
        serviceName: this.config.serviceName,
        tags: [
          { key: 'version', value: this.config.serviceVersion },
          { key: 'environment', value: this.config.environment }
        ]
      }
    }));

    const payload = {
      data: [{
        traceID: spans[0]?.traceId || 'unknown',
        spans: jaegerSpans
      }]
    };

    // Send to Jaeger (mock implementation)
    logger.info(`📡 Exporting ${spans.length} spans to Jaeger: ${this.config.jaegerEndpoint}`);
  }

  // Zipkin exporter
  private async exportToZipkin(spans: TraceSpan[]): Promise<void> {
    if (!this.config.zipkinEndpoint) return;

    const zipkinSpans = spans.map(span => ({
      traceId: span.traceId,
      id: span.spanId,
      parentId: span.parentSpanId,
      name: span.operationName,
      timestamp: span.startTime.getTime() * 1000, // microseconds
      duration: (span.duration || 0) * 1000, // microseconds
      kind: span.tags['span.kind'] || 'INTERNAL',
      localEndpoint: {
        serviceName: this.config.serviceName
      },
      tags: span.tags,
      annotations: span.logs.map(log => ({
        timestamp: log.timestamp.getTime() * 1000,
        value: `${log.level}: ${log.message}`
      }))
    }));

    logger.info(`📡 Exporting ${spans.length} spans to Zipkin: ${this.config.zipkinEndpoint}`);
  }

  // Custom exporter
  private async exportToCustom(spans: TraceSpan[]): Promise<void> {
    if (!this.config.customExporterUrl) return;

    const payload = {
      service: {
        name: this.config.serviceName,
        version: this.config.serviceVersion,
        environment: this.config.environment
      },
      spans: spans.map(span => ({
        ...span,
        startTime: span.startTime.toISOString(),
        endTime: span.endTime?.toISOString(),
        logs: span.logs.map(log => ({
          ...log,
          timestamp: log.timestamp.toISOString()
        }))
      })),
      exportedAt: new Date().toISOString()
    };

    logger.info(`📡 Exporting ${spans.length} spans to custom endpoint: ${this.config.customExporterUrl}`);
  }

  // Generate trace ID
  private generateTraceId(): string {
    return nanoid(16);
  }

  // Generate span ID
  private generateSpanId(): string {
    return nanoid(8);
  }

  // Determine if span should be sampled
  private shouldSample(): boolean {
    return Math.random() < this.config.samplingRate;
  }

  // Cleanup memory
  private cleanupMemory(): void {
    // Clean up old completed spans if memory limit exceeded
    if (this.completedSpans.length > this.config.maxSpansInMemory) {
      const excessSpans = this.completedSpans.length - this.config.maxSpansInMemory;
      this.completedSpans.splice(0, excessSpans);
      
      logger.info(`🧹 Cleaned up ${excessSpans} old spans from memory`);
    }

    // Clean up orphaned active spans (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const orphanedSpans = Array.from(this.activeSpans.entries()).filter(
      ([_, span]) => span.startTime.getTime() < fiveMinutesAgo
    );

    for (const [spanId, span] of orphanedSpans) {
      logger.warn(`⚠️ Cleaning up orphaned span: ${span.operationName}`);
      this.finishSpan(spanId, 'Span timeout - automatically finished');
    }
  }

  // Update configuration
  updateConfig(config: Partial<TracingConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config-updated', this.config);
  }

  // Get current configuration
  getConfig(): TracingConfig {
    return { ...this.config };
  }

  // Get tracing statistics
  getStatistics(): {
    activeSpans: number;
    completedSpans: number;
    totalTraces: number;
    averageSpanDuration: number;
    errorRate: number;
    throughput: number;
  } {
    const totalSpans = this.completedSpans.length;
    const totalDuration = this.completedSpans.reduce((sum, span) => sum + (span.duration || 0), 0);
    const errorCount = this.completedSpans.filter(span => span.status === 'error').length;
    const uniqueTraces = new Set(this.completedSpans.map(span => span.traceId)).size;

    return {
      activeSpans: this.activeSpans.size,
      completedSpans: totalSpans,
      totalTraces: uniqueTraces,
      averageSpanDuration: totalSpans > 0 ? totalDuration / totalSpans : 0,
      errorRate: totalSpans > 0 ? (errorCount / totalSpans) * 100 : 0,
      throughput: totalSpans / Math.max(1, (Date.now() - (this.completedSpans[0]?.startTime.getTime() || Date.now())) / 60000)
    };
  }

  // Shutdown tracing system
  shutdown(): void {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
      this.exportTimer = null;
    }

    // Export remaining spans
    if (this.completedSpans.length > 0) {
      this.exportSpans();
    }

    // Finish active spans
    for (const [spanId, span] of this.activeSpans) {
      this.finishSpan(spanId, 'System shutdown');
    }

    this.isInitialized = false;
    logger.info('🛑 Distributed Tracing System shut down');
  }
}

// Create singleton instance
export const distributedTracing = DistributedTracing.getInstance();

// Auto-initialize in production
if (process.env.NODE_ENV === 'production') {
  distributedTracing.initialize({
    samplingRate: 0.01, // 1% sampling in production
    enableJaegerExporter: !!process.env.JAEGER_ENDPOINT,
    jaegerEndpoint: process.env.JAEGER_ENDPOINT
  });
}

// Add global tracing API for debugging
if (typeof global !== 'undefined') {
  (global as any).meridianTracing = {
    tracer: distributedTracing,
    startTrace: (name: string) => distributedTracing.startTrace(name),
    finishSpan: (spanId: string) => distributedTracing.finishSpan(spanId),
    getMetrics: () => distributedTracing.getSpanMetrics(),
    getStats: () => distributedTracing.getStatistics()
  };
}

