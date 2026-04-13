import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '../.env') });

async function testEndpoints() {
  const API_URL = 'http://localhost:3005';
  
  try {
    console.log('🔍 Testing all profile endpoints...\n');
    
    const endpoints = [
      '/api/profile',
      '/api/profile/experience',
      '/api/profile/education',
      '/api/profile/skills',
      '/api/profile/connections'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`📝 Testing ${endpoint}...`);
      try {
        const response = await fetch(`${API_URL}${endpoint}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const status = response.status;
        const statusText = response.statusText;
        
        if (status === 200) {
          console.log(`✅ ${endpoint}: ${status} ${statusText}`);
          const data = await response.json();
          console.log(`   Response:`, JSON.stringify(data).substring(0, 100) + '...');
        } else if (status === 401) {
          console.log(`⚠️  ${endpoint}: ${status} ${statusText} (Auth required - expected in demo mode)`);
        } else {
          console.log(`❌ ${endpoint}: ${status} ${statusText}`);
          const text = await response.text();
          console.log(`   Error:`, text.substring(0, 200));
        }
      } catch (error: any) {
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
      console.log('');
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testEndpoints();

