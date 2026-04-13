#!/usr/bin/env node

/**
 * Backup System Setup Script
 * 
 * Configures automated backup system for Neon PostgreSQL database
 * - Creates backup directories
 * - Installs required tools (pg_dump, etc.)
 * - Configures backup schedules
 * - Sets up monitoring and alerts
 * - Creates recovery procedures
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BackupSystemSetup {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.backupDir = path.join(this.rootDir, 'backups');
    this.config = {
      enabled: true,
      schedule: {
        daily: '0 2 * * *',    // 2 AM daily
        weekly: '0 3 * * 0',   // 3 AM Sunday
        monthly: '0 4 1 * *',  // 4 AM 1st of month
      },
      retention: {
        daily: 7,   // Keep 7 daily backups
        weekly: 4,  // Keep 4 weekly backups
        monthly: 12, // Keep 12 monthly backups
      },
      compression: true,
      validation: true,
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    
    console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`);
  }

  checkPrerequisites() {
    this.log('Checking prerequisites...', 'info');

    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable not set');
    }

    // Check if pg_dump is available
    try {
      execSync('pg_dump --version', { stdio: 'pipe' });
      this.log('pg_dump is available', 'success');
    } catch (error) {
      this.log('pg_dump not found. Installing PostgreSQL client tools...', 'warning');
      this.installPostgreSQLTools();
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    
    if (majorVersion < 16) {
      this.log(`Node.js ${nodeVersion} detected. Node 16+ recommended for backup features`, 'warning');
    } else {
      this.log(`Node.js ${nodeVersion} is compatible`, 'success');
    }
  }

  installPostgreSQLTools() {
    this.log('Installing PostgreSQL client tools...', 'info');
    
    try {
      const platform = process.platform;
      
      if (platform === 'darwin') {
        // macOS
        execSync('brew install postgresql', { stdio: 'inherit' });
      } else if (platform === 'linux') {
        // Linux (Ubuntu/Debian)
        try {
          execSync('sudo apt-get update && sudo apt-get install -y postgresql-client', { stdio: 'inherit' });
        } catch {
          // Try yum for RHEL/CentOS
          execSync('sudo yum install -y postgresql', { stdio: 'inherit' });
        }
      } else if (platform === 'win32') {
        this.log('Windows detected. Please install PostgreSQL tools manually:', 'warning');
        this.log('Download from: https://www.postgresql.org/download/windows/', 'info');
        this.log('Or use Chocolatey: choco install postgresql', 'info');
        throw new Error('Manual PostgreSQL installation required on Windows');
      }
      
      this.log('PostgreSQL client tools installed successfully', 'success');
      
    } catch (error) {
      this.log('Failed to install PostgreSQL tools automatically', 'error');
      this.log('Please install pg_dump manually for backup functionality', 'warning');
    }
  }

  createDirectoryStructure() {
    this.log('Creating backup directory structure...', 'info');

    const directories = [
      this.backupDir,
      path.join(this.backupDir, 'daily'),
      path.join(this.backupDir, 'weekly'),
      path.join(this.backupDir, 'monthly'),
      path.join(this.backupDir, 'manual'),
      path.join(this.backupDir, 'logs'),
      path.join(this.backupDir, 'scripts'),
      path.join(this.backupDir, 'recovery'),
      path.join(this.backupDir, 'temp'),
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.log(`Created directory: ${path.relative(this.rootDir, dir)}`, 'success');
      }
    });

    // Create .gitignore for backups
    const gitignorePath = path.join(this.backupDir, '.gitignore');
    const gitignoreContent = `# Backup files - do not commit to repository
*.sql
*.sql.gz
*.dump
*.tar
*.zip

# Keep directory structure
!.gitignore
!scripts/
!recovery/
!logs/.gitkeep

# Temporary files
temp/
*.tmp
*.log

# Sensitive files
*.env
backup-history.json
`;

    fs.writeFileSync(gitignorePath, gitignoreContent);
    
    // Create log directory keeper
    fs.writeFileSync(path.join(this.backupDir, 'logs', '.gitkeep'), '');
  }

  createBackupScripts() {
    this.log('Creating backup scripts...', 'info');

    // Manual backup script
    const manualBackupScript = `#!/bin/bash

# Manual Backup Script for Meridian Database
# Usage: ./manual-backup.sh [description]

set -e

# Configuration
BACKUP_DIR="$(dirname "$0")/.."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DESCRIPTION="\${1:-manual}"
BACKUP_FILE="manual_backup_\${TIMESTAMP}_\${DESCRIPTION}.sql.gz"

echo "🔄 Starting manual backup..."
echo "📁 Backup file: \$BACKUP_FILE"

# Check if DATABASE_URL is set
if [ -z "\$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable not set"
    exit 1
fi

# Create backup
cd "\$BACKUP_DIR/manual"
pg_dump "\$DATABASE_URL" | gzip > "\$BACKUP_FILE"

if [ \$? -eq 0 ]; then
    SIZE=$(du -h "\$BACKUP_FILE" | cut -f1)
    echo "✅ Backup completed successfully"
    echo "📊 Size: \$SIZE"
    echo "📁 Location: manual/\$BACKUP_FILE"
else
    echo "❌ Backup failed"
    exit 1
fi
`;

    const manualScriptPath = path.join(this.backupDir, 'scripts', 'manual-backup.sh');
    fs.writeFileSync(manualScriptPath, manualBackupScript);
    
    try {
      fs.chmodSync(manualScriptPath, '755');
    } catch (error) {
      this.log('Could not set script permissions (non-Unix system)', 'warning');
    }

    // Restore script template
    const restoreScript = `#!/bin/bash

# Database Restore Script for Meridian
# Usage: ./restore.sh <backup-file> [target-database-url]

set -e

BACKUP_FILE="\$1"
TARGET_DB="\${2:-\$DATABASE_URL}"

if [ -z "\$BACKUP_FILE" ]; then
    echo "❌ Usage: \$0 <backup-file> [target-database-url]"
    echo "📁 Available backups:"
    find .. -name "*.sql*" -type f | head -10
    exit 1
fi

if [ -z "\$TARGET_DB" ]; then
    echo "❌ ERROR: No target database URL provided"
    echo "Set DATABASE_URL environment variable or provide as second argument"
    exit 1
fi

echo "⚠️  WARNING: This will overwrite the target database!"
echo "📁 Backup file: \$BACKUP_FILE"
echo "🎯 Target database: \$(echo \$TARGET_DB | sed 's/:.*@/:***@/')"
echo
read -p "Are you sure you want to continue? (type YES to confirm): " confirm

if [ "\$confirm" != "YES" ]; then
    echo "❌ Restore cancelled"
    exit 1
fi

echo "🔄 Starting restore..."

# Determine if file is compressed
if [[ "\$BACKUP_FILE" == *.gz ]]; then
    echo "📦 Decompressing backup file..."
    zcat "\$BACKUP_FILE" | psql "\$TARGET_DB"
else
    psql "\$TARGET_DB" < "\$BACKUP_FILE"
fi

if [ \$? -eq 0 ]; then
    echo "✅ Restore completed successfully"
else
    echo "❌ Restore failed"
    exit 1
fi
`;

    const restoreScriptPath = path.join(this.backupDir, 'scripts', 'restore.sh');
    fs.writeFileSync(restoreScriptPath, restoreScript);
    
    try {
      fs.chmodSync(restoreScriptPath, '755');
    } catch (error) {
      // Windows or permission issue
    }

    this.log('Created backup scripts', 'success');
  }

  createConfigFiles() {
    this.log('Creating configuration files...', 'info');

    // Main backup configuration
    const backupConfig = {
      version: "1.0.0",
      enabled: true,
      database: {
        type: "postgresql",
        connection_env: "DATABASE_URL",
        ssl_required: true,
      },
      schedule: this.config.schedule,
      retention: this.config.retention,
      storage: {
        local: {
          enabled: true,
          path: "./backups",
          compression: true,
        },
        cloud: {
          enabled: false,
          provider: "neon-native",
          config: {
            // Add cloud storage configuration here
          },
        },
      },
      validation: {
        enabled: true,
        checksum_verification: true,
        test_restore: false, // Enable for critical systems
      },
      notifications: {
        success: true,
        failure: true,
        webhook_url: process.env.BACKUP_WEBHOOK_URL || null,
        email: {
          enabled: false,
          recipients: [],
          smtp_config: {},
        },
      },
      security: {
        encryption: false, // Enable if handling sensitive data
        encryption_key_env: "BACKUP_ENCRYPTION_KEY",
      },
    };

    const configPath = path.join(this.backupDir, 'backup-config.json');
    fs.writeFileSync(configPath, JSON.stringify(backupConfig, null, 2));

    // Recovery procedures documentation
    const recoveryProcedures = `# Database Recovery Procedures

## Quick Recovery Commands

### 1. Full Database Restore
\`\`\`bash
# Restore from most recent backup
./scripts/restore.sh $(find . -name "*.sql.gz" -type f -printf '%T@ %p\\n' | sort -n | tail -1 | cut -d' ' -f2-)

# Restore specific backup
./scripts/restore.sh daily/backup-20240101-daily.sql.gz
\`\`\`

### 2. Point-in-Time Recovery
\`\`\`bash
# For point-in-time recovery, use Neon's built-in features
# Contact Neon support or use their dashboard for PITR
\`\`\`

### 3. Partial Data Recovery
\`\`\`bash
# Extract specific tables from backup
pg_restore -t table_name backup_file.sql
\`\`\`

## Recovery Scenarios

### Scenario 1: Complete Database Loss
1. **Immediate Actions**:
   - Stop application to prevent further damage
   - Identify cause of data loss
   - Locate most recent valid backup

2. **Recovery Steps**:
   - Create new database instance if needed
   - Restore from most recent backup
   - Verify data integrity
   - Update application configuration
   - Resume application services

3. **Validation**:
   - Check critical tables and record counts
   - Test application functionality
   - Verify real-time features work

### Scenario 2: Partial Data Corruption
1. **Assessment**:
   - Identify affected tables/data
   - Determine corruption timeframe
   - Choose appropriate backup

2. **Selective Recovery**:
   - Restore specific tables only
   - Merge with existing data if possible
   - Resolve any conflicts

### Scenario 3: Accidental Data Deletion
1. **Immediate Response**:
   - Stop write operations immediately
   - Document what was deleted
   - Choose backup before deletion

2. **Recovery Process**:
   - Restore to temporary database
   - Extract deleted data
   - Import back to main database

## Emergency Contacts
- Database Administrator: [your-email@company.com]
- Neon Support: https://neon.tech/docs/introduction/support
- System Administrator: [admin@company.com]

## Recovery Time Objectives (RTO)
- Database restore: 15-30 minutes
- Application recovery: 5-10 minutes
- Full system recovery: 30-45 minutes

## Recovery Point Objectives (RPO)
- Daily backups: 24 hours max data loss
- Real-time replication: <5 minutes (if configured)
`;

    const recoveryPath = path.join(this.backupDir, 'recovery', 'procedures.md');
    fs.writeFileSync(recoveryPath, recoveryProcedures);

    this.log('Created configuration files', 'success');
  }

  createSystemdService() {
    if (process.platform !== 'linux') {
      this.log('Skipping systemd service creation (not Linux)', 'info');
      return;
    }

    this.log('Creating systemd service for backup scheduling...', 'info');

    const servicePath = path.join(this.backupDir, 'scripts', 'meridian-backup.service');
    const timerPath = path.join(this.backupDir, 'scripts', 'meridian-backup.timer');

    const serviceContent = `[Unit]
Description=Meridian Database Backup Service
Wants=meridian-backup.timer

[Service]
Type=oneshot
User=root
WorkingDirectory=${this.rootDir}
Environment=DATABASE_URL=${process.env.DATABASE_URL || 'your-database-url'}
ExecStart=/usr/bin/node ${path.join(__dirname, 'run-backup.js')}
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
`;

    const timerContent = `[Unit]
Description=Run Meridian Database Backup Daily
Requires=meridian-backup.service

[Timer]
OnCalendar=daily
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
`;

    fs.writeFileSync(servicePath, serviceContent);
    fs.writeFileSync(timerPath, timerContent);

    this.log('Created systemd service files', 'success');
    this.log('To install: sudo cp scripts/meridian-backup.* /etc/systemd/system/', 'info');
    this.log('Then run: sudo systemctl enable meridian-backup.timer', 'info');
  }

  createRunnerScript() {
    this.log('Creating backup runner script...', 'info');

    const runnerScript = `#!/usr/bin/env node

/**
 * Backup Runner Script
 * Used by cron jobs and systemd services to run scheduled backups
 */

