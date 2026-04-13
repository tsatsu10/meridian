// Comprehensive Function Testing Script
// Tests all major function categories in the Meridian system

const BASE_URL = 'http://localhost:1337';

// Test helper function
async function testEndpoint(method, endpoint, data = null, description) {
  console.log(`\n🔍 Testing: ${description}`);
  console.log(`   ${method} ${endpoint}`);
  
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const result = await response.text();
    
    let parsedResult;
    try {
      parsedResult = JSON.parse(result);
    } catch {
      parsedResult = result;
    }
    
    if (response.ok) {
      console.log(`   ✅ SUCCESS (${response.status}):`, 
        typeof parsedResult === 'object' ? JSON.stringify(parsedResult).substring(0, 200) + '...' : parsedResult);
      return { success: true, data: parsedResult, status: response.status };
    } else {
      console.log(`   ❌ FAILED (${response.status}):`, 
        typeof parsedResult === 'object' ? JSON.stringify(parsedResult).substring(0, 200) + '...' : parsedResult);
      return { success: false, error: parsedResult, status: response.status };
    }
  } catch (error) {
    console.log(`   💥 ERROR:`, error.message);
    return { success: false, error: error.message, status: 0 };
  }
}

// Main testing function
async function runComprehensiveFunctionTest() {
  console.log('🚀 MERIDIAN COMPREHENSIVE FUNCTION ANALYSIS');
  console.log('=' .repeat(60));
  
  const results = {
    core: {},
    advanced: {},
    communication: {},
    integration: {},
    system: {},
    business: {}
  };

  // ========================================
  // CORE MANAGEMENT MODULES (120+ Functions)
  // ========================================
  console.log('\n📋 TESTING CORE MANAGEMENT MODULES');
  console.log('-'.repeat(40));

  // 1. Authentication & Basic Functions
  results.core.auth = await testEndpoint('GET', '/debug/auth', null, 'Authentication System');
  results.core.userMe = await testEndpoint('GET', '/api/user/me', null, 'User Profile Access');
  results.core.workspaces = await testEndpoint('GET', '/api/workspaces', null, 'Workspace Listing');

  // 2. Project Management (25+ Functions)
  console.log('\n🗂️  Testing Project Management Functions...');
  
  // Create project
  const projectData = {
    name: "Function Test Project",
    description: "Testing all project functions",
    workspaceId: "existing-workspace-id"
  };
  results.core.createProject = await testEndpoint('POST', '/api/project/create', projectData, 'Create Project');
  
  // List projects  
  results.core.listProjects = await testEndpoint('GET', '/api/project/workspace/clzhv72ve0005vx5ebvxvx5ze', null, 'List Projects');
  
  // Get project by ID (if create succeeded)
  if (results.core.createProject.success && results.core.createProject.data?.project?.id) {
    const projectId = results.core.createProject.data.project.id;
    results.core.getProject = await testEndpoint('GET', `/api/project/${projectId}`, null, 'Get Project by ID');
    
    // Update project
    results.core.updateProject = await testEndpoint('PATCH', `/api/project/${projectId}`, 
      { name: "Updated Function Test Project" }, 'Update Project');
  }

  // 3. Task Management (30+ Functions)
  console.log('\n✅ Testing Task Management Functions...');
  
  // Create task
  const taskData = {
    title: "Function Test Task",
    description: "Testing all task functions",
    projectId: results.core.createProject.data?.project?.id || "test-project-id"
  };
  results.core.createTask = await testEndpoint('POST', '/api/task/create', taskData, 'Create Task');
  
  // List tasks
  results.core.listTasks = await testEndpoint('GET', '/api/task/all/clzhv72ve0005vx5ebvxvx5ze', null, 'List Tasks');
  
  // Get task by ID (if create succeeded)
  if (results.core.createTask.success && results.core.createTask.data?.task?.id) {
    const taskId = results.core.createTask.data.task.id;
    results.core.getTask = await testEndpoint('GET', `/api/task/${taskId}`, null, 'Get Task by ID');
    
    // Update task
    results.core.updateTask = await testEndpoint('PATCH', `/api/task/${taskId}`, 
      { title: "Updated Function Test Task" }, 'Update Task');
  }

  // 4. Activity & Logging (20+ Functions)
  console.log('\n📝 Testing Activity & Logging Functions...');
  
  const activityData = {
    taskId: results.core.createTask.data?.task?.id || "w5oupiz1caxt4npur5iegvxf",
    userEmail: "elidegbotse@gmail.com",
    type: "comment",
    content: "Function test activity"
  };
  results.core.createActivity = await testEndpoint('POST', '/api/activity/create', activityData, 'Create Activity');
  
  // Get activities
  results.core.getActivities = await testEndpoint('GET', '/api/activity/task/w5oupiz1caxt4npur5iegvxf', null, 'Get Task Activities');

  // 5. Notification System (15+ Functions)
  console.log('\n🔔 Testing Notification Functions...');
  
  const notificationData = {
    userId: "demo-user-id",
    title: "Function Test Notification", 
    message: "Testing notification system",
    type: "info"
  };
  results.core.createNotification = await testEndpoint('POST', '/api/notification/create', notificationData, 'Create Notification');
  
  // Get notifications
  results.core.getNotifications = await testEndpoint('GET', '/api/notification/user/demo-user-id', null, 'Get User Notifications');

  // 6. Label Management (10+ Functions)  
  console.log('\n🏷️  Testing Label Functions...');
  
  const labelData = {
    name: "Function Test Label",
    color: "#FF5733",
    workspaceId: "clzhv72ve0005vx5ebvxvx5ze"
  };
  results.core.createLabel = await testEndpoint('POST', '/api/label/create', labelData, 'Create Label');
  
  // Get labels
  results.core.getLabels = await testEndpoint('GET', '/api/label/workspace/clzhv72ve0005vx5ebvxvx5ze', null, 'Get Workspace Labels');

  // ========================================
  // ADVANCED FEATURE MODULES (80+ Functions)
  // ========================================
  console.log('\n\n🔧 TESTING ADVANCED FEATURE MODULES');
  console.log('-'.repeat(40));

  // 7. Analytics & Reporting (15+ Functions)
  console.log('\n📊 Testing Analytics Functions...');
  results.advanced.analytics = await testEndpoint('GET', '/api/analytics', null, 'Analytics Dashboard');
  results.advanced.reports = await testEndpoint('GET', '/api/reports', null, 'Reports System');

  // 8. Search & Filtering (10+ Functions)
  console.log('\n🔍 Testing Search Functions...');
  results.advanced.search = await testEndpoint('GET', '/api/search?q=test', null, 'Global Search');

  // 9. Automation & Workflow (8+ Functions)
  console.log('\n⚙️  Testing Automation Functions...');
  results.advanced.automation = await testEndpoint('GET', '/api/automation', null, 'Automation Engine');

  // ========================================
  // COMMUNICATION MODULES (60+ Functions) 
  // ========================================
  console.log('\n\n💬 TESTING COMMUNICATION MODULES');
  console.log('-'.repeat(40));

  // 10. Messaging & Chat (15+ Functions)
  console.log('\n💭 Testing Messaging Functions...');
  results.communication.channels = await testEndpoint('GET', '/api/channel/clzhv72ve0005vx5ebvxvx5ze', null, 'Chat Channels');
  results.communication.directMessages = await testEndpoint('GET', '/api/direct-messaging/conversations?userEmail=elidegbotse@gmail.com', null, 'Direct Messages');

  // 11. Team Management (20+ Functions)
  console.log('\n👥 Testing Team Functions...');
  results.communication.teams = await testEndpoint('GET', '/api/team/clzhv72ve0005vx5ebvxvx5ze', null, 'Team Management');
  results.communication.workspaceUsers = await testEndpoint('GET', '/workspace-user/clzhv72ve0005vx5ebvxvx5ze', null, 'Workspace Users');

  // ========================================
  // INTEGRATION MODULES (50+ Functions)
  // ========================================
  console.log('\n\n🔗 TESTING INTEGRATION MODULES');
  console.log('-'.repeat(40));

  // 12. Third-party Integrations (20+ Functions)
  console.log('\n🌐 Testing Integration Functions...');
  results.integration.integrations = await testEndpoint('GET', '/api/integrations', null, 'Third-party Integrations');

  // 13. API & Webhooks (15+ Functions) 
  console.log('\n🎣 Testing Webhook Functions...');
  results.integration.webhooks = await testEndpoint('GET', '/api/webhooks', null, 'Webhook Management');

  // ========================================
  // SYSTEM & INFRASTRUCTURE (40+ Functions)
  // ========================================
  console.log('\n\n🏗️  TESTING SYSTEM & INFRASTRUCTURE');
  console.log('-'.repeat(40));

  // 14. User Management (10+ Functions)
  console.log('\n👤 Testing User Management Functions...');
  results.system.users = await testEndpoint('GET', '/users', null, 'User Management');

  // 15. Settings & Configuration (8+ Functions)
  console.log('\n⚙️  Testing Settings Functions...');
  results.system.settings = await testEndpoint('GET', '/api/settings', null, 'Settings Management');

  // 16. Themes & Customization (7+ Functions)
  console.log('\n🎨 Testing Theme Functions...');
  results.system.themes = await testEndpoint('GET', '/api/themes', null, 'Theme Management');

  // ========================================
  // BUSINESS INTELLIGENCE (30+ Functions)
  // ========================================
  console.log('\n\n📈 TESTING BUSINESS INTELLIGENCE');
  console.log('-'.repeat(40));

  // 17. Dashboard & Metrics (15+ Functions)
  console.log('\n📊 Testing Dashboard Functions...');
  results.business.dashboard = await testEndpoint('GET', '/api/dashboard', null, 'Analytics Dashboard');

  // 18. Performance Monitoring (15+ Functions)  
  console.log('\n⚡ Testing Performance Functions...');
  results.business.performance = await testEndpoint('GET', '/api/performance', null, 'Performance Monitoring');

  // ========================================
  // RESULTS SUMMARY
  // ========================================
  console.log('\n\n🏁 COMPREHENSIVE FUNCTION ANALYSIS COMPLETE');
  console.log('='.repeat(60));

  // Calculate statistics
  let totalTests = 0;
  let successfulTests = 0;
  let failedTests = 0;
  let errorTests = 0;

  function countResults(category) {
    for (const [key, result] of Object.entries(category)) {
      totalTests++;
      if (result.success) {
        successfulTests++;
      } else if (result.status === 0) {
        errorTests++;
      } else {
        failedTests++;
      }
    }
  }

  countResults(results.core);
  countResults(results.advanced);
  countResults(results.communication);
  countResults(results.integration);
  countResults(results.system);
  countResults(results.business);

  console.log('\n📊 FINAL STATISTICS:');
  console.log(`   Total Functions Tested: ${totalTests}`);
  console.log(`   ✅ Successful: ${successfulTests} (${((successfulTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`   ❌ Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`   💥 Errors: ${errorTests} (${((errorTests/totalTests)*100).toFixed(1)}%)`);

  console.log('\n🎯 FUNCTIONALITY STATUS BY CATEGORY:');
  
  function analyzeCategory(categoryName, category) {
    const total = Object.keys(category).length;
    const successful = Object.values(category).filter(r => r.success).length;
    const percentage = total > 0 ? ((successful/total)*100).toFixed(1) : 0;
    
    console.log(`   ${categoryName}: ${successful}/${total} working (${percentage}%)`);
    
    // List specific failures
    const failures = Object.entries(category).filter(([key, result]) => !result.success);
    if (failures.length > 0) {
      failures.forEach(([key, result]) => {
        console.log(`     ❌ ${key}: ${result.error || 'Unknown error'}`);
      });
    }
  }

  analyzeCategory('Core Management', results.core);
  analyzeCategory('Advanced Features', results.advanced);
  analyzeCategory('Communication', results.communication);
  analyzeCategory('Integration', results.integration);
  analyzeCategory('System Infrastructure', results.system);
  analyzeCategory('Business Intelligence', results.business);

  console.log('\n🔍 DETAILED ANALYSIS:');
  
  // Working Functions
  const workingFunctions = [];
  const brokenFunctions = [];
  
  Object.entries(results).forEach(([categoryName, category]) => {
    Object.entries(category).forEach(([functionName, result]) => {
      if (result.success) {
        workingFunctions.push(`${categoryName}.${functionName}`);
      } else {
        brokenFunctions.push(`${categoryName}.${functionName} (${result.status || 'ERROR'})`);
      }
    });
  });

  console.log(`\n✅ WORKING FUNCTIONS (${workingFunctions.length}):`);
  workingFunctions.forEach(func => console.log(`   ✓ ${func}`));

  console.log(`\n❌ NON-WORKING FUNCTIONS (${brokenFunctions.length}):`);
  brokenFunctions.forEach(func => console.log(`   ✗ ${func}`));

  console.log('\n📋 CONCLUSION:');
  if (successfulTests / totalTests >= 0.8) {
    console.log('   🎉 EXCELLENT: System is highly functional!');
  } else if (successfulTests / totalTests >= 0.6) {
    console.log('   👍 GOOD: System is mostly functional with some issues.');
  } else if (successfulTests / totalTests >= 0.4) {
    console.log('   ⚠️  FAIR: System has significant functionality gaps.');
  } else {
    console.log('   🚨 POOR: System has major functionality issues.');
  }

  return results;
}

// Run the test
runComprehensiveFunctionTest().catch(console.error);