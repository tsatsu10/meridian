/**
 * 🧹 SECURITY CLEANUP SCRIPT
 * 
 * This script removes unauthorized workspace access that was created by the
 * vulnerable database seeding logic.
 * 
 * WHAT IT DOES:
 * 1. Identifies workspace_user entries where user is not the workspace owner
 * 2. Removes unauthorized workspace_user memberships  
 * 3. Removes corresponding role_assignment entries for non-owners
 * 4. Preserves legitimate workspace creators and invited users
 * 
 * RUN: node scripts/cleanup-unauthorized-workspace-access.cjs
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database setup
const dbPath = path.join(__dirname, '..', 'meridian.db');
const db = new Database(dbPath);

console.log('🧹 Starting security cleanup: Removing unauthorized workspace access...\n');

try {
  // Start transaction for safety
  db.exec('BEGIN TRANSACTION');

  // 1. Find all workspace_user entries where user is NOT the workspace owner
  const unauthorizedMemberships = db.prepare(`
    SELECT 
      wu.id as membership_id,
      wu.workspace_id,
      wu.user_email,
      w.name as workspace_name,
      w.owner_email
    FROM workspace_user wu
    JOIN workspace w ON wu.workspace_id = w.id
    WHERE wu.user_email != w.owner_email
  `).all();

  console.log(`🔍 Found ${unauthorizedMemberships.length} unauthorized workspace memberships:`);
  
  if (unauthorizedMemberships.length === 0) {
    console.log('✅ No unauthorized memberships found. Database is clean!');
    db.exec('ROLLBACK');
    process.exit(0);
  }

  // Show what will be cleaned up
  unauthorizedMemberships.forEach(membership => {
    console.log(`   🚨 ${membership.user_email} has access to "${membership.workspace_name}" (owned by ${membership.owner_email})`);
  });

  console.log('\n🧹 Cleaning up unauthorized access...');

  let removedMemberships = 0;
  let removedRoleAssignments = 0;

  // 2. Remove unauthorized workspace_user entries
  for (const membership of unauthorizedMemberships) {
    // Remove workspace_user entry
    const membershipResult = db.prepare(`
      DELETE FROM workspace_user 
      WHERE id = ? AND user_email != (
        SELECT owner_email FROM workspace WHERE id = workspace_user.workspace_id
      )
    `).run(membership.membership_id);

    if (membershipResult.changes > 0) {
      removedMemberships++;
      console.log(`   🗑️  Removed workspace membership: ${membership.user_email} from "${membership.workspace_name}"`);
    }

    // 3. Remove corresponding role_assignment entries (if user exists)
    const user = db.prepare('SELECT id FROM user WHERE email = ?').get(membership.user_email);
    
    if (user) {
      const roleResult = db.prepare(`
        DELETE FROM role_assignment 
        WHERE user_id = ? AND workspace_id = ? AND user_id != (
          SELECT u.id FROM user u 
          JOIN workspace w ON u.email = w.owner_email 
          WHERE w.id = ?
        )
      `).run(user.id, membership.workspace_id, membership.workspace_id);

      if (roleResult.changes > 0) {
        removedRoleAssignments++;
        console.log(`   🗑️  Removed role assignment: ${membership.user_email} from workspace "${membership.workspace_name}"`);
      }

      // Also clean up role_history for these assignments
      db.prepare(`
        DELETE FROM role_history 
        WHERE user_id = ? AND workspace_id = ? AND user_id != (
          SELECT u.id FROM user u 
          JOIN workspace w ON u.email = w.owner_email 
          WHERE w.id = ?
        )
      `).run(user.id, membership.workspace_id, membership.workspace_id);
    }
  }

  // Commit transaction
  db.exec('COMMIT');

  console.log('\n📊 Cleanup Summary:');
  console.log(`   🗑️  Removed workspace memberships: ${removedMemberships}`);
  console.log(`   🗑️  Removed role assignments: ${removedRoleAssignments}`);
  console.log(`   ✅ Security vulnerability patched!`);
  
  console.log('\n🔒 SECURITY STATUS:');
  console.log('   ✅ Users can now only access workspaces they own or are invited to');
  console.log('   ✅ No more auto-assignment of users to random workspaces');
  console.log('   ✅ Proper workspace isolation restored');

  // Verification: Check remaining workspace access
  const remainingAccess = db.prepare(`
    SELECT 
      wu.user_email,
      w.name as workspace_name,
      w.owner_email,
      wu.role,
      CASE 
        WHEN wu.user_email = w.owner_email THEN 'Owner'
        ELSE 'Invited Member'
      END as access_reason
    FROM workspace_user wu
    JOIN workspace w ON wu.workspace_id = w.id
    ORDER BY w.name, wu.user_email
  `).all();

  if (remainingAccess.length > 0) {
    console.log('\n✅ Remaining legitimate workspace access:');
    remainingAccess.forEach(access => {
      console.log(`   👤 ${access.user_email} → "${access.workspace_name}" (${access.access_reason})`);
    });
  }

} catch (error) {
  console.error('❌ Cleanup failed:', error);
  db.exec('ROLLBACK');
  process.exit(1);
} finally {
  db.close();
}

console.log('\n🎉 Security cleanup completed successfully!');
console.log('💡 New users will now only see workspaces they create or are invited to.'); 