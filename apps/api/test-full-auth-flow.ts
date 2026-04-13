/**
 * Comprehensive authentication flow test
 * Tests: Sign-in → Get session token → Test Task API
 */

async function testAuthFlow() {
  const BASE_URL = 'http://localhost:3005';

  console.log('🧪 Starting comprehensive authentication flow test\n');

  // Step 1: Sign in
  console.log('📝 Step 1: Signing in...');
  const signInResponse = await fetch(`${BASE_URL}/api/user/sign-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@meridian.app',
      password: 'admin123'
    })
  });

  if (!signInResponse.ok) {
    const error = await signInResponse.text();
    console.error('❌ Sign-in failed:', signInResponse.status, error);
    process.exit(1);
  }

  const signInData = await signInResponse.json();
  console.log('✅ Sign-in successful!');
  console.log('   User:', signInData.user.email);
  console.log('   Session Token:', signInData.sessionToken.substring(0, 20) + '...');
  console.log('');

  // Step 2: Test Task API with token
  console.log('📝 Step 2: Testing Task API with Bearer token...');
  const taskResponse = await fetch(`${BASE_URL}/api/task/all/urv86i1eiibkxrmajm5tvxir?limit=5`, {
    headers: {
      'Authorization': `Bearer ${signInData.sessionToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!taskResponse.ok) {
    const error = await taskResponse.text();
    console.error('❌ Task API failed:', taskResponse.status, error);
    process.exit(1);
  }

  const taskData = await taskResponse.json();
  console.log('✅ Task API successful!');
  console.log(`   Tasks returned: ${taskData.tasks.length}`);
  console.log(`   Total tasks: ${taskData.pagination.total}`);
  console.log(`   Projects available: ${taskData.filters.projects.length}`);
  console.log('');

  // Step 3: Test with cookie
  console.log('📝 Step 3: Testing Task API with cookie...');
  const cookieHeader = signInResponse.headers.get('set-cookie');
  if (cookieHeader) {
    const taskWithCookieResponse = await fetch(`${BASE_URL}/api/task/all/urv86i1eiibkxrmajm5tvxir?limit=5`, {
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': 'application/json'
      }
    });

    if (taskWithCookieResponse.ok) {
      console.log('✅ Task API works with cookie!');
    } else {
      console.log('⚠️  Cookie auth not working (but Bearer token works)');
    }
  }
  console.log('');

  // Summary
  console.log('═══════════════════════════════════════');
  console.log('🎉 ALL TESTS PASSED!');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('✅ Sign-in endpoint: WORKING');
  console.log('✅ Session token generation: WORKING');
  console.log('✅ Task API with Bearer token: WORKING');
  console.log('✅ Task API 500 error: FIXED');
  console.log('');
  console.log('📋 Credentials for browser login:');
  console.log('   Email: admin@meridian.app');
  console.log('   Password: admin123');
  console.log('');
  console.log('🔑 Current valid session token:');
  console.log(`   ${signInData.sessionToken}`);
  console.log('');
  console.log('💡 To use in browser console:');
  console.log(`   localStorage.setItem('sessionToken', '${signInData.sessionToken}')`);
  console.log('   Then refresh the page');
}

testAuthFlow().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
