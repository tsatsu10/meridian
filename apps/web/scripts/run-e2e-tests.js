#!/usr/bin/env node

/**
 * E2E Test Runner Script
 * 
 * Provides comprehensive E2E testing workflows:
 * - Full test suite execution
 * - Smoke testing for quick validation
 * - Specific browser testing
 * - CI-friendly execution
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TEST_CONFIG = {
  // Test execution modes
  modes: {
    full: 'Full test suite across all browsers and devices',
    smoke: 'Quick smoke test on Chrome only',
    chrome: 'Chrome-only comprehensive testing',
    mobile: 'Mobile device testing only',
    accessibility: 'Accessibility-focused testing',
    performance: 'Performance and load testing'
  },
  
  // Browser configurations
  browsers: {
    chrome: ['chromium', 'Google Chrome'],
    firefox: ['firefox'],
    safari: ['webkit'],
    edge: ['Microsoft Edge'],
    mobile: ['Mobile Chrome', 'Mobile Safari']
  },
  
  // Test categories
  categories: {
    auth: 'auth.setup.ts',
    dashboard: 'dashboard.spec.ts',
    projects: 'project-management.spec.ts',
    communication: 'real-time-communication.spec.ts',
    users: 'user-management.spec.ts',
    performance: 'performance.spec.ts',
    cleanup: 'auth.teardown.ts'
  }
};

class E2ETestRunner {
  constructor() {
    this.mode = process.argv[2] || 'smoke';
    this.verbose = process.argv.includes('--verbose');
    this.headless = !process.argv.includes('--headed');
    this.debug = process.argv.includes('--debug');
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '✅',
      warn: '⚠️',
      error: '❌',
      debug: '🔍'
    }[level] || 'ℹ️';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async checkPrerequisites() {
    this.log('Checking prerequisites...');
    
    // Check if Playwright browsers are installed
    try {
      await this.runCommand('npx', ['playwright', '--version'], { quiet: true });
      this.log('Playwright CLI available');
    } catch (error) {
      this.log('Playwright CLI not found. Installing...', 'warn');
      await this.runCommand('npm', ['install', '@playwright/test']);
    }

    // Check browser installation
    try {
      await this.runCommand('npx', ['playwright', 'install', '--dry-run'], { quiet: true });
      this.log('Browser binaries available');
    } catch (error) {
      this.log('Installing browser binaries...', 'warn');
      await this.runCommand('npx', ['playwright', 'install']);
    }

    // Ensure test results directory exists
    const resultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
      this.log('Created test results directory');
    }
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        stdio: options.quiet ? 'pipe' : 'inherit',
        shell: true,
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      if (options.quiet) {
        proc.stdout?.on('data', (data) => {
          stdout += data.toString();
        });
        proc.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
      }

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }

  buildPlaywrightArgs() {
    const args = [];

    // Configure test execution based on mode
    switch (this.mode) {
      case 'smoke':
        args.push('--project=chromium');
        args.push('--grep=should load dashboard with core elements|should navigate to chat interface');
        break;
      
      case 'chrome':
        args.push('--project=chromium,Google Chrome');
        break;
      
      case 'mobile':
        args.push('--project=Mobile Chrome,Mobile Safari');
        break;
      
      case 'accessibility':
        args.push('--grep=accessibility|responsive|keyboard|screen reader');
        break;
      
      case 'performance':
        args.push('performance.spec.ts');
        break;
      
      case 'full':
      default:
        // Run all tests on all browsers
        break;
    }

    // Add execution options
    if (this.headless) {
      args.push('--headed=false');
    } else {
      args.push('--headed=true');
    }

    if (this.debug) {
      args.push('--debug');
    }

    // Add reporter options
    args.push('--reporter=html,json,junit');
    
    return args;
  }

  async runTests() {
    this.log(`Starting E2E tests in ${this.mode} mode...`);
    
    const startTime = Date.now();
    const args = this.buildPlaywrightArgs();
    
    try {
      this.log(`Running: npx playwright test ${args.join(' ')}`);
      await this.runCommand('npx', ['playwright', 'test', ...args]);
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      this.log(`Tests completed successfully in ${duration}s`);
      
      await this.generateSummary();
      
    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      this.log(`Tests failed after ${duration}s: ${error.message}`, 'error');
      
      // Still try to generate summary for failed tests
      await this.generateSummary().catch(() => {});
      
      process.exit(1);
    }
  }

  async generateSummary() {
    try {
      const resultsFile = path.join(process.cwd(), 'test-results', 'e2e-results.json');
      
      if (fs.existsSync(resultsFile)) {
        const results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
        
        this.log('=== TEST SUMMARY ===');
        this.log(`Total Tests: ${results.stats?.total || 0}`);
        this.log(`Passed: ${results.stats?.passed || 0}`);
        this.log(`Failed: ${results.stats?.failed || 0}`);
        this.log(`Skipped: ${results.stats?.skipped || 0}`);
        this.log(`Duration: ${Math.round((results.stats?.duration || 0) / 1000)}s`);
        
        if (results.stats?.failed > 0) {
          this.log('Some tests failed. Check the HTML report for details.', 'warn');
          this.log('Run: npx playwright show-report', 'info');
        }
        
      } else {
        this.log('No test results file found', 'warn');
      }
    } catch (error) {
      this.log(`Failed to generate summary: ${error.message}`, 'error');
    }
  }

  showUsage() {
    console.log(`
🎭 Meridian E2E Test Runner

Usage: node scripts/run-e2e-tests.js [mode] [options]

Modes:
  smoke       Quick smoke test (default)
  full        Complete test suite
  chrome      Chrome-only testing
  mobile      Mobile device testing
  accessibility  A11y-focused testing
  performance    Performance testing

Options:
  --headed    Run with browser UI (default: headless)
  --verbose   Verbose output
  --debug     Enable debug mode

Examples:
  node scripts/run-e2e-tests.js smoke
  node scripts/run-e2e-tests.js full --headed
  node scripts/run-e2e-tests.js mobile --verbose
  node scripts/run-e2e-tests.js performance --debug

Test Categories:
${Object.entries(TEST_CONFIG.categories).map(([key, file]) => `  ${key.padEnd(12)} ${file}`).join('\n')}
`);
  }

  async run() {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      this.showUsage();
      return;
    }

    if (!TEST_CONFIG.modes[this.mode]) {
      this.log(`Invalid mode: ${this.mode}`, 'error');
      this.showUsage();
      process.exit(1);
    }

    this.log(`E2E Test Runner - ${TEST_CONFIG.modes[this.mode]}`);
    
    try {
      await this.checkPrerequisites();
      await this.runTests();
    } catch (error) {
      this.log(`Test execution failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Check if running directly
if (require.main === module) {
  const runner = new E2ETestRunner();
  runner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = E2ETestRunner;