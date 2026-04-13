import { Hono } from "hono";
import { authMiddleware } from "../middlewares/secure-auth";
import { getDatabase } from "../database/connection";
import { scheduledReports, reportExecutions } from "../database/schema";
import { eq, desc } from "drizzle-orm";
import logger from '../utils/logger';

const reportsRoutes = new Hono();

// Get scheduled reports
reportsRoutes.get("/scheduled", authMiddleware, async (c) => {
  try {
    const db = getDatabase();

    // Fetch all scheduled reports from database
    const dbReports = await db
      .select()
      .from(scheduledReports)
      .orderBy(desc(scheduledReports.createdAt));

    // Transform to API format
    const reports = dbReports.map((report) => ({
      id: report.id.toString(),
      name: report.name,
      description: report.description,
      reportType: report.reportType,
      schedule: report.schedule ? JSON.parse(report.schedule) : {},
      recipients: report.recipients ? JSON.parse(report.recipients) : [],
      format: report.format,
      enabled: report.enabled,
      lastRun: report.lastRun,
      nextRun: report.nextRun,
      runCount: report.runCount,
      createdAt: report.createdAt,
      createdBy: report.createdBy || "System",
    }));

    return c.json({ data: reports });
  } catch (error) {
    logger.error("Error fetching scheduled reports:", error);
    return c.json({ error: "Failed to fetch scheduled reports" }, 500);
  }
});

// Create scheduled report
reportsRoutes.post("/schedule", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const body = await c.req.json();

    const newReport = await db
      .insert(scheduledReports)
      .values({
        name: body.name,
        description: body.description,
        reportType: body.reportType,
        schedule: JSON.stringify(body.schedule),
        recipients: JSON.stringify(body.recipients),
        format: body.format || "pdf",
        enabled: body.enabled !== false,
        createdBy: body.createdBy || "User",
        runCount: 0,
      })
      .returning();

    return c.json({ data: newReport[0] }, 201);
  } catch (error) {
    logger.error("Error creating scheduled report:", error);
    return c.json({ error: "Failed to create scheduled report" }, 500);
  }
});

// Update scheduled report
reportsRoutes.put("/schedule/:id", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const { id } = c.req.param();
    const body = await c.req.json();

    const updated = await db
      .update(scheduledReports)
      .set({
        name: body.name,
        description: body.description,
        reportType: body.reportType,
        schedule: body.schedule ? JSON.stringify(body.schedule) : undefined,
        recipients: body.recipients ? JSON.stringify(body.recipients) : undefined,
        format: body.format,
        enabled: body.enabled,
      })
      .where(eq(scheduledReports.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return c.json({ error: "Report not found" }, 404);
    }

    return c.json({ data: updated[0] });
  } catch (error) {
    logger.error("Error updating scheduled report:", error);
    return c.json({ error: "Failed to update scheduled report" }, 500);
  }
});

// Delete scheduled report
reportsRoutes.delete("/schedule/:id", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const { id } = c.req.param();

    const deleted = await db
      .delete(scheduledReports)
      .where(eq(scheduledReports.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return c.json({ error: "Report not found" }, 404);
    }

    return c.json({ message: "Report deleted successfully" });
  } catch (error) {
    logger.error("Error deleting scheduled report:", error);
    return c.json({ error: "Failed to delete scheduled report" }, 500);
  }
});

// Run report now
reportsRoutes.post("/send-now", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const { reportId } = await c.req.json();

    // Create execution record
    const execution = await db
      .insert(reportExecutions)
      .values({
        reportId: parseInt(reportId),
        status: "pending",
        startedAt: new Date(),
      })
      .returning();

    // In production, this would trigger actual report generation
    // For now, just return success
    return c.json({
      success: true,
      data: {
        executionId: execution[0].id,
        reportId,
        message: "Report generation started",
        estimatedTime: "2-5 minutes",
      },
    });
  } catch (error) {
    logger.error("Error running report:", error);
    return c.json({ error: "Failed to run report" }, 500);
  }
});

