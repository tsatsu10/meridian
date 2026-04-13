import postgres from 'postgres';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '../.env') });

async function runMigration() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('🔄 Adding missing job_title column...');
    
    await sql.unsafe(`ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS job_title TEXT`);
    console.log('✅ Added job_title column');
    
    console.log('✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sql.end();
  }
}

runMigration();

