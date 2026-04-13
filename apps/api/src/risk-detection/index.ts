import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { getRiskAnalysis } from "./controllers/get-risk-analysis";
import { getRiskAlerts } from "./controllers/get-risk-alerts";
import { getRiskMetrics } from "./controllers/get-risk-metrics";
import { updateRiskAlert } from "./controllers/update-risk-alert";
import { getRiskTrends } from "./controllers/get-risk-trends";
import { getAlertHistory, resolveAlert } from "./controllers/alert-history";
import logger from '../utils/logger';

const riskDetection = new Hono<{
  Variables: {
    userEmail: string;
    userId: string;
  };
}>();

// Get comprehensive risk analysis for workspace
riskDetection.get(
  "/analysis/:workspaceId",
  zValidator("param", z.object({ workspaceId: z.string() })),
  zValidator("query", z.object({
    timeRange: z.enum(["7d", "30d", "90d", "1y", "all"]).optional().default("30d"),
    projectIds: z.string().optional(),
    includeResolved: z.string().optional().default("false").transform(val => val === "true"),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  })),
  async (c) => {
    try {
      const { workspaceId } = c.req.valid("param");
      const query = c.req.valid("query");
      
      logger.info(`🔍 Risk analysis request for workspace: ${workspaceId}`, {
        timeRange: query.timeRange,
        includeResolved: query.includeResolved,
        severity: query.severity,
      });
      
      const analysis = await getRiskAnalysis({
        workspaceId,
        timeRange: query.timeRange,
        projectIds: query.projectIds ? query.projectIds.split(",") : undefined,
        includeResolved: query.includeResolved,
        severity: query.severity,
      });
      
      logger.info(`✅ Risk analysis complete: ${analysis.alerts.length} alerts, score: ${analysis.overallRiskScore}`);
      return c.json(analysis);
    } catch (error) {
      logger.error("❌ Risk analysis error:", error);
      
      // Return more detailed error information
      if (error instanceof Error) {
        return c.json({ 
          error: "Failed to analyze risks", 
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, 500);
      }
      
      return c.json({ error: "Unknown error occurred" }, 500);
    }
  }
);

// Get active risk alerts
riskDetection.get(
  "/alerts/:workspaceId",
  zValidator("param", z.object({ workspaceId: z.string() })),
  zValidator("query", z.object({
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    type: z.enum(["overdue", "blocked", "resource_conflict", "deadline_risk", "dependency_chain", "quality_risk"]).optional(),
    limit: z.number().optional().default(50),
  })),
  async (c) => {
    const { workspaceId } = c.req.valid("param");
    const query = c.req.valid("query");
    
    try {
      const alerts = await getRiskAlerts({
        workspaceId,
        severity: query.severity,
        type: query.type,
        limit: query.limit,
      });
      
      return c.json(alerts);
    } catch (error) {
      logger.error("Risk alerts error:", error);
      return c.json({ error: "Failed to get risk alerts" }, 500);
    }
  }
);

// Get risk metrics and KPIs
riskDetection.get(
  "/metrics/:workspaceId",
  zValidator("param", z.object({ workspaceId: z.string() })),
  zValidator("query", z.object({
    timeRange: z.enum(["7d", "30d", "90d", "1y", "all"]).optional().default("30d"),
  })),
  async (c) => {
    const { workspaceId } = c.req.valid("param");
    const { timeRange } = c.req.valid("query");
    
    try {
      const metrics = await getRiskMetrics({
        workspaceId,
        timeRange,
      });
      
      return c.json(metrics);
    } catch (error) {
      logger.error("Risk metrics error:", error);
      return c.json({ error: "Failed to get risk metrics" }, 500);
    }
  }
);

// Get risk trends over time
riskDetection.get(
  "/trends/:workspaceId",
  zValidator("param", z.object({ workspaceId: z.string() })),
  zValidator("query", z.object({
    timeRange: z.enum(["7d", "30d", "90d", "1y", "all"]).optional().default("30d"),
    granularity: z.enum(["daily", "weekly", "monthly"]).optional().default("daily"),
  })),
  async (c) => {
    const { workspaceId } = c.req.valid("param");
    const query = c.req.valid("query");
    
    try {
      const trends = await getRiskTrends({
        workspaceId,
        timeRange: query.timeRange,
        granularity: query.granularity,
      });
      
      return c.json(trends);
    } catch (error) {
      logger.error("Risk trends error:", error);
      return c.json({ error: "Failed to get risk trends" }, 500);
    }
  }
);

// Update risk alert status (acknowledge, resolve, etc.)
riskDetection.patch(
  "/alerts/:alertId",
  zValidator("param", z.object({ alertId: z.string() })),
  zValidator("json", z.object({
    status: z.enum(["active", "acknowledged", "resolved", "dismissed"]),
    notes: z.string().optional(),
  })),
  async (c) => {
    const { alertId } = c.req.valid("param");
    const { status, notes } = c.req.valid("json");
    const userEmail = c.get("userEmail");

    try {
      const updatedAlert = await updateRiskAlert({
        alertId,
        status,
        notes,
        updatedBy: userEmail,
      });

      return c.json(updatedAlert);
    } catch (error) {
      logger.error("Update risk alert error:", error);
      return c.json({ error: "Failed to update risk alert" }, 500);
    }
  }
);

// Get alert history with statistics
riskDetection.get(
  "/history/:workspaceId",
  zValidator("param", z.object({ workspaceId: z.string() })),
  zValidator("query", z.object({
    limit: z.string().optional().default("50").transform(val => parseInt(val, 10)),
    offset: z.string().optional().default("0").transform(val => parseInt(val, 10)),
    status: z.enum(["active", "resolved", "acknowledged", "dismissed"]).optional(),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    alertType: z.enum(["overdue", "blocked", "resource_conflict", "deadline_risk", "dependency_chain", "quality_risk"]).optional(),
  })),
  async (c) => {
    const { workspaceId } = c.req.valid("param");
    const query = c.req.valid("query");

    try {
      logger.info(`📊 Alert history request for workspace: ${workspaceId}`, query);

      const history = await getAlertHistory({
        workspaceId,
        limit: query.limit,
        offset: query.offset,
        status: query.status,
        severity: query.severity,
        alertType: query.alertType,
      });

      return c.json(history);
    } catch (error) {
      logger.error("Alert history error:", error);
      return c.json({ error: "Failed to get alert history" }, 500);
    }
  }
);

// Resolve alert with resolution notes
riskDetection.post(
  "/alerts/:alertId/resolve",
  zValidator("param", z.object({ alertId: z.string() })),
  zValidator("json", z.object({
    workspaceId: z.string(),
    resolutionNotes: z.string().optional(),
  })),
  async (c) => {
    const { alertId } = c.req.valid("param");
    const { workspaceId, resolutionNotes } = c.req.valid("json");
    const userEmail = c.get("userEmail");

    try {
      logger.info(`🔧 Resolving alert: ${alertId} by ${userEmail}`);

      const result = await resolveAlert({
        alertId,
        workspaceId,
        resolvedBy: userEmail,
        resolutionNotes,
      });

      return c.json(result);
    } catch (error) {
      logger.error("Resolve alert error:", error);
      return c.json({ error: "Failed to resolve alert" }, 500);
    }
  }
);

export default riskDetection; 

