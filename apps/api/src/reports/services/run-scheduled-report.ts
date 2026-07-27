import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { scheduledReports, reportExecutions } from "../../database/schema";
import emailService from "../../services/email-service";
import logger from "../../utils/logger";
import { generateReportEmail } from "./generate-report-email";
import { calculateNextRun } from "./calculate-next-run";

export interface RunReportResult {
  sent: boolean;
  recipientCount: number;
  error?: string;
}

/**
 * Generates and sends one scheduled report right now, records the execution,
 * and (for recurring reports) advances nextRunAt. Shared by the manual
 * "run now" route and the cron scheduler so both go through one code path.
 */
export async function runScheduledReport(
  reportId: string,
): Promise<RunReportResult> {
  const db = getDatabase();
  const startedAt = Date.now();

  const [report] = await db
    .select()
    .from(scheduledReports)
    .where(eq(scheduledReports.id, reportId))
    .limit(1);

  if (!report) {
    return { sent: false, recipientCount: 0, error: "Report not found" };
  }

  try {
    const email = await generateReportEmail(
      report.workspaceId,
      report.name,
      (report.sections as string[]) ?? [],
    );

    const recipients = (report.recipients as string[]) ?? [];
    const sent = await emailService.sendHtmlEmail(
      recipients,
      email.subject,
      email.html,
      email.text,
    );

    const now = new Date();
    await db
      .update(scheduledReports)
      .set({
        lastRunAt: now,
        // Only recurring (active) reports get a next run - keeps the
        // isActive ? calculateNextRun(...) : null invariant that
        // create/update-scheduled-report enforce, even when this ran via a
        // manual "run now" on a paused report.
        nextRunAt: report.isActive
          ? calculateNextRun(
              report.frequency,
              report.time,
              report.dayOfWeek,
              report.dayOfMonth,
            )
          : null,
        updatedAt: now,
      })
      .where(eq(scheduledReports.id, reportId));

    await db.insert(reportExecutions).values({
      reportId,
      status: sent ? "success" : "failed",
      error: sent ? null : "Email service is not configured",
      executionTime: Date.now() - startedAt,
    });

    return { sent, recipientCount: recipients.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to run scheduled report ${reportId}:`, error);
    await db.insert(reportExecutions).values({
      reportId,
      status: "failed",
      error: message,
      executionTime: Date.now() - startedAt,
    });
    return { sent: false, recipientCount: 0, error: message };
  }
}
