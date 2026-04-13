/**
 * 🔍 RBAC Unification Migration Verification Script
 * 
 * Verifies that the RBAC unification migration completed successfully.
 * Checks data integrity, counts, and relationships.
 * 
 * Usage:
 *   tsx src/scripts/verify-rbac-migration.ts
 * 
 * @phase Phase-1-Week-1
 */

import { getDatabase } from '../database/connection';
import { sql } from 'drizzle-orm';
import { roles, roleAssignments, permissionOverrides, roleAuditLog, roleTemplates } from '../database/schema/rbac-unified';
import { eq } from 'drizzle-orm';
import logger from '../utils/logger';

interface VerificationResult {
  check: string;
  passed: boolean;
  details: string;
  severity: 'critical' | 'warning' | 'info';
}

const results: VerificationResult[] = [];

/**
 * Add verification result
 */
function addResult(check: string, passed: boolean, details: string, severity: 'critical' | 'warning' | 'info' = 'info') {
  results.push({ check, passed, details, severity });
  
  const icon = passed ? '✅' : (severity === 'critical' ? '❌' : '⚠️ ');
  logger.debug(`${icon} ${check}: ${details}`);
}

/**
 * Verify table exists and has correct structure
 */
async function verifyTable(tableName: string, expectedColumns: string[]): Promise<boolean> {
  try {
    const db = getDatabase();
    
    // Check table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = ${tableName}
      )
    `);
    
    if (!tableCheck.rows[0]?.exists) {
      addResult(`Table: ${tableName}`, false, 'Table does not exist', 'critical');
      return false;
    }
    
    // Check columns exist
    const columnsCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
    `);
    
    const actualColumns = columnsCheck.rows.map((row: any) => row.column_name);
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
    
    if (missingColumns.length > 0) {
      addResult(
        `Table: ${tableName}`, 
        false, 
        `Missing columns: ${missingColumns.join(', ')}`,
        'critical'
      );
      return false;
    }
    
    addResult(`Table: ${tableName}`, true, `Exists with all expected columns`);
    return true;
    
  } catch (error) {
    addResult(`Table: ${tableName}`, false, `Error: ${(error as Error).message}`, 'critical');
    return false;
  }
}

/**
 * Verify system roles were seeded
 */
async function verifySystemRoles(): Promise<boolean> {
  try {
    const db = getDatabase();
    
    const expectedSystemRoles = [
      'workspace-manager',
      'department-head',
      'workspace-viewer',
      'project-manager',
      'project-viewer',
      'team-lead',
      'member',
      'client',
      'contractor',
      'stakeholder',
      'guest'
    ];
    
    const systemRoles = await db
      .select()
      .from(roles)
      .where(eq(roles.type, 'system'));
    
    const foundRoleIds = systemRoles.map(r => r.id);
    const missingRoles = expectedSystemRoles.filter(id => !foundRoleIds.includes(id));
    
    if (missingRoles.length > 0) {
      addResult(
        'System roles',
        false,
        `Missing ${missingRoles.length} roles: ${missingRoles.join(', ')}`,
        'critical'
      );
      return false;
    }
    
    if (systemRoles.length > 11) {
      addResult(
        'System roles',
        false,
        `Found ${systemRoles.length} system roles (expected 11)`,
        'warning'
      );
    } else {
      addResult('System roles', true, `All 11 system roles present`);
    }
    
    return missingRoles.length === 0;
    
  } catch (error) {
    addResult('System roles', false, `Error: ${(error as Error).message}`, 'critical');
    return false;
  }
}

/**
 * Verify role templates were seeded
 */
async function verifyRoleTemplates(): Promise<boolean> {
  try {
    const db = getDatabase();
    
    const templates = await db
      .select()
      .from(roleTemplates)
      .where(eq(roleTemplates.type, 'system'));
    
    const expectedCount = 4; // viewer, contributor, manager, administrator
    
    if (templates.length < expectedCount) {
      addResult(
        'Role templates',
        false,
        `Found ${templates.length} templates (expected ${expectedCount})`,
        'warning'
      );
      return false;
    }
    
    addResult('Role templates', true, `${templates.length} system templates present`);
    return true;
    
  } catch (error) {
    addResult('Role templates', false, `Error: ${(error as Error).message}`, 'warning');
    return false;
  }
}

