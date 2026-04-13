import postgres from 'postgres';
import { createId } from '@paralleldrive/cuid2';
import 'dotenv/config';

const client = postgres(process.env.DATABASE_URL);

async function createTeamMembersTable() {
  try {
    console.log('🚀 Creating team_members table...\n');

    // Create team_members table
    await client`
      CREATE TABLE IF NOT EXISTS team_members (
        id text PRIMARY KEY,
        team_id text NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role text DEFAULT 'member',
        joined_at timestamp with time zone DEFAULT now() NOT NULL,
        added_by text REFERENCES users(id)
      );
    `;
    console.log('✅ team_members table created\n');

    // Add existing team owners as members
    console.log('🔨 Adding team owners as team members...\n');
    
    const teams = await client`
      SELECT t.id, t.created_by, t.name
      FROM teams t
      LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = t.created_by
      WHERE t.created_by IS NOT NULL
      AND tm.id IS NULL;
    `;

    console.log(`Found ${teams.length} teams without their owners as members`);

    for (const team of teams) {
      const memberId = createId();
      await client`
        INSERT INTO team_members (id, team_id, user_id, role, added_by, joined_at)
        VALUES (
          ${memberId},
          ${team.id},
          ${team.created_by},
          'lead',
          ${team.created_by},
          NOW()
        );
      `;
      console.log(`✅ Added owner to team: ${team.name}`);
    }

    console.log('\n✅ Migration complete!');

    // Verify
    console.log('\n📊 Team members summary:');
    const summary = await client`
      SELECT 
        t.name as team_name,
        u.name as member_name,
        tm.role,
        tm.joined_at
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      JOIN users u ON tm.user_id = u.id
      ORDER BY t.created_at DESC, tm.joined_at;
    `;
    console.table(summary);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTeamMembersTable();
