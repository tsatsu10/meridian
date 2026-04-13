/**
 * ✅ RBAC Rollback Verification Script
 * 
 * Verifies that rollback was successful and system is in pre-migration state.
 * 
 * @usage tsx src/scripts/verify-rbac-rollback.ts
 */

import { getDatabase } from '../database/connection';
import { sql } from 'drizzle-orm';
import logger from '../utils/logger';

// ==========================================
// LOGGING
// ==========================================

function log(level: 'info' | 'success' | 'warning' | 'error', message: string) {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
  };
  const reset = '\x1b[0m';
  logger.debug(`${colors[level]}${message}${reset}`);
}

// ==========================================
// VERIFICATION
// ==========================================

async function verifyRollback() {
  log('info', '🔍 Verifying rollback...\n');
  
  let allPassed = true;
  
  try {
    const db = getDatabase();
    // 1. Check that new tables are gone
    log('info', '1️⃣  Checking tables removed...');
    const newTables = ['roles', 'role_assignments', 'permission_overrides', 'role_audit_log', 'role_templates'];
    
    for (const table of newTables) {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${table}
        )
      `);
      
      const exists = result.rows?.[0]?.exists;
      if (exists) {
        log('error', `   ❌ Table ${table} still exists (should be removed)`);
        allPassed = false;
      } else {
        log('success', `   ✅ Table ${table} removed`);
      }
    }
    
    // 2. Check that old tables still exist
    log('info', '\n2️⃣  Checking old tables preserved...');
    const oldTables = ['users', 'role_history', 'role_assignment', 'custom_permission'];
    
    for (const table of oldTables) {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${table}
        )
      `);
      
      const exists = result.rows?.[0]?.exists;
      if (!exists) {
        log('error', `   ❌ Table ${table} missing (should be preserved)`);
        allPassed = false;
      } else {
        log('success', `   ✅ Table ${table} preserved`);
        
        // Check row count
        const count = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
        const rowCount = count.rows?.[0]?.count || 0;
        log('info', `      ${rowCount} rows present`);
      }
    }
    
    // 3. Verify data integrity
    log('info', '\n3️⃣  Checking data integrity...');
    
    // Check users exist
    const userCount = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const users = userCount.rows?.[0]?.count || 0;
    if (users > 0) {
      log('success', `   ✅ Users table intact (${users} users)`);
    } else {
      log('warning', '   ⚠️  No users found (may be expected in fresh DB)');
    }
    
    // Check role_assignment
    const assignmentCount = await db.execute(sql`SELECT COUNT(*) as count FROM role_assignment`);
    const assignments = assignmentCount.rows?.[0]?.count || 0;
    log('info', `   ℹ️  ${assignments} role assignments preserved`);
    
    // 4. Check for orphaned data
    log('info', '\n4️⃣  Checking for orphaned data...');
    
    try {
      const orphans = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM role_assignment ra 
        WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ra.user_id)
      `);
      
      const orphanCount = orphans.rows?.[0]?.count || 0;
      if (orphanCount > 0) {
        log('warning', `   ⚠️  ${orphanCount} orphaned assignments (users deleted)`);
      } else {
        log('success', '   ✅ No orphaned data');
      }
    } catch (error) {
      log('info', '   ℹ️  Could not check for orphans (may be expected)');
    }
    
    // Summary
    log('info', '\n' + '='.repeat(60));
    if (allPassed) {
      log('success', '✅ Rollback verification PASSED');
      log('success', 'System is back to pre-migration state');
    } else {
      log('error', '❌ Rollback verification FAILED');
      log('error', 'Manual intervention may be required');
    }
    log('info', '='.repeat(60) + '\n');
    
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    log('error', `\n❌ Verification failed with error: ${error}`);
    process.exit(1);
  }
}

// Run verification
verifyRollback();



