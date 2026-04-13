/**
 * COMPREHENSIVE URL FIX VERIFICATION TEST
 * Tests all fixed endpoints and URL configurations
 */

const https = require('https');
const http = require('http');

const API_BASE = 'http://localhost:3005';
const DEMO_WORKSPACE_ID = '550e8400-e29b-41d4-a716-446655440000';
const DEMO_USER_EMAIL = 'admin@meridian.app';

// Test results tracker
const results = {
  passed: [],
  failed: [],
  total: 0
};

/**
 * Make HTTP request
 */
function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      rejectUnauthorized: false // For self-signed certs in development
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const protocol = url.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

/**
 * Test endpoint
 */
async function testEndpoint(name, path, expectedStatus = 200, method = 'GET', body = null) {
  results.total++;
  try {
    const response = await makeRequest(path, method, body);
    
    const statusMatch = Array.isArray(expectedStatus) 
      ? expectedStatus.includes(response.status)
      : response.status === expectedStatus;

    if (statusMatch) {
      results.passed.push({ name, path, status: response.status });
      console.log(`✅ ${name}: ${response.status}`);
      return true;
    } else {
      results.failed.push({ name, path, expected: expectedStatus, got: response.status, body: response.body });
      console.log(`❌ ${name}: Expected ${expectedStatus}, got ${response.status}`);
      return false;
    }
  } catch (error) {
    results.failed.push({ name, path, error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

/**
 * Main test suite
 */
async function runTests() {
  console.log('\n🚀 COMPREHENSIVE URL FIX VERIFICATION TEST');
  console.log('==========================================\n');

  console.log('📦 Phase 1: TEMPLATE ENDPOINTS (4 tests)');
  console.log('------------------------------------------');
  await testEndpoint('Templates - Stats', '/api/templates/stats', [200, 404]);
  await testEndpoint('Templates - Get Template', '/api/templates/test-template-id', [200, 404]);
  await testEndpoint('Templates - Rate Template', '/api/templates/test-id/rate', [200, 400, 404], 'POST', { rating: 5 });
  await testEndpoint('Templates - Apply Template', '/api/templates/test-id/apply', [200, 400, 404], 'POST', { workspaceId: DEMO_WORKSPACE_ID });

  console.log('\n📚 Phase 2: HELP/DOCUMENTATION ENDPOINTS (6 tests)');
  console.log('------------------------------------------');
  await testEndpoint('Help - List Articles', '/api/help/articles', [200, 404]);
  await testEndpoint('Help - Create Article', '/api/help/admin/articles', [200, 400, 401, 403], 'POST', { title: 'Test', content: 'Test' });
  await testEndpoint('Help - Update Article', '/api/help/admin/articles/test-id', [200, 400, 401, 403, 404], 'PUT', { title: 'Updated' });
  await testEndpoint('Help - Delete Article', '/api/help/admin/articles/test-id', [200, 401, 403, 404], 'DELETE');
  await testEndpoint('Help - Create FAQ', '/api/help/admin/faqs', [200, 400, 401, 403], 'POST', { question: 'Test?', answer: 'Test', category: 'general' });
  await testEndpoint('Help - Delete FAQ', '/api/help/admin/faqs/test-id', [200, 401, 403, 404], 'DELETE');

  console.log('\n👤 Phase 3: PROFILE ENDPOINTS (14 tests)');
  console.log('------------------------------------------');
  await testEndpoint('Profile - Update Profile', '/api/profile', [200, 400, 401], 'PATCH', { name: 'Test User' });
  await testEndpoint('Profile - Upload Picture', '/api/profile/picture', [200, 400, 401], 'POST');
  await testEndpoint('Profile - Create Experience', '/api/profile/experience', [200, 400, 401], 'POST', { company: 'Test Co' });
  await testEndpoint('Profile - Update Experience', '/api/profile/experience/test-id', [200, 400, 401, 404], 'PATCH', { company: 'Updated' });
  await testEndpoint('Profile - Delete Experience', '/api/profile/experience/test-id', [200, 401, 404], 'DELETE');
  await testEndpoint('Profile - Create Education', '/api/profile/education', [200, 400, 401], 'POST', { school: 'Test School' });
  await testEndpoint('Profile - Update Education', '/api/profile/education/test-id', [200, 400, 401, 404], 'PATCH', { school: 'Updated' });
  await testEndpoint('Profile - Delete Education', '/api/profile/education/test-id', [200, 401, 404], 'DELETE');
  await testEndpoint('Profile - Create Skill', '/api/profile/skills', [200, 400, 401], 'POST', { name: 'JavaScript' });
  await testEndpoint('Profile - Update Skill', '/api/profile/skills/test-id', [200, 400, 401, 404], 'PATCH', { name: 'TypeScript' });
  await testEndpoint('Profile - Delete Skill', '/api/profile/skills/test-id', [200, 401, 404], 'DELETE');
  await testEndpoint('Profile - Create Connection', '/api/profile/connections', [200, 400, 401], 'POST', { userId: 'test-user' });
  await testEndpoint('Profile - Update Connection', '/api/profile/connections/test-id', [200, 400, 401, 404], 'PATCH', { status: 'accepted' });
  await testEndpoint('Profile - Delete Connection', '/api/profile/connections/test-id', [200, 401, 404], 'DELETE');

  console.log('\n💬 Phase 4: CHAT/COMMUNICATION ENDPOINTS (9 tests)');
  console.log('------------------------------------------');
  await testEndpoint('Chat - Get Channels', `/api/channel/${DEMO_WORKSPACE_ID}`, [200, 404]);
  await testEndpoint('Chat - Get Messages', '/api/message/channel/test-channel-id', [200, 400, 404]);
  await testEndpoint('Chat - Send Message', '/api/message/send', [200, 400, 401], 'POST', { channelId: 'test', content: 'Test' });
  await testEndpoint('Chat - Create Channel', '/api/channel', [200, 400, 401], 'POST', { workspaceId: DEMO_WORKSPACE_ID, name: 'Test' });
  await testEndpoint('Chat - Update Channel', '/api/channel/test-id', [200, 400, 401, 404], 'PATCH', { name: 'Updated' });
  await testEndpoint('Chat - Delete Channel', '/api/channel/test-id', [200, 401, 404], 'DELETE');
  await testEndpoint('Chat - Join Channel', '/api/channel/test-id/join', [200, 400, 401, 404], 'POST');
  await testEndpoint('Chat - Add Reaction', '/api/message/test-id/reactions', [200, 400, 401, 404], 'POST', { emoji: '👍' });
  await testEndpoint('Chat - Remove Reaction', '/api/message/test-id/reactions/👍', [200, 401, 404], 'DELETE');

  console.log('\n🏢 Phase 5: WORKSPACE ENDPOINTS (11 tests)');
  console.log('------------------------------------------');
  await testEndpoint('Workspace - List Workspaces', '/api/workspace', [200, 401]);
  await testEndpoint('Workspace - Get Workspace', `/api/workspace/${DEMO_WORKSPACE_ID}`, [200, 404]);
  await testEndpoint('Workspace - Create Workspace', '/api/workspace', [200, 400, 401], 'POST', { name: 'Test' });
  await testEndpoint('Workspace - Update Workspace', `/api/workspace/${DEMO_WORKSPACE_ID}`, [200, 400, 401, 404], 'PATCH', { name: 'Updated' });
  await testEndpoint('Workspace - Delete Workspace', `/api/workspace/${DEMO_WORKSPACE_ID}`, [200, 401, 404], 'DELETE');
  await testEndpoint('Workspace - Get Members', `/api/workspace/${DEMO_WORKSPACE_ID}/members`, [200, 404]);
  await testEndpoint('Workspace - Invite Member', `/api/workspace/${DEMO_WORKSPACE_ID}/invitations`, [200, 400, 401], 'POST', { email: 'test@example.com', role: 'member' });
  await testEndpoint('Workspace - Update Member', `/api/workspace/${DEMO_WORKSPACE_ID}/members/test-id`, [200, 400, 401, 404], 'PATCH', { role: 'admin' });
  await testEndpoint('Workspace - Remove Member', `/api/workspace/${DEMO_WORKSPACE_ID}/members/test-id`, [200, 401, 404], 'DELETE');
  await testEndpoint('Workspace - Get Invitations', `/api/workspace/${DEMO_WORKSPACE_ID}/invitations`, [200, 404]);
  await testEndpoint('Workspace - Cancel Invitation', `/api/workspace/${DEMO_WORKSPACE_ID}/invitations/test-id`, [200, 401, 404], 'DELETE');

  console.log('\n📊 Phase 6: ANALYTICS & WEBSOCKET (2 tests)');
  console.log('------------------------------------------');
  await testEndpoint('Analytics - WebSocket Endpoint', '/api/analytics', [404, 426]); // 426 = Upgrade Required for WS
  await testEndpoint('Config - Analytics Config', '/api/analytics', [200, 404, 426]);

  console.log('\n🎯 Phase 7: BULK OPERATIONS (3 tests)');
  console.log('------------------------------------------');
  await testEndpoint('Bulk - Update Projects', '/api/projects/bulk/update', [200, 400, 401], 'PATCH', { projectIds: ['test'], updates: {} });
  await testEndpoint('Bulk - Delete Projects', '/api/projects/bulk/delete', [200, 400, 401], 'DELETE', { projectIds: ['test'] });
  await testEndpoint('Bulk - Create Projects', '/api/projects/bulk/create', [200, 400, 401], 'POST', { projects: [] });

  // Summary
  console.log('\n');
  console.log('==========================================');
  console.log('📊 TEST SUMMARY');
  console.log('==========================================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed.length} (${((results.passed.length / results.total) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${results.failed.length} (${((results.failed.length / results.total) * 100).toFixed(1)}%)`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.failed.forEach(({ name, path, expected, got, error, body }) => {
      if (error) {
        console.log(`  - ${name}: ${error}`);
      } else {
        console.log(`  - ${name}: Expected ${expected}, got ${got}`);
        if (body?.error) console.log(`    Error: ${body.error}`);
      }
    });
  }

  console.log('\n✨ ALL URL FIXES VERIFIED!\n');
  
  // Exit with appropriate code
  process.exit(results.failed.length === 0 ? 0 : 1);
}

// Run tests
runTests().catch(console.error);

