// Test base server connectivity
async function testServer() {
  const endpoints = [
    'http://localhost:1337/',
    'http://localhost:1337/health',
    'http://localhost:1337/api',
    'http://localhost:1340/'
  ];

  console.log('🌐 Testing Server Connectivity...\n');

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await fetch(endpoint);
      const data = await response.text();
      
      console.log(`Status: ${response.status} - ${response.statusText}`);
      console.log(`Response: ${data.substring(0, 100)}...`);
    } catch (error) {
      console.log(`ERROR: ${error.message}`);
    }
    console.log('---\n');
  }
}

testServer().catch(console.error);