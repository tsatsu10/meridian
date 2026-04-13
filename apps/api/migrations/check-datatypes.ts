import postgres from 'postgres';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '../.env') });

async function checkDataTypes() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('🔍 Checking data types in profile tables...\n');
    
    // Check user_experience
    console.log('📋 user_experience columns:');
    const expCols = await sql`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'user_experience'
      AND column_name IN ('skills', 'achievements', 'metadata')
      ORDER BY ordinal_position
    `;
    expCols.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.udt_name})`);
    });
    
    // Check user_education
    console.log('\n📋 user_education columns:');
    const eduCols = await sql`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'user_education'
      AND column_name IN ('activities', 'metadata')
      ORDER BY ordinal_position
    `;
    eduCols.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.udt_name})`);
    });
    
    // Check user_skill  
    console.log('\n📋 user_skill columns:');
    const skillCols = await sql`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'user_skill'
      AND column_name IN ('proficiency', 'level', 'metadata')
      ORDER BY ordinal_position
    `;
    skillCols.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.udt_name})`);
    });
    
  } catch (error: any) {
    console.error('❌ Check failed:', error.message);
  } finally {
    await sql.end();
  }
}

checkDataTypes();

