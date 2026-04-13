import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '../.env') });

// Import and initialize database first
import { initializeDatabase } from '../src/database/connection';

async function testController() {
  try {
    console.log('🔄 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized\n');
    
    console.log('🔄 Importing controller...');
    const getExperience = (await import('../src/profile/controllers/get-experience')).default;
    console.log('✅ Controller imported\n');
    
    console.log('🔄 Calling controller with test userId...');
    const userId = 'j44kaoka2kg3xhw48e54syp4';  // From our earlier test
    const result = await getExperience(userId);
    console.log('✅ Controller executed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testController();

