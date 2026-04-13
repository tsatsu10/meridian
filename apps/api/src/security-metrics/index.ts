import { Hono } from "hono";
import { getDatabase } from "../database/connection";
import { settingsAuditLogTable, userTable, securityAlerts, securityMetricsHistory } from "../database/schema";
import { eq, and, gte, desc, sql, count } from "drizzle-orm";
import { authMiddleware } from "../middlewares/secure-auth";
import twoFactorRoutes from "./two-factor";
import gdprRoutes from "./gdpr";
import sessionRoutes from "./sessions";
import logger from '../utils/logger';

const securityMetrics = new Hono();

// Get overall security metrics
securityMetrics.get("/metrics", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const now = new Date();
    const timeRange = c.req.query("timeRange") || "7d";
    
    // Calculate date range
    const days = timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get latest security metrics from history
    const latestMetrics = await db
      .select()
      .from(securityMetricsHistory)
      .where(gte(securityMetricsHistory.date, startDate))
      .orderBy(desc(securityMetricsHistory.date))
      .limit(1);
    
    const metrics = latestMetrics[0] || {
      totalThreats: 0,
      resolvedThreats: 0,
      criticalAlerts: 0,
      failedLogins: 0,
    };
    
    // Get active alerts count
    const activeAlertsCount = await db
      .select({ count: count() })
      .from(securityAlerts)
      .where(eq(securityAlerts.status, "active"));
    
    // Calculate security score based on metrics
    const unresolvedThreats = metrics.totalThreats - metrics.resolvedThreats;
    
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get failed login attempts in last 24 hours
    const failedLogins = await db
      .select({ count: count() })
      .from(settingsAuditLogTable)
      .where(
        and(
          eq(settingsAuditLogTable.action, "sign_in_failed"),
          gte(settingsAuditLogTable.timestamp, yesterday)
        )
      );

    // Get active sessions count
    const activeSessions = await db
      .select({ count: count() })
      .from(userTable)
      .where(sql`${userTable.lastActiveAt} > NOW() - INTERVAL '15 minutes'`);

    // Get 2FA adoption rate
    const totalUsers = await db.select({ count: count() }).from(userTable);
    const usersWithTwoFactor = await db
      .select({ count: count() })
      .from(userTable)
      .where(eq(userTable.twoFactorEnabled, true));

    const twoFactorAdoption =
      totalUsers[0]?.count && totalUsers[0].count > 0
        ? Math.round(
            ((usersWithTwoFactor[0]?.count ?? 0) / totalUsers[0].count) * 100
          )
        : 0;

    // Get suspicious activities count
    const suspiciousActivities = await db
      .select({ count: count() })
      .from(settingsAuditLogTable)
      .where(
        and(
          gte(settingsAuditLogTable.timestamp, yesterday),
          sql`${settingsAuditLogTable.details}->>'suspicious' = 'true'`
        )
      );

    // Calculate security score (0-100)
    let securityScore = 100;
    
    // Deduct points for failed logins (max -20)
    const failedLoginCount = failedLogins[0]?.count ?? 0;
    securityScore -= Math.min((failedLoginCount / 50) * 20, 20);
    
    // Deduct points for low 2FA adoption (max -30)
    securityScore -= Math.max(0, (75 - twoFactorAdoption) / 75 * 30);
    
    // Deduct points for suspicious activities (max -20)
    const suspiciousCount = suspiciousActivities[0]?.count ?? 0;
    securityScore -= Math.min((suspiciousCount / 20) * 20, 20);

    securityScore = Math.max(0, Math.round(securityScore));

    // Count active threats (unresolved security incidents)
    const activeThreats = await db
      .select({ count: count() })
      .from(settingsAuditLogTable)
      .where(
        and(
          gte(settingsAuditLogTable.timestamp, yesterday),
          sql`${settingsAuditLogTable.severity} IN ('critical', 'high')`
        )
      );

    return c.json({
      securityScore,
      totalThreats: metrics.totalThreats,
      resolvedThreats: metrics.resolvedThreats,
      activeAlerts: activeAlertsCount[0]?.count ?? 0,
      criticalAlerts: metrics.criticalAlerts,
      failedLogins: metrics.failedLogins,
      activeSessions: activeSessions[0]?.count ?? 0,
      twoFactorAdoption,
      timeRange,
      lastUpdated: now,
    });
  } catch (error) {
    logger.error("Error fetching security metrics:", error);
    return c.json(
      { error: "Failed to fetch security metrics" },
      500
    );
  }
});

