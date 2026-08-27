import { asc, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userTable, workspaceUserTable } from "../../database/schema";
import { dedupeWorkspaceUserListRows } from "./dedupe-workspace-member-rows";

async function getWorkspaceUsers(workspaceId: string) {
  const db = getDatabase();
  const rows = await db
    .select({
      id: userTable.id,
      // change-member-role/remove-member operate on workspace_user.id, a
      // different id space than userTable.id above - expose it separately
      // rather than repurposing `id` (other consumers already rely on it
      // meaning the user's id).
      workspaceUserId: workspaceUserTable.id,
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
