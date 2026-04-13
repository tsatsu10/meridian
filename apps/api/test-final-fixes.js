#!/usr/bin/env node

/**
 * Test script for the final 3 endpoint improvements
 */

const API_BASE = 'http://localhost:3005/api';
const DEMO_SESSION = 'demo-session-token';

async function testEndpoint(name, path, expectedStatus = 200) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${DEMO_SESSION}`
      }
    });

    const status = response.status;
    const data = await response.json();
    
    const success = status === expectedStatus;
    const icon = success ? '✅' : '❌';
    const color = success ? '\x1b[32m' : '\x1b[31m';
    
    console.log(`${icon} ${name.padEnd(45)} ${color}${status}\x1b[0m`);
    
    if (data.message) {
      console.log(`   💬 Message: ${data.message}`);
    }
    if (data.data || data.conversations !== undefined) {
      console.log(`   ✓ Data returned successfully`);
    }
    if (data.howToUse) {
      console.log(`   📖 Helpful documentation included`);
    }
    
    return { name, status, success, data };
  } catch (error) {
    console.log(`❌ ${name.padEnd(45)} \x1b[31mERROR: ${error.message}\x1b[0m`);
    return { name, status: 'ERROR', success: false };
  }
}

async function runTests() {
  console.log('\n🧪 Testing Final 3 Endpoint Improvements\n');
  console.log('='.repeat(70));
  
  const tests = [
    { 
      name: 'GET /api/settings (root, authenticated)', 
      path: '/settings',
      expected: 200
    },
    { 
      name: 'GET /api/automation/rules (improved error)', 
      path: '/automation/rules',
      expected: 400 // Now returns helpful message
    },
    { 
      name: 'GET /api/direct-messaging/conversations', 
      path: '/direct-messaging/conversations',
      expected: 200 // Now uses authenticated user by default
    },
  ];

  const results = [];
  for (const test of tests) {
    const result = await testEndpoint(test.name, test.path, test.expected);
    results.push(result);
    console.log(''); // Spacing
  }

  console.log('='.repeat(70));
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`\n📊 Results: ${successful}/${total} tests passed (${Math.round(successful/total*100)}%)\n`);
  
  if (successful === total) {
    console.log('🎉 All endpoints are now developer-friendly!');
    console.log('\n✅ Summary:');
    console.log('   • Settings: Root route returns current user\'s settings');
    console.log('   • Automation: Helpful error message with usage examples');
    console.log('   • Direct Messaging: Uses authenticated user by default');
  }
}

setTimeout(() => {
  runTests().catch(console.error);
}, 1000);

