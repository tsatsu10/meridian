import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '../.env') });

async function testDetailedEndpoint() {
  const API_URL = 'http://localhost:3005';
  
  try {
    console.log('🔍 Testing /api/profile/experience endpoint in detail...\n');
    
    const response = await fetch(`${API_URL}/api/profile/experience`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      console.log('\nJSON Response:', JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('\nText Response:', text);
    }
    
  } catch (error: any) {
    console.error('❌ Request failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDetailedEndpoint();

