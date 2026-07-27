import { and, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { scheduledReports } from "../../database/schema";
import { verifyWorkspaceMembership } from "../utils/verify-workspace-membership";
import { NotFoundError } from "../../utils/errors";

export default async function deleteScheduledReport(
  workspaceId: string,
  userEmail: string,
  reportId: string,
) {
  await verifyWorkspaceMembership(workspaceId, userEmail);

  const db = getDatabase();
  const [deleted] = await db
    .delete(scheduledReports)
    .where(
      and(
        eq(scheduledReports.id, reportId),
        eq(scheduledReports.workspaceId, workspaceId),
      ),
    )
    .returning();

  if (!deleted) {
    throw new NotFoundError("Scheduled report");
  }

  return deleted;
}
