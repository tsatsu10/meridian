import postgres from 'postgres';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '../.env') });

async function addAchievements() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('🔄 Adding achievements column to user_experience...');
    
    await sql.unsafe(`ALTER TABLE user_experience ADD COLUMN IF NOT EXISTS achievements TEXT`);
    console.log('✅ Added achievements column');
    
    console.log('✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sql.end();
  }
}

addAchievements();

