import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { workspaceTable, userTable } from "../../database/schema";

async function deleteWorkspace(userEmail: string, workspaceId: string) {
  const db = getDatabase();

  // First get the user ID from email
  const [user] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, userEmail))
    .limit(1);

  if (!user) {
    throw new HTTPException(403, {
      message: "User not found",
    });
  }

  // Check if workspace exists and user is the owner
  const [existingWorkspace] = await db
    .select({
      id: workspaceTable.id,
      ownerId: workspaceTable.ownerId,
    })
    .from(workspaceTable)
    .where(
      and(
        eq(workspaceTable.id, workspaceId),
        eq(workspaceTable.ownerId, user.id),
      ),
    )
    .limit(1);

  const isWorkspaceExisting = Boolean(existingWorkspace);

  if (!isWorkspaceExisting) {
    throw new HTTPException(404, {
      message: "Workspace not found or you don't have permission to delete it",
    });
  }

  const [deletedWorkspace] = await db
    .delete(workspaceTable)
    .where(eq(workspaceTable.id, workspaceId))
    .returning({
      id: workspaceTable.id,
      name: workspaceTable.name,
      ownerId: workspaceTable.ownerId,
      createdAt: workspaceTable.createdAt,
    });

  return deletedWorkspace;
}

export default deleteWorkspace;

