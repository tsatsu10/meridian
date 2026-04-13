import postgres from 'postgres';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

config({ path: join(__dirname, '../.env') });

async function runMigration() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('🔄 Running remaining column fixes...\n');
    
    const migrationSQL = readFileSync(join(__dirname, 'fix-remaining-columns.sql'), 'utf-8');
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      console.log('📝 Executing:', statement.substring(0, 60) + '...');
      await sql.unsafe(statement);
      console.log('✅ Done');
    }
    
    console.log('\n✅ All remaining fixes completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

