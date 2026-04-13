import { Hono } from "hono";
import { authMiddleware } from "../middlewares/secure-auth";
import { getDatabase } from "../database/connection";
import { apiUsageMetrics, apiRateLimits } from "../database/schema";
import { desc, gte, eq, and, avg, count, sum } from "drizzle-orm";
import logger from '../utils/logger';

const monitoringRoutes = new Hono();

// Get API metrics
monitoringRoutes.get("/metrics", authMiddleware, async (c) => {
  try {
    const { range } = c.req.query();
    const db = getDatabase();

    // Calculate time range
    const now = new Date();
    let startDate: Date;
    if (range === "hour") {
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
    } else if (range === "day") {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (range === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get metrics from database
    const metrics = await db
      .select()
      .from(apiUsageMetrics)
      .where(gte(apiUsageMetrics.timestamp, startDate));

    const totalCalls = metrics.length;
    const successfulCalls = metrics.filter((m) => m.statusCode < 400).length;
    const failedCalls = totalCalls - successfulCalls;

    // Calculate response time percentiles
    const responseTimes = metrics.map((m) => m.responseTime).sort((a, b) => a - b);
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length)
      : 0;
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    const p95ResponseTime = responseTimes[p95Index] || avgResponseTime;
    const p99ResponseTime = responseTimes[p99Index] || avgResponseTime;

    const errorRate = totalCalls > 0 ? (failedCalls / totalCalls) * 100 : 0;

    // Get rate limit info (get current user's rate limit)
    const userId = c.get("userId") || 1; // Fallback to 1 if not set
    const rateLimitInfo = await db
      .select()
      .from(apiRateLimits)
      .where(eq(apiRateLimits.userId, userId))
      .limit(1);

    const rateLimitTotal = rateLimitInfo[0]?.limitTotal || 10000;
    const rateLimitRemaining = rateLimitInfo[0]?.limitRemaining || rateLimitTotal;
    const rateLimitResetAt = rateLimitInfo[0]?.resetAt || new Date(now.getTime() + 60 * 60 * 1000);

    return c.json({
      data: {
        totalCalls,
        successfulCalls,
        failedCalls,
        avgResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        errorRate: Math.round(errorRate * 100) / 100,
        rateLimitRemaining,
        rateLimitTotal,
        rateLimitResetAt,
      },
    });
  } catch (error) {
    logger.error("Error fetching API metrics:", error);
    return c.json({ error: "Failed to fetch API metrics" }, 500);
  }
});

// Get endpoint stats
monitoringRoutes.get("/endpoints", authMiddleware, async (c) => {
  try {
    const { range } = c.req.query();
    const db = getDatabase();

    // Calculate time range
    const now = new Date();
    let startDate: Date;
    if (range === "hour") {
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
    } else if (range === "day") {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (range === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get all metrics from database for the time range
    const allMetrics = await db
      .select()
      .from(apiUsageMetrics)
      .where(gte(apiUsageMetrics.timestamp, startDate));

    // Group by endpoint and method
    const endpointStats = new Map<string, {
      endpoint: string;
      method: string;
      calls: number;
      responseTimes: number[];
      errors: number;
      lastCalled: Date;
    }>();

    for (const metric of allMetrics) {
      const key = `${metric.endpoint}:${metric.method}`;
      
      if (!endpointStats.has(key)) {
        endpointStats.set(key, {
          endpoint: metric.endpoint,
          method: metric.method,
          calls: 0,
          responseTimes: [],
          errors: 0,
          lastCalled: metric.timestamp,
        });
      }

      const stats = endpointStats.get(key)!;
      stats.calls++;
      stats.responseTimes.push(metric.responseTime);
      if (metric.statusCode >= 400) stats.errors++;
      if (metric.timestamp > stats.lastCalled) stats.lastCalled = metric.timestamp;
    }

    // Calculate stats for each endpoint
    const stats = Array.from(endpointStats.values()).map((stat) => {
      const avgResponseTime = stat.responseTimes.length > 0
        ? Math.round(stat.responseTimes.reduce((sum, rt) => sum + rt, 0) / stat.responseTimes.length)
        : 0;
      
      const errorRate = stat.calls > 0 ? (stat.errors / stat.calls) * 100 : 0;
      
      let status: "healthy" | "degraded" | "failing";
      if (errorRate < 2 && avgResponseTime < 300) status = "healthy";
      else if (errorRate < 5 && avgResponseTime < 500) status = "degraded";
      else status = "failing";

      return {
        endpoint: stat.endpoint,
        method: stat.method,
        calls: stat.calls,
        avgResponseTime,
        errorRate: Math.round(errorRate * 100) / 100,
        lastCalled: stat.lastCalled,
        status,
      };
    });

    // Sort by calls descending
    stats.sort((a, b) => b.calls - a.calls);

    return c.json({ data: stats });
  } catch (error) {
    logger.error("Error fetching endpoint stats:", error);
    return c.json({ error: "Failed to fetch endpoint stats" }, 500);
  }
});

// Get recent API calls
monitoringRoutes.get("/recent-calls", authMiddleware, async (c) => {
  try {
    const db = getDatabase();

    // Get the 100 most recent API calls from database
    const recentMetrics = await db
      .select()
      .from(apiUsageMetrics)
      .orderBy(desc(apiUsageMetrics.timestamp))
      .limit(100);

    // Transform to API format
    const calls = recentMetrics.map((metric) => ({
      id: metric.id.toString(),
      endpoint: metric.endpoint,
      method: metric.method,
      statusCode: metric.statusCode,
      responseTime: metric.responseTime,
      timestamp: metric.timestamp,
      error: metric.statusCode >= 400 
        ? `Error: ${metric.statusCode >= 500 ? "Internal Server Error" : "Client Error"}` 
        : undefined,
    }));

    return c.json({ data: calls });
  } catch (error) {
    logger.error("Error fetching recent calls:", error);
    return c.json({ error: "Failed to fetch recent calls" }, 500);
  }
});

// Get timeseries data
monitoringRoutes.get("/timeseries", authMiddleware, async (c) => {
  try {
    const { range } = c.req.query();
    const db = getDatabase();

    // Calculate time range and bucket size
    const now = new Date();
    let startDate: Date;
    let bucketMs: number;
    
    if (range === "hour") {
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
      bucketMs = 60 * 1000; // 1 minute buckets
    } else if (range === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      bucketMs = 60 * 60 * 1000; // 1 hour buckets
    } else if (range === "month") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      bucketMs = 24 * 60 * 60 * 1000; // 1 day buckets
    } else {
      // Default: day
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      bucketMs = 60 * 60 * 1000; // 1 hour buckets
    }

    // Get all metrics in range
    const metrics = await db
      .select()
      .from(apiUsageMetrics)
      .where(gte(apiUsageMetrics.timestamp, startDate));

    // Group into time buckets
    const buckets = new Map<number, {
      calls: number;
      errors: number;
      responseTimes: number[];
    }>();

    for (const metric of metrics) {
      const bucketKey = Math.floor(metric.timestamp.getTime() / bucketMs) * bucketMs;
      
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          calls: 0,
          errors: 0,
          responseTimes: [],
        });
      }

      const bucket = buckets.get(bucketKey)!;
      bucket.calls++;
      if (metric.statusCode >= 400) bucket.errors++;
      bucket.responseTimes.push(metric.responseTime);
    }

    // Build timeseries array
    const timeseries = [];
    const currentBucket = Math.floor(now.getTime() / bucketMs) * bucketMs;
    const startBucket = Math.floor(startDate.getTime() / bucketMs) * bucketMs;

    for (let bucketTime = startBucket; bucketTime <= currentBucket; bucketTime += bucketMs) {
      const bucket = buckets.get(bucketTime);
      const time = new Date(bucketTime);

      let timeLabel: string;
      if (range === "hour") {
        timeLabel = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      } else if (range === "month") {
        timeLabel = time.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } else {
        timeLabel = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      }

      const calls = bucket?.calls || 0;
      const errors = bucket?.errors || 0;
      const avgResponseTime = bucket && bucket.responseTimes.length > 0
        ? Math.round(bucket.responseTimes.reduce((sum, rt) => sum + rt, 0) / bucket.responseTimes.length)
        : 0;

      timeseries.push({
        time: timeLabel,
        calls,
        errors,
        avgResponseTime,
      });
    }

    return c.json({ data: timeseries });
  } catch (error) {
    logger.error("Error fetching timeseries:", error);
    return c.json({ error: "Failed to fetch timeseries" }, 500);
  }
});

export default monitoringRoutes;