// Get security alerts
securityMetrics.get("/alerts", authMiddleware, async (c) => {
  try {
    const timeRange = c.req.query("timeRange") || "7d";
    const status = c.req.query("status") || "all";
    const db = getDatabase();

    // Calculate time range
    const days = timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build query
    let query = db
      .select()
      .from(securityAlerts)
      .where(gte(securityAlerts.createdAt, startDate));

    // Filter by status if specified
    if (status !== "all") {
      query = query.where(
        and(
          gte(securityAlerts.createdAt, startDate),
          eq(securityAlerts.status, status)
        )
      );
    }

    // Fetch alerts
    const alerts = await query
      .orderBy(desc(securityAlerts.createdAt))
      .limit(100);

    // Transform to expected format
    const formattedAlerts = alerts.map((alert) => ({
      id: alert.id.toString(),
      severity: alert.severity as "critical" | "high" | "medium" | "low",
      type: alert.type,
      description: alert.description,
      timestamp: alert.createdAt,
      status: alert.status,
      resolvedBy: alert.resolvedBy,
      resolvedAt: alert.resolvedAt,
      metadata: alert.metadata,
    }));

    return c.json(formattedAlerts);
  } catch (error) {
    logger.error("Error fetching security alerts:", error);
    return c.json({ error: "Failed to fetch security alerts" }, 500);
  }
});

// Get threat data for charts
securityMetrics.get("/threats", authMiddleware, async (c) => {
  try {
    const timeRange = c.req.query("timeRange") || "7d";
    const db = getDatabase();

    // Calculate time range
    const now = new Date();
    let startDate = new Date(now);
    let days = 7;
    
    switch (timeRange) {
      case "24h":
        days = 1;
        startDate.setHours(now.getHours() - 24);
        break;
      case "7d":
        days = 7;
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        days = 30;
        startDate.setDate(now.getDate() - 30);
        break;
    }

    // Generate data for each day
    const threatData = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      // Count failed logins
      const failedLogins = await db
        .select({ count: count() })
        .from(settingsAuditLogTable)
        .where(
          and(
            eq(settingsAuditLogTable.action, "sign_in_failed"),
            gte(settingsAuditLogTable.timestamp, date),
            sql`${settingsAuditLogTable.timestamp} < ${nextDate}`
          )
        );

      // Count suspicious activities
      const suspicious = await db
        .select({ count: count() })
        .from(settingsAuditLogTable)
        .where(
          and(
            sql`${settingsAuditLogTable.details}->>'suspicious' = 'true'`,
            gte(settingsAuditLogTable.timestamp, date),
            sql`${settingsAuditLogTable.timestamp} < ${nextDate}`
          )
        );

      // Count blocked IPs (from rate limiting)
      const blockedIPs = await db
        .select({ count: count() })
        .from(settingsAuditLogTable)
        .where(
          and(
            eq(settingsAuditLogTable.action, "ip_blocked"),
            gte(settingsAuditLogTable.timestamp, date),
            sql`${settingsAuditLogTable.timestamp} < ${nextDate}`
          )
        );

      threatData.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        failedLogins: failedLogins[0]?.count ?? 0,
        suspiciousActivity: suspicious[0]?.count ?? 0,
        blockedIPs: blockedIPs[0]?.count ?? 0,
      });
    }

    return c.json(threatData);
  } catch (error) {
    logger.error("Error fetching threat data:", error);
    return c.json({ error: "Failed to fetch threat data" }, 500);
  }
});

// Resolve a security alert
securityMetrics.post("/alerts/:id/resolve", authMiddleware, async (c) => {
  try {
    const alertId = c.req.param("id");
    const userEmail = c.get("userEmail");
    const db = getDatabase();

    // TODO: Add resolved flag to audit log table
    // For now, we'll just log the resolution action
    await db.insert(settingsAuditLogTable).values({
      id: crypto.randomUUID(),
      userEmail,
      action: "alert_resolved",
      details: JSON.stringify({ alertId }),
      ipAddress: c.req.header("x-forwarded-for") || "unknown",
      timestamp: new Date(),
      severity: "info",
    });

    return c.json({ success: true, message: "Alert marked as resolved" });
  } catch (error) {
    logger.error("Error resolving alert:", error);
    return c.json({ error: "Failed to resolve alert" }, 500);
  }
});

// Export security report
securityMetrics.post("/export-report", authMiddleware, async (c) => {
  try {
    const { timeRange } = await c.req.json();
    
    // TODO: Generate PDF report
    // For now, return a JSON report
    const report = {
      generatedAt: new Date().toISOString(),
      timeRange,
      message: "PDF generation not yet implemented",
    };

    return c.json(report);
  } catch (error) {
    logger.error("Error exporting report:", error);
    return c.json({ error: "Failed to export report" }, 500);
  }
});

// Mount two-factor routes
securityMetrics.route("/two-factor", twoFactorRoutes);

// Mount GDPR routes
securityMetrics.route("/gdpr", gdprRoutes);

// Mount session routes
securityMetrics.route("/sessions", sessionRoutes);

export default securityMetrics;


