import "dotenv/config";
import { eq, and, notInArray } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { workspaceTable, roleAssignmentTable, userTable } from "../database/schema";
import { createId } from "@paralleldrive/cuid2";
import logger from '../utils/logger';

/**
 * Script to assign workspace-manager roles to workspace owners who don't have role assignments yet
 * This fixes the issue where old workspaces aren't showing up because they lack role assignments
 */

async function assignMissingWorkspaceRoles() {
  logger.debug("🔍 Finding workspaces without role assignments...");

  try {
    const db = getDatabase();
    // Get all workspaces
    const allWorkspaces = await db
      .select({
        id: workspaceTable.id,
        name: workspaceTable.name,
        ownerId: workspaceTable.ownerId,
      })
      .from(workspaceTable);

    logger.debug(`📊 Found ${allWorkspaces.length} total workspaces`);

    let fixed = 0;
    let errors = 0;

    for (const workspace of allWorkspaces) {
      try {
        // Check if owner already has a role assignment for this workspace
        const existingAssignment = await db
          .select({ id: roleAssignmentTable.id })
          .from(roleAssignmentTable)
          .where(
            and(
              eq(roleAssignmentTable.workspaceId, workspace.id),
              eq(roleAssignmentTable.userId, workspace.ownerId),
              eq(roleAssignmentTable.isActive, true)
            )
          )
          .limit(1);

        if (existingAssignment.length > 0) {
          logger.debug(`✅ Workspace "${workspace.name}" already has role assignment`);
          continue;
        }

        // Get owner details
        const owner = await db
          .select({
            id: userTable.id,
            email: userTable.email,
          })
          .from(userTable)
          .where(eq(userTable.id, workspace.ownerId))
          .limit(1);

        if (!owner.length) {
          logger.debug(`⚠️  Skipping workspace "${workspace.name}" - owner not found`);
          errors++;
          continue;
        }

        // Create role assignment
        await db.insert(roleAssignmentTable).values({
          id: createId(),
          userId: workspace.ownerId,
          role: "workspace-manager",
          workspaceId: workspace.id,
          isActive: true,
        });

        logger.debug(`✅ Assigned workspace-manager role to ${owner[0]!.email} for workspace "${workspace.name}"`);
        fixed++;
      } catch (error) {
        logger.error(`❌ Error processing workspace "${workspace.name}":`, error);
        errors++;
      }
    }

    logger.debug("\n📊 Summary:");
    logger.debug(`✅ Successfully assigned ${fixed} roles`);
    logger.debug(`❌ Errors: ${errors}`);
    logger.debug(`📈 Total workspaces: ${allWorkspaces.length}`);

    process.exit(0);
  } catch (error) {
    logger.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
assignMissingWorkspaceRoles();

