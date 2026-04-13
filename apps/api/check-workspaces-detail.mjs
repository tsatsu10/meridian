import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { workspaceTable, workspaceUserTable } from './src/database/schema.ts';
import { eq } from 'drizzle-orm';

const connectionString = "postgresql://neondb_owner:npg_PoJlUnKCf32a@ep-dry-mode-ae1fy7m1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require";

const client = postgres(connectionString);
const db = drizzle(client);

const userEmail = 'elidegbotse@gmail.com';

console.log('🔍 Checking all workspace data for:', userEmail);
console.log('='.repeat(60));

// Get all workspaces from workspace table
console.log('\n📊 ALL Workspaces in workspace table:');
const allWorkspaces = await db.select().from(workspaceTable).limit(10);
console.log(`Found ${allWorkspaces.length} total workspaces:`);
for (const w of allWorkspaces) {
  console.log(`  - ID: ${w.id}, Name: ${w.name}, Created: ${w.createdAt}`);
}

// Get workspace_user entries for this user
console.log('\n🔗 Workspace User Entries for', userEmail + ':');
const workspaceUsers = await db.select()
  .from(workspaceUserTable)
  .where(eq(workspaceUserTable.userEmail, userEmail))
  .limit(10);

console.log(`Found ${workspaceUsers.length} workspace access entries:`);
for (const wu of workspaceUsers) {
  console.log(`  - Workspace ID: ${wu.workspaceId}`);
  console.log(`    User Email: ${wu.userEmail}`);
  console.log(`    Role: ${wu.role || 'N/A'}`);

  // Check if workspace exists
  const workspace = await db.select()
    .from(workspaceTable)
    .where(eq(workspaceTable.id, wu.workspaceId))
    .limit(1);

  if (workspace.length > 0) {
    console.log(`    ✅ Workspace exists: ${workspace[0].name}`);
  } else {
    console.log(`    ❌ Workspace NOT FOUND in workspace table!`);
  }
  console.log('');
}

await client.end();
