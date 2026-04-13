#!/usr/bin/env node

const { Client, Pool } = require('pg');

/**
 * Neon PostgreSQL Connection Testing Script
 * 
 * Comprehensive connection testing and validation for Neon database
 */

class NeonConnectionTester {
  constructor() {
    this.connectionString = process.env.DATABASE_URL;
    this.testResults = [];
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

  addTestResult(testName, passed, details = '') {
    this.testResults.push({
      test: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async testBasicConnection() {
    this.log('Testing basic connection...', 'info');
    
    try {
      if (!this.connectionString) {
        throw new Error('DATABASE_URL environment variable not set');
      }

      const client = new Client({
        connectionString: this.connectionString,
        ssl: { rejectUnauthorized: true }
      });

      await client.connect();
      
      const result = await client.query('SELECT NOW(), version(), current_database(), current_user');
      const row = result.rows[0];
      
      await client.end();
      
      this.log('Basic connection successful', 'success');
      this.log(`Database: ${row.current_database}`, 'info');
      this.log(`User: ${row.current_user}`, 'info');
      this.log(`Server Time: ${row.now}`, 'info');
      
      this.addTestResult('Basic Connection', true, `Connected to ${row.current_database}`);
      
    } catch (error) {
      this.log(`Basic connection failed: ${error.message}`, 'error');
      this.addTestResult('Basic Connection', false, error.message);
      throw error;
    }
  }

  async testConnectionPool() {
    this.log('Testing connection pool...', 'info');
    
    try {
      const pool = new Pool({
        connectionString: this.connectionString,
        ssl: { rejectUnauthorized: true },
        max: 10,
        min: 2,
        idle: 30000,
        connectionTimeoutMillis: 15000,
      });

      // Test multiple concurrent connections
      const promises = Array.from({ length: 5 }, async (_, i) => {
        const client = await pool.connect();
        try {
          const result = await client.query('SELECT $1 as connection_id', [i]);
          return result.rows[0].connection_id;
        } finally {
          client.release();
        }
      });

      const results = await Promise.all(promises);
      await pool.end();
      
      this.log(`Connection pool test successful: ${results.length} concurrent connections`, 'success');
      this.addTestResult('Connection Pool', true, `${results.length} concurrent connections`);
      
    } catch (error) {
      this.log(`Connection pool test failed: ${error.message}`, 'error');
      this.addTestResult('Connection Pool', false, error.message);
    }
  }

  async testSSLConnection() {
    this.log('Testing SSL connection...', 'info');
    
    try {
      // Test with SSL required
      const client = new Client({
        connectionString: this.connectionString,
        ssl: {
          rejectUnauthorized: true,
          ca: process.env.NEON_CA_CERT // If custom CA is provided
        }
      });

      await client.connect();
      
      const result = await client.query(`
        SELECT 
          CASE WHEN ssl THEN 'SSL Enabled' ELSE 'SSL Disabled' END as ssl_status,
          version
        FROM pg_stat_ssl 
        WHERE pid = pg_backend_pid()
      `);
      
      if (result.rows.length > 0) {
        const sslStatus = result.rows[0].ssl_status;
        this.log(`SSL Status: ${sslStatus}`, sslStatus.includes('Enabled') ? 'success' : 'warning');
        this.addTestResult('SSL Connection', sslStatus.includes('Enabled'), sslStatus);
      }
      
      await client.end();
      
    } catch (error) {
      this.log(`SSL connection test failed: ${error.message}`, 'error');
      this.addTestResult('SSL Connection', false, error.message);
    }
  }

  async testDatabaseSchema() {
    this.log('Testing database schema...', 'info');
    
    try {
      const client = new Client({
        connectionString: this.connectionString,
        ssl: { rejectUnauthorized: true }
      });

      await client.connect();
      
      // Check required extensions
      const extensionsResult = await client.query(`
        SELECT extname FROM pg_extension 
        WHERE extname IN ('uuid-ossp', 'pg_trgm', 'btree_gin')
        ORDER BY extname
      `);
      
      const extensions = extensionsResult.rows.map(row => row.extname);
      this.log(`Extensions installed: ${extensions.join(', ')}`, 'success');
      
      // Check main tables
      const tablesResult = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'workspaces', 'projects', 'tasks', 'messages', 'channels')
        ORDER BY table_name
      `);
      
      const tables = tablesResult.rows.map(row => row.table_name);
      this.log(`Core tables found: ${tables.join(', ')}`, 'success');
      
      // Check indexes
      const indexesResult = await client.query(`
        SELECT COUNT(*) as index_count 
        FROM pg_indexes 
        WHERE schemaname = 'public'
      `);
      
      const indexCount = indexesResult.rows[0].index_count;
      this.log(`Indexes created: ${indexCount}`, 'success');
      
      await client.end();
      
      this.addTestResult('Database Schema', true, 
        `${tables.length} tables, ${extensions.length} extensions, ${indexCount} indexes`);
      
    } catch (error) {
      this.log(`Schema test failed: ${error.message}`, 'error');
      this.addTestResult('Database Schema', false, error.message);
    }
  }

  async testPerformance() {
    this.log('Testing database performance...', 'info');
    
    try {
      const client = new Client({
        connectionString: this.connectionString,
        ssl: { rejectUnauthorized: true }
      });

      await client.connect();
      
      // Test query performance
      const startTime = Date.now();
      
      const performanceTests = [
        {
          name: 'Simple SELECT',
          query: 'SELECT 1 as test'
        },
        {
          name: 'Table scan',
          query: 'SELECT COUNT(*) FROM information_schema.tables'
        },
        {
          name: 'Join query',
          query: `
            SELECT COUNT(*) 
            FROM information_schema.tables t 
            LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
            WHERE t.table_schema = 'public'
          `
        }
      ];
      
      for (const test of performanceTests) {
        const testStart = Date.now();
        await client.query(test.query);
        const duration = Date.now() - testStart;
        
        this.log(`${test.name}: ${duration}ms`, duration < 100 ? 'success' : 'warning');
      }
      
      const totalDuration = Date.now() - startTime;
      
      await client.end();
      
      this.addTestResult('Performance', totalDuration < 1000, `Total: ${totalDuration}ms`);
      
    } catch (error) {
      this.log(`Performance test failed: ${error.message}`, 'error');
      this.addTestResult('Performance', false, error.message);
    }
  }

  async testConnectionLimits() {
    this.log('Testing connection limits...', 'info');
    
    try {
      const pool = new Pool({
        connectionString: this.connectionString,
        ssl: { rejectUnauthorized: true },
        max: 20, // Test with higher connection count
        min: 1,
        idle: 10000,
        connectionTimeoutMillis: 15000,
      });

      // Get connection limits
      const client = await pool.connect();
      const result = await client.query(`
        SELECT 
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
          (SELECT COUNT(*) FROM pg_stat_activity) as current_connections,
          (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections
      `);
      
      const stats = result.rows[0];
      client.release();
      
      this.log(`Max connections: ${stats.max_connections}`, 'info');
      this.log(`Current connections: ${stats.current_connections}`, 'info');
      this.log(`Active connections: ${stats.active_connections}`, 'info');
      
      // Test rapid connections
      const rapidConnections = Array.from({ length: 10 }, async () => {
        const conn = await pool.connect();
        conn.release();
        return true;
      });
      
      await Promise.all(rapidConnections);
      await pool.end();
      
      this.addTestResult('Connection Limits', true, 
        `Max: ${stats.max_connections}, Current: ${stats.current_connections}`);
      
    } catch (error) {
      this.log(`Connection limits test failed: ${error.message}`, 'error');
      this.addTestResult('Connection Limits', false, error.message);
    }
  }

  async testTransactions() {
    this.log('Testing transactions...', 'info');
    
    try {
      const client = new Client({
        connectionString: this.connectionString,
        ssl: { rejectUnauthorized: true }
      });

      await client.connect();
      
      // Test transaction commit
      await client.query('BEGIN');
      await client.query('SELECT 1');
      await client.query('COMMIT');
      
      // Test transaction rollback
      await client.query('BEGIN');
      await client.query('SELECT 1');
      await client.query('ROLLBACK');
      
      await client.end();
      
      this.log('Transaction test successful', 'success');
      this.addTestResult('Transactions', true, 'COMMIT and ROLLBACK working');
      
    } catch (error) {
      this.log(`Transaction test failed: ${error.message}`, 'error');
      this.addTestResult('Transactions', false, error.message);
    }
  }

  generateReport() {
    this.log('', 'info');
    this.log('🧪 CONNECTION TEST RESULTS', 'info');
    this.log('==========================', 'info');
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    this.log(`Overall: ${passed}/${total} tests passed`, 
             passed === total ? 'success' : 'warning');
    
    console.log('\nDetailed Results:');
    console.log('================');
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.test}`);
      if (result.details) {
        console.log(`     ${result.details}`);
      }
    });
    
    if (passed === total) {
      this.log('\n🎉 All tests passed! Your Neon connection is ready for production.', 'success');
    } else {
      this.log(`\n⚠️  ${total - passed} tests failed. Please review and fix issues before production deployment.`, 'warning');
    }
    
    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      database_url: this.connectionString ? 'SET' : 'NOT_SET',
      total_tests: total,
      passed_tests: passed,
      success_rate: Math.round((passed / total) * 100),
      results: this.testResults
    };
    
    return report;
  }

  async runAllTests() {
    try {
      this.log('🔍 Starting Neon PostgreSQL Connection Tests', 'info');
      this.log('============================================', 'info');
      
      await this.testBasicConnection();
      await this.testSSLConnection();
      await this.testConnectionPool();
      await this.testDatabaseSchema();
      await this.testPerformance();
      await this.testConnectionLimits();
      await this.testTransactions();
      
      const report = this.generateReport();
      return report;
      
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new NeonConnectionTester();
  tester.runAllTests()
    .then(report => {
      // Save report to file
      const fs = require('fs');
      const path = require('path');
      const reportPath = path.join(__dirname, `neon-connection-test-${Date.now()}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📊 Report saved: ${reportPath}`);
      
      process.exit(report.success_rate === 100 ? 0 : 1);
    })
    .catch(error => {
      console.error('Connection tests failed:', error);
      process.exit(1);
    });
}

module.exports = NeonConnectionTester;