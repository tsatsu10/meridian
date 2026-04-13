import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { userTable, workspaceUserTable, workspaceTable } from './src/database/schema.ts';
import { eq, and } from 'drizzle-orm';

const connectionString = "postgresql://neondb_owner:npg_PoJlUnKCf32a@ep-dry-mode-ae1fy7m1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require";

const client = postgres(connectionString);
const db = drizzle(client);

const userEmail = 'elidegbotse@gmail.com';
const workspaceId = 'nv64aylk8vnkg1lo97cmveps';

console.log('🔍 Checking workspace access for:', userEmail);
console.log('🔍 Workspace ID:', workspaceId);

// Check if user exists
const users = await db.select().from(userTable).where(eq(userTable.email, userEmail)).limit(1);
console.log('\n✅ User exists:', users.length > 0);
if (users.length > 0) {
  console.log('   User ID:', users[0].id);
  console.log('   User Name:', users[0].name);
}

// Check workspace_user table
const workspaceUsers = await db.select()
  .from(workspaceUserTable)
  .where(and(
    eq(workspaceUserTable.userEmail, userEmail),
    eq(workspaceUserTable.workspaceId, workspaceId)
  ))
  .limit(1);

console.log('\n✅ Workspace access:', workspaceUsers.length > 0);
if (workspaceUsers.length > 0) {
  console.log('   Access granted!');
} else {
  console.log('   ❌ No workspace access found');

  // Check what workspaces user has access to
  console.log('\n🔍 Checking all workspaces for this user:');
  const allWorkspaces = await db.select()
    .from(workspaceUserTable)
    .where(eq(workspaceUserTable.userEmail, userEmail))
    .limit(10);

  console.log(`   Found ${allWorkspaces.length} workspace(s)`);
  for (const ws of allWorkspaces) {
    console.log(`   - Workspace ID: ${ws.workspaceId}`);
  }
}

await client.end();
