import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceUserTable, roleAssignmentTable, userTable } from "../../database/schema";
import logger from '../../utils/logger';

async function createRootWorkspaceUser(workspaceId: string, userEmail: string) {
  const db = getDatabase();
  // Get the user ID first - needed for both workspace_user and RBAC assignment
  const [user] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, userEmail))
    .limit(1);

  if (!user) {
    logger.error(`❌ Cannot create workspace user: User not found for email ${userEmail}`);
    return null;
  }

  // Create workspace user entry with "admin" role (highest level in user_role enum)
  const [workspaceUser] = await db
    .insert(workspaceUserTable)
    .values({
      workspaceId,
      userId: user.id, // Fixed: add userId from lookup
      userEmail,
      role: "admin", // Fixed: use valid enum value (admin, manager, member, viewer)
      status: "active",
    })
    .returning();

  if (workspaceUser) {
    // Assign workspace-manager role in RBAC system
    const assignmentId = createId();
    
    await db.insert(roleAssignmentTable).values({
      id: assignmentId,
      userId: user.id,
      role: "workspace-manager",
      workspaceId: workspaceId,
      isActive: true,
      assignedAt: new Date(),
    });

    // TODO: Record in role history when roleHistoryTable is created
    // Role history table doesn't exist in schema yet

    logger.debug(`🛡️ Auto-assigned workspace-manager role to workspace creator: ${userEmail}`);
  }

  return workspaceUser;
}

export default createRootWorkspaceUser;

