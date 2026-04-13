// Simple server connectivity test
async function testServer() {
  console.log('🌐 Testing server connectivity...\n');

  try {
    const response = await fetch('http://localhost:1337/projects');
    if (response.ok) {
      console.log('✅ Server is responding');
      const data = await response.text();
      console.log('📊 Response length:', data.length);
    } else {
      console.log('❌ Server responded with error:', response.status);
    }
  } catch (error) {
    console.log('💥 Server connection failed:', error.message);
  }
}

testServer().catch(console.error);