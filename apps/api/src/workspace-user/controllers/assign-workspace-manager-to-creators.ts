import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import logger from '../../utils/logger';
import { 
  workspaceTable, 
  userTable, 
  roleAssignmentTable, 
  roleHistoryTable 
} from "../../database/schema";

/**
 * Retroactively assigns workspace-manager role to all existing workspace creators
 * This function should be run once to migrate existing workspaces to the new RBAC system
 */
async function assignWorkspaceManagerToCreators() {
  const db = getDatabase();
  logger.debug("🔄 Starting workspace-manager role assignment for existing workspace creators...");
  
  try {
    // Get all workspaces with their owners
    const workspaces = await db
      .select({
        workspaceId: workspaceTable.id,
        workspaceName: workspaceTable.name,
        ownerId: workspaceTable.ownerId,
        createdAt: workspaceTable.createdAt
      })
      .from(workspaceTable);

    logger.debug(`📋 Found ${workspaces.length} workspaces to process`);

    let assignedCount = 0;
    let skippedCount = 0;

    for (const workspace of workspaces) {
      // Get user by ID
      const [user] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, workspace.ownerId))
        .limit(1);

      if (!user) {
        logger.debug(`⚠️  User not found for workspace "${workspace.workspaceName}": ${workspace.ownerId}`);
        skippedCount++;
        continue;
      }

      // Check if workspace-manager role already exists for this user in this workspace
      const existingAssignment = await db
        .select()
        .from(roleAssignmentTable)
        .where(
          and(
            eq(roleAssignmentTable.userId, user.id),
            eq(roleAssignmentTable.role, "workspace-manager"),
            eq(roleAssignmentTable.workspaceId, workspace.workspaceId),
            eq(roleAssignmentTable.isActive, true)
          )
        )
        .limit(1);

      if (existingAssignment.length > 0) {
        logger.debug(`⏭️  Workspace-manager role already assigned for "${workspace.workspaceName}": ${user.email}`);
        skippedCount++;
        continue;
      }

      // Assign workspace-manager role
      const assignmentId = createId();
      
      await db.insert(roleAssignmentTable).values({
        id: assignmentId,
        userId: user.id,
        role: "workspace-manager",
        workspaceId: workspace.workspaceId,
        isActive: true,
        assignedAt: new Date(),
      });

      // Record in role history for audit trail
      await db.insert(roleHistoryTable).values({
        id: createId(),
        userId: user.id,
        role: "workspace-manager",
        action: "assigned",
        performedBy: user.id,
        reason: "Migration: Retroactive assignment for workspace creator",
        workspaceId: workspace.workspaceId,
        notes: "Migration: Existing workspace creator automatically assigned workspace-manager role",
        metadata: {
          source: "migration-workspace-creators",
        },
      });

      logger.debug(`✅ Assigned workspace-manager role to "${workspace.workspaceName}" creator: ${user.email}`);
      assignedCount++;
    }

    logger.debug("\n📊 Migration Summary:");
    logger.debug(`   ✅ Assigned: ${assignedCount} workspace creators`);
    logger.debug(`   ⏭️  Skipped: ${skippedCount} (already assigned or user not found)`);
    logger.debug(`   📋 Total processed: ${workspaces.length} workspaces`);
    logger.debug("🎉 Migration completed successfully!");

    return {
      success: true,
      totalWorkspaces: workspaces.length,
      assigned: assignedCount,
      skipped: skippedCount
    };

  } catch (error) {
    logger.error("❌ Failed to assign workspace-manager roles:", error);
    throw error;
  }
}

export default assignWorkspaceManagerToCreators; 
