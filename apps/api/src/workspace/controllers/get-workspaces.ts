import { eq, or, and, inArray } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceTable, roleAssignmentTable, userTable, workspaceUserTable } from "../../database/schema";
import logger from '../../utils/logger';

async function getWorkspaces(userEmail: string) {
  logger.debug(`🔍 Getting workspaces for user: ${userEmail}`);

  try {
    // Ensure database is initialized before using it
    const { initializeDatabase, getDatabase } = await import("../../database/connection.js");
    await initializeDatabase();
    const db = getDatabase();

    // First get user ID
    const user = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    const userRow = user[0];
    if (!userRow) {
      logger.debug(`❌ User not found: ${userEmail}`);
      return [];
    }

    const userId = userRow.id;

  // 🛡️ SECURITY: Only return workspaces where user has active membership
  const userWorkspaceMemberships = await db
    .select({
      workspaceId: workspaceUserTable.workspaceId,
      role: workspaceUserTable.role,
      status: workspaceUserTable.status,
      joinedAt: workspaceUserTable.joinedAt,
    })
    .from(workspaceUserTable)
    .where(
      and(
        eq(workspaceUserTable.userId, userId),
        eq(workspaceUserTable.status, 'active')
      )
    );

  logger.debug(`👥 Found ${userWorkspaceMemberships.length} active workspace memberships for user ${userEmail}`);

  if (userWorkspaceMemberships.length === 0) {
    logger.debug(`❌ No active workspace memberships found for user ${userEmail}`);
    return [];
  }

  // Get ALL workspace details for the user's memberships
  // ✅ JOIN with userTable to get ownerEmail
  const workspaceIds = userWorkspaceMemberships.map((m: { workspaceId: string }) => m.workspaceId);
  const workspaces = await db
    .select({
      id: workspaceTable.id,
      name: workspaceTable.name,
      description: workspaceTable.description,
      ownerId: workspaceTable.ownerId,
      ownerEmail: userTable.email, // ✅ Get email from joined user table
      createdAt: workspaceTable.createdAt,
      updatedAt: workspaceTable.updatedAt,
    })
    .from(workspaceTable)
    .leftJoin(userTable, eq(workspaceTable.ownerId, userTable.id))
    .where(inArray(workspaceTable.id, workspaceIds));

  logger.debug(`🔍 Found ${workspaces.length} workspace records for user ${userEmail}`);

  if (workspaces.length === 0) {
    logger.debug(`❌ No workspace details found for user ${userEmail}`);
    return [];
  }

  // Return ALL workspaces with their membership info
  const results = workspaces.map((workspace: any) => {
    const membership = userWorkspaceMemberships.find((m: { workspaceId: string }) => m.workspaceId === workspace.id);

    return {
      id: workspace.id,
      name: workspace.name,
      ownerId: workspace.ownerId,
      ownerEmail: workspace.ownerEmail, // ✅ FIXED: Return actual ownerEmail from database
      createdAt: workspace.createdAt,
      description: workspace.description,
      userRole: membership?.role || 'member',
      status: membership?.status || 'active',
      joinedAt: membership?.joinedAt || null,
    };
  });

  logger.debug(`✅ Returning ${results.length} workspaces for user ${userEmail}`);

  return results;

  } catch (error) {
    logger.error(`❌ Error in getWorkspaces for ${userEmail}:`, error);
    throw error;
  }
}

export default getWorkspaces;

