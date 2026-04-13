import { initializeDatabase, getDatabase } from './src/database/connection';
import { workspaceTable, userTable, roleAssignmentTable } from './src/database/schema';
import { eq } from 'drizzle-orm';

async function checkDatabase() {
  try {
    await initializeDatabase();
    const db = getDatabase();

    console.log('🔍 Checking database state...');

    // Check workspaces
    const workspaces = await db.select().from(workspaceTable).limit(5);
    console.log('Workspaces:', workspaces.length > 0 ? workspaces : 'No workspaces found');

    // Check admin user
    const adminUser = await db.select().from(userTable).where(eq(userTable.email, 'admin@meridian.app')).limit(1);
    console.log('Admin user:', adminUser.length > 0 ? adminUser[0] : 'Admin user not found');

    if (adminUser.length > 0) {
      // Check admin roles
      const adminRoles = await db.select().from(roleAssignmentTable).where(eq(roleAssignmentTable.userId, adminUser[0].id));
      console.log('Admin roles:', adminRoles.length > 0 ? adminRoles : 'No roles for admin user');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
