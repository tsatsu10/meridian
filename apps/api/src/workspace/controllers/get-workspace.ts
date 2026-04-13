import { and, eq, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { workspaceTable, workspaceMembers, userTable } from "../../database/schema";
import logger from '../../utils/logger';

async function getWorkspace(userEmail: string, workspaceId: string) {
  logger.debug(`🔍 DEBUG: getWorkspace called with userEmail: ${userEmail}, workspaceId: ${workspaceId}`);

  // Ensure database is initialized
  const { initializeDatabase, getDatabase } = await import("../../database/connection.js");
  await initializeDatabase();
  const db = getDatabase();

  // 🚨 SECURITY: Removed hardcoded admin bypass - all users must have proper workspace access
  
  // First get the user's ID
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
  
  // Check if user has legitimate access to this workspace
  const [existingWorkspace] = await db
    .select({
      id: workspaceTable.id,
      name: workspaceTable.name,
      ownerId: workspaceTable.ownerId,
      ownerEmail: userTable.email,
      description: workspaceTable.description,
      createdAt: workspaceTable.createdAt,
    })
    .from(workspaceTable)
    .leftJoin(
      userTable,
      eq(workspaceTable.ownerId, userTable.id),
    )
    .leftJoin(
      workspaceMembers,
      eq(workspaceTable.id, workspaceMembers.workspaceId),
    )
    .where(
      and(
        eq(workspaceTable.id, workspaceId),
        or(
          eq(workspaceTable.ownerId, user.id),
          eq(workspaceMembers.userEmail, userEmail),
        ),
      ),
    )
    .limit(1);

  const isWorkspaceExisting = Boolean(existingWorkspace);

  if (!isWorkspaceExisting) {
    logger.debug(`🚨 SECURITY: User ${userEmail} attempted unauthorized access to workspace ${workspaceId}`);
    throw new HTTPException(403, {
      message: "Access denied - You do not have access to this workspace",
    });
  }

  logger.debug(`✅ Authorized workspace access: ${existingWorkspace!.name} for user ${userEmail}`);
  return existingWorkspace;
}

export default getWorkspace;

