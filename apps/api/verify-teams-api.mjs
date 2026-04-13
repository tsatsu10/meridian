import postgres from 'postgres';
import 'dotenv/config';

const client = postgres(process.env.DATABASE_URL);

async function verifyTeamsData() {
  try {
    console.log('🔍 Checking database state...\n');

    // Check teams
    console.log('📊 Teams in database:');
    const teams = await client`
      SELECT id, name, workspace_id, project_id, is_active
      FROM teams
      WHERE is_active = true;
    `;
    console.table(teams);

    // Check team members
    console.log('\n👥 Team members:');
    const members = await client`
      SELECT tm.id, t.name as team_name, u.name as user_name, tm.role
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      JOIN users u ON tm.user_id = u.id;
    `;
    console.table(members);

    // Check if team_members table exists
    console.log('\n📋 Checking team_members table structure:');
    const tableExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'team_members'
      );
    `;
    console.log('team_members table exists:', tableExists[0].exists);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

verifyTeamsData();
