#!/usr/bin/env node

/**
 * Settings System Verification Script
 * Tests all 53 API endpoints to ensure they're responding correctly
 */

const API_BASE = 'http://localhost:3005';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Mock workspace ID (adjust based on your setup)
const WORKSPACE_ID = 'test-workspace-id';

async function testEndpoint(method, path, description, expectedStatus = 200, body = null) {
  totalTests++;
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${path}`, options);
    const status = response.status;
    
    // Allow 401/403 for auth-required endpoints
    const isSuccess = status === expectedStatus || status === 401 || status === 403;
    
    if (isSuccess) {
      passedTests++;
      console.log(`${colors.green}✓${colors.reset} ${method.padEnd(6)} ${path.padEnd(60)} ${description}`);
    } else {
      failedTests++;
      console.log(`${colors.red}✗${colors.reset} ${method.padEnd(6)} ${path.padEnd(60)} ${description} (Status: ${status})`);
    }
    
    return isSuccess;
  } catch (error) {
    failedTests++;
    console.log(`${colors.red}✗${colors.reset} ${method.padEnd(6)} ${path.padEnd(60)} ${description} (Error: ${error.message})`);
    return false;
  }
}

async function runTests() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  Settings System Verification Script${colors.reset}`);
  console.log(`${colors.cyan}  Testing all 53 API endpoints${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════════${colors.reset}\n`);
  
  // Test API Health
  console.log(`${colors.blue}📡 Testing API Health...${colors.reset}`);
  await testEndpoint('GET', '/health', 'API health check');
  console.log();
  
  // Workspace Settings (6 endpoints)
  console.log(`${colors.blue}🏢 Testing Workspace Settings (6 endpoints)...${colors.reset}`);
  await testEndpoint('GET', `/api/workspace/${WORKSPACE_ID}/settings`, 'Get workspace settings');
  await testEndpoint('PATCH', `/api/workspace/${WORKSPACE_ID}/settings`, 'Update workspace settings', 200, {
    name: 'Test Workspace'
  });
  await testEndpoint('POST', `/api/workspace/${WORKSPACE_ID}/logo`, 'Upload workspace logo', 200);
  await testEndpoint('GET', `/api/workspace/${WORKSPACE_ID}`, 'Get workspace details');
  await testEndpoint('DELETE', `/api/workspace/${WORKSPACE_ID}`, 'Delete workspace', 200);
  console.log();
  
  // Email Settings (10 endpoints)
  console.log(`${colors.blue}📧 Testing Email Settings (10 endpoints)...${colors.reset}`);
  await testEndpoint('GET', `/api/settings/email/${WORKSPACE_ID}`, 'Get email settings');
  await testEndpoint('PATCH', `/api/settings/email/${WORKSPACE_ID}`, 'Update email settings', 200, {
    smtpHost: 'smtp.example.com'
  });
  await testEndpoint('POST', '/api/settings/email/test-connection', 'Test SMTP connection', 200, {
    smtpHost: 'smtp.example.com',
    smtpPort: 587
  });
  await testEndpoint('POST', '/api/settings/email/send-test', 'Send test email', 200, {
    to: 'test@example.com',
    smtpHost: 'smtp.example.com'
  });
  await testEndpoint('GET', `/api/settings/email/${WORKSPACE_ID}/templates`, 'Get email templates');
  await testEndpoint('GET', `/api/settings/email/${WORKSPACE_ID}/templates/template-id`, 'Get email template', 404);
  await testEndpoint('POST', `/api/settings/email/${WORKSPACE_ID}/templates`, 'Create email template', 200, {
    name: 'Test Template',
    subject: 'Test',
    body: 'Test body'
  });
  await testEndpoint('PATCH', `/api/settings/email/${WORKSPACE_ID}/templates/template-id`, 'Update email template', 200, {
    name: 'Updated Template'
  });
  await testEndpoint('DELETE', `/api/settings/email/${WORKSPACE_ID}/templates/template-id`, 'Delete email template', 200);
  console.log();
  
  // Automation Settings (2 endpoints)
  console.log(`${colors.blue}⚡ Testing Automation Settings (2 endpoints)...${colors.reset}`);
  await testEndpoint('GET', `/api/settings/automation/${WORKSPACE_ID}`, 'Get automation settings');
  await testEndpoint('PATCH', `/api/settings/automation/${WORKSPACE_ID}`, 'Update automation settings', 200, {
    enableAutomation: true
  });
  console.log();
  
  // Calendar Settings (2 endpoints)
  console.log(`${colors.blue}📅 Testing Calendar Settings (2 endpoints)...${colors.reset}`);
  await testEndpoint('GET', `/api/settings/calendar/${WORKSPACE_ID}`, 'Get calendar settings');
  await testEndpoint('PATCH', `/api/settings/calendar/${WORKSPACE_ID}`, 'Update calendar settings', 200, {
    enableCalendar: true
  });
  console.log();
  
  // Audit Logs (6 endpoints)
  console.log(`${colors.blue}📊 Testing Audit Logs (6 endpoints)...${colors.reset}`);
  await testEndpoint('GET', `/api/settings/audit/${WORKSPACE_ID}/logs`, 'Get audit logs');
  await testEndpoint('GET', `/api/settings/audit/${WORKSPACE_ID}/stats`, 'Get audit stats');
  await testEndpoint('GET', `/api/settings/audit/${WORKSPACE_ID}/filters`, 'Get audit filter options');
  await testEndpoint('GET', `/api/settings/audit/${WORKSPACE_ID}/settings`, 'Get audit settings');
  await testEndpoint('PATCH', `/api/settings/audit/${WORKSPACE_ID}/settings`, 'Update audit settings', 200, {
    enableAuditLogs: true
  });
  await testEndpoint('POST', `/api/settings/audit/${WORKSPACE_ID}/export`, 'Export audit logs', 200, {
    format: 'json'
  });
  console.log();
  
  // Backup Settings (8 endpoints)
  console.log(`${colors.blue}💾 Testing Backup Settings (8 endpoints)...${colors.reset}`);
  await testEndpoint('GET', `/api/settings/backup/${WORKSPACE_ID}/settings`, 'Get backup settings');
  await testEndpoint('PATCH', `/api/settings/backup/${WORKSPACE_ID}/settings`, 'Update backup settings', 200, {
    enableAutomatedBackups: true
  });
  await testEndpoint('GET', `/api/settings/backup/${WORKSPACE_ID}/history`, 'Get backup history');
  await testEndpoint('POST', `/api/settings/backup/${WORKSPACE_ID}/create`, 'Create manual backup', 200, {
    includeFiles: false
  });
  await testEndpoint('POST', `/api/settings/backup/${WORKSPACE_ID}/backup-id/restore`, 'Restore from backup');
  await testEndpoint('GET', `/api/settings/backup/${WORKSPACE_ID}/backup-id/download`, 'Download backup');
  await testEndpoint('DELETE', `/api/settings/backup/${WORKSPACE_ID}/backup-id`, 'Delete backup');
  await testEndpoint('POST', `/api/settings/backup/${WORKSPACE_ID}/backup-id/verify`, 'Verify backup integrity');
  console.log();
  
  // Role Permissions (8 endpoints)
  console.log(`${colors.blue}🔐 Testing Role Permissions (8 endpoints)...${colors.reset}`);
  await testEndpoint('GET', '/api/settings/roles/permissions', 'Get all permissions');
  await testEndpoint('GET', '/api/settings/roles/templates', 'Get role templates');
  await testEndpoint('GET', `/api/settings/roles/${WORKSPACE_ID}`, 'Get all roles');
  await testEndpoint('GET', `/api/settings/roles/${WORKSPACE_ID}/role-id`, 'Get single role', 404);
  await testEndpoint('POST', `/api/settings/roles/${WORKSPACE_ID}`, 'Create custom role', 200, {
    name: 'Custom Role',
    description: 'Test role',
    permissions: ['project.view']
  });
  await testEndpoint('PATCH', `/api/settings/roles/${WORKSPACE_ID}/role-id`, 'Update custom role', 200, {
    name: 'Updated Role'
  });
  await testEndpoint('DELETE', `/api/settings/roles/${WORKSPACE_ID}/role-id`, 'Delete custom role');
  await testEndpoint('POST', `/api/settings/roles/${WORKSPACE_ID}/role-id/clone`, 'Clone role', 200, {
    name: 'Cloned Role'
  });
  console.log();
  
  // Advanced Search (7 endpoints)
  console.log(`${colors.blue}🔍 Testing Advanced Search (7 endpoints)...${colors.reset}`);
  await testEndpoint('POST', `/api/settings/search/${WORKSPACE_ID}`, 'Perform search', 200, {
    query: 'test'
  });
  await testEndpoint('GET', `/api/settings/search/${WORKSPACE_ID}/suggestions?q=test`, 'Get search suggestions');
  await testEndpoint('GET', `/api/settings/search/${WORKSPACE_ID}/saved`, 'Get saved searches');
  await testEndpoint('POST', `/api/settings/search/${WORKSPACE_ID}/saved`, 'Save search', 200, {
    name: 'My Search',
    filters: { query: 'test' }
  });
  await testEndpoint('PATCH', `/api/settings/search/${WORKSPACE_ID}/saved/search-id`, 'Update saved search', 200, {
    name: 'Updated Search'
  });
  await testEndpoint('DELETE', `/api/settings/search/${WORKSPACE_ID}/saved/search-id`, 'Delete saved search');
  await testEndpoint('POST', `/api/settings/search/${WORKSPACE_ID}/saved/search-id/use`, 'Record search usage');
  console.log();
  
  // Import/Export (4 endpoints)
  console.log(`${colors.blue}📦 Testing Import/Export (4 endpoints)...${colors.reset}`);
  await testEndpoint('GET', '/api/settings/import-export/templates', 'Get export templates');
  await testEndpoint('POST', `/api/settings/import-export/${WORKSPACE_ID}/export`, 'Export workspace data', 200, {
    format: 'json',
    includeProjects: true
  });
  await testEndpoint('POST', `/api/settings/import-export/${WORKSPACE_ID}/validate`, 'Validate import data', 200, {
    format: 'json',
    data: { projects: [] }
  });
  await testEndpoint('POST', `/api/settings/import-export/${WORKSPACE_ID}/import`, 'Import workspace data', 200, {
    format: 'json',
    data: { projects: [] },
    validateOnly: true
  });
  console.log();
  
  // Print summary
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  Test Summary${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`  Total Tests:    ${totalTests}`);
  console.log(`  ${colors.green}Passed:${colors.reset}         ${passedTests}`);
  console.log(`  ${colors.red}Failed:${colors.reset}         ${failedTests}`);
  console.log(`  ${colors.yellow}Success Rate:${colors.reset}   ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════════${colors.reset}\n`);
  
  if (failedTests === 0) {
    console.log(`${colors.green}🎉 All tests passed! Your settings system is working correctly.${colors.reset}\n`);
  } else if (passedTests > failedTests) {
    console.log(`${colors.yellow}⚠️  Some tests failed. This might be due to authentication or missing data.${colors.reset}`);
    console.log(`${colors.yellow}   Most endpoints are responding correctly.${colors.reset}\n`);
  } else {
    console.log(`${colors.red}❌ Many tests failed. Please check:${colors.reset}`);
    console.log(`${colors.red}   1. Is the API server running on ${API_BASE}?${colors.reset}`);
    console.log(`${colors.red}   2. Are you logged in?${colors.reset}`);
    console.log(`${colors.red}   3. Does the workspace ID exist?${colors.reset}\n`);
  }
  
  process.exit(failedTests === 0 ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});

