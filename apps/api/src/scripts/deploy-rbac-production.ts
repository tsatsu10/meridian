/**
 * 🚀 RBAC Production Deployment Script
 * 
 * Automated script for deploying RBAC unification to production.
 * Includes safety checks, backups, and rollback capability.
 * 
 * @usage tsx src/scripts/deploy-rbac-production.ts
 */

import { getDatabase } from '../database/connection';
import { sql } from 'drizzle-orm';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';

// ==========================================
// CONFIGURATION
// ==========================================

const CONFIG = {
  backupDir: path.join(process.cwd(), 'backups'),
  migrationDir: path.join(process.cwd(), 'src', 'database', 'migrations'),
  dryRun: process.env.DRY_RUN === 'true',
  skipBackup: process.env.SKIP_BACKUP === 'true',
  environment: process.env.NODE_ENV || 'development',
};

// ==========================================
// LOGGING
// ==========================================

function log(level: 'info' | 'success' | 'warning' | 'error', message: string) {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
  };
  const reset = '\x1b[0m';
  
  logger.debug(`${colors[level]}[${timestamp}] [${level.toUpperCase()}] ${message}${reset}`);
}

// ==========================================
// PRE-FLIGHT CHECKS
// ==========================================

async function preFlightChecks(): Promise<boolean> {
  log('info', '🔍 Running pre-flight checks...');
  
  try {
    const db = getDatabase();
    // 1. Check database connection
    log('info', 'Checking database connection...');
    await db.execute(sql`SELECT 1`);
    log('success', '✅ Database connection OK');
    
    // 2. Check environment
    if (CONFIG.environment === 'production' && CONFIG.dryRun) {
      log('warning', '⚠️  DRY RUN mode enabled in production!');
    }
    
    if (CONFIG.environment !== 'production') {
      log('warning', `⚠️  Environment is ${CONFIG.environment}, not production`);
    }
    
    // 3. Check migration files exist
    log('info', 'Checking migration files...');
    const requiredFiles = [
      '001_create_unified_roles.sql',
      '002_seed_system_roles.sql',
      '003_migrate_role_assignments.sql',
      'ROLLBACK_unified_rbac.sql',
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(CONFIG.migrationDir, file);
      if (!fs.existsSync(filePath)) {
        log('error', `❌ Missing migration file: ${file}`);
        return false;
      }
    }
    log('success', '✅ All migration files present');
    
    // 4. Check for conflicting data
    log('info', 'Checking for data conflicts...');
    const conflicts = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'roles'
    `);
    
    if (conflicts.rows && conflicts.rows[0]?.count > 0) {
      log('warning', '⚠️  Tables already exist - may be a re-run or failed previous attempt');
    }
    
    // 5. Check disk space for backups
    if (!CONFIG.skipBackup) {
      log('info', 'Checking disk space for backups...');
      // Create backup dir if not exists
      if (!fs.existsSync(CONFIG.backupDir)) {
        fs.mkdirSync(CONFIG.backupDir, { recursive: true });
      }
      log('success', '✅ Backup directory ready');
    }
    
    log('success', '✅ All pre-flight checks passed!');
    return true;
  } catch (error) {
    log('error', `❌ Pre-flight check failed: ${error}`);
    return false;
  }
}

// ==========================================
// BACKUP
// ==========================================

async function createBackup(): Promise<string | null> {
  if (CONFIG.skipBackup) {
    log('warning', '⚠️  Skipping backup (SKIP_BACKUP=true)');
    return null;
  }
  
  log('info', '💾 Creating database backup...');
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(CONFIG.backupDir, `rbac_backup_${timestamp}.sql`);
    
    // Extract database credentials from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      log('error', '❌ DATABASE_URL not set');
      return null;
    }
    
    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.slice(1);
    const username = url.username;
    const password = url.password;
    
    // Create pg_dump command
    const cmd = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} \
      -t users -t role_history -t role_assignment -t custom_permission \
      > "${backupFile}"`;
    
    if (CONFIG.dryRun) {
      log('info', `[DRY RUN] Would execute: ${cmd.replace(password, '***')}`);
      return backupFile;
    }
    
    execSync(cmd, { stdio: 'inherit' });
    
    // Verify backup
    const stats = fs.statSync(backupFile);
    log('success', `✅ Backup created: ${backupFile} (${(stats.size / 1024).toFixed(2)} KB)`);
    
    return backupFile;
  } catch (error) {
    log('error', `❌ Backup failed: ${error}`);
    return null;
  }
}

// ==========================================
// MIGRATION
// ==========================================

async function runMigrations(): Promise<boolean> {
  log('info', '📦 Running migrations...');
  
  try {
    const db = getDatabase();
    const migrations = [
      { file: '001_create_unified_roles.sql', desc: 'Creating unified tables' },
      { file: '002_seed_system_roles.sql', desc: 'Seeding system roles' },
      { file: '003_migrate_role_assignments.sql', desc: 'Migrating role assignments' },
    ];
    
    for (const migration of migrations) {
      log('info', `⏳ ${migration.desc}...`);
      
      const sqlPath = path.join(CONFIG.migrationDir, migration.file);
      const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
      
      if (CONFIG.dryRun) {
        log('info', `[DRY RUN] Would execute migration: ${migration.file}`);
        continue;
      }
      
      // Split into individual statements and execute
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        await db.execute(sql.raw(statement));
      }
      
      log('success', `✅ ${migration.desc} complete`);
    }
    
    log('success', '✅ All migrations completed successfully!');
    return true;
  } catch (error) {
    log('error', `❌ Migration failed: ${error}`);
    return false;
  }
}

