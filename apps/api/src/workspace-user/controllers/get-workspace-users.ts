import { asc, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userTable, workspaceUserTable } from "../../database/schema";
import { dedupeWorkspaceUserListRows } from "./dedupe-workspace-member-rows";

async function getWorkspaceUsers(workspaceId: string) {
  const db = getDatabase();
  const rows = await db
    .select({
      id: userTable.id,
      email: workspaceUserTable.userEmail,
      name: userTable.name,
      avatar: userTable.avatar,
      joinedAt: workspaceUserTable.joinedAt,
      status: workspaceUserTable.status,
      role: workspaceUserTable.role,
    })
    .from(workspaceUserTable)
    .leftJoin(userTable, eq(workspaceUserTable.userEmail, userTable.email))
    .where(eq(workspaceUserTable.workspaceId, workspaceId))
    .orderBy(asc(workspaceUserTable.status));

  return dedupeWorkspaceUserListRows(rows);
}

export default getWorkspaceUsers;
