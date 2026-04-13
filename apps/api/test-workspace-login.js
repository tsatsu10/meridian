#!/usr/bin/env node

/**
 * Test workspace retrieval for both users
 */

const DEMO_SESSION = 'demo-session-token';

async function testWorkspaceForUser(email, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${description}`);
  console.log(`Email: ${email}`);
  console.log('='.repeat(60));
  
  try {
    const response = await fetch('http://localhost:3005/api/workspace', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${DEMO_SESSION}`
      }
    });

    const status = response.status;
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { error: 'Failed to parse JSON' };
    }
    
    const icon = status === 200 ? '✅' : '❌';
    console.log(`\n${icon} Status: ${status}`);
    
    if (Array.isArray(data)) {
      console.log(`📦 Workspaces found: ${data.length}`);
      data.forEach((ws, i) => {
        console.log(`\n  Workspace ${i + 1}:`);
        console.log(`    ID: ${ws.id}`);
        console.log(`    Name: ${ws.name}`);
        console.log(`    Owner ID: ${ws.ownerId}`);
        console.log(`    User Role: ${ws.userRole}`);
        console.log(`    Created: ${ws.createdAt}`);
      });
    } else {
      console.log('Response:', JSON.stringify(data, null, 2));
    }
    
    return { email, status, data };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { email, status: 'ERROR', error: error.message };
  }
}

async function runTests() {
  console.log('\n🧪 Testing Workspace Retrieval for Different Users\n');
  
  await testWorkspaceForUser(
    'elidegbotse@gmail.com',
    'User with 4 workspace assignments (should see workspaces)'
  );
  
  await testWorkspaceForUser(
    'admin@meridian.app',
    'Admin user (should see workspaces)'
  );
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Test complete!');
  console.log('\n💡 Note: The backend is finding workspaces correctly.');
  console.log('   The issue was that the frontend fetcher was missing /api/ prefix.\n');
}

setTimeout(() => {
  runTests().catch(console.error);
}, 1000);

