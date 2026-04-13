import postgres from 'postgres';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '../.env') });

async function verifyColumns() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('🔍 Verifying all profile table columns...\n');
    
    // Check user_profile columns
    const profileColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_profile' 
      ORDER BY ordinal_position
    `;
    console.log('✅ user_profile columns:', profileColumns.length);
    console.log(profileColumns.map(c => `  - ${c.column_name} (${c.data_type})`).join('\n'));
    
    // Check user_experience columns
    const experienceColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_experience' 
      ORDER BY ordinal_position
    `;
    console.log('\n✅ user_experience columns:', experienceColumns.length);
    console.log(experienceColumns.map(c => `  - ${c.column_name} (${c.data_type})`).join('\n'));
    
    // Check user_education columns
    const educationColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_education' 
      ORDER BY ordinal_position
    `;
    console.log('\n✅ user_education columns:', educationColumns.length);
    console.log(educationColumns.map(c => `  - ${c.column_name} (${c.data_type})`).join('\n'));
    
    // Check user_skill columns
    const skillColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_skill' 
      ORDER BY ordinal_position
    `;
    console.log('\n✅ user_skill columns:', skillColumns.length);
    console.log(skillColumns.map(c => `  - ${c.column_name} (${c.data_type})`).join('\n'));
    
    // Check user_connection columns
    const connectionColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_connection' 
      ORDER BY ordinal_position
    `;
    console.log('\n✅ user_connection columns:', connectionColumns.length);
    console.log(connectionColumns.map(c => `  - ${c.column_name} (${c.data_type})`).join('\n'));
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await sql.end();
  }
}

verifyColumns();

