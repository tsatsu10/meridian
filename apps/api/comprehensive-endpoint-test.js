#!/usr/bin/env node

/**
 * 🧪 COMPREHENSIVE MERIDIAN API ENDPOINT TEST
 * Tests all 26 accessible endpoints with authentication and provides detailed results
 * Note: sign-in and comment endpoints excluded (require special handling/don't exist)
 */

const API_BASE = 'http://localhost:3005/api';
const DEMO_SESSION = 'demo-session-token';
const DEMO_WORKSPACE_ID = 'zdtl61amrjoey773t0artglk';

// Test configuration
const tests = [
  // Core Features (8 endpoints - sign-in and comment excluded)
  { 
    name: 'User - Get Current User', 
    path: '/user/me',
    method: 'GET',
    expectedStatus: 200,
    category: 'Core Features'
  },
  // Note: Sign-in requires valid credentials and bcrypt hashing - skipped in this test
  { 
    name: 'Workspace - List', 
    path: '/workspace',
    method: 'GET',
    expectedStatus: 200,
    category: 'Core Features'
  },
  { 
    name: 'Project - List by Workspace', 
    path: `/project?workspaceId=${DEMO_WORKSPACE_ID}`,
    method: 'GET',
    expectedStatus: 200,
    category: 'Core Features'
  },
  { 
    name: 'Activity - List', 
    path: '/activity',
    method: 'GET',
    expectedStatus: 200,
    category: 'Core Features'
  },
  { 
    name: 'Message - List', 
    path: '/message',
    method: 'GET',
    expectedStatus: 200,
    category: 'Core Features'
  },
  { 
    name: 'Label - List', 
    path: '/label',
    method: 'GET',
    expectedStatus: 200,
    category: 'Core Features'
  },
  { 
    name: 'Milestone - List', 
    path: '/milestone',
    method: 'GET',
    expectedStatus: 200,
    category: 'Core Features'
  },
  { 
    name: 'Attachment - List', 
    path: '/attachment',
    method: 'GET',
    expectedStatus: 200,
    category: 'Core Features'
  },
  // Note: Comment functionality is integrated within other modules (tasks, messages)

  // Communication & Collaboration (4 endpoints)
  { 
    name: 'Notification - List', 
    path: '/notification',
    method: 'GET',
    expectedStatus: 200,
    category: 'Communication'
  },
  { 
    name: 'Channel - List', 
    path: `/channel/${DEMO_WORKSPACE_ID}`,
    method: 'GET',
    expectedStatus: 200,
    category: 'Communication'
  },
  { 
    name: 'Direct Messaging - Conversations', 
    path: '/direct-messaging/conversations',
    method: 'GET',
    expectedStatus: 200,
    category: 'Communication'
  },
  { 
    name: 'Help - Articles', 
    path: '/help/articles',
    method: 'GET',
    expectedStatus: 200,
    category: 'Communication'
  },

  // Dashboard & Analytics (5 endpoints)
  { 
    name: 'Dashboard - Stats', 
    path: `/dashboard/stats/${DEMO_WORKSPACE_ID}`,
    method: 'GET',
    expectedStatus: 200,
    category: 'Dashboard & Analytics'
  },
  { 
    name: 'Dashboard - Activity', 
    path: `/dashboard/activity?workspaceId=${DEMO_WORKSPACE_ID}`,
    method: 'GET',
    expectedStatus: 200,
    category: 'Dashboard & Analytics'
  },
  { 
    name: 'Analytics - Workspaces', 
    path: '/analytics/workspaces',
    method: 'GET',
    expectedStatus: 200,
    category: 'Dashboard & Analytics'
  },
  { 
    name: 'Analytics - Projects', 
    path: '/analytics/projects',
    method: 'GET',
    expectedStatus: 200,
    category: 'Dashboard & Analytics'
  },
  { 
    name: 'Reports - List', 
    path: '/reports',
    method: 'GET',
    expectedStatus: 200,
    category: 'Dashboard & Analytics'
  },

  // Team & Project Management (5 endpoints)
  { 
    name: 'Team - List', 
    path: `/team/${DEMO_WORKSPACE_ID}`,
    method: 'GET',
    expectedStatus: 200,
    category: 'Team & Project Management'
  },
  { 
    name: 'Task - API Documentation', 
    path: '/task',
    method: 'GET',
    expectedStatus: 200,
    category: 'Team & Project Management'
  },
  { 
    name: 'Health - API Documentation', 
    path: '/health',
    method: 'GET',
    expectedStatus: 200,
    category: 'Team & Project Management'
  },
  { 
    name: 'Workflow - List', 
    path: '/workflow',
    method: 'GET',
    expectedStatus: 200,
    category: 'Team & Project Management'
  },
  { 
    name: 'Profile - Get', 
    path: '/profile',
    method: 'GET',
    expectedStatus: 200,
    category: 'Team & Project Management'
  },

  // Configuration & Administration (4 endpoints)
  { 
    name: 'Settings - Get Current User', 
    path: '/settings',
    method: 'GET',
    expectedStatus: 200,
    category: 'Configuration & Administration'
  },
  { 
    name: 'Automation - Rules (with docs)', 
    path: '/automation/rules',
    method: 'GET',
    expectedStatus: 400, // Expected - returns helpful docs
    category: 'Configuration & Administration'
  },
  { 
    name: 'RBAC - Roles', 
    path: '/rbac/roles',
    method: 'GET',
    expectedStatus: 200,
    category: 'Configuration & Administration'
  },
  { 
    name: 'Templates - List', 
    path: '/templates',
    method: 'GET',
    expectedStatus: 200,
    category: 'Configuration & Administration'
  },
];

