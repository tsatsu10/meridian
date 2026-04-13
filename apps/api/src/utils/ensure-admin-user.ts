import { createId } from "@paralleldrive/cuid2";
import bcrypt from "bcrypt";
import { eq, and } from "drizzle-orm";
import { getDatabase, initializeDatabase } from "../database/connection";
import { userTable, roleAssignmentTable, workspaceTable, workspaceUserTable } from "../database/schema";
import { appSettings } from "../config/settings";
import logger from '../utils/logger';

export async function ensureAdminUser() {
  const adminEmail = appSettings.adminEmail;

  // Ensure database is initialized
  await initializeDatabase();

  // Check if admin user already exists
  const [existingUser] = await getDatabase()
    .select()
    .from(userTable)
    .where(eq(userTable.email, adminEmail))
    .limit(1);

  if (existingUser) {
    logger.debug(`✅ Admin user already exists: ${adminEmail}`);
    
    // CRITICAL FIX: Ensure existing admin has workspace membership
    // Check if user has any workspace memberships
    const [workspaceMembership] = await getDatabase()
      .select()
      .from(workspaceUserTable)
      .where(eq(workspaceUserTable.userId, existingUser.id))
      .limit(1);

    if (!workspaceMembership) {
      logger.debug(`⚠️  Existing admin user has no workspace membership, creating one...`);
      
      // Get or create a workspace
      let [workspace] = await getDatabase()
        .select()
        .from(workspaceTable)
        .limit(1);

      if (!workspace) {
        const workspaceId = createId();
        await getDatabase().insert(workspaceTable).values({
          id: workspaceId,
          name: "Main Workspace",
          description: "Default workspace",
          ownerId: existingUser.id,
        });

        [workspace] = await getDatabase()
          .select()
          .from(workspaceTable)
          .where(eq(workspaceTable.id, workspaceId))
          .limit(1);
      }

      // Create workspace_user entry AND role_assignment (WebSocket requires both!)
      if (workspace) {
        await getDatabase().insert(workspaceUserTable).values({
          workspaceId: workspace.id,
          userId: existingUser.id,
          userEmail: adminEmail,
          role: "admin", // Using 'admin' from user_role enum: ['admin', 'manager', 'member', 'viewer']
          status: "active",
          joinedAt: new Date(),
          invitedBy: existingUser.id,
        });

        // CRITICAL: Also create role_assignment for WebSocket access (if not exists)
        const existingRoleAssignment = await getDatabase()
          .select()
          .from(roleAssignmentTable)
          .where(
            and(
              eq(roleAssignmentTable.userId, existingUser.id),
              eq(roleAssignmentTable.workspaceId, workspace.id),
              eq(roleAssignmentTable.isActive, true)
            )
          )
          .limit(1);

        if (!existingRoleAssignment.length) {
          const roleAssignmentId = createId();
          await getDatabase().insert(roleAssignmentTable).values({
            id: roleAssignmentId,
            userId: existingUser.id,
            role: "workspace-manager",
            assignedAt: new Date(),
            isActive: true,
            workspaceId: workspace.id,
          });
          logger.debug(`✅ Created role_assignment for WebSocket access`);
        } else {
          logger.debug(`ℹ️  Role assignment already exists for workspace`);
        }

        logger.debug(`✅ Created workspace membership for existing admin user in workspace: ${workspace.name}`);
      }
    }
    
    return existingUser;
  }

  logger.debug(`🔧 Creating admin user: ${adminEmail}`);
  
  // Create admin user
  const adminId = createId();
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await getDatabase().insert(userTable).values({
    id: adminId,
    name: "Admin User",
    email: adminEmail,
    password: hashedPassword,
  });

  // Ensure there's a workspace for the admin
  let [workspace] = await getDatabase()
    .select()
    .from(workspaceTable)
    .limit(1);

  if (!workspace) {
    const workspaceId = createId();
    await getDatabase().insert(workspaceTable).values({
      id: workspaceId,
      name: "Main Workspace",
      description: "Default workspace",
      ownerId: adminId,
    });

    [workspace] = await getDatabase()
      .select()
      .from(workspaceTable)
      .where(eq(workspaceTable.id, workspaceId))
      .limit(1);
  }

  // Give admin user workspace-manager role and workspace membership
  if (workspace) {
    const roleAssignmentId = createId();
    await getDatabase().insert(roleAssignmentTable).values({
      id: roleAssignmentId,
      userId: adminId,
      role: "workspace-manager",
      assignedAt: new Date(),
      isActive: true,
      workspaceId: workspace.id,
    });

    // CRITICAL FIX: Create workspace_user entry for the admin
    // This is required by getWorkspaces to return workspaces for the user
    await getDatabase().insert(workspaceUserTable).values({
      workspaceId: workspace.id,
      userId: adminId,
      userEmail: adminEmail,
      role: "admin", // Using 'admin' from user_role enum: ['admin', 'manager', 'member', 'viewer']
      status: "active",
      joinedAt: new Date(),
      invitedBy: adminId,
    });

    logger.debug(`✅ Created workspace membership for admin user in workspace: ${workspace.name}`);
  }

  logger.debug(`✅ Created admin user with workspace-manager role: ${adminEmail}`);
  
  return await getDatabase()
    .select()
    .from(userTable)
    .where(eq(userTable.email, adminEmail))
    .limit(1)
    .then(users => users[0]);
} 
