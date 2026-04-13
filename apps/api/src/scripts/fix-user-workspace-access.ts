/**
 * Fix User Workspace Access
 *
 * Updates workspace memberships to use the correct user email
 */

import { getDatabase, initializeDatabase } from '../database/connection';
import { workspaceMembers, userTable } from '../database/schema';
import { eq } from 'drizzle-orm';
import logger from '../utils/logger';

async function fixUserWorkspaceAccess() {
  await initializeDatabase();
  const db = getDatabase();

  try {
    logger.info('🔧 Fixing user workspace access...');

    // Get the actual user email from database
    const users = await db.select().from(userTable).limit(10);
    logger.info(`Found ${users.length} users in database:`);
    users.forEach(u => logger.info(`  - ${u.email} (${u.role})`));

    // Update all workspace memberships from admin@meridian.app to elidegbotse@gmail.com
    const oldEmail = 'admin@meridian.app';
    const newEmail = 'elidegbotse@gmail.com';

    logger.info(`\n📝 Updating workspace memberships from ${oldEmail} to ${newEmail}...`);

    const result = await db
      .update(workspaceMembers)
      .set({
        userEmail: newEmail,
        updatedAt: new Date(),
      })
      .where(eq(workspaceMembers.userEmail, oldEmail))
      .returning();

    logger.info(`✅ Updated ${result.length} workspace memberships`);

    result.forEach((member) => {
      logger.info(`  - Workspace ${member.workspaceId}: ${member.userEmail} (${member.role})`);
    });

    logger.info('🎉 User workspace access fixed!');
    return result;
  } catch (error) {
    logger.error('❌ Error fixing workspace access:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  fixUserWorkspaceAccess()
    .then(() => {
      logger.info('✅ Fix complete!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Fix failed:', error);
      process.exit(1);
    });
}

export default fixUserWorkspaceAccess;
