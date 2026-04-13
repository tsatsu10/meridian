import { and, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceUserTable } from "../../database/schema";

// @epic-3.4-teams: Change workspace user role
async function changeUserRole(
  workspaceId: string,
  userEmail: string,
  role: string
) {
  const db = getDatabase();
  
  const [updatedWorkspaceUser] = await db
    .update(workspaceUserTable)
    .set({ role: role as any }) // Type assertion for enum
    .where(
      and(
        eq(workspaceUserTable.workspaceId, workspaceId),
        eq(workspaceUserTable.userEmail, userEmail)
      )
    )
    .returning();

  return updatedWorkspaceUser;
}

export default changeUserRole;


