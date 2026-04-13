// Test time-entry endpoint specifically
async function testTimeEntry() {
  const endpoints = [
    'http://localhost:1337/time-entry',
    'http://localhost:1337/api/time-entry',
    'http://localhost:1337/',
  ];

  console.log('⏱️  Testing Time Entry Endpoints...\n');

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await fetch(endpoint);
      console.log(`Status: ${response.status} - ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS:', data);
      } else {
        const errorText = await response.text();
        console.log('❌ Error response:', errorText.substring(0, 200));
      }
    } catch (error) {
      console.log('💥 Network error:', error.message);
    }
    console.log('---\n');
  }
}

testTimeEntry().catch(console.error);