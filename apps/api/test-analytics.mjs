// Simple analytics endpoint test
async function testAnalytics() {
  const endpoints = [
    'http://localhost:1337/analytics',
    'http://localhost:1337/api/analytics',
    'http://localhost:1337/analytics/workspaces/cm2hzdirs000013snqe0oxv8e/analytics',
    'http://localhost:1337/analytics/projects/cm2hzdk4p000113snt5zq8xyy/analytics'
  ];

  console.log('🧪 Testing Analytics Endpoints...\n');

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await fetch(endpoint);
      const data = await response.text();
      
      if (response.ok) {
        console.log(`✅ SUCCESS: ${response.status}`);
        console.log(`📊 Response: ${data.substring(0, 200)}...`);
      } else {
        console.log(`❌ FAILED: ${response.status} - ${response.statusText}`);
        console.log(`🔍 Error: ${data}`);
      }
    } catch (error) {
      console.log(`💥 ERROR: ${error.message}`);
    }
    console.log('---\n');
  }
}

testAnalytics().catch(console.error);