const path = require('path');
const { createBackupManager } = require('../src/monitoring/backup-manager');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const backupManager = createBackupManager(connectionString);
  
  try {
    // Determine backup type based on date
    const now = new Date();
    const dayOfMonth = now.getDate();
    const dayOfWeek = now.getDay();
    
    let backupType = 'daily';
    
    if (dayOfMonth === 1) {
      backupType = 'monthly';
    } else if (dayOfWeek === 0) { // Sunday
      backupType = 'weekly';
    }
    
    console.log(\`🔄 Starting \${backupType} backup...\`);
    const result = await backupManager.createBackup(backupType);
    
    console.log(\`✅ Backup completed: \${result.id}\`);
    console.log(\`📊 Size: \${(result.size / 1024 / 1024).toFixed(2)} MB\`);
    console.log(\`⏱️  Duration: \${result.duration}ms\`);
    
  } catch (error) {
    console.error(\`❌ Backup failed: \${error.message}\`);
    process.exit(1);
  } finally {
    await backupManager.close();
  }
}

main().catch(error => {
  console.error('Backup runner failed:', error);
  process.exit(1);
});
`;

    const runnerPath = path.join(this.backupDir, 'scripts', 'run-backup.js');
    fs.writeFileSync(runnerPath, runnerScript);

    try {
      fs.chmodSync(runnerPath, '755');
    } catch (error) {
      // Windows or permission issue
    }

    this.log('Created backup runner script', 'success');
  }

  createCronEntries() {
    this.log('Creating cron configuration...', 'info');

    const cronEntries = `# Meridian Database Backup Cron Jobs
# Add these entries to your crontab with: crontab -e

# Daily backup at 2:00 AM
${this.config.schedule.daily} cd ${this.rootDir} && node backups/scripts/run-backup.js >> backups/logs/cron.log 2>&1

# Weekly backup on Sunday at 3:00 AM (runs in addition to daily)
# ${this.config.schedule.weekly} cd ${this.rootDir} && node backups/scripts/run-backup.js weekly >> backups/logs/cron.log 2>&1

# Monthly backup on 1st day at 4:00 AM (runs in addition to daily)
# ${this.config.schedule.monthly} cd ${this.rootDir} && node backups/scripts/run-backup.js monthly >> backups/logs/cron.log 2>&1

# Backup cleanup - remove old backups beyond retention period
0 5 * * * cd ${this.rootDir} && node backups/scripts/cleanup-old-backups.js >> backups/logs/cleanup.log 2>&1
`;

    const cronPath = path.join(this.backupDir, 'scripts', 'cron-entries.txt');
    fs.writeFileSync(cronPath, cronEntries);

    this.log('Created cron configuration', 'success');
    this.log('To install cron jobs: crontab scripts/cron-entries.txt', 'info');
  }

  testBackupSystem() {
    this.log('Testing backup system...', 'info');

    // Test backup configuration
    const configPath = path.join(this.backupDir, 'backup-config.json');
    if (!fs.existsSync(configPath)) {
      throw new Error('Backup configuration file not found');
    }

    // Test directory structure
    const requiredDirs = ['daily', 'weekly', 'monthly', 'scripts', 'logs', 'recovery'];
    for (const dir of requiredDirs) {
      const dirPath = path.join(this.backupDir, dir);
      if (!fs.existsSync(dirPath)) {
        throw new Error(`Required directory not found: ${dir}`);
      }
    }

    // Test script permissions
    const scriptPath = path.join(this.backupDir, 'scripts', 'manual-backup.sh');
    try {
      fs.accessSync(scriptPath, fs.constants.F_OK);
    } catch (error) {
      throw new Error('Backup scripts not accessible');
    }

    this.log('Backup system test completed successfully', 'success');
  }

  generateSetupReport() {
    const report = {
      timestamp: new Date().toISOString(),
      setup_completed: true,
      configuration: this.config,
      directories_created: [
        'backups/daily',
        'backups/weekly', 
        'backups/monthly',
        'backups/scripts',
        'backups/logs',
        'backups/recovery',
      ],
      scripts_created: [
        'scripts/manual-backup.sh',
        'scripts/restore.sh',
        'scripts/run-backup.js',
        'scripts/cron-entries.txt',
      ],
      next_steps: [
        'Configure DATABASE_URL environment variable',
        'Set up cron jobs: crontab scripts/cron-entries.txt',
        'Test manual backup: ./scripts/manual-backup.sh test',
        'Configure monitoring webhook (optional)',
        'Enable cloud storage backup (optional)',
      ],
      monitoring_endpoints: {
        backup_history: 'GET /api/backup/history',
        latest_backup: 'GET /api/backup/latest',
        storage_usage: 'GET /api/backup/storage',
      },
    };

    const reportPath = path.join(this.backupDir, 'setup-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  async run() {
    try {
      this.log('🚀 Starting backup system setup...', 'info');
      
      this.checkPrerequisites();
      this.createDirectoryStructure();
      this.createBackupScripts();
      this.createConfigFiles();
      this.createSystemdService();
      this.createRunnerScript();
      this.createCronEntries();
      this.testBackupSystem();
      
      const report = this.generateSetupReport();
      
      this.log('', 'info');
      this.log('🎉 Backup system setup completed successfully!', 'success');
      this.log('===========================================', 'info');
      this.log('', 'info');
      this.log('📋 Next Steps:', 'info');
      this.log('1. Configure DATABASE_URL environment variable', 'info');
      this.log('2. Test manual backup: cd backups && ./scripts/manual-backup.sh test', 'info');
      this.log('3. Set up automated backups: crontab scripts/cron-entries.txt', 'info');
      this.log('4. Configure monitoring (optional)', 'info');
      this.log('', 'info');
      this.log(`📊 Setup report saved: ${path.relative(process.cwd(), path.join(this.backupDir, 'setup-report.json'))}`, 'info');
      
      return report;
      
    } catch (error) {
      this.log(`Setup failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new BackupSystemSetup();
  setup.run()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Backup setup failed:', error);
      process.exit(1);
    });
}

module.exports = BackupSystemSetup;