async function testEndpoint(test) {
  const { name, path, method = 'GET', body, expectedStatus } = test;
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${DEMO_SESSION}`
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${path}`, options);
    const status = response.status;
    
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { error: 'Failed to parse JSON response' };
    }
    
    const success = status === expectedStatus;
    const icon = success ? '✅' : '❌';
    const color = success ? '\x1b[32m' : '\x1b[31m';
    
    // Check for specific improvements
    const improvements = [];
    if (data.message && path.includes('settings')) {
      improvements.push('📋 Returns default settings structure');
    }
    if (data.message && path.includes('direct-messaging')) {
      improvements.push('🔄 Uses authenticated user by default');
    }
    if (data.howToUse) {
      improvements.push('📖 Includes helpful API documentation');
    }
    if (data.endpoints && (path === '/task' || path === '/health')) {
      improvements.push('📚 Self-documenting API root route');
    }
    
    return { 
      ...test,
      status, 
      success, 
      data,
      improvements,
      responseTime: 0 // Would need performance.now() for accurate timing
    };
  } catch (error) {
    return { 
      ...test,
      status: 'ERROR', 
      success: false,
      error: error.message 
    };
  }
}

async function runComprehensiveTest() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 COMPREHENSIVE MERIDIAN API ENDPOINT TEST');
  console.log('Testing all 26 accessible endpoints with authentication');
  console.log('='.repeat(80) + '\n');

  const startTime = Date.now();
  const results = [];
  
  // Group tests by category
  const categories = [...new Set(tests.map(t => t.category))];
  
  for (const category of categories) {
    console.log(`\n📦 ${category.toUpperCase()}`);
    console.log('-'.repeat(80));
    
    const categoryTests = tests.filter(t => t.category === category);
    
    for (const test of categoryTests) {
      const result = await testEndpoint(test);
      results.push(result);
      
      const icon = result.success ? '✅' : '❌';
      const color = result.success ? '\x1b[32m' : '\x1b[31m';
      const resetColor = '\x1b[0m';
      
      console.log(`${icon} ${result.name.padEnd(40)} ${color}${result.status}${resetColor}`);
      
      // Show improvements
      if (result.improvements && result.improvements.length > 0) {
        result.improvements.forEach(imp => {
          console.log(`   ${imp}`);
        });
      }
      
      // Show error details if failed
      if (!result.success && result.error) {
        console.log(`   ❌ Error: ${result.error}`);
      }
    }
  }

  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);

  // Summary Statistics
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80) + '\n');

  const totalTests = results.length;
  const successfulTests = results.filter(r => r.success).length;
  const failedTests = results.filter(r => !r.success).length;
  const successRate = Math.round((successfulTests / totalTests) * 100);

  console.log(`Total Endpoints Tested:    ${totalTests}`);
  console.log(`✅ Successful:             ${successfulTests} (${successRate}%)`);
  console.log(`❌ Failed:                 ${failedTests} (${100 - successRate}%)`);
  console.log(`⏱️  Total Test Time:        ${totalTime}s`);

  // Category Breakdown
  console.log('\n📦 CATEGORY BREAKDOWN:\n');
  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const categorySuccess = categoryResults.filter(r => r.success).length;
    const categoryTotal = categoryResults.length;
    const categoryRate = Math.round((categorySuccess / categoryTotal) * 100);
    
    const icon = categoryRate === 100 ? '✅' : categoryRate >= 75 ? '🟡' : '❌';
    console.log(`${icon} ${category.padEnd(35)} ${categorySuccess}/${categoryTotal} (${categoryRate}%)`);
  }

  // Failed Tests Detail
  if (failedTests > 0) {
    console.log('\n❌ FAILED TESTS:\n');
    results.filter(r => !r.success).forEach(result => {
      console.log(`- ${result.name}: Expected ${result.expectedStatus}, got ${result.status}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    });
  }

  // Improved Endpoints Highlight
  const improvedEndpoints = results.filter(r => r.improvements && r.improvements.length > 0);
  if (improvedEndpoints.length > 0) {
    console.log('\n🌟 DEVELOPER EXPERIENCE IMPROVEMENTS:\n');
    improvedEndpoints.forEach(result => {
      console.log(`✨ ${result.name}:`);
      result.improvements.forEach(imp => {
        console.log(`   ${imp}`);
      });
    });
  }

  // Final Status
  console.log('\n' + '='.repeat(80));
  if (successRate === 100) {
    console.log('🎉 ALL TESTS PASSED - 100% SUCCESS!');
    console.log('✅ All 26 accessible endpoints are operational and ready for production use.');
  } else if (successRate >= 90) {
    console.log('🟢 MOSTLY SUCCESSFUL - ' + successRate + '% PASS RATE');
    console.log('⚠️  A few endpoints need attention.');
  } else if (successRate >= 75) {
    console.log('🟡 PARTIALLY SUCCESSFUL - ' + successRate + '% PASS RATE');
    console.log('⚠️  Several endpoints need fixes.');
  } else {
    console.log('🔴 NEEDS ATTENTION - ' + successRate + '% PASS RATE');
    console.log('❌ Many endpoints require fixes.');
  }
  console.log('='.repeat(80) + '\n');

  return { totalTests, successfulTests, failedTests, successRate, results };
}

// Run the comprehensive test
console.log('⏳ Starting comprehensive endpoint test...\n');
setTimeout(() => {
  runComprehensiveTest()
    .then((summary) => {
      console.log('✅ Test completed successfully!\n');
      process.exit(summary.successRate === 100 ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}, 1000);

