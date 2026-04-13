import 'dotenv/config';

const API_URL = 'http://localhost:3005';

async function testTeamsEndpoint() {
  try {
    console.log('🔍 Testing teams API endpoint...\n');

    // First, sign in to get session
    console.log('1. Signing in...');
    const signInResponse = await fetch(`${API_URL}/api/user/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@meridian.app',
        password: 'admin123'
      }),
      credentials: 'include'
    });

    if (!signInResponse.ok) {
      throw new Error(`Sign in failed: ${signInResponse.status}`);
    }

    const cookies = signInResponse.headers.get('set-cookie');
    console.log('✅ Signed in successfully\n');

    // Get workspace ID
    console.log('2. Getting workspaces...');
    const workspacesResponse = await fetch(`${API_URL}/api/workspace`, {
      headers: { 'Cookie': cookies }
    });
    const workspacesData = await workspacesResponse.json();
    const workspaceId = workspacesData.workspaces?.[0]?.id;
    
    if (!workspaceId) {
      throw new Error('No workspace found');
    }
    console.log(`✅ Workspace ID: ${workspaceId}\n`);

    // Test teams endpoint
    console.log('3. Fetching teams...');
    const teamsResponse = await fetch(`${API_URL}/api/team/${workspaceId}`, {
      headers: { 'Cookie': cookies }
    });

    console.log(`Response status: ${teamsResponse.status}`);
    
    const teamsData = await teamsResponse.json();
    
    if (teamsResponse.ok) {
      console.log('\n✅ Teams fetched successfully!');
      console.log(`Found ${teamsData.teams?.length || 0} teams\n`);
      
      if (teamsData.teams && teamsData.teams.length > 0) {
        console.log('Teams:');
        teamsData.teams.forEach(team => {
          console.log(`\n  - ${team.name}`);
          console.log(`    Members: ${team.memberCount}`);
          console.log(`    Project: ${team.projectName || 'N/A'}`);
          if (team.members && team.members.length > 0) {
            team.members.forEach(member => {
              console.log(`      * ${member.name} (${member.role})`);
            });
          }
        });
      } else {
        console.log('⚠️  No teams returned from API');
      }
    } else {
      console.error('\n❌ Failed to fetch teams');
      console.error('Response:', teamsData);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testTeamsEndpoint();
