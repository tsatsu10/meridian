import { Hono } from "hono";
import { getDatabase } from "../database/connection";
import { projectHealthTable, healthHistoryTable, healthRecommendationsTable } from "../database/schema";
import { eq, desc, gte } from "drizzle-orm";
import { calculateProjectHealth } from "./calculate-project-health";
import { generateRecommendations } from "./recommendation-engine";
import logger from '../utils/logger';

const healthRoute = new Hono();

/**
 * GET /api/health
 * Root endpoint - API documentation and system health check
 */
healthRoute.get("/", async (c) => {
  return c.json({
    message: "Project Health API",
    version: "1.0.0",
    status: "operational",
    endpoints: {
      "GET /projects/:projectId": "Get current health metrics for a project",
      "GET /projects/:projectId/history": "Get historical health data (supports ?days=30)",
      "GET /projects/:projectId/recommendations": "Get AI-generated recommendations",
      "GET /comparison": "Compare health across projects (requires ?projectIds=id1,id2)",
      "POST /projects/:projectId/refresh": "Force recalculation of metrics"
    },
    examples: {
      getProjectHealth: "/api/health/projects/project-id-123",
      getHistory: "/api/health/projects/project-id-123/history?days=30",
      compareProjects: "/api/health/comparison?projectIds=id1,id2,id3"
    }
  });
});

/**
 * GET /api/health/projects/:projectId
 * Get current health metrics for a specific project
 * Includes 5-minute caching to avoid excessive recalculations
 */
