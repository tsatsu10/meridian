/**
 * Add User to All Workspaces
 *
 * Ensures elidegbotse@gmail.com is a member of all workspaces with admin role
 */

import { getDatabase, initializeDatabase } from '../database/connection';
import { workspaceMembers, workspaceTable, userTable } from '../database/schema';
import { eq, and, notInArray } from 'drizzle-orm';
import logger from '../utils/logger';
import { createId } from '@paralleldrive/cuid2';

async function addUserToAllWorkspaces() {
  await initializeDatabase();
  const db = getDatabase();

  const userEmail = 'elidegbotse@gmail.com';

  try {
    logger.info(`🔧 Adding ${userEmail} to all workspaces...`);

    // Get user ID first
    const [user] = await db.select().from(userTable).where(eq(userTable.email, userEmail)).limit(1);
    if (!user) {
      throw new Error(`User ${userEmail} not found`);
    }
    logger.info(`Found user ID: ${user.id}`);

    // Get all workspaces
    const allWorkspaces = await db.select().from(workspaceTable);
    logger.info(`Found ${allWorkspaces.length} workspaces`);

    // Get workspaces where user is already a member
    const existingMemberships = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userEmail, userEmail));

    const existingWorkspaceIds = existingMemberships.map(m => m.workspaceId);
    logger.info(`User is already member of ${existingWorkspaceIds.length} workspaces`);

    // Find workspaces where user is NOT a member
    const workspacesToAdd = allWorkspaces.filter(
      w => !existingWorkspaceIds.includes(w.id)
    );

    logger.info(`Adding user to ${workspacesToAdd.length} new workspaces...`);

    // Add user to each workspace
    const newMemberships = [];
    for (const workspace of workspacesToAdd) {
      const membership = {
        id: createId(),
        workspaceId: workspace.id,
        userId: user.id, // IMPORTANT: Add user ID
        userEmail: userEmail,
        role: 'admin' as const,
        status: 'active' as const,
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      newMemberships.push(membership);
    }

    if (newMemberships.length > 0) {
      await db.insert(workspaceMembers).values(newMemberships);
      logger.info(`✅ Added user to ${newMemberships.length} workspaces`);

      newMemberships.forEach(m => {
        logger.info(`  - ${m.workspaceId} (${m.role})`);
      });
    }

    // Update existing memberships to admin role
    if (existingMemberships.length > 0) {
      await db
        .update(workspaceMembers)
        .set({ role: 'admin', updatedAt: new Date() })
        .where(eq(workspaceMembers.userEmail, userEmail));

      logger.info(`✅ Updated ${existingMemberships.length} existing memberships to admin role`);
    }

    logger.info('🎉 User now has admin access to all workspaces!');

    // Show final status
    const finalMemberships = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userEmail, userEmail));

    logger.info(`\n📊 Final status: ${userEmail} is member of ${finalMemberships.length} workspaces with admin role`);

    return finalMemberships;
  } catch (error) {
    logger.error('❌ Error adding user to workspaces:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  addUserToAllWorkspaces()
    .then(() => {
      logger.info('✅ Complete!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Failed:', error);
      process.exit(1);
    });
}

export default addUserToAllWorkspaces;
