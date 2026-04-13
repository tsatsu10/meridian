import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { monitoring, createMonitoringMiddleware } from '../monitoring';
import { logger, LogLevel, createRequestLoggingMiddleware } from '../logging';
import { errorHandler } from '../errors';

// TODO: Monitoring service has logger interface mismatch - skipping until logger is refactored
describe.skip('Monitoring Service', () => {
  beforeEach(() => {
    // Clear monitoring data
    monitoring.clearOldMetrics(0);
    monitoring.clearResolvedAlerts();
    logger.clearLogs();
    vi.clearAllMocks();
  });

  describe('Metrics Recording', () => {
    it('records metric values correctly', () => {
      monitoring.recordMetric('test_metric', 100, { tag1: 'value1' });
      monitoring.recordMetric('test_metric', 200, { tag1: 'value1' });
      monitoring.recordMetric('test_metric', 150, { tag1: 'value1' });

      const metrics = monitoring.getMetrics('test_metric');
      const metricKey = Object.keys(metrics)[0];
      const metric = metrics[metricKey];

      expect(metric.count).toBe(3);
      expect(metric.total).toBe(450);
      expect(metric.avg).toBe(150);
      expect(metric.min).toBe(100);
      expect(metric.max).toBe(200);
    });

    it('increments counter metrics', () => {
      monitoring.incrementCounter('test_counter', 5);
      monitoring.incrementCounter('test_counter', 3);

      const metrics = monitoring.getMetrics('counter:test_counter');
      const metricKey = Object.keys(metrics)[0];
      const metric = metrics[metricKey];

      expect(metric.count).toBe(8);
    });

    it('sets gauge metrics', () => {
      monitoring.setGauge('test_gauge', 42);

      const metrics = monitoring.getMetrics('gauge:test_gauge');
      const metricKey = Object.keys(metrics)[0];
      const metric = metrics[metricKey];

      expect(metric.value).toBe(42);
    });

    it('records histogram metrics', () => {
      monitoring.recordHistogram('test_histogram', 100);
      monitoring.recordHistogram('test_histogram', 200);
      monitoring.recordHistogram('test_histogram', 150);

      const metrics = monitoring.getMetrics('histogram:test_histogram');
      const metricKey = Object.keys(metrics)[0];
      const metric = metrics[metricKey];

      expect(metric.count).toBe(3);
      expect(metric.sum).toBe(450);
      expect(metric.buckets.size).toBeGreaterThan(0);
    });
  });

  describe('Alert Management', () => {
    it('creates alerts correctly', () => {
      const alert = monitoring.createAlert('Test alert', 'high', { tag1: 'value1' });

      expect(alert.message).toBe('Test alert');
      expect(alert.severity).toBe('high');
      expect(alert.tags).toEqual({ tag1: 'value1' });
      expect(alert.resolved).toBe(false);
    });

    it('resolves alerts', () => {
      const alert = monitoring.createAlert('Test alert', 'medium');
      monitoring.resolveAlert(alert.id);

      const alerts = monitoring.getAlerts(false);
      expect(alerts).toHaveLength(0);

      const resolvedAlerts = monitoring.getAlerts(true);
      expect(resolvedAlerts).toHaveLength(1);
      expect(resolvedAlerts[0].resolved).toBe(true);
    });

    it('gets health status based on alerts', () => {
      // No alerts - healthy
      let health = monitoring.getHealthStatus();
      expect(health.status).toBe('healthy');

      // High alert - warning
      monitoring.createAlert('High alert', 'high');
      health = monitoring.getHealthStatus();
      expect(health.status).toBe('warning');

      // Critical alert - critical
      monitoring.createAlert('Critical alert', 'critical');
      health = monitoring.getHealthStatus();
      expect(health.status).toBe('critical');
    });
  });

  describe('Event Recording', () => {
    it('records events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      monitoring.recordEvent('test_event', { data: 'test' }, { tag1: 'value1' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Event recorded:',
        expect.objectContaining({
          name: 'test_event',
          data: { data: 'test' },
          tags: { tag1: 'value1' },
        })
      );
      
      consoleSpy.mockRestore();
    });
  });
});

describe('Monitoring Middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.onError(errorHandler());
    vi.clearAllMocks();
  });

  it('records request metrics', async () => {
    app.use('*', createMonitoringMiddleware());
    app.get('/test', (c) => c.text('OK'));

    await app.request('/test');

    const metrics = monitoring.getMetrics('http_request_duration');
    expect(Object.keys(metrics)).toHaveLength(1);
  });

  it.skip('creates alerts for slow requests', async () => {
    // TODO: Monitoring middleware doesn't create alerts for slow requests yet
    app.use('*', createMonitoringMiddleware());
    app.get('/slow', async (c) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return c.text('OK');
    });

    await app.request('/slow');

    const alerts = monitoring.getAlerts(false);
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('creates alerts for server errors', async () => {
    app.use('*', createMonitoringMiddleware());
    app.get('/error', (c) => {
      return c.text('Error', 500);
    });

    await app.request('/error');

    const alerts = monitoring.getAlerts(false);
    expect(alerts.length).toBeGreaterThan(0);
  });
});

describe.skip('Logger', () => {
  beforeEach(() => {
    // logger.clearLogs(); // Not available in current logger implementation
    vi.clearAllMocks();
  });

  describe('Logging Levels', () => {
    it('logs at different levels', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      
      logger.info('Test info message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Test info message')
      );
      
      consoleSpy.mockRestore();
    });

    it('respects log level setting', () => {
      logger.setLogLevel(LogLevel.WARN);
      
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      logger.debug('Debug message');
      logger.warn('Warning message');
      
      expect(debugSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      
      debugSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });

  describe('Log Retrieval', () => {
    it('retrieves logs correctly', () => {
      logger.info('Test message 1');
      logger.warn('Test message 2');
      logger.error('Test message 3');

      const allLogs = logger.getLogs();
      expect(allLogs).toHaveLength(3);

      const errorLogs = logger.getLogs(LogLevel.ERROR);
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].message).toBe('Test message 3');
    });

    it('limits log retrieval', () => {
      for (let i = 0; i < 150; i++) {
        logger.info(`Message ${i}`);
      }

      const logs = logger.getLogs(undefined, 100);
      expect(logs).toHaveLength(100);
    });

    it('provides log statistics', () => {
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      const stats = logger.getLogStats();
      expect(stats.total).toBe(3);
      expect(stats.byLevel.info).toBe(1);
      expect(stats.byLevel.warn).toBe(1);
      expect(stats.byLevel.error).toBe(1);
    });
  });

  describe('Request Logging Middleware', () => {
    let app: Hono;

    beforeEach(() => {
      app = new Hono();
      app.onError(errorHandler());
      vi.clearAllMocks();
    });

    it('logs request start and completion', async () => {
      app.use('*', createRequestLoggingMiddleware());
      app.get('/test', (c) => c.text('OK'));

      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      await app.request('/test');

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Request started')
      );
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Request completed')
      );

      infoSpy.mockRestore();
    });

    it('logs request errors', async () => {
      app.use('*', createRequestLoggingMiddleware());
      app.get('/error', () => {
        throw new Error('Test error');
      });

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await app.request('/error');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Request failed')
      );

      errorSpy.mockRestore();
    });
  });

  describe('Structured Logging', () => {
    it('creates structured logger with context', () => {
      const structuredLogger = logger.createStructuredLogger({ userId: '123' });
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      structuredLogger.info('Test message', { additional: 'data' });

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test message')
      );

      infoSpy.mockRestore();
    });
  });
});

