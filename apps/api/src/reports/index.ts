import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../middlewares/secure-auth";
import logger from "../utils/logger";
import listScheduledReports from "./controllers/list-scheduled-reports";
import createScheduledReport from "./controllers/create-scheduled-report";
import updateScheduledReport from "./controllers/update-scheduled-report";
import deleteScheduledReport from "./controllers/delete-scheduled-report";
import runScheduledReportNow from "./controllers/run-scheduled-report-now";

const reportsRoutes = new Hono<{ Variables: { userEmail: string } }>();

const scheduleBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  time: z.string().default("09:00"),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  format: z.enum(["pdf", "excel", "csv"]),
  recipients: z.array(z.string().email()).min(1),
  sections: z.array(z.string()).min(1),
  isActive: z.boolean().default(true),
});

// List scheduled reports for a workspace
reportsRoutes.get(
  "/scheduled/:workspaceId",
  authMiddleware(),
  zValidator("param", z.object({ workspaceId: z.string() })),
  async (c) => {
    const { workspaceId } = c.req.valid("param");
    const userEmail = c.get("userEmail");
    const reports = await listScheduledReports(workspaceId, userEmail);
    return c.json({ data: reports });
  },
);

// Create a scheduled report
reportsRoutes.post(
  "/scheduled/:workspaceId",
  authMiddleware(),
  zValidator("param", z.object({ workspaceId: z.string() })),
  zValidator("json", scheduleBody),
  async (c) => {
    const { workspaceId } = c.req.valid("param");
    const userEmail = c.get("userEmail");
    const body = c.req.valid("json");

    const created = await createScheduledReport({
      workspaceId,
      createdBy: userEmail,
      ...body,
    });

    return c.json({ data: created }, 201);
  },
);

// Update a scheduled report
reportsRoutes.put(
  "/scheduled/:workspaceId/:reportId",
  authMiddleware(),
  zValidator(
    "param",
    z.object({ workspaceId: z.string(), reportId: z.string() }),
  ),
  zValidator("json", scheduleBody.partial()),
  async (c) => {
    const { workspaceId, reportId } = c.req.valid("param");
    const userEmail = c.get("userEmail");
    const body = c.req.valid("json");

    const updated = await updateScheduledReport({
      workspaceId,
      userEmail,
      reportId,
      ...body,
    });

    return c.json({ data: updated });
  },
);

// Delete a scheduled report
reportsRoutes.delete(
  "/scheduled/:workspaceId/:reportId",
  authMiddleware(),
  zValidator(
    "param",
    z.object({ workspaceId: z.string(), reportId: z.string() }),
  ),
  async (c) => {
    const { workspaceId, reportId } = c.req.valid("param");
    const userEmail = c.get("userEmail");

    await deleteScheduledReport(workspaceId, userEmail, reportId);

    return c.json({ message: "Report deleted successfully" });
  },
);

// Run a scheduled report right now
reportsRoutes.post(
  "/scheduled/:workspaceId/:reportId/run",
  authMiddleware(),
  zValidator(
    "param",
    z.object({ workspaceId: z.string(), reportId: z.string() }),
  ),
  async (c) => {
    const { workspaceId, reportId } = c.req.valid("param");
    const userEmail = c.get("userEmail");

    const result = await runScheduledReportNow(
      workspaceId,
      userEmail,
      reportId,
    );

    if (!result.sent) {
      logger.debug(
        `Scheduled report ${reportId} run but not sent:`,
        result.error,
      );
    }

    return c.json({ data: result });
  },
);

export default reportsRoutes;
