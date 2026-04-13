import { and, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userTable, workspaceUserTable } from "../../database/schema";
import { dedupeByUserEmail } from "./dedupe-workspace-member-rows";

async function getActiveWorkspaceUsers(workspaceId: string) {
  const db = getDatabase();
  const activeWorkspaceUsers = await db
    .select({
      id: workspaceUserTable.id,
      userEmail: workspaceUserTable.userEmail,
      userName: userTable.name,
      role: workspaceUserTable.role,
      status: workspaceUserTable.status,
    })
    .from(workspaceUserTable)
    .where(
      and(
        eq(workspaceUserTable.workspaceId, workspaceId),
        eq(workspaceUserTable.status, "active"),
      ),
    )
    .innerJoin(userTable, eq(workspaceUserTable.userEmail, userTable.email));

  return dedupeByUserEmail(activeWorkspaceUsers);
}

export default getActiveWorkspaceUsers;

