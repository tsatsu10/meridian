// Script to check team messages in database
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function checkMessages() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const sql = postgres(databaseUrl);

  try {
    console.log('🔍 Checking team_messages table...\n');
    
    // Count total messages
    const [count] = await sql`
      SELECT COUNT(*) as count FROM team_messages;
    `;
    console.log(`📊 Total messages in database: ${count.count}`);
    
    // Get recent messages
    const messages = await sql`
      SELECT 
        id, 
        team_id,
        user_email,
        content,
        message_type,
        is_deleted,
        created_at
      FROM team_messages
      ORDER BY created_at DESC
      LIMIT 10;
    `;
    
    console.log(`\n📨 Recent messages (${messages.length}):`);
    messages.forEach((msg: any, i: number) => {
      console.log(`\n${i + 1}. ID: ${msg.id}`);
      console.log(`   Team: ${msg.team_id}`);
      console.log(`   User: ${msg.user_email}`);
      console.log(`   Content: "${msg.content}"`);
      console.log(`   Type: ${msg.message_type}`);
      console.log(`   Deleted: ${msg.is_deleted}`);
      console.log(`   Created: ${msg.created_at}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

checkMessages();

