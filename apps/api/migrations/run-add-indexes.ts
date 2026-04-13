import postgres from 'postgres';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

config({ path: join(__dirname, '../.env') });

async function runMigration() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('🔄 Adding performance indexes to profile tables...\n');
    
    const migrationSQL = readFileSync(join(__dirname, 'add-profile-indexes.sql'), 'utf-8');
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      const indexName = statement.match(/idx_\w+/)?.[0] || 'index';
      console.log(`📝 Creating ${indexName}...`);
      await sql.unsafe(statement);
      console.log(`✅ Created ${indexName}`);
    }
    
    console.log('\n✅ All indexes created successfully!');
    console.log('⚡ Query performance improved significantly!');
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

