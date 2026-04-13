/**
 * Reset admin user password to admin123
 * Run with: npx tsx reset-admin-password.ts
 */

import postgres from 'postgres';
import bcrypt from 'bcrypt';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_PoJlUnKCf32a@ep-dry-mode-ae1fy7m1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function resetAdminPassword() {
  const sql = postgres(DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    console.log('🔍 Finding admin user...');

    const users = await sql`
      SELECT * FROM "user" WHERE email = 'admin@meridian.app' LIMIT 1
    `;

    if (users.length === 0) {
      console.error('❌ Admin user not found');
      await sql.end();
      process.exit(1);
    }

    const user = users[0];
    console.log('✅ Found admin user:', user.email);
    console.log('🆔 User ID:', user.id);

    console.log('🔧 Hashing new password...');
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log('💾 Updating password in database...');
    await sql`
      UPDATE "user"
      SET password = ${hashedPassword}
      WHERE email = 'admin@meridian.app'
    `;

    console.log('✅ Password reset successfully!');
    console.log('\n🎉 You can now log in with:');
    console.log('📧 Email: admin@meridian.app');
    console.log('🔑 Password: admin123');

    await sql.end();
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    await sql.end();
    process.exit(1);
  }
}

resetAdminPassword();
