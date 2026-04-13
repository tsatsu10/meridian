/**
 * Grant Admin User Highest Permissions
 *
 * This script updates the admin@meridian.app user to have workspace-manager role
 * in all workspaces, which is the highest permission level.
 */

import { getDatabase, initializeDatabase } from '../database/connection';
import { workspaceMembers } from '../database/schema';
import { eq } from 'drizzle-orm';
import logger from '../utils/logger';

async function grantAdminAllPermissions() {
  // Initialize database first
  await initializeDatabase();

  const db = getDatabase();
  const adminEmail = 'admin@meridian.app';

  try {
    logger.info('🔐 Starting permission upgrade for admin user...');

    // Update all workspace memberships for admin to admin (highest role in DB)
    const result = await db
      .update(workspaceMembers)
      .set({
        role: 'admin', // Highest role available in database
        updatedAt: new Date(),
      })
      .where(eq(workspaceMembers.userEmail, adminEmail))
      .returning();

    logger.info(`✅ Updated ${result.length} workspace memberships to workspace-manager role`);

    result.forEach((member) => {
      logger.info(`  - Workspace ${member.workspaceId}: ${member.role}`);
    });

    logger.info('🎉 Admin user now has highest permissions in all workspaces!');

    return result;
  } catch (error) {
    logger.error('❌ Error granting permissions:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  grantAdminAllPermissions()
    .then(() => {
      logger.info('✅ Permission upgrade complete!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Permission upgrade failed:', error);
      process.exit(1);
    });
}

export default grantAdminAllPermissions;
