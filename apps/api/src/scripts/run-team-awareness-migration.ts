// Script to run team awareness migration
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔌 Connecting to database...');
  const sql = postgres(databaseUrl);

  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'database', 'migrations', '005_create_user_activity.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('🚀 Running migration...');
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Tables created:');
    console.log('  - user_activity');
    
    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (
        table_name LIKE 'user_activity%' OR
        table_name LIKE 'user_status%' OR
        table_name = 'kudos' OR
        table_name = 'mood_log' OR
        table_name LIKE 'user_skills%' OR
        table_name LIKE 'team_availability%' OR
        table_name LIKE 'activity_feed%'
      )
      ORDER BY table_name;
    `;
    
    console.log('\n✅ Tables in database:');
    tables.forEach((table: any) => {
      console.log(`  ✓ ${table.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
    console.log('\n👋 Database connection closed');
  }
}

runMigration();

