/**
 * 🚀 RBAC Unification Migration Runner
 * 
 * Executes the complete RBAC unification migration safely.
 * Includes pre-flight checks, backup verification, and rollback capability.
 * 
 * Usage:
 *   tsx src/scripts/run-rbac-unification-migration.ts
 * 
 * Options:
 *   --dry-run    Show what would be done without executing
 *   --rollback   Rollback the migration
 * 
 * @phase Phase-1-Week-1
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getDatabase } from '../database/connection';
import { sql } from 'drizzle-orm';
import logger from '../utils/logger';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isRollback = args.includes('--rollback');

interface MigrationResult {
  success: boolean;
  step: string;
  message: string;
  error?: Error;
}

const results: MigrationResult[] = [];

/**
 * Run a SQL migration file
 */
async function runMigrationFile(filename: string): Promise<MigrationResult> {
  try {
    logger.debug(`\n📄 Reading migration file: ${filename}`);
    
    const migrationPath = join(__dirname, '..', 'database', 'migrations', filename);
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    if (isDryRun) {
      logger.debug(`✅ [DRY RUN] Would execute: ${filename}`);
      return {
        success: true,
        step: filename,
        message: 'Dry run - no changes made'
      };
    }
    
    logger.debug(`⚙️  Executing migration: ${filename}...`);
    
    const db = getDatabase();
    await db.execute(sql.raw(migrationSQL));
    
    logger.debug(`✅ Successfully executed: ${filename}`);
    
    return {
      success: true,
      step: filename,
      message: 'Migration executed successfully'
    };
    
  } catch (error) {
    logger.error(`❌ Failed to execute: ${filename}`);
    logger.error(error);
    
    return {
      success: false,
      step: filename,
      message: 'Migration failed',
      error: error as Error
    };
  }
}

/**
 * Pre-flight checks before migration
 */
async function preFlightChecks(): Promise<boolean> {
  logger.debug('\n🔍 Running pre-flight checks...');
  
  try {
    const db = getDatabase();
    
    // Check 1: Database connection
    logger.debug('  ✓ Checking database connection...');
    await db.execute(sql`SELECT 1`);
    logger.debug('    ✅ Database connection OK');
    
    // Check 2: Verify users table exists
    logger.debug('  ✓ Checking users table...');
    const usersCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
      )
    `);
    if (!usersCheck.rows[0]?.exists) {
      logger.error('    ❌ Users table not found!');
      return false;
    }
    logger.debug('    ✅ Users table exists');
    
    // Check 3: Verify workspace table exists
    logger.debug('  ✓ Checking workspace table...');
    const workspaceCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'workspace'
      )
    `);
    if (!workspaceCheck.rows[0]?.exists) {
      logger.error('    ❌ Workspace table not found!');
      return false;
    }
    logger.debug('    ✅ Workspace table exists');
    
    // Check 4: Check if migration already ran
    logger.debug('  ✓ Checking if migration already ran...');
    const rolesCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'roles'
      )
    `);
    if (rolesCheck.rows[0]?.exists) {
      logger.warn('    ⚠️  Roles table already exists! Migration may have already run.');
      logger.warn('    If you want to rollback, run with --rollback flag');
      return false;
    }
    logger.debug('    ✅ Clean slate - ready for migration');
    
    logger.debug('\n✅ All pre-flight checks passed!\n');
    return true;
    
  } catch (error) {
    logger.error('❌ Pre-flight checks failed:');
    logger.error(error);
    return false;
  }
}

/**
 * Create backup of existing data
 */
async function createBackup(): Promise<boolean> {
  logger.debug('\n💾 Creating backup of existing data...');
  
  try {
    const db = getDatabase();
    
    // Check if role_assignment table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'role_assignment'
      )
    `);
    
    if (tableCheck.rows[0]?.exists) {
      if (isDryRun) {
        logger.debug('✅ [DRY RUN] Would create backup of role_assignment table');
        return true;
      }
      
      // Backup is created in migration 001 by renaming the table
      logger.debug('  ✓ Backup will be created during migration (role_assignment → role_assignment_backup)');
      return true;
    } else {
      logger.debug('  ℹ️  No existing role_assignment table to backup');
      return true;
    }
    
  } catch (error) {
    logger.error('❌ Backup failed:');
    logger.error(error);
    return false;
  }
}

/**
 * Run the complete migration
 */
async function runMigration() {
  logger.debug('\n═══════════════════════════════════════════════');
  logger.debug('🚀 RBAC UNIFICATION MIGRATION');
  logger.debug('═══════════════════════════════════════════════\n');
  
  if (isDryRun) {
    logger.debug('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  // Pre-flight checks
  const checksPass = await preFlightChecks();
  if (!checksPass) {
    logger.error('\n❌ Pre-flight checks failed. Aborting migration.');
    process.exit(1);
  }
  
  // Create backup
  const backupSuccess = await createBackup();
  if (!backupSuccess) {
    logger.error('\n❌ Backup failed. Aborting migration.');
    process.exit(1);
  }
  
  // Run migrations in sequence
  logger.debug('\n🚀 Starting migration...\n');
  
  const migrations = [
    '001_create_unified_roles.sql',
    '002_seed_system_roles.sql',
    '003_migrate_role_assignments.sql'
  ];
  
  for (const migration of migrations) {
    const result = await runMigrationFile(migration);
    results.push(result);
    
    if (!result.success) {
      logger.error(`\n❌ Migration failed at: ${migration}`);
      logger.error('Rolling back...');
      await runRollback();
      process.exit(1);
    }
  }
  
  // Success!
  logger.debug('\n═══════════════════════════════════════════════');
  logger.debug('✅ MIGRATION COMPLETED SUCCESSFULLY!');
  logger.debug('═══════════════════════════════════════════════\n');
  
  logger.debug('Summary:');
  results.forEach(result => {
    logger.debug(`  ✅ ${result.step}: ${result.message}`);
  });
  
  logger.debug('\n📋 Next Steps:');
  logger.debug('  1. Verify data in new tables');
  logger.debug('  2. Run: tsx src/scripts/verify-rbac-migration.ts');
  logger.debug('  3. Test application with new schema');
  logger.debug('  4. Deploy updated services and middleware');
  logger.debug('  5. Monitor application logs');
  logger.debug('\n💡 If issues arise, run with --rollback flag to revert\n');
}

/**
 * Run rollback
 */
async function runRollback() {
  logger.debug('\n═══════════════════════════════════════════════');
  logger.debug('⏪ ROLLING BACK RBAC UNIFICATION');
  logger.debug('═══════════════════════════════════════════════\n');
  
  if (isDryRun) {
    logger.debug('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  const result = await runMigrationFile('ROLLBACK_unified_rbac.sql');
  
  if (result.success) {
    logger.debug('\n✅ Rollback completed successfully');
    logger.debug('System restored to pre-migration state\n');
  } else {
    logger.error('\n❌ Rollback failed!');
    logger.error('Manual intervention may be required');
    logger.error('Please review the database state\n');
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    if (isRollback) {
      await runRollback();
    } else {
      await runMigration();
    }
  } catch (error) {
    logger.error('\n❌ Fatal error during migration:');
    logger.error(error);
    process.exit(1);
  }
}

// Run migration
main();


