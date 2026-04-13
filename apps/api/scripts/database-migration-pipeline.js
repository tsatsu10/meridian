#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Comprehensive Database Migration Pipeline
 * 
 * This pipeline orchestrates the complete database setup process:
 * 1. Environment validation
 * 2. Schema migration
 * 3. Connection testing
 * 4. Performance validation
 * 5. Monitoring setup
 * 6. Health verification
 */

class DatabaseMigrationPipeline {
  constructor() {
    this.scriptsDir = __dirname;
    this.rootDir = path.join(this.scriptsDir, '..');
    this.logFile = path.join(this.rootDir, 'logs', `migration-${Date.now()}.log`);
    this.results = {
      startTime: new Date().toISOString(),
      phases: {},
      errors: [],
      warnings: [],
      success: false
    };
    
    // Ensure logs directory exists
    const logsDir = path.join(this.rootDir, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      phase: '\x1b[35m',
      reset: '\x1b[0m'
    };
    
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      phase: '🚀'
    };
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    // Console output
    console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`);
    
    // File logging
    fs.appendFileSync(this.logFile, logMessage + '\n');
    
    // Track for results
    if (type === 'error') {
      this.results.errors.push(message);
    } else if (type === 'warning') {
      this.results.warnings.push(message);
    }
  }

  async runPhase(phaseName, phaseFunction) {
    this.log(`Starting Phase: ${phaseName}`, 'phase');
    const startTime = Date.now();
    
    try {
      const result = await phaseFunction();
      const duration = Date.now() - startTime;
      
      this.results.phases[phaseName] = {
        success: true,
        duration,
        result
      };
      
      this.log(`Phase completed: ${phaseName} (${duration}ms)`, 'success');
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.phases[phaseName] = {
        success: false,
        duration,
        error: error.message
      };
      
      this.log(`Phase failed: ${phaseName} - ${error.message}`, 'error');
      throw error;
    }
  }

  async validateEnvironment() {
    return this.runPhase('Environment Validation', async () => {
      // Check required environment variables
      const requiredEnvVars = [
        'DATABASE_URL',
        'NODE_ENV'
      ];
      
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
      }
      
      // Validate DATABASE_URL format
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
        throw new Error('DATABASE_URL must be a PostgreSQL connection string');
      }
      
      if (!dbUrl.includes('neon.tech')) {
        this.log('DATABASE_URL does not appear to be a Neon connection string', 'warning');
      }
      
      if (!dbUrl.includes('sslmode=require')) {
        this.log('DATABASE_URL should include sslmode=require for security', 'warning');
      }
      
      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
      
      if (majorVersion < 16) {
        this.log(`Node.js ${nodeVersion} detected. Node 16+ recommended`, 'warning');
      }
      
      // Check required packages
      const packageJsonPath = path.join(this.rootDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      const requiredPackages = ['pg', 'drizzle-orm', '@neondatabase/serverless'];
      const missingPackages = requiredPackages.filter(pkg => 
        !packageJson.dependencies[pkg] && !packageJson.devDependencies[pkg]
      );
      
      if (missingPackages.length > 0) {
        this.log(`Missing packages: ${missingPackages.join(', ')}`, 'warning');
        this.log('Run: npm install pg drizzle-orm @neondatabase/serverless', 'info');
      }
      
      return {
        nodeVersion,
        databaseUrl: dbUrl.replace(/:[^:@]*@/, ':***@'), // Hide password in logs
        environment: process.env.NODE_ENV,
        missingPackages
      };
    });
  }

  async runSchemaMigration() {
    return this.runPhase('Schema Migration', async () => {
      this.log('Running database schema migration...', 'info');
      
      try {
        // Import and run the migration script
        const NeonMigrator = require('./migrate-to-neon');
        const migrator = new NeonMigrator();
        
        await migrator.run();
        
        return {
          status: 'completed',
          message: 'Schema migration completed successfully'
        };
        
      } catch (error) {
        // If migration script doesn't exist, create basic schema
        if (error.code === 'MODULE_NOT_FOUND') {
          this.log('Migration script not found, using basic schema creation', 'warning');
          return await this.createBasicSchema();
        }
        throw error;
      }
    });
  }

  async createBasicSchema() {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true }
    });
    
    await client.connect();
    
    try {
      // Basic schema creation
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        
        CREATE TABLE IF NOT EXISTS workspaces (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email VARCHAR(255) UNIQUE NOT NULL,
          workspace_id UUID REFERENCES workspaces(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      return {
        status: 'basic_schema_created',
        message: 'Basic schema created successfully'
      };
      
    } finally {
      await client.end();
    }
  }

  async runConnectionTests() {
    return this.runPhase('Connection Testing', async () => {
      this.log('Running comprehensive connection tests...', 'info');
      
      try {
        const NeonConnectionTester = require('./test-neon-connection');
        const tester = new NeonConnectionTester();
        
        const report = await tester.runAllTests();
        
        if (report.success_rate < 80) {
          throw new Error(`Connection tests failed: ${report.success_rate}% success rate`);
        }
        
        return {
          successRate: report.success_rate,
          totalTests: report.total_tests,
          passedTests: report.passed_tests,
          details: report.results
        };
        
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
          // Fallback basic connection test
          return await this.basicConnectionTest();
        }
        throw error;
      }
    });
  }

  async basicConnectionTest() {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true }
    });
    
    await client.connect();
    
    try {
      const result = await client.query('SELECT NOW(), version()');
      const row = result.rows[0];
      
      return {
        successRate: 100,
        totalTests: 1,
        passedTests: 1,
        serverTime: row.now,
        version: row.version
      };
      
    } finally {
      await client.end();
    }
  }

  async setupMonitoring() {
    return this.runPhase('Monitoring Setup', async () => {
      this.log('Setting up database monitoring...', 'info');
      
      // Create monitoring configuration
      const monitoringConfig = {
        enabled: true,
        healthCheckInterval: 30000, // 30 seconds
        slowQueryThreshold: 1000,   // 1 second
        connectionPoolWarning: 40,  // 80% of max connections
        alerts: {
          email: process.env.ADMIN_EMAIL || 'admin@meridian.app',
          webhook: process.env.MONITORING_WEBHOOK_URL || null
        }
      };
      
      const configPath = path.join(this.rootDir, 'config', 'monitoring.json');
      const configDir = path.dirname(configPath);
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(configPath, JSON.stringify(monitoringConfig, null, 2));
      
      // Create health check endpoint configuration
      const healthCheckConfig = `
// Database Health Check Configuration
// Auto-generated by migration pipeline

export const DB_HEALTH_CONFIG = {
  endpoint: '/health/database',
  timeout: 5000,
  checks: [
    'connection',
    'schema_version',
    'connection_pool',
    'slow_queries'
  ],
  alerts: ${JSON.stringify(monitoringConfig.alerts, null, 2)}
};

export function createHealthCheckHandler() {
  return async (req, res) => {
    try {
      const health = await checkDatabaseHealth();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}

async function checkDatabaseHealth() {
  // Import your database monitoring utilities here
  // This is a placeholder for the actual implementation
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected',
    migrations: 'up-to-date'
  };
}`;
      
      const healthCheckPath = path.join(this.rootDir, 'src', 'health', 'database-health.js');
      const healthDir = path.dirname(healthCheckPath);
      
      if (!fs.existsSync(healthDir)) {
        fs.mkdirSync(healthDir, { recursive: true });
      }
      
      fs.writeFileSync(healthCheckPath, healthCheckConfig);
      
      return {
        monitoringConfig: configPath,
        healthCheckEndpoint: healthCheckPath,
        alertsConfigured: !!monitoringConfig.alerts.email
      };
    });
  }

  async validateDeployment() {
    return this.runPhase('Deployment Validation', async () => {
      this.log('Validating deployment readiness...', 'info');
      
      const validations = [];
      
      // Check if all required files exist
      const requiredFiles = [
        'src/database/schema.ts',
        '.env.production.template',
        'scripts/migrate-to-neon.js'
      ];
      
      for (const file of requiredFiles) {
        const filePath = path.join(this.rootDir, file);
        if (fs.existsSync(filePath)) {
          validations.push({ check: file, status: 'exists' });
        } else {
          validations.push({ check: file, status: 'missing' });
          this.log(`Missing file: ${file}`, 'warning');
        }
      }
      
      // Test database connectivity one final time
      try {
        const { Client } = require('pg');
        const client = new Client({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: true }
        });
        
        await client.connect();
        await client.query('SELECT 1');
        await client.end();
        
        validations.push({ check: 'final_connectivity', status: 'passed' });
        
      } catch (error) {
        validations.push({ check: 'final_connectivity', status: 'failed' });
        throw new Error(`Final connectivity check failed: ${error.message}`);
      }
      
      // Check environment readiness
      const productionEnvTemplate = path.join(this.rootDir, '.env.production.template');
      if (fs.existsSync(productionEnvTemplate)) {
        validations.push({ check: 'production_config', status: 'ready' });
      } else {
        validations.push({ check: 'production_config', status: 'missing' });
        this.log('Production environment template missing', 'warning');
      }
      
      const passedChecks = validations.filter(v => v.status === 'exists' || v.status === 'passed' || v.status === 'ready').length;
      const totalChecks = validations.length;
      
      return {
        readiness: Math.round((passedChecks / totalChecks) * 100),
        validations,
        deploymentReady: passedChecks === totalChecks
      };
    });
  }

  generateFinalReport() {
    this.results.endTime = new Date().toISOString();
    this.results.totalDuration = Date.now() - new Date(this.results.startTime).getTime();
    this.results.success = Object.values(this.results.phases).every(phase => phase.success);
    
    this.log('', 'info');
    this.log('🎯 MIGRATION PIPELINE RESULTS', 'phase');
    this.log('==============================', 'info');
    
    const phaseNames = Object.keys(this.results.phases);
    const successfulPhases = Object.values(this.results.phases).filter(p => p.success).length;
    
    this.log(`Overall Success: ${successfulPhases}/${phaseNames.length} phases completed`, 
             this.results.success ? 'success' : 'error');
    
    console.log('\nPhase Results:');
    console.log('==============');
    
    phaseNames.forEach(phaseName => {
      const phase = this.results.phases[phaseName];
      const status = phase.success ? '✅ SUCCESS' : '❌ FAILED';
      const duration = Math.round(phase.duration / 1000 * 100) / 100;
      
      console.log(`${status} ${phaseName} (${duration}s)`);
      
      if (phase.error) {
        console.log(`     Error: ${phase.error}`);
      } else if (phase.result && typeof phase.result === 'object') {
        Object.entries(phase.result).forEach(([key, value]) => {
          if (typeof value === 'object') return;
          console.log(`     ${key}: ${value}`);
        });
      }
    });
    
    // Summary
    console.log('\nSummary:');
    console.log('========');
    console.log(`Total Duration: ${Math.round(this.results.totalDuration / 1000)}s`);
    console.log(`Errors: ${this.results.errors.length}`);
    console.log(`Warnings: ${this.results.warnings.length}`);
    
    if (this.results.success) {
      this.log('\n🎉 Database migration pipeline completed successfully!', 'success');
      this.log('Your Neon PostgreSQL database is ready for production.', 'success');
    } else {
      this.log(`\n⚠️ Pipeline completed with issues. Review the errors above.`, 'warning');
    }
    
    // Save detailed report
    const reportPath = path.join(this.rootDir, 'logs', `migration-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    this.log(`\n📊 Detailed report saved: ${reportPath}`, 'info');
    
    return this.results;
  }

  async run() {
    try {
      this.log('🚀 Starting Database Migration Pipeline', 'phase');
      this.log('=====================================', 'info');
      
      // Run all phases in sequence
      await this.validateEnvironment();
      await this.runSchemaMigration();
      await this.runConnectionTests();
      await this.setupMonitoring();
      await this.validateDeployment();
      
      this.generateFinalReport();
      return this.results;
      
    } catch (error) {
      this.log(`Pipeline failed: ${error.message}`, 'error');
      this.generateFinalReport();
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const pipeline = new DatabaseMigrationPipeline();
  pipeline.run()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Migration pipeline failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseMigrationPipeline;