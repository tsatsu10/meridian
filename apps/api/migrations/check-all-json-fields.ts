import postgres from 'postgres';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '../.env') });

async function checkJsonFields() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('🔍 Checking all JSON/JSONB fields in profile tables...\n');
    
    const tables = ['user_profile', 'user_experience', 'user_education', 'user_skill', 'user_connection'];
    
    for (const table of tables) {
      const cols = await sql`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns 
        WHERE table_name = ${table}
        AND (data_type = 'jsonb' OR data_type = 'json' OR column_name LIKE '%json%' OR column_name IN ('skills', 'metadata', 'social_links', 'activities', 'achievements'))
        ORDER BY ordinal_position
      `;
      
      if (cols.length > 0) {
        console.log(`📋 ${table}:`);
        cols.forEach(col => {
          console.log(`  ${col.column_name}: ${col.data_type} (${col.udt_name})`);
        });
        console.log('');
      }
    }
    
  } catch (error: any) {
    console.error('❌ Check failed:', error.message);
  } finally {
    await sql.end();
  }
}

checkJsonFields();

