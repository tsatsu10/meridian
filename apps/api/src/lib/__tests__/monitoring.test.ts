import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { monitoring, createMonitoringMiddleware } from "../monitoring";
import { errorHandler } from "../errors";
import logger from "../../utils/logger";

// monitoring is a process-wide singleton: resolve every open alert before
// clearing, or alerts leak from one test into the next.
function resetMonitoring() {
  monitoring.clearOldMetrics(0);
  for (const alert of monitoring.getAlerts(false)) {
    monitoring.resolveAlert(alert.id);
  }
  monitoring.clearResolvedAlerts();
}

describe("Monitoring Service", () => {
  beforeEach(() => {
    resetMonitoring();
    vi.clearAllMocks();
  });

  describe("Metrics Recording", () => {
    it("records metric values correctly", () => {
      monitoring.recordMetric("test_metric", 100, { tag1: "value1" });
      monitoring.recordMetric("test_metric", 200, { tag1: "value1" });
      monitoring.recordMetric("test_metric", 150, { tag1: "value1" });

      const metrics = monitoring.getMetrics("test_metric");
      const metricKey = Object.keys(metrics)[0];
      const metric = metrics[metricKey];

      expect(metric.count).toBe(3);
      expect(metric.total).toBe(450);
      expect(metric.avg).toBe(150);
      expect(metric.min).toBe(100);
      expect(metric.max).toBe(200);
    });

    it("increments counter metrics", () => {
      monitoring.incrementCounter("test_counter", 5);
      monitoring.incrementCounter("test_counter", 3);

      const metrics = monitoring.getMetrics("counter:test_counter");
      const metricKey = Object.keys(metrics)[0];
      const metric = metrics[metricKey];

      expect(metric.count).toBe(8);
    });

    it("sets gauge metrics", () => {
      monitoring.setGauge("test_gauge", 42);

      const metrics = monitoring.getMetrics("gauge:test_gauge");
      const metricKey = Object.keys(metrics)[0];
      const metric = metrics[metricKey];

      expect(metric.value).toBe(42);
    });

    it("records histogram metrics", () => {
      monitoring.recordHistogram("test_histogram", 100);
      monitoring.recordHistogram("test_histogram", 200);
      monitoring.recordHistogram("test_histogram", 150);

      const metrics = monitoring.getMetrics("histogram:test_histogram");
      const metricKey = Object.keys(metrics)[0];
      const metric = metrics[metricKey];

      expect(metric.count).toBe(3);
      expect(metric.sum).toBe(450);
      expect(metric.buckets.size).toBeGreaterThan(0);
    });
  });

  describe("Alert Management", () => {
    it("creates alerts correctly", () => {
      const alert = monitoring.createAlert("Test alert", "high", {
        tag1: "value1",
      });

      expect(alert.message).toBe("Test alert");
      expect(alert.severity).toBe("high");
      expect(alert.tags).toEqual({ tag1: "value1" });
      expect(alert.resolved).toBe(false);
    });

    it("resolves alerts", () => {
      const alert = monitoring.createAlert("Test alert", "medium");
      monitoring.resolveAlert(alert.id);

      const alerts = monitoring.getAlerts(false);
      expect(alerts).toHaveLength(0);

      const resolvedAlerts = monitoring.getAlerts(true);
      expect(resolvedAlerts).toHaveLength(1);
      expect(resolvedAlerts[0].resolved).toBe(true);
    });

    it("gets health status based on alerts", () => {
      // No alerts - healthy
      let health = monitoring.getHealthStatus();
      expect(health.status).toBe("healthy");

      // High alert - warning
      monitoring.createAlert("High alert", "high");
      health = monitoring.getHealthStatus();
      expect(health.status).toBe("warning");

      // Critical alert - critical
      monitoring.createAlert("Critical alert", "critical");
      health = monitoring.getHealthStatus();
      expect(health.status).toBe("critical");
    });
  });

  describe("Event Recording", () => {
    it("records events", () => {
      const debugSpy = vi
        .spyOn(logger, "debug")
        .mockImplementation(async () => {});

      monitoring.recordEvent(
        "test_event",
        { data: "test" },
        { tag1: "value1" },
      );

      expect(debugSpy).toHaveBeenCalledWith(
        "Event recorded:",
        expect.objectContaining({
          name: "test_event",
          data: { data: "test" },
          tags: { tag1: "value1" },
        }),
      );

      debugSpy.mockRestore();
    });
  });
});

describe("Monitoring Middleware", () => {
  let app: Hono;

  beforeEach(() => {
    resetMonitoring();
    app = new Hono();
    app.onError(errorHandler());
    vi.clearAllMocks();
  });

  it("records request metrics", async () => {
    app.use("*", createMonitoringMiddleware());
    app.get("/test", (c) => c.text("OK"));

    await app.request("/test");

    const metrics = monitoring.getMetrics("http_request_duration");
    expect(Object.keys(metrics)).toHaveLength(1);
  });

  it("creates alerts for server errors", async () => {
    app.use("*", createMonitoringMiddleware());
    app.get("/error", (c) => {
      return c.text("Error", 500);
    });

    await app.request("/error");

    const alerts = monitoring.getAlerts(false);
    expect(alerts.length).toBeGreaterThan(0);
  });
});
