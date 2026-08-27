import { and, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceUserTable } from "../../database/schema";
import { ForbiddenError } from "../../utils/errors";

// Every scheduled-reports route is workspace-scoped data; this is the one
// check standing between "logged in" and "logged in AND allowed to touch
// this workspace's reports" - see the IDOR this replaced in reports/index.ts.
export async function verifyWorkspaceMembership(
  workspaceId: string,
  userEmail: string,
): Promise<void> {
  const db = getDatabase();

  const [member] = await db
    .select({ userEmail: workspaceUserTable.userEmail })
    .from(workspaceUserTable)
    .where(
      and(
        eq(workspaceUserTable.workspaceId, workspaceId),
        eq(workspaceUserTable.userEmail, userEmail),
      ),
    )
    .limit(1);

  if (!member) {
    throw new ForbiddenError("You are not a member of this workspace");
  }
}