healthRoute.get("/projects/:projectId", async (c) => {
  try {
    const db = getDatabase(); // FIX: Initialize database connection
    const { projectId } = c.req.param();

    if (!projectId) {
      return c.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Check if health metrics exist and are recent (< 5 min)
    const existingHealth = await db
      .select()
      .from(projectHealthTable)
      .where(eq(projectHealthTable.projectId, projectId))
      .then((rows: any[]) => rows[0]);

    const now = new Date();
    const cacheExpired = !existingHealth ||
      !existingHealth.cachedAt ||
      (now.getTime() - new Date(existingHealth.cachedAt).getTime()) > 5 * 60 * 1000;

    if (!cacheExpired && existingHealth) {
      return c.json(existingHealth);
    }

    // Calculate fresh metrics
    const projectMetrics = await calculateProjectHealth(projectId);

    if (!projectMetrics) {
      return c.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Store/update metrics in database
    if (existingHealth) {
      await db
        .update(projectHealthTable)
        .set({
          score: projectMetrics.score,
          status: projectMetrics.status,
          trend: projectMetrics.trend,
          completionRate: projectMetrics.factors.completionRate,
          timelineHealth: projectMetrics.factors.timelineHealth,
          taskHealth: projectMetrics.factors.taskHealth,
          resourceAllocation: projectMetrics.factors.resourceAllocation,
          riskLevel: projectMetrics.factors.riskLevel,
          cachedAt: now,
          updatedAt: now,
        })
        .where(eq(projectHealthTable.id, existingHealth.id));
    } else {
      await db.insert(projectHealthTable).values({
        projectId,
        score: projectMetrics.score,
        status: projectMetrics.status,
        trend: projectMetrics.trend,
        completionRate: projectMetrics.factors.completionRate,
        timelineHealth: projectMetrics.factors.timelineHealth,
        taskHealth: projectMetrics.factors.taskHealth,
        resourceAllocation: projectMetrics.factors.resourceAllocation,
        riskLevel: projectMetrics.factors.riskLevel,
        cachedAt: now,
      });
    }

    // Record in history
    await db.insert(healthHistoryTable).values({
      projectId,
      score: projectMetrics.score,
      status: projectMetrics.status,
      completionRate: projectMetrics.factors.completionRate,
      timelineHealth: projectMetrics.factors.timelineHealth,
      taskHealth: projectMetrics.factors.taskHealth,
      resourceAllocation: projectMetrics.factors.resourceAllocation,
      riskLevel: projectMetrics.factors.riskLevel,
      recordedAt: now,
    });

    return c.json({
      ...projectMetrics,
      projectId,
      cachedAt: now.toISOString(),
    });
  } catch (error) {
    logger.error("Error fetching project health:", error);
    return c.json(
      { error: "Failed to fetch project health" },
      { status: 500 }
    );
  }
});

/**
 * GET /api/health/projects/:projectId/history
 * Get historical health data for a project
 * Supports time range filtering via ?days=30 query parameter
 */
healthRoute.get("/projects/:projectId/history", async (c) => {
  try {
    const db = getDatabase(); // FIX: Initialize database connection
    const { projectId } = c.req.param();
    const daysParam = c.req.query("days") || "30";
    const days = parseInt(daysParam);

    if (!projectId) {
      return c.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    if (isNaN(days) || days < 1 || days > 365) {
      return c.json(
        { error: "Invalid days parameter (1-365)" },
        { status: 400 }
      );
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Query history
    const history = await db
      .select()
      .from(healthHistoryTable)
      .where(
        gte(healthHistoryTable.recordedAt, cutoffDate) &&
        eq(healthHistoryTable.projectId, projectId)
      )
      .orderBy(desc(healthHistoryTable.recordedAt));

    // Format for frontend charting
    const formattedHistory = history.map((h: any) => ({
      date: new Date(h.recordedAt).toISOString().split("T")[0],
      score: h.score,
      status: h.status,
      completionRate: h.completionRate,
      timelineHealth: h.timelineHealth,
      taskHealth: h.taskHealth,
      resourceAllocation: h.resourceAllocation,
      riskLevel: h.riskLevel,
      timestamp: h.recordedAt.toISOString(),
    }));

    return c.json({
      projectId,
      days,
      dataPoints: formattedHistory.length,
      history: formattedHistory,
    });
  } catch (error) {
    logger.error("Error fetching health history:", error);
    return c.json(
      { error: "Failed to fetch health history" },
      { status: 500 }
    );
  }
});

/**
 * GET /api/health/projects/:projectId/recommendations
 * Get AI-generated recommendations for a project
 */
healthRoute.get("/projects/:projectId/recommendations", async (c) => {
  try {
    const db = getDatabase(); // FIX: Initialize database connection
    const { projectId } = c.req.param();

    if (!projectId) {
      return c.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Calculate fresh metrics
    const projectMetrics = await calculateProjectHealth(projectId);

    if (!projectMetrics) {
      return c.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Generate recommendations
    const recommendations = generateRecommendations(projectMetrics);

    // Store in database
    const now = new Date();
    for (const rec of recommendations) {
      await db
        .insert(healthRecommendationsTable)
        .values({
          projectId,
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          category: rec.category,
          actionItems: rec.actionItems,
          estimatedImpact: rec.estimatedImpact,
        })
        .catch(() => {}); // Ignore duplicates
    }

    return c.json({
      projectId,
      generatedAt: now.toISOString(),
      count: recommendations.length,
      recommendations,
    });
  } catch (error) {
    logger.error("Error generating recommendations:", error);
    return c.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
});

/**
 * GET /api/health/comparison
 * Compare health metrics across multiple projects
 * Accepts ?projectIds=id1,id2,id3 query parameter
 */
healthRoute.get("/comparison", async (c) => {
  try {
    const projectIdsParam = c.req.query("projectIds");

    if (!projectIdsParam) {
      return c.json(
        { error: "projectIds query parameter is required" },
        { status: 400 }
      );
    }

    const projectIds = projectIdsParam.split(",").map((id) => id.trim());

    if (projectIds.length === 0 || projectIds.length > 10) {
      return c.json(
        { error: "Provide between 1 and 10 project IDs" },
        { status: 400 }
      );
    }

    // Calculate metrics for all projects
    const healthMetrics = await Promise.all(
      projectIds.map((id) => calculateProjectHealth(id))
    );

    const validMetrics = healthMetrics.filter((m): m is typeof healthMetrics[0] => m !== null);

    if (validMetrics.length === 0) {
      return c.json(
        { error: "No valid projects found" },
        { status: 404 }
      );
    }

    // Calculate aggregated statistics
    const averageScore =
      validMetrics.reduce((sum, m) => sum + (m?.score || 0), 0) / validMetrics.length;

    const bestProject = validMetrics.reduce((best, m) =>
      m && m.score > (best?.score || 0) ? m : best
    );

    const worstProject = validMetrics.reduce((worst, m) =>
      m && m.score < (worst?.score || 100) ? m : worst
    );

    return c.json({
      comparisonDate: new Date().toISOString(),
      projectCount: validMetrics.length,
      averageScore: Math.round(averageScore),
      bestScore: bestProject?.score || 0,
      worstScore: worstProject?.score || 0,
      metrics: validMetrics.map((m, idx) => ({
        projectId: projectIds[idx],
        score: m?.score,
        status: m?.status,
        trend: m?.trend,
      })),
      summary: {
        excellent: validMetrics.filter((m) => m?.status === "excellent").length,
        good: validMetrics.filter((m) => m?.status === "good").length,
        fair: validMetrics.filter((m) => m?.status === "fair").length,
        critical: validMetrics.filter((m) => m?.status === "critical").length,
      },
    });
  } catch (error) {
    logger.error("Error comparing project health:", error);
    return c.json(
      { error: "Failed to compare project health" },
      { status: 500 }
    );
  }
});

/**
 * POST /api/health/projects/:projectId/refresh
 * Force recalculation of project health metrics (bypass cache)
 */
healthRoute.post("/projects/:projectId/refresh", async (c) => {
  try {
    const db = getDatabase(); // FIX: Initialize database connection
    const { projectId } = c.req.param();

    if (!projectId) {
      return c.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Force calculate fresh metrics
    const projectMetrics = await calculateProjectHealth(projectId);

    if (!projectMetrics) {
      return c.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const now = new Date();

    // Update or create health record
    const existingHealth = await db
      .select()
      .from(projectHealthTable)
      .where(eq(projectHealthTable.projectId, projectId))
      .then((rows: any[]) => rows[0]);

    if (existingHealth) {
      await db
        .update(projectHealthTable)
        .set({
          score: projectMetrics.score,
          status: projectMetrics.status,
          trend: projectMetrics.trend,
          completionRate: projectMetrics.factors.completionRate,
          timelineHealth: projectMetrics.factors.timelineHealth,
          taskHealth: projectMetrics.factors.taskHealth,
          resourceAllocation: projectMetrics.factors.resourceAllocation,
          riskLevel: projectMetrics.factors.riskLevel,
          cachedAt: now,
          updatedAt: now,
        })
        .where(eq(projectHealthTable.id, existingHealth.id));
    } else {
      await db.insert(projectHealthTable).values({
        projectId,
        score: projectMetrics.score,
        status: projectMetrics.status,
        trend: projectMetrics.trend,
        completionRate: projectMetrics.factors.completionRate,
        timelineHealth: projectMetrics.factors.timelineHealth,
        taskHealth: projectMetrics.factors.taskHealth,
        resourceAllocation: projectMetrics.factors.resourceAllocation,
        riskLevel: projectMetrics.factors.riskLevel,
        cachedAt: now,
      });
    }

    // Record in history
    await db.insert(healthHistoryTable).values({
      projectId,
      score: projectMetrics.score,
      status: projectMetrics.status,
      completionRate: projectMetrics.factors.completionRate,
      timelineHealth: projectMetrics.factors.timelineHealth,
      taskHealth: projectMetrics.factors.taskHealth,
      resourceAllocation: projectMetrics.factors.resourceAllocation,
      riskLevel: projectMetrics.factors.riskLevel,
      recordedAt: now,
    });

    return c.json({
      ...projectMetrics,
      projectId,
      refreshedAt: now.toISOString(),
      message: "Health metrics refreshed successfully",
    });
  } catch (error) {
    logger.error("Error refreshing project health:", error);
    return c.json(
      { error: "Failed to refresh project health" },
      { status: 500 }
    );
  }
});

export default healthRoute;