/**
 * Verify role assignments were migrated
 */
async function verifyRoleAssignments(): Promise<boolean> {
  try {
    const db = getDatabase();
    
    // Count active assignments
    const assignments = await db
      .select()
      .from(roleAssignments)
      .where(eq(roleAssignments.isActive, true));
    
    // Check users table count
    const usersCheck = await db.execute(sql`SELECT COUNT(*) as count FROM "users"`);
    const userCount = parseInt(usersCheck.rows[0]?.count || '0');
    
    // Ideally, every user should have at least one role assignment
    const coveragePercent = userCount > 0 ? (assignments.length / userCount) * 100 : 0;
    
    if (assignments.length === 0) {
      addResult(
        'Role assignments',
        false,
        'No role assignments found',
        'critical'
      );
      return false;
    }
    
    if (coveragePercent < 50) {
      addResult(
        'Role assignments',
        false,
        `Only ${coveragePercent.toFixed(1)}% of users have role assignments`,
        'warning'
      );
    } else {
      addResult(
        'Role assignments',
        true,
        `${assignments.length} active assignments (${coveragePercent.toFixed(1)}% user coverage)`
      );
    }
    
    return true;
    
  } catch (error) {
    addResult('Role assignments', false, `Error: ${(error as Error).message}`, 'critical');
    return false;
  }
}

/**
 * Verify role statistics are accurate
 */
async function verifyRoleStatistics(): Promise<boolean> {
  try {
    const db = getDatabase();
    
    // Get all roles with their stated users_count
    const allRoles = await db.select().from(roles);
    
    let allCorrect = true;
    
    for (const role of allRoles) {
      // Count actual assignments
      const actualCount = await db
        .select()
        .from(roleAssignments)
        .where(eq(roleAssignments.roleId, role.id));
      
      if (actualCount.length !== role.usersCount) {
        addResult(
          `Role statistics: ${role.name}`,
          false,
          `users_count is ${role.usersCount} but actual is ${actualCount.length}`,
          'warning'
        );
        allCorrect = false;
      }
    }
    
    if (allCorrect) {
      addResult('Role statistics', true, 'All role user counts are accurate');
    }
    
    return allCorrect;
    
  } catch (error) {
    addResult('Role statistics', false, `Error: ${(error as Error).message}`, 'warning');
    return false;
  }
}

/**
 * Verify indexes were created
 */
async function verifyIndexes(): Promise<boolean> {
  try {
    const db = getDatabase();
    
    const indexCheck = await db.execute(sql`
      SELECT 
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('roles', 'role_assignments', 'permission_overrides', 'role_audit_log', 'role_templates')
      ORDER BY tablename, indexname
    `);
    
    const indexCount = indexCheck.rows.length;
    
    // We expect at least 15 indexes across all tables
    if (indexCount < 15) {
      addResult(
        'Database indexes',
        false,
        `Found ${indexCount} indexes (expected at least 15)`,
        'warning'
      );
      return false;
    }
    
    addResult('Database indexes', true, `${indexCount} indexes created for optimal performance`);
    return true;
    
  } catch (error) {
    addResult('Database indexes', false, `Error: ${(error as Error).message}`, 'warning');
    return false;
  }
}

/**
 * Check for orphaned data
 */
