#!/usr/bin/env node

/**
 * Disaster Recovery Plan Generator and Executor
 * 
 * Creates comprehensive disaster recovery procedures for Meridian platform
 * - Database recovery scenarios
 * - Application recovery procedures
 * - Infrastructure restoration
 * - Business continuity planning
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DisasterRecoveryPlan {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.planDir = path.join(this.rootDir, 'disaster-recovery');
    this.currentTime = new Date().toISOString();
    
    // Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO)
    this.objectives = {
      database: {
        rto: '30 minutes',  // Maximum downtime acceptable
        rpo: '24 hours',    // Maximum data loss acceptable
      },
      application: {
        rto: '15 minutes',
        rpo: '1 hour',
      },
      infrastructure: {
        rto: '45 minutes',
        rpo: '4 hours',
      },
    };
    
    this.scenarios = [
      'database_corruption',
      'complete_data_loss',
      'server_failure',
      'neon_service_outage',
      'application_failure',
      'security_breach',
      'natural_disaster',
    ];
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      critical: '\x1b[41m',
      reset: '\x1b[0m'
    };
    
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      critical: '🚨'
    };
    
    console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`);
  }

  ensureDirectories() {
    const directories = [
      this.planDir,
      path.join(this.planDir, 'scenarios'),
      path.join(this.planDir, 'procedures'),
      path.join(this.planDir, 'templates'),
      path.join(this.planDir, 'scripts'),
      path.join(this.planDir, 'documentation'),
      path.join(this.planDir, 'tests'),
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  generateMasterPlan() {
    this.log('Generating master disaster recovery plan...', 'info');

    const masterPlan = `# Meridian Platform Disaster Recovery Plan

**Document Version**: 1.0  
**Last Updated**: ${this.currentTime}  
**Next Review**: ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}

---

## Executive Summary

This document outlines comprehensive disaster recovery procedures for the Meridian project management platform. It covers various failure scenarios and provides step-by-step recovery procedures to ensure business continuity.

### Recovery Objectives

| Component | RTO (Recovery Time) | RPO (Data Loss) | Priority |
|-----------|--------------------|--------------------|----------|
| Database | ${this.objectives.database.rto} | ${this.objectives.database.rpo} | Critical |
| Application | ${this.objectives.application.rto} | ${this.objectives.application.rpo} | High |
| Infrastructure | ${this.objectives.infrastructure.rto} | ${this.objectives.infrastructure.rpo} | Medium |

---

## Emergency Response Team

### Primary Contacts
- **Incident Commander**: [Your Name] - [phone] - [email]
- **Database Administrator**: [DBA Name] - [phone] - [email]
- **System Administrator**: [SysAdmin Name] - [phone] - [email]
- **Application Lead**: [Dev Lead Name] - [phone] - [email]

### External Contacts
- **Neon Support**: https://neon.tech/docs/introduction/support
- **Hosting Provider**: [Provider Support Info]
- **Domain Registrar**: [Registrar Support Info]

---

## Disaster Scenarios

### 1. Database Corruption/Loss
**Probability**: Medium  
**Impact**: Critical  
**Recovery Procedure**: [scenarios/database-recovery.md](scenarios/database-recovery.md)

### 2. Complete Server Failure
**Probability**: Low  
**Impact**: Critical  
**Recovery Procedure**: [scenarios/server-failure.md](scenarios/server-failure.md)

### 3. Neon Service Outage
**Probability**: Low  
**Impact**: High  
**Recovery Procedure**: [scenarios/neon-outage.md](scenarios/neon-outage.md)

### 4. Application Failure
**Probability**: Medium  
**Impact**: Medium  
**Recovery Procedure**: [scenarios/application-failure.md](scenarios/application-failure.md)

### 5. Security Breach
**Probability**: Medium  
**Impact**: Critical  
**Recovery Procedure**: [scenarios/security-breach.md](scenarios/security-breach.md)

---

## Quick Reference Emergency Procedures

### Immediate Response (First 5 Minutes)
1. **Assess the situation** - Determine scope and impact
2. **Notify team** - Alert emergency response team
3. **Stop further damage** - Isolate affected systems
4. **Begin documentation** - Log all actions taken

### Database Emergency
\`\`\`bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT NOW();"

# List recent backups
ls -la backups/daily/ | tail -5

# Restore from backup (if needed)
./backups/scripts/restore.sh backups/daily/latest-backup.sql.gz
\`\`\`

### Application Emergency
\`\`\`bash
# Check application status
curl -f http://localhost:3005/health || echo "App down"

# Restart application
pm2 restart meridian-api
pm2 restart meridian-web

# Check logs
tail -f logs/application.log
\`\`\`

---

## Communication Plan

### Internal Communications
- **Slack Channel**: #incident-response
- **Email List**: incident-team@company.com
- **Phone Tree**: [Primary → Secondary → Tertiary contacts]

### External Communications
- **Status Page**: status.meridian.com (if available)
- **Customer Support**: support@meridian.app
- **Social Media**: @MeridianApp (if applicable)

### Communication Templates
- Initial incident notification
- Progress updates
- Resolution announcement
- Post-incident review

---

## Testing and Maintenance

### Monthly Tests
- Backup restoration test
- Failover procedure test
- Communication plan test

### Quarterly Reviews
- Update contact information
- Review and update procedures
- Conduct full disaster recovery drill

### Annual Activities
- Complete plan review and update
- Staff training and certification
- Vendor relationship review

---

## Compliance and Documentation

### Required Documentation
- Incident response logs
- Recovery procedure execution records
- Post-incident analysis reports
- Training completion certificates

### Compliance Requirements
- Data protection regulations
- Industry standards (SOC 2, ISO 27001, etc.)
- Customer contractual obligations

---

## Appendices

### A. Contact Information
[Complete emergency contact directory]

### B. System Architecture
[Current system architecture diagrams]

### C. Vendor Information
[Complete vendor contact and contract information]

### D. Recovery Scripts
[Location of all automated recovery scripts]
`;

    const masterPlanPath = path.join(this.planDir, 'master-plan.md');
    fs.writeFileSync(masterPlanPath, masterPlan);

    this.log('Master disaster recovery plan created', 'success');
  }

  generateDatabaseRecoveryScenario() {
    this.log('Generating database recovery scenario...', 'info');

    const databaseScenario = `# Database Recovery Scenario

## Scenario: Database Corruption or Complete Loss

### Symptoms
- Database connection failures
- Query errors or timeouts
- Data inconsistency reports
- Application cannot start due to DB errors

### Immediate Assessment (2-3 minutes)

#### Step 1: Check Database Connectivity
\`\`\`bash
# Test basic connection
psql "$DATABASE_URL" -c "SELECT NOW(), version();"

# Check current connections
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity;"
\`\`\`

#### Step 2: Assess Damage Scope
\`\`\`bash
# Check if specific tables are accessible
psql "$DATABASE_URL" -c "SELECT count(*) FROM users LIMIT 1;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM workspaces LIMIT 1;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM projects LIMIT 1;"

# Check for corruption indicators
psql "$DATABASE_URL" -c "SELECT * FROM pg_stat_database WHERE datname = current_database();"
\`\`\`

### Recovery Procedures

#### Option A: Partial Database Issues (Preferred)

1. **Identify Problematic Tables**
   \`\`\`bash
   # Check individual tables
   for table in users workspaces projects tasks messages; do
     echo "Checking $table..."
     psql "$DATABASE_URL" -c "SELECT count(*) FROM $table;" || echo "$table is corrupted"
   done
   \`\`\`

2. **Selective Recovery**
   \`\`\`bash
   # Extract specific tables from backup
   pg_restore -t corrupted_table_name latest_backup.sql
   \`\`\`

#### Option B: Complete Database Restoration (If Option A fails)

1. **Stop All Applications**
   \`\`\`bash
   # Stop application servers
   pm2 stop meridian-api
   pm2 stop meridian-web
   
   # Stop any background jobs
   pkill -f "node.*meridian"
   \`\`\`

2. **Identify Latest Valid Backup**
   \`\`\`bash
   # List available backups with timestamps
   find backups/ -name "*.sql*" -type f -exec ls -lh {} \\; | sort -k6,7
   
   # Choose the most recent backup before the incident
   BACKUP_FILE="backups/daily/backup-YYYYMMDD-daily.sql.gz"
   \`\`\`

3. **Verify Backup Integrity**
   \`\`\`bash
   # Check backup file exists and is not corrupted
   test -f "$BACKUP_FILE" || echo "ERROR: Backup file not found"
   
   # Check file size (should be > 1MB for populated database)
   ls -lh "$BACKUP_FILE"
   
   # Verify checksum if available
   sha256sum "$BACKUP_FILE"
   \`\`\`

4. **Create New Database (Neon)**
   - Option 1: Use Neon Console to create new database
   - Option 2: Create via API (if available)
   - Update DATABASE_URL with new connection string

5. **Execute Restoration**
   \`\`\`bash
   # Restore from backup
   cd backups
   ./scripts/restore.sh "$BACKUP_FILE" "$NEW_DATABASE_URL"
   \`\`\`

6. **Validate Restoration**
   \`\`\`bash
   # Check critical tables
   psql "$NEW_DATABASE_URL" -c "SELECT count(*) FROM users;"
   psql "$NEW_DATABASE_URL" -c "SELECT count(*) FROM workspaces;"
   psql "$NEW_DATABASE_URL" -c "SELECT count(*) FROM projects;"
   psql "$NEW_DATABASE_URL" -c "SELECT count(*) FROM tasks;"
   
   # Verify recent data
   psql "$NEW_DATABASE_URL" -c "SELECT max(created_at) FROM tasks;"
   \`\`\`

7. **Update Application Configuration**
   \`\`\`bash
   # Update environment variable
   export DATABASE_URL="$NEW_DATABASE_URL"
   
   # Update .env file
   echo "DATABASE_URL=$NEW_DATABASE_URL" > .env.production
   \`\`\`

8. **Restart Applications**
   \`\`\`bash
   # Start API server
   pm2 start meridian-api
   
   # Verify API is responding
   curl -f http://localhost:3005/health
   
   # Start web application
   pm2 start meridian-web
   \`\`\`

### Post-Recovery Validation

#### Functional Tests
1. **User Authentication**
   - Test login/logout functionality
   - Verify session management

2. **Core Features**
   - Create/edit/delete projects
   - Task management operations
   - Real-time messaging
   - File uploads

3. **Data Integrity**
   - Verify user data completeness
   - Check project/task relationships
   - Validate message history

#### Performance Tests
\`\`\`bash
# Check query performance
time psql "$DATABASE_URL" -c "SELECT count(*) FROM tasks;"

# Monitor connection pool
psql "$DATABASE_URL" -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
\`\`\`

### Recovery Time Estimate
- **Assessment**: 2-5 minutes
- **Backup verification**: 2-3 minutes
- **Database creation**: 5-10 minutes
- **Restoration**: 10-20 minutes (depending on backup size)
- **Validation**: 5-10 minutes
- **Total**: 25-50 minutes

### Data Loss Estimate
- Maximum 24 hours (based on daily backup schedule)
- Minimum varies based on backup frequency and incident timing

### Post-Incident Actions
1. **Root Cause Analysis**
   - Determine what caused the database corruption
   - Document timeline of events
   - Identify prevention measures

2. **Backup Strategy Review**
   - Consider increasing backup frequency
   - Implement real-time replication if needed
   - Review backup validation procedures

3. **Monitoring Improvements**
   - Add database health checks
   - Set up corruption detection alerts
   - Implement automated failover if budget allows

### Prevention Measures
- Regular backup validation
- Database monitoring and alerting
- Connection pool monitoring
- Query performance monitoring
- Automated health checks
`;

    const scenarioPath = path.join(this.planDir, 'scenarios', 'database-recovery.md');
    fs.writeFileSync(scenarioPath, databaseScenario);
  }

  generateApplicationFailureScenario() {
    const applicationScenario = `# Application Failure Recovery

## Scenario: Application Server Failure or Crash

### Symptoms
- HTTP 503/504 errors
- Application not responding
- Memory/CPU exhaustion
- Process crashes

### Quick Recovery Steps

1. **Check Process Status**
   \`\`\`bash
   pm2 status
   ps aux | grep node
   \`\`\`

2. **Restart Application**
   \`\`\`bash
   pm2 restart meridian-api
   pm2 restart meridian-web
   \`\`\`

3. **Verify Recovery**
   \`\`\`bash
   curl -f http://localhost:3005/health
   curl -f http://localhost:5173/
   \`\`\`

### Full Recovery Procedure in scenarios/application-failure.md
`;

    fs.writeFileSync(
      path.join(this.planDir, 'scenarios', 'application-failure.md'), 
      applicationScenario
    );
  }

  generateRecoveryScripts() {
    this.log('Generating automated recovery scripts...', 'info');

    // Emergency database restore script
    const emergencyRestoreScript = `#!/bin/bash

# EMERGENCY DATABASE RESTORE SCRIPT
# This script performs rapid database restoration for disaster recovery

set -e

echo "🚨 EMERGENCY DATABASE RESTORE"
echo "================================"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "❌ Usage: $0 <backup-file> [target-database-url]"
    echo "📁 Available backups:"
    find ../backups -name "*.sql*" -type f -printf '%T@ %p\\n' | sort -n | tail -10 | cut -d' ' -f2-
    exit 1
fi

BACKUP_FILE="$1"
TARGET_DB="\${2:-$DATABASE_URL}"

if [ -z "$TARGET_DB" ]; then
    echo "❌ ERROR: No target database URL provided"
    exit 1
fi

echo "⚠️  DANGER: This will completely replace the target database!"
echo "📁 Backup: $BACKUP_FILE"
echo "🎯 Target: $(echo $TARGET_DB | sed 's/:.*@/:***@/')"

# In emergency mode, skip confirmation for automation
if [ "$EMERGENCY_MODE" != "true" ]; then
    read -p "Type 'RESTORE' to confirm: " confirm
    if [ "$confirm" != "RESTORE" ]; then
        echo "❌ Restore cancelled"
        exit 1
    fi
fi

# Verify backup file
echo "🔍 Verifying backup file..."
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "📊 Backup size: $SIZE"

# Stop applications
echo "🛑 Stopping applications..."
pm2 stop meridian-api meridian-web 2>/dev/null || true

# Restore database
echo "🔄 Starting restore..."
START_TIME=$(date +%s)

if [[ "$BACKUP_FILE" == *.gz ]]; then
    zcat "$BACKUP_FILE" | psql "$TARGET_DB"
else
    psql "$TARGET_DB" < "$BACKUP_FILE"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "✅ Restore completed in ${DURATION} seconds"

# Restart applications
echo "🚀 Restarting applications..."
pm2 start meridian-api
sleep 5
pm2 start meridian-web

# Verify restoration
echo "🔍 Verifying restoration..."
sleep 10

if curl -f http://localhost:3005/health >/dev/null 2>&1; then
    echo "✅ API server is responding"
else
    echo "❌ API server not responding"
fi

echo "🎉 Emergency restore completed!"
echo "🔍 Please run full validation tests"
`;

    fs.writeFileSync(
      path.join(this.planDir, 'scripts', 'emergency-restore.sh'),
      emergencyRestoreScript
    );

    try {
      fs.chmodSync(path.join(this.planDir, 'scripts', 'emergency-restore.sh'), '755');
    } catch (error) {
      // Windows or permission issue
    }

    // Health check script
    const healthCheckScript = `#!/bin/bash

# SYSTEM HEALTH CHECK SCRIPT
# Comprehensive health check for disaster recovery validation

echo "🏥 MERIDIAN SYSTEM HEALTH CHECK"
echo "============================="

HEALTH_SCORE=0
TOTAL_CHECKS=10

# Database connectivity
echo -n "🗄️  Database connectivity... "
if psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; then
    echo "✅ OK"
    ((HEALTH_SCORE++))
else
    echo "❌ FAILED"
fi

# API server
echo -n "🔧 API server... "
if curl -f http://localhost:3005/health >/dev/null 2>&1; then
    echo "✅ OK"
    ((HEALTH_SCORE++))
else
    echo "❌ FAILED"
fi

# Web application
echo -n "🌐 Web application... "
if curl -f http://localhost:5173/ >/dev/null 2>&1; then
    echo "✅ OK"
    ((HEALTH_SCORE++))
else
    echo "❌ FAILED"
fi

# Critical tables
for table in users workspaces projects tasks; do
    echo -n "📊 Table $table... "
    if psql "$DATABASE_URL" -c "SELECT count(*) FROM $table LIMIT 1" >/dev/null 2>&1; then
        echo "✅ OK"
        ((HEALTH_SCORE++))
    else
        echo "❌ FAILED"
    fi
done

# WebSocket functionality
echo -n "🔌 WebSocket server... "
if nc -z localhost 3006 2>/dev/null; then
    echo "✅ OK"
    ((HEALTH_SCORE++))
else
    echo "❌ FAILED"
fi

# File system
echo -n "💾 Backup directory... "
if [ -d "../backups" ] && [ -w "../backups" ]; then
    echo "✅ OK"
    ((HEALTH_SCORE++))
else
    echo "❌ FAILED"
fi

echo ""
echo "📊 HEALTH SCORE: $HEALTH_SCORE/$TOTAL_CHECKS"

if [ "$HEALTH_SCORE" -eq "$TOTAL_CHECKS" ]; then
    echo "🎉 System is fully operational"
    exit 0
elif [ "$HEALTH_SCORE" -ge $((TOTAL_CHECKS * 3 / 4)) ]; then
    echo "⚠️  System has minor issues"
    exit 1
else
    echo "🚨 System has critical issues"
    exit 2
fi
`;

    fs.writeFileSync(
      path.join(this.planDir, 'scripts', 'health-check.sh'),
      healthCheckScript
    );

    try {
      fs.chmodSync(path.join(this.planDir, 'scripts', 'health-check.sh'), '755');
    } catch (error) {
      // Windows or permission issue
    }

    this.log('Recovery scripts created', 'success');
  }

  generateTestProcedures() {
    this.log('Generating disaster recovery test procedures...', 'info');

    const testProcedures = `# Disaster Recovery Testing Procedures

## Monthly DR Tests

### Test 1: Backup Restoration Test
**Frequency**: Monthly  
**Duration**: 30 minutes  
**Objective**: Verify backup can be successfully restored

#### Procedure
1. Create test database instance
2. Restore from most recent backup
3. Validate data integrity
4. Document results

#### Success Criteria
- Backup restores without errors
- All critical tables present
- Data counts match expected ranges
- Restoration completes within RTO

### Test 2: Application Failover Test
**Frequency**: Monthly  
**Duration**: 15 minutes  
**Objective**: Verify application can be restarted after failure

#### Procedure
1. Simulate application crash
2. Execute restart procedures
3. Validate functionality
4. Document recovery time

### Test 3: Communication Plan Test
**Frequency**: Monthly  
**Duration**: 10 minutes  
**Objective**: Verify emergency communication channels

## Quarterly DR Tests

### Full Disaster Simulation
**Frequency**: Quarterly  
**Duration**: 2 hours  
**Objective**: End-to-end disaster recovery validation

#### Scenario
Complete system failure requiring full restoration

#### Procedure
1. Document current system state
2. Simulate complete failure
3. Execute full recovery procedures
4. Validate all systems operational
5. Document lessons learned

## Annual DR Tests

### Complete DR Plan Review
**Frequency**: Annually  
**Duration**: 1 day  
**Objective**: Comprehensive plan validation and update

#### Activities
- Full plan review and update
- Staff training on procedures
- Vendor contact validation
- Infrastructure assessment
- Plan distribution

## Test Documentation Template

### Test Report Format
- Test Date/Time
- Test Type
- Participants
- Procedures Executed
- Results
- Issues Identified
- Recommendations
- Sign-off

### Key Metrics to Track
- Recovery Time Actual vs. RTO
- Data Loss Actual vs. RPO
- Procedure Effectiveness
- Staff Readiness
- Communication Effectiveness
`;

    fs.writeFileSync(
      path.join(this.planDir, 'procedures', 'testing.md'),
      testProcedures
    );
  }

  generateContactDirectory() {
    const contactDirectory = `# Emergency Contact Directory

## Internal Team

### Primary Response Team
| Role | Name | Phone | Email | Backup |
|------|------|-------|-------|---------|
| Incident Commander | [Name] | [Phone] | [Email] | [Backup] |
| Database Admin | [Name] | [Phone] | [Email] | [Backup] |
| System Admin | [Name] | [Phone] | [Email] | [Backup] |
| Application Lead | [Name] | [Phone] | [Email] | [Backup] |

### Secondary Response Team
| Role | Name | Phone | Email |
|------|------|-------|-------|
| Frontend Lead | [Name] | [Phone] | [Email] |
| DevOps Engineer | [Name] | [Phone] | [Email] |
| QA Lead | [Name] | [Phone] | [Email] |

## External Vendors

### Database & Infrastructure
- **Neon**: https://neon.tech/docs/introduction/support
- **Hosting Provider**: [Contact Info]
- **CDN Provider**: [Contact Info]
- **DNS Provider**: [Contact Info]

### Business Services
- **Domain Registrar**: [Contact Info]
- **SSL Certificate Provider**: [Contact Info]
- **Email Service**: [Contact Info]
- **Monitoring Service**: [Contact Info]

## Escalation Matrix

### Severity Levels
1. **Critical** (System down) → Incident Commander → CTO → CEO
2. **High** (Major functionality impacted) → Team Lead → Incident Commander
3. **Medium** (Some functionality impacted) → Primary responder → Team Lead
4. **Low** (Minor issues) → Primary responder

### Communication Schedule
- **Initial notification**: Within 15 minutes of incident
- **Status updates**: Every 30 minutes during active recovery
- **Resolution notification**: Within 15 minutes of resolution
- **Post-incident report**: Within 24 hours
`;

    fs.writeFileSync(
      path.join(this.planDir, 'documentation', 'contacts.md'),
      contactDirectory
    );
  }

  async run() {
    try {
      this.log('🚨 Generating comprehensive disaster recovery plan...', 'info');
      
      this.ensureDirectories();
      this.generateMasterPlan();
      this.generateDatabaseRecoveryScenario();
      this.generateApplicationFailureScenario();
      this.generateRecoveryScripts();
      this.generateTestProcedures();
      this.generateContactDirectory();
      
      // Create README
      const readmePath = path.join(this.planDir, 'README.md');
      const readme = `# Meridian Disaster Recovery Plan

This directory contains comprehensive disaster recovery procedures for the Meridian platform.

## Quick Start Emergency Procedures

### Database Emergency
\`\`\`bash
./scripts/emergency-restore.sh backups/daily/latest-backup.sql.gz
\`\`\`

### System Health Check
\`\`\`bash
./scripts/health-check.sh
\`\`\`

## Documents
- **[Master Plan](master-plan.md)** - Complete disaster recovery plan
- **[Database Recovery](scenarios/database-recovery.md)** - Database-specific procedures
- **[Testing Procedures](procedures/testing.md)** - Regular DR testing
- **[Contact Directory](documentation/contacts.md)** - Emergency contacts

## Recovery Scripts
- **emergency-restore.sh** - Rapid database restoration
- **health-check.sh** - System health validation

## Important Notes
⚠️ These procedures should be tested regularly  
⚠️ Update contact information quarterly  
⚠️ Review and update procedures after any major system changes
`;
      
      fs.writeFileSync(readmePath, readme);
      
      this.log('', 'info');
      this.log('🎉 Disaster Recovery Plan generated successfully!', 'success');
      this.log('================================================', 'info');
      this.log('', 'info');
      this.log('📋 Plan Components Created:', 'info');
      this.log('• Master disaster recovery plan', 'success');
      this.log('• Database recovery procedures', 'success');
      this.log('• Application failure procedures', 'success');
      this.log('• Emergency recovery scripts', 'success');
      this.log('• Testing procedures', 'success');
      this.log('• Contact directory template', 'success');
      this.log('', 'info');
      this.log('📍 Location: disaster-recovery/', 'info');
      this.log('', 'info');
      this.log('⚠️ IMPORTANT NEXT STEPS:', 'warning');
      this.log('1. Review and customize contact information', 'info');
      this.log('2. Test emergency recovery scripts', 'info');
      this.log('3. Schedule monthly DR testing', 'info');
      this.log('4. Train team on procedures', 'info');
      this.log('5. Distribute plan to key stakeholders', 'info');
      
      return {
        planDirectory: this.planDir,
        scenarios: this.scenarios.length,
        objectives: this.objectives,
        scriptsCreated: [
          'emergency-restore.sh',
          'health-check.sh'
        ]
      };
      
    } catch (error) {
      this.log(`Disaster recovery plan generation failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const drPlan = new DisasterRecoveryPlan();
  drPlan.run()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Disaster recovery plan generation failed:', error);
      process.exit(1);
    });
}

module.exports = DisasterRecoveryPlan;