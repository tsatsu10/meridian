import postgres from 'postgres';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '../.env') });

async function runMigration() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('🔄 Adding missing user_connection columns...');
    
    // Add follower_id column
    await sql.unsafe(`ALTER TABLE user_connection ADD COLUMN IF NOT EXISTS follower_id TEXT`);
    console.log('✅ Added follower_id column');
    
    // Add following_id column if it doesn't exist
    await sql.unsafe(`ALTER TABLE user_connection ADD COLUMN IF NOT EXISTS following_id TEXT`);
    console.log('✅ Added following_id column');
    
    // Copy data if the old columns exist
    try {
      await sql.unsafe(`UPDATE user_connection SET follower_id = user_id WHERE follower_id IS NULL AND user_id IS NOT NULL`);
      console.log('✅ Migrated user_id to follower_id');
    } catch (e) {
      console.log('ℹ️  user_id column might not exist, skipping data migration');
    }
    
    try {
      await sql.unsafe(`UPDATE user_connection SET following_id = connected_user_id WHERE following_id IS NULL AND connected_user_id IS NOT NULL`);
      console.log('✅ Migrated connected_user_id to following_id');
    } catch (e) {
      console.log('ℹ️  connected_user_id column might not exist, skipping data migration');
    }
    
    console.log('✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sql.end();
  }
}

runMigration();

