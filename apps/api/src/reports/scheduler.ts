import * as cron from "node-cron";
import { and, eq, lte } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { scheduledReports } from "../database/schema";
import { runScheduledReport } from "./services/run-scheduled-report";
import logger from "../utils/logger";

class ScheduledReportsScheduler {
  private job: cron.ScheduledTask | null = null;

  public start() {
    // Every 15 minutes: reports are scheduled to the minute in the UI, but
    // running on a coarser tick keeps this cheap - nothing here needs
    // second-level precision.
    this.job = cron.schedule("*/15 * * * *", async () => {
      try {
        await this.processDueReports();
      } catch (error) {
        logger.error("Scheduled reports job failed:", error);
      }
    });

    logger.info(
      "✅ Scheduled reports scheduler started (runs every 15 minutes)",
    );
  }

  private async processDueReports() {
    const db = getDatabase();
    const now = new Date();

    const dueReports = await db
      .select({ id: scheduledReports.id, name: scheduledReports.name })
      .from(scheduledReports)
      .where(
        and(
          eq(scheduledReports.isActive, true),
          lte(scheduledReports.nextRunAt, now),
        ),
      );

    if (dueReports.length === 0) return;

    logger.info(`Running ${dueReports.length} due scheduled report(s)`);

    for (const report of dueReports) {
      try {
        const result = await runScheduledReport(report.id);
        logger.info(
          `Scheduled report "${report.name}" run: sent=${result.sent} recipients=${result.recipientCount}`,
        );
      } catch (error) {
        logger.error(`Failed to run scheduled report "${report.name}":`, error);
      }
    }
  }

  public stop() {
    if (this.job) {
      this.job.stop();
      logger.info("Scheduled reports scheduler stopped");
    }
  }
}

export const scheduledReportsScheduler = new ScheduledReportsScheduler();
