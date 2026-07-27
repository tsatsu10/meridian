import { and, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { scheduledReports } from "../../database/schema";
import { verifyWorkspaceMembership } from "../utils/verify-workspace-membership";
import { runScheduledReport } from "../services/run-scheduled-report";
import { NotFoundError } from "../../utils/errors";

export default async function runScheduledReportNow(
  workspaceId: string,
  userEmail: string,
  reportId: string,
) {
  await verifyWorkspaceMembership(workspaceId, userEmail);

  const db = getDatabase();
  const [report] = await db
    .select({ id: scheduledReports.id })
    .from(scheduledReports)
    .where(
      and(
        eq(scheduledReports.id, reportId),
        eq(scheduledReports.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!report) {
    throw new NotFoundError("Scheduled report");
  }

  return runScheduledReport(reportId);
}