// ==========================================
// VERIFICATION
// ==========================================

async function verifyMigration(): Promise<boolean> {
  log('info', '🔍 Verifying migration...');
  
  try {
    const db = getDatabase();
    // 1. Check tables exist
    log('info', 'Checking tables...');
    const tables = ['roles', 'role_assignments', 'permission_overrides', 'role_audit_log', 'role_templates'];
    
    for (const table of tables) {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${table}
        )
      `);
      
      if (!result.rows || !result.rows[0]?.exists) {
        log('error', `❌ Table ${table} not found`);
        return false;
      }
    }
    log('success', '✅ All tables exist');
    
    // 2. Check system roles
    log('info', 'Checking system roles...');
    const roleCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM roles WHERE type = 'system'
    `);
    
    const count = roleCount.rows?.[0]?.count || 0;
    if (count < 11) {
      log('error', `❌ Expected 11 system roles, found ${count}`);
      return false;
    }
    log('success', `✅ System roles present (${count} roles)`);
    
    // 3. Check assignments migrated
    log('info', 'Checking role assignments...');
    const assignmentCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM role_assignments
    `);
    log('success', `✅ Role assignments present (${assignmentCount.rows?.[0]?.count || 0} assignments)`);
    
    // 4. Check indexes
    log('info', 'Checking indexes...');
    const indexes = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM pg_indexes 
      WHERE tablename IN ('roles', 'role_assignments', 'permission_overrides')
    `);
    log('success', `✅ Indexes created (${indexes.rows?.[0]?.count || 0} indexes)`);
    
    log('success', '✅ Migration verification passed!');
    return true;
  } catch (error) {
    log('error', `❌ Verification failed: ${error}`);
    return false;
  }
}

// ==========================================
// ROLLBACK
// ==========================================

async function rollback(): Promise<boolean> {
  log('warning', '⏪ Rolling back migration...');
  
  try {
    const db = getDatabase();
    const rollbackPath = path.join(CONFIG.migrationDir, 'ROLLBACK_unified_rbac.sql');
    const sqlContent = fs.readFileSync(rollbackPath, 'utf-8');
    
    if (CONFIG.dryRun) {
      log('info', '[DRY RUN] Would execute rollback');
      return true;
    }
    
    // Execute rollback
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      await db.execute(sql.raw(statement));
    }
    
    log('success', '✅ Rollback completed');
    return true;
  } catch (error) {
    log('error', `❌ Rollback failed: ${error}`);
    return false;
  }
}

// ==========================================
// MAIN DEPLOYMENT FUNCTION
// ==========================================

async function deploy() {
  const startTime = Date.now();
  
  log('info', '🚀 Starting RBAC Unification Deployment');
  log('info', `Environment: ${CONFIG.environment}`);
  log('info', `Dry Run: ${CONFIG.dryRun}`);
  log('info', '');
  
  try {
    // Step 1: Pre-flight checks
    const checksPass = await preFlightChecks();
    if (!checksPass) {
      log('error', '❌ Pre-flight checks failed. Aborting deployment.');
      process.exit(1);
    }
    log('info', '');
    
    // Step 2: Backup
    const backupFile = await createBackup();
    if (!backupFile && !CONFIG.skipBackup) {
      log('error', '❌ Backup failed. Aborting deployment.');
      process.exit(1);
    }
    log('info', '');
    
    // Step 3: Run migrations
    const migrationSuccess = await runMigrations();
    if (!migrationSuccess) {
      log('error', '❌ Migration failed. Attempting rollback...');
      await rollback();
      process.exit(1);
    }
    log('info', '');
    
    // Step 4: Verify migration
    const verificationSuccess = await verifyMigration();
    if (!verificationSuccess) {
      log('error', '❌ Verification failed. Attempting rollback...');
      await rollback();
      process.exit(1);
    }
    log('info', '');
    
    // Success!
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log('success', '🎉 Deployment completed successfully!');
    log('success', `⏱️  Duration: ${duration}s`);
    
    if (backupFile) {
      log('info', `💾 Backup saved: ${backupFile}`);
    }
    
    log('info', '');
    log('info', '📋 Next steps:');
    log('info', '  1. Monitor logs for errors');
    log('info', '  2. Test role creation in UI');
    log('info', '  3. Verify user assignments');
    log('info', '  4. Check audit trail');
    
  } catch (error) {
    log('error', `❌ Deployment failed with error: ${error}`);
    log('warning', '⏪ Attempting rollback...');
    await rollback();
    process.exit(1);
  }
}

// ==========================================
// CLI
// ==========================================

// Confirmation prompt for production
if (CONFIG.environment === 'production' && !CONFIG.dryRun) {
  logger.debug('\n⚠️  WARNING: You are about to deploy to PRODUCTION!');
  logger.debug('This will modify the production database.');
  logger.debug('\nPress Ctrl+C to cancel, or wait 10 seconds to continue...\n');
  
  setTimeout(() => {
    deploy();
  }, 10000);
} else {
  deploy();
}



