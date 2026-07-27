import { desc, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { scheduledReports } from "../../database/schema";
import { verifyWorkspaceMembership } from "../utils/verify-workspace-membership";

export default async function listScheduledReports(
  workspaceId: string,
  userEmail: string,
) {
  await verifyWorkspaceMembership(workspaceId, userEmail);

  const db = getDatabase();
  return db
    .select()
    .from(scheduledReports)
    .where(eq(scheduledReports.workspaceId, workspaceId))
    .orderBy(desc(scheduledReports.createdAt));
}
