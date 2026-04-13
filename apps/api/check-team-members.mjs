import postgres from 'postgres';
import 'dotenv/config';

const client = postgres(process.env.DATABASE_URL);

async function checkTeamMembers() {
  try {
    console.log('🔍 Checking for team membership table...\n');

    // Check if team_members table exists
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%team%'
      ORDER BY table_name;
    `;

    console.log('📋 Tables with "team" in name:');
    console.table(tables);

    // Check teams table structure
    console.log('\n📊 Current teams table structure:');
    const teamCols = await client`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'teams'
      ORDER BY ordinal_position;
    `;
    console.table(teamCols);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTeamMembers();
