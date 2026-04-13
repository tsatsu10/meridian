// Analytics Endpoint Testing Script
const BASE_URL = 'http://localhost:1337';

async function testAnalyticsEndpoints() {
  console.log('🧪 TESTING ANALYTICS ENDPOINTS');
  console.log('=' .repeat(50));

  // Test helper function using PowerShell's Invoke-RestMethod equivalent
  async function testEndpoint(endpoint, description) {
    console.log(`\n📊 Testing: ${description}`);
    console.log(`   Endpoint: ${endpoint}`);
    
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.text();
      let parsedResult;
      
      try {
        parsedResult = JSON.parse(result);
      } catch {
        parsedResult = result;
      }
      
      if (response.ok) {
        console.log(`   ✅ SUCCESS (${response.status})`);
        if (parsedResult && typeof parsedResult === 'object') {
          console.log(`   📊 Data keys:`, Object.keys(parsedResult));
          if (parsedResult.data) {
            console.log(`   📊 Analytics data:`, Object.keys(parsedResult.data));
          }
        }
        return { success: true, data: parsedResult, status: response.status };
      } else {
        console.log(`   ❌ FAILED (${response.status}): ${JSON.stringify(parsedResult).substring(0, 200)}`);
        return { success: false, error: parsedResult, status: response.status };
      }
    } catch (error) {
      console.log(`   💥 ERROR: ${error.message}`);
      return { success: false, error: error.message, status: 0 };
    }
  }

  const results = {};

  // Test base analytics endpoint
  results.base = await testEndpoint('/api/analytics', 'Analytics Base Endpoint');

  // Test workspace analytics (using known workspace ID)
  results.workspace = await testEndpoint('/api/analytics/workspaces/clzhv72ve0005vx5ebvxvx5ze', 'Workspace Analytics');
  
  // Test workspace analytics with time range
  results.workspaceTimeRange = await testEndpoint('/api/analytics/workspaces/clzhv72ve0005vx5ebvxvx5ze?timeRange=7d', 'Workspace Analytics (7 days)');

  // Test project analytics (using known project ID)
  results.project = await testEndpoint('/api/analytics/projects/clm9dxfr90002vx5ebvxvx5ze', 'Project Analytics');
  
  // Test project analytics with time range
  results.projectTimeRange = await testEndpoint('/api/analytics/projects/clm9dxfr90002vx5ebvxvx5ze?timeRange=30d', 'Project Analytics (30 days)');

  // Summary
  console.log('\n📈 ANALYTICS TESTING SUMMARY');
  console.log('=' .repeat(50));

  const totalTests = Object.keys(results).length;
  const successfulTests = Object.values(results).filter(r => r.success).length;
  const failedTests = totalTests - successfulTests;

  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Successful: ${successfulTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`Success Rate: ${((successfulTests/totalTests)*100).toFixed(1)}%`);

  // List working endpoints
  console.log('\n✅ WORKING ANALYTICS ENDPOINTS:');
  Object.entries(results).forEach(([test, result]) => {
    if (result.success) {
      console.log(`   ✓ ${test}: ${result.status}`);
    }
  });

  // List failed endpoints
  console.log('\n❌ FAILED ANALYTICS ENDPOINTS:');
  Object.entries(results).forEach(([test, result]) => {
    if (!result.success) {
      console.log(`   ✗ ${test}: ${result.error || 'Unknown error'}`);
    }
  });

  return results;
}

// Run the test
testAnalyticsEndpoints().catch(console.error);