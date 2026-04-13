#!/usr/bin/env node
/**
 * Comprehensive API Endpoint Testing Script
 * Tests all Phase 1-3 settings endpoints and core functionality
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3005';
const WORKSPACE_ID = 'test-workspace-id';
const USER_EMAIL = 'admin@meridian.app';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: [],
};

/**
 * Test an endpoint
 */
async function testEndpoint(name, method, url, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const isSuccess = response.ok || options.expectedStatus === response.status;
    
    if (isSuccess) {
      console.log(`${colors.green}✓${colors.reset} ${name} - ${method} ${url}`);
      results.passed++;
    } else {
      console.log(`${colors.red}✗${colors.reset} ${name} - ${method} ${url} (Status: ${response.status})`);
      results.failed++;
      results.errors.push({ name, method, url, status: response.status });
    }

    return { success: isSuccess, response };
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name} - ${method} ${url} (Error: ${error.message})`);
    results.failed++;
    results.errors.push({ name, method, url, error: error.message });
    return { success: false, error };
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║   Meridian API Endpoint Testing - Comprehensive Suite   ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.blue}Testing API Base: ${API_BASE}${colors.reset}\n`);

  // ============================================================================
  // HEALTH & CORE ENDPOINTS
  // ============================================================================
  console.log(`${colors.yellow}[HEALTH & CORE]${colors.reset}`);
  
  await testEndpoint('Health Check', 'GET', '/health');
  await testEndpoint('Settings Health', 'GET', '/api/settings/health');

  // ============================================================================
  // PHASE 1: WORKSPACE SETTINGS
  // ============================================================================
  console.log(`\n${colors.yellow}[PHASE 1: WORKSPACE SETTINGS]${colors.reset}`);
  
  await testEndpoint('Get Workspace Settings', 'GET', `/api/workspace/${WORKSPACE_ID}/settings`);
  await testEndpoint('Update Workspace Settings', 'PATCH', `/api/workspace/${WORKSPACE_ID}/settings`, {
    body: { name: 'Test Workspace' },
    expectedStatus: 200,
  });

  // ============================================================================
  // PHASE 1: EMAIL & COMMUNICATION SETTINGS
  // ============================================================================
  console.log(`\n${colors.yellow}[PHASE 1: EMAIL & COMMUNICATION]${colors.reset}`);
  
  await testEndpoint('Get Email Settings', 'GET', `/api/settings/email/${WORKSPACE_ID}`);
  await testEndpoint('Update Email Settings', 'PATCH', `/api/settings/email/${WORKSPACE_ID}`, {
    body: { smtpEnabled: false },
    expectedStatus: 200,
  });
  await testEndpoint('Get Email Templates', 'GET', `/api/settings/email/${WORKSPACE_ID}/templates`);
  await testEndpoint('Test SMTP Connection', 'POST', '/api/settings/email/test-connection', {
    body: {
      host: 'smtp.test.com',
      port: 587,
      secure: false,
      username: 'test',
      password: 'test'
    },
    expectedStatus: 200,
  });

  // ============================================================================
  // PHASE 1: AUTOMATION SETTINGS
  // ============================================================================
  console.log(`\n${colors.yellow}[PHASE 1: AUTOMATION]${colors.reset}`);
  
  await testEndpoint('Get Automation Settings', 'GET', `/api/settings/automation/${WORKSPACE_ID}`);
  await testEndpoint('Update Automation Settings', 'PATCH', `/api/settings/automation/${WORKSPACE_ID}`, {
    body: { enabled: true },
    expectedStatus: 200,
  });

  // ============================================================================
  // PHASE 1: CALENDAR SETTINGS
  // ============================================================================
  console.log(`\n${colors.yellow}[PHASE 1: CALENDAR]${colors.reset}`);
  
  await testEndpoint('Get Calendar Settings', 'GET', `/api/settings/calendar/${WORKSPACE_ID}`);
  await testEndpoint('Update Calendar Settings', 'PATCH', `/api/settings/calendar/${WORKSPACE_ID}`, {
    body: { googleCalendarEnabled: false },
    expectedStatus: 200,
  });

  // ============================================================================
  // PHASE 2: AUDIT LOGS
  // ============================================================================
  console.log(`\n${colors.yellow}[PHASE 2: AUDIT LOGS]${colors.reset}`);
  
  await testEndpoint('Get Audit Logs', 'GET', `/api/settings/activity/${WORKSPACE_ID}/logs?limit=10`);
  await testEndpoint('Get Audit Stats', 'GET', `/api/settings/activity/${WORKSPACE_ID}/stats`);
  await testEndpoint('Get Audit Filter Options', 'GET', `/api/settings/activity/${WORKSPACE_ID}/filters`);
  await testEndpoint('Get Audit Settings', 'GET', `/api/settings/activity/${WORKSPACE_ID}/settings`);
  await testEndpoint('Update Audit Settings', 'PATCH', `/api/settings/activity/${WORKSPACE_ID}/settings`, {
    body: { retentionDays: 90 },
    expectedStatus: 200,
  });

  // ============================================================================
  // PHASE 2: BACKUP & RECOVERY
  // ============================================================================
  console.log(`\n${colors.yellow}[PHASE 2: BACKUP & RECOVERY]${colors.reset}`);
  
  await testEndpoint('Get Backup Settings', 'GET', `/api/settings/backup/${WORKSPACE_ID}/settings`);
  await testEndpoint('Update Backup Settings', 'PATCH', `/api/settings/backup/${WORKSPACE_ID}/settings`, {
    body: { autoBackupEnabled: true },
    expectedStatus: 200,
  });
  await testEndpoint('Get Backup History', 'GET', `/api/settings/backup/${WORKSPACE_ID}/history`);

  // ============================================================================
  // PHASE 2: ROLE PERMISSIONS
  // ============================================================================
  console.log(`\n${colors.yellow}[PHASE 2: ROLE PERMISSIONS]${colors.reset}`);
  
  await testEndpoint('Get Roles', 'GET', `/api/settings/roles/${WORKSPACE_ID}`);
  await testEndpoint('Get All Permissions', 'GET', `/api/settings/roles/${WORKSPACE_ID}/permissions`);
  await testEndpoint('Get Role Templates', 'GET', `/api/settings/roles/${WORKSPACE_ID}/templates`);

  // ============================================================================
  // PHASE 2: ADVANCED SEARCH
  // ============================================================================
  console.log(`\n${colors.yellow}[PHASE 2: ADVANCED SEARCH]${colors.reset}`);
  
  await testEndpoint('Perform Search', 'POST', `/api/settings/search/${WORKSPACE_ID}`, {
    body: {
      query: 'test',
      types: ['projects', 'tasks'],
      limit: 10
    },
    expectedStatus: 200,
  });
  await testEndpoint('Get Search Suggestions', 'GET', `/api/settings/search/${WORKSPACE_ID}/suggestions?q=test`);
  await testEndpoint('Get Saved Searches', 'GET', `/api/settings/search/${WORKSPACE_ID}/saved`);

  // ============================================================================
  // PHASE 2: IMPORT/EXPORT
  // ============================================================================
  console.log(`\n${colors.yellow}[PHASE 2: IMPORT/EXPORT]${colors.reset}`);
  
  await testEndpoint('Get Export Templates', 'GET', `/api/settings/import-export/${WORKSPACE_ID}/templates`);

  // ============================================================================
  // PHASE 3: THEMES & BRANDING
  // ============================================================================
  console.log(`\n${colors.yellow}[PHASE 3: THEMES & BRANDING]${colors.reset}`);
  
  await testEndpoint('Get Themes', 'GET', `/api/settings/themes/${WORKSPACE_ID}`);
  await testEndpoint('Get Theme Templates', 'GET', `/api/settings/themes/${WORKSPACE_ID}/templates`);
  await testEndpoint('Get Branding Settings', 'GET', `/api/settings/themes/${WORKSPACE_ID}/branding`);
  await testEndpoint('Update Branding Settings', 'PATCH', `/api/settings/themes/${WORKSPACE_ID}/branding`, {
    body: { primaryColor: '#3B82F6' },
    expectedStatus: 200,
  });

  // ============================================================================
  // PHASE 3: LOCALIZATION
  // ============================================================================
  console.log(`\n${colors.yellow}[PHASE 3: LOCALIZATION]${colors.reset}`);
  
  await testEndpoint('Get Languages', 'GET', `/api/settings/localization/${WORKSPACE_ID}/languages`);
  await testEndpoint('Get Supported Languages', 'GET', `/api/settings/localization/${WORKSPACE_ID}/supported`);
  await testEndpoint('Get Localization Settings', 'GET', `/api/settings/localization/${WORKSPACE_ID}/settings`);
  await testEndpoint('Update Localization Settings', 'PATCH', `/api/settings/localization/${WORKSPACE_ID}/settings`, {
    body: { defaultLanguage: 'en' },
    expectedStatus: 200,
  });

  // ============================================================================
  // PHASE 3: KEYBOARD SHORTCUTS
  // ============================================================================
  console.log(`\n${colors.yellow}[PHASE 3: KEYBOARD SHORTCUTS]${colors.reset}`);
  
  await testEndpoint('Get Shortcuts', 'GET', `/api/settings/shortcuts/${WORKSPACE_ID}`);
  await testEndpoint('Get Shortcut Presets', 'GET', `/api/settings/shortcuts/${WORKSPACE_ID}/presets`);
  await testEndpoint('Update Shortcuts', 'PATCH', `/api/settings/shortcuts/${WORKSPACE_ID}`, {
    body: { shortcuts: [] },
    expectedStatus: 200,
  });

  // ============================================================================
  // PHASE 3: ADVANCED FILTERS
  // ============================================================================
  console.log(`\n${colors.yellow}[PHASE 3: ADVANCED FILTERS]${colors.reset}`);
  
  await testEndpoint('Get Saved Filters', 'GET', `/api/settings/filters/${WORKSPACE_ID}/filters`);
  await testEndpoint('Get Filter Templates', 'GET', `/api/settings/filters/${WORKSPACE_ID}/templates`);

  // ============================================================================
  // RESULTS SUMMARY
  // ============================================================================
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║                    TEST RESULTS                        ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.green}✓ Passed:${colors.reset} ${results.passed}`);
  console.log(`${colors.red}✗ Failed:${colors.reset} ${results.failed}`);
  console.log(`${colors.yellow}⊘ Skipped:${colors.reset} ${results.skipped}`);
  console.log(`${colors.cyan}Total Tests:${colors.reset} ${results.passed + results.failed + results.skipped}\n`);

  if (results.errors.length > 0) {
    console.log(`${colors.red}Failed Tests:${colors.reset}`);
    results.errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error.name} - ${error.method} ${error.url}`);
      if (error.status) console.log(`     Status: ${error.status}`);
      if (error.error) console.log(`     Error: ${error.error}`);
    });
  }

  const successRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(2);
  console.log(`\n${colors.cyan}Success Rate: ${successRate}%${colors.reset}\n`);

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);

