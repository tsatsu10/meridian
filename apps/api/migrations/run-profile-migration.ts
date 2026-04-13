import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: join(__dirname, '../.env') });

async function runMigration() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('🔄 Running profile columns migration...');
    
    const migrationSQL = readFileSync(join(__dirname, 'add-profile-columns.sql'), 'utf-8');
    
    // Split by semicolons and run each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 80)}...`);
      await sql.unsafe(statement);
    }
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();

