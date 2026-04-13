import postgres from 'postgres';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '../.env') });

async function addColumns() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('🔄 Adding missing columns...\n');
    
    console.log('📝 Adding location to user_education...');
    await sql.unsafe(`ALTER TABLE user_education ADD COLUMN IF NOT EXISTS location TEXT`);
    console.log('✅ Done');
    
    console.log('📝 Adding level to user_skill...');
    await sql.unsafe(`ALTER TABLE user_skill ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1`);
    console.log('✅ Done');
    
    console.log('\n✅ All columns added successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sql.end();
  }
}

addColumns();

