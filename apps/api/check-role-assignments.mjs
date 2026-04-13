import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { roleAssignmentTable, userTable, workspaceTable } from './src/database/schema.ts';
import { eq, and } from 'drizzle-orm';

const connectionString = "postgresql://neondb_owner:npg_PoJlUnKCf32a@ep-dry-mode-ae1fy7m1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require";

const client = postgres(connectionString);
const db = drizzle(client);

const userEmail = 'elidegbotse@gmail.com';

console.log('🔍 Checking role_assignment table for:', userEmail);
console.log('='.repeat(60));

// Get user ID
const user = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.email, userEmail)).limit(1);
if (!user.length) {
  console.log('❌ User not found!');
  await client.end();
  process.exit(1);
}

const userId = user[0].id;
console.log('✅ User ID:', userId);

// Get all role assignments for this user
console.log('\n📊 Role Assignments:');
const assignments = await db.select()
  .from(roleAssignmentTable)
  .where(eq(roleAssignmentTable.userId, userId))
  .limit(20);

console.log(`Found ${assignments.length} role assignment(s):`);
for (const ra of assignments) {
  console.log(`\n  - Workspace ID: ${ra.workspaceId}`);
  console.log(`    Role: ${ra.role}`);
  console.log(`    Is Active: ${ra.isActive}`);
  console.log(`    Resource Type: ${ra.resourceType}`);

  // Check if workspace exists
  const workspace = await db.select()
    .from(workspaceTable)
    .where(eq(workspaceTable.id, ra.workspaceId))
    .limit(1);

  if (workspace.length > 0) {
    console.log(`    ✅ Workspace: ${workspace[0].name}`);
  } else {
    console.log(`    ❌ Workspace NOT FOUND`);
  }
}

await client.end();
