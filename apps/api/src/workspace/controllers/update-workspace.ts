import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { workspaceTable, userTable } from "../../database/schema";

async function updateWorkspace(
  userEmail: string,
  workspaceId: string,
  name: string,
  description: string,
) {
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
      message: "Workspace not found or you don't have permission to update it",
    });
  }

  const [updatedWorkspace] = await db
    .update(workspaceTable)
    .set({
      name,
      description,
    })
    .where(eq(workspaceTable.id, workspaceId))
    .returning({
      id: workspaceTable.id,
      name: workspaceTable.name,
      ownerId: workspaceTable.ownerId,
      description: workspaceTable.description,
      createdAt: workspaceTable.createdAt,
    });

  if (!updatedWorkspace) {
    throw new HTTPException(500, {
      message: "Failed to update workspace",
    });
  }

  // Get owner email for response
  const [ownerUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, updatedWorkspace.ownerId))
    .limit(1);

  return {
    ...updatedWorkspace,
    ownerEmail: ownerUser?.email || userEmail,
  };
}

export default updateWorkspace;

