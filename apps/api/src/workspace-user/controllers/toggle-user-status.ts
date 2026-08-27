import { and, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceUserTable } from "../../database/schema";
import { NotFoundError } from "../../core/ErrorHandler";

// @epic-3.4-teams: Toggle workspace user status (active/inactive)
async function toggleUserStatus(workspaceId: string, userEmail: string) {
  const db = getDatabase();

  // Get current status
  const [currentUser] = await db
    .select()
    .from(workspaceUserTable)
    .where(
      and(
        eq(workspaceUserTable.workspaceId, workspaceId),
        eq(workspaceUserTable.userEmail, userEmail),
      ),
    );

  if (!currentUser) {
    throw new NotFoundError("User");
  }

  const newStatus = currentUser.status === "active" ? "inactive" : "active";

  const [updatedWorkspaceUser] = await db
    .update(workspaceUserTable)
    .set({ status: newStatus })
    .where(
      and(
        eq(workspaceUserTable.workspaceId, workspaceId),
        eq(workspaceUserTable.userEmail, userEmail),
      ),
    )
    .returning();

  return updatedWorkspaceUser;
}

export default toggleUserStatus;