async function checkForOrphans(): Promise<boolean> {
  try {
    const db = getDatabase();
    
    // Check for role assignments with non-existent roles
    const orphanedAssignments = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM "role_assignments" ra
      WHERE NOT EXISTS (
        SELECT 1 FROM "roles" r WHERE r.id = ra.role_id
      )
    `);
    
    const orphanCount = parseInt(orphanedAssignments.rows[0]?.count || '0');
    
    if (orphanCount > 0) {
      addResult(
        'Data integrity',
        false,
        `Found ${orphanCount} role assignments with non-existent roles`,
        'critical'
      );
      return false;
    }
    
    addResult('Data integrity', true, 'No orphaned role assignments');
    return true;
    
  } catch (error) {
    addResult('Data integrity', false, `Error: ${(error as Error).message}`, 'warning');
    return false;
  }
}

/**
 * Generate summary report
 */
function generateReport() {
  logger.debug('\n═══════════════════════════════════════════════');
  logger.debug('📊 RBAC MIGRATION VERIFICATION REPORT');
  logger.debug('═══════════════════════════════════════════════\n');
  
  const criticalIssues = results.filter(r => !r.passed && r.severity === 'critical');
  const warnings = results.filter(r => !r.passed && r.severity === 'warning');
  const passed = results.filter(r => r.passed);
  
  logger.debug(`Total Checks: ${results.length}`);
  logger.debug(`✅ Passed: ${passed.length}`);
  logger.debug(`⚠️  Warnings: ${warnings.length}`);
  logger.debug(`❌ Critical: ${criticalIssues.length}`);
  
  if (criticalIssues.length > 0) {
    logger.debug('\n🚨 CRITICAL ISSUES:\n');
    criticalIssues.forEach(issue => {
      logger.debug(`  ❌ ${issue.check}`);
      logger.debug(`     ${issue.details}\n`);
    });
  }
  
  if (warnings.length > 0) {
    logger.debug('\n⚠️  WARNINGS:\n');
    warnings.forEach(warning => {
      logger.debug(`  ⚠️  ${warning.check}`);
      logger.debug(`     ${warning.details}\n`);
    });
  }
  
  logger.debug('\n═══════════════════════════════════════════════');
  
  if (criticalIssues.length === 0 && warnings.length === 0) {
    logger.debug('✅ MIGRATION VERIFIED SUCCESSFULLY!');
    logger.debug('═══════════════════════════════════════════════\n');
    logger.debug('The RBAC unification migration completed successfully.');
    logger.debug('All tables, data, and relationships are intact.\n');
    logger.debug('Next steps:');
    logger.debug('  1. Deploy updated services and middleware');
    logger.debug('  2. Run application tests');
    logger.debug('  3. Monitor application logs');
    logger.debug('  4. Begin Phase 2 development\n');
    return true;
  } else if (criticalIssues.length === 0) {
    logger.debug('⚠️  MIGRATION COMPLETED WITH WARNINGS');
    logger.debug('═══════════════════════════════════════════════\n');
    logger.debug('The migration completed but has some warnings.');
    logger.debug('Review the warnings above and address if necessary.\n');
    return true;
  } else {
    logger.debug('❌ MIGRATION VERIFICATION FAILED!');
    logger.debug('═══════════════════════════════════════════════\n');
    logger.debug('Critical issues found. Do NOT proceed to production.');
    logger.debug('Review the issues above and fix before continuing.\n');
    logger.debug('To rollback:');
    logger.debug('  tsx src/scripts/run-rbac-unification-migration.ts --rollback\n');
    return false;
  }
}

/**
 * Main verification function
 */
async function main() {
  logger.debug('\n🚀 Starting RBAC Migration Verification...\n');
  
  try {
    // Verify tables
    logger.debug('📋 Verifying Tables:\n');
    await verifyTable('roles', ['id', 'name', 'type', 'permissions', 'workspace_id']);
    await verifyTable('role_assignments', ['id', 'user_id', 'role_id', 'workspace_id']);
    await verifyTable('permission_overrides', ['id', 'user_id', 'permission', 'granted']);
    await verifyTable('role_audit_log', ['id', 'action', 'role_id', 'user_id']);
    await verifyTable('role_templates', ['id', 'name', 'type', 'permissions']);
    
    // Verify data
    logger.debug('\n📊 Verifying Data:\n');
    await verifySystemRoles();
    await verifyRoleTemplates();
    await verifyRoleAssignments();
    await verifyRoleStatistics();
    
    // Verify integrity
    logger.debug('\n🔍 Verifying Data Integrity:\n');
    await checkForOrphans();
    await verifyIndexes();
    
    // Generate report
    const success = generateReport();
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    logger.error('\n❌ Verification failed with error:');
    logger.error(error);
    process.exit(1);
  }
}

// Run verification
main();


