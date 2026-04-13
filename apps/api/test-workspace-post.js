#!/usr/bin/env node

/**
 * Test POST to workspace endpoint
 */

const DEMO_SESSION = 'demo-session-token';

async function testWorkspacePost(path) {
  const fullUrl = `http://localhost:3005${path}`;
  
  try {
    console.log(`\nTesting POST ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${DEMO_SESSION}`
      },
      body: JSON.stringify({
        name: 'Test Workspace',
        description: 'Testing workspace creation'
      })
    });

    const status = response.status;
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { error: 'Failed to parse JSON' };
    }
    
    const icon = status === 200 || status === 201 ? '✅' : '❌';
    console.log(`${icon} Status: ${status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return { path, status, data };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { path, status: 'ERROR', error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing Workspace POST Endpoints\n');
  console.log('='.repeat(60));
  
  // Test both paths
  await testWorkspacePost('/workspace');  // Without /api prefix
  await testWorkspacePost('/api/workspace');  // With /api prefix
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Test complete!');
  console.log('\n💡 The correct endpoint is: POST /api/workspace');
  console.log('   Frontend should use: http://localhost:3005/api/workspace\n');
}

setTimeout(() => {
  runTests().catch(console.error);
}, 1000);