// Keep old endpoints for backward compatibility (deprecated)
reportsRoutes.get("/scheduled-old", authMiddleware, async (c) => {
  try {
    // Legacy mock data for backward compatibility
    const reports = [
      {
        id: "report-1",
        name: "Weekly Team Summary",
        description: "Comprehensive overview of team tasks and progress",
        reportType: "tasks",
        schedule: {
          frequency: "weekly",
          time: "09:00",
          dayOfWeek: 1, // Monday
        },
        recipients: ["manager@example.com", "team-lead@example.com"],
        format: "pdf",
        enabled: true,
        lastRun: new Date("2024-10-21T09:00:00"),
        nextRun: new Date("2024-10-28T09:00:00"),
        runCount: 24,
        createdAt: new Date("2024-05-01"),
        createdBy: "Admin",
      },
      {
        id: "report-2",
        name: "Monthly Project Status",
        description: "Detailed project metrics and milestones",
        reportType: "projects",
        schedule: {
          frequency: "monthly",
          time: "08:00",
          dayOfMonth: 1,
        },
        recipients: ["exec@example.com", "pm@example.com"],
        format: "excel",
        enabled: true,
        lastRun: new Date("2024-10-01T08:00:00"),
        nextRun: new Date("2024-11-01T08:00:00"),
        runCount: 6,
        createdAt: new Date("2024-05-15"),
        createdBy: "Admin",
      },
      {
        id: "report-3",
        name: "Daily Time Tracking",
        description: "Daily time entry summary by team member",
        reportType: "time",
        schedule: {
          frequency: "daily",
          time: "18:00",
        },
        recipients: ["hr@example.com", "finance@example.com"],
        format: "csv",
        enabled: true,
        lastRun: new Date("2024-10-26T18:00:00"),
        nextRun: new Date("2024-10-27T18:00:00"),
        runCount: 156,
        createdAt: new Date("2024-05-01"),
        createdBy: "Admin",
      },
      {
        id: "report-4",
        name: "Quarterly Analytics Dashboard",
        description: "Comprehensive business intelligence report",
        reportType: "analytics",
        schedule: {
          frequency: "custom",
          time: "07:00",
          cron: "0 7 1 */3 *", // First day of every 3 months
        },
        recipients: ["ceo@example.com", "cfo@example.com", "coo@example.com"],
        format: "pdf",
        enabled: false,
        lastRun: new Date("2024-07-01T07:00:00"),
        nextRun: new Date("2025-01-01T07:00:00"),
        runCount: 2,
        createdAt: new Date("2024-01-15"),
        createdBy: "Admin",
      },
    ];

    return c.json({ data: reports });
  } catch (error) {
    logger.error("Error fetching scheduled reports:", error);
    return c.json({ error: "Failed to fetch scheduled reports" }, 500);
  }
});

// Toggle report enabled status
reportsRoutes.post("/scheduled/:reportId/toggle", authMiddleware, async (c) => {
  try {
    const { reportId } = c.req.param();
    const { enabled } = await c.req.json();

    // In production, update the report in the database
    logger.debug(`Toggling report ${reportId} to ${enabled ? "enabled" : "disabled"}`);

    return c.json({
      success: true,
      data: { reportId, enabled },
    });
  } catch (error) {
    logger.error("Error toggling report:", error);
    return c.json({ error: "Failed to toggle report" }, 500);
  }
});

// Delete scheduled report
reportsRoutes.delete("/scheduled/:reportId", authMiddleware, async (c) => {
  try {
    const { reportId } = c.req.param();

    // In production, delete the report from the database
    logger.debug(`Deleting report ${reportId}`);

    return c.json({
      success: true,
      data: { reportId },
    });
  } catch (error) {
    logger.error("Error deleting report:", error);
    return c.json({ error: "Failed to delete report" }, 500);
  }
});

// Run report now
reportsRoutes.post("/scheduled/:reportId/run", authMiddleware, async (c) => {
  try {
    const { reportId } = c.req.param();

    // In production, trigger report generation and email sending
    logger.debug(`Running report ${reportId} now`);

    return c.json({
      success: true,
      data: {
        reportId,
        message: "Report generation started",
        estimatedTime: "2-5 minutes",
      },
    });
  } catch (error) {
    logger.error("Error running report:", error);
    return c.json({ error: "Failed to run report" }, 500);
  }
});

export default reportsRoutes;

