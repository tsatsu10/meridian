/**
 * Simple script to create admin user in PostgreSQL database
 * Run with: node create-admin-user.js
 */

import postgres from 'postgres';
import bcrypt from 'bcrypt';
import { createId } from '@paralleldrive/cuid2';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_PoJlUnKCf32a@ep-dry-mode-ae1fy7m1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function createAdminUser() {
  const sql = postgres(DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    console.log('🔍 Checking for existing admin user...');

    // Check if admin exists
    const existingUsers = await sql`
      SELECT * FROM "user" WHERE email = 'admin@meridian.app' LIMIT 1
    `;

    if (existingUsers.length > 0) {
      console.log('✅ Admin user already exists:', existingUsers[0].email);
      console.log('User ID:', existingUsers[0].id);
      console.log('User Name:', existingUsers[0].name);
      await sql.end();
      return;
    }

    console.log('🔧 Creating admin user...');

    // Create admin user
    const adminId = createId();
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await sql`
      INSERT INTO "user" (id, name, email, password, created_at)
      VALUES (${adminId}, 'Admin User', 'admin@meridian.app', ${hashedPassword}, NOW())
    `;

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@meridian.app');
    console.log('🔑 Password: admin123');
    console.log('🆔 ID:', adminId);

    // Check for workspace
    const workspaces = await sql`
      SELECT * FROM workspace LIMIT 1
    `;

    if (workspaces.length === 0) {
      console.log('🔧 Creating default workspace...');
      const workspaceId = createId();
      await sql`
        INSERT INTO workspace (id, name, description, owner_email, created_at)
        VALUES (${workspaceId}, 'Main Workspace', 'Default workspace', 'admin@meridian.app', NOW())
      `;
      console.log('✅ Workspace created:', workspaceId);

      // Add admin to workspace
      const workspaceUserId = createId();
      await sql`
        INSERT INTO workspace_user (id, workspace_id, user_email, role, joined_at, is_active)
        VALUES (${workspaceUserId}, ${workspaceId}, 'admin@meridian.app', 'owner', NOW(), true)
      `;
      console.log('✅ Admin added to workspace');
    } else {
      console.log('✅ Workspace exists:', workspaces[0].id);

      // Add admin to existing workspace if not already there
      const workspaceId = workspaces[0].id;
      const existingWsUser = await sql`
        SELECT * FROM workspace_user
        WHERE workspace_id = ${workspaceId} AND user_email = 'admin@meridian.app'
        LIMIT 1
      `;

      if (existingWsUser.length === 0) {
        const workspaceUserId = createId();
        await sql`
          INSERT INTO workspace_user (id, workspace_id, user_email, role, joined_at, is_active)
          VALUES (${workspaceUserId}, ${workspaceId}, 'admin@meridian.app', 'owner', NOW(), true)
        `;
        console.log('✅ Admin added to existing workspace');
      }
    }

    await sql.end();
    console.log('\n🎉 Setup complete! You can now log in with admin@meridian.app / admin123');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    await sql.end();
    process.exit(1);
  }
}

createAdminUser();
