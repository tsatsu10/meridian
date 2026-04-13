import postgres from 'postgres';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '../.env') });

async function testQueries() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('🔍 Testing profile queries...\n');
    
    // Get a sample user ID
    console.log('📝 Getting sample user...');
    const users = await sql`SELECT id, email FROM users LIMIT 1`;
    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    const userId = users[0].id;
    console.log(`✅ Found user: ${users[0].email} (${userId})\n`);
    
    // Test profile query
    console.log('📝 Testing profile query...');
    try {
      const profile = await sql`
        SELECT * FROM user_profile WHERE user_id = ${userId}
      `;
      console.log(`✅ Profile query successful: ${profile.length} rows`);
    } catch (error: any) {
      console.error('❌ Profile query failed:', error.message);
    }
    
    // Test experience query
    console.log('\n📝 Testing experience query...');
    try {
      const experience = await sql`
        SELECT * FROM user_experience WHERE user_id = ${userId}
      `;
      console.log(`✅ Experience query successful: ${experience.length} rows`);
    } catch (error: any) {
      console.error('❌ Experience query failed:', error.message);
    }
    
    // Test education query
    console.log('\n📝 Testing education query...');
    try {
      const education = await sql`
        SELECT * FROM user_education WHERE user_id = ${userId}
      `;
      console.log(`✅ Education query successful: ${education.length} rows`);
    } catch (error: any) {
      console.error('❌ Education query failed:', error.message);
    }
    
    // Test skills query
    console.log('\n📝 Testing skills query...');
    try {
      const skills = await sql`
        SELECT * FROM user_skill WHERE user_id = ${userId}
      `;
      console.log(`✅ Skills query successful: ${skills.length} rows`);
    } catch (error: any) {
      console.error('❌ Skills query failed:', error.message);
    }
    
    // Test connections query
    console.log('\n📝 Testing connections query...');
    try {
      const connections = await sql`
        SELECT * FROM user_connection 
        WHERE follower_id = ${userId} OR following_id = ${userId}
      `;
      console.log(`✅ Connections query successful: ${connections.length} rows`);
    } catch (error: any) {
      console.error('❌ Connections query failed:', error.message);
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await sql.end();
  }
}

testQueries();

