// Time Tracking Functionality Test
async function testTimeTracking() {
  const baseUrl = 'http://localhost:1337';
  
  console.log('⏱️  Testing Time Tracking Module...\n');

  // Test 1: Base time-entry endpoint
  try {
    console.log('1. Testing base time-entry endpoint...');
    const response = await fetch(`${baseUrl}/time-entry`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS: Time entry module accessible');
      console.log('📋 Available endpoints:', data.endpoints);
    } else {
      console.log('❌ FAILED:', response.status, data);
    }
  } catch (error) {
    console.log('💥 ERROR:', error.message);
  }
  console.log('---\n');

  // Test 2: Get time entries for a task
  try {
    console.log('2. Testing get time entries by task...');
    const taskId = 'cm2hzdk4p000113snt5zq8xyy'; // Using existing task ID
    const response = await fetch(`${baseUrl}/time-entry/task/${taskId}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS: Time entries retrieved');
      console.log('📊 Response type:', typeof data);
      console.log('📈 Data preview:', JSON.stringify(data).substring(0, 200));
    } else {
      console.log('❌ FAILED:', response.status, data);
    }
  } catch (error) {
    console.log('💥 ERROR:', error.message);
  }
  console.log('---\n');

  // Test 3: Create new time entry (POST test)
  try {
    console.log('3. Testing create time entry...');
    const timeEntryData = {
      taskId: 'cm2hzdk4p000113snt5zq8xyy',
      description: 'Test time tracking entry',
      startTime: new Date().toISOString()
    };
    
    const response = await fetch(`${baseUrl}/time-entry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(timeEntryData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS: Time entry created');
      console.log('🆔 Created entry:', data);
    } else {
      console.log('❌ FAILED:', response.status, data);
    }
  } catch (error) {
    console.log('💥 ERROR:', error.message);
  }
  console.log('---\n');

  // Summary
  console.log('📊 Time Tracking Assessment Summary:');
  console.log('- Base module: API structure exists');
  console.log('- GET endpoints: Need authentication/validation testing');
  console.log('- POST endpoints: Need user context for creation');
  console.log('- Overall status: Framework implemented, needs auth integration');
}

testTimeTracking().catch(console.error);