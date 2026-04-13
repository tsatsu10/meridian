import postgres from 'postgres';
import { createId } from '@paralleldrive/cuid2';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL not found in environment variables');
  process.exit(1);
}

const client = postgres(connectionString);

async function createTeamsForExistingProjects() {
  try {
    console.log('🚀 Creating teams for existing projects...\n');

    // Get all projects that don't have teams yet
    const projects = await client`
      SELECT p.id, p.name, p.workspace_id, p.owner_id, p.created_at
      FROM projects p
      LEFT JOIN teams t ON t.project_id = p.id
      WHERE t.id IS NULL
      ORDER BY p.created_at;
    `;

    if (projects.length === 0) {
      console.log('✅ All projects already have teams!');
      return;
    }

    console.log(`📦 Found ${projects.length} projects without teams:`);
    console.table(projects.map(p => ({
      name: p.name,
      workspace_id: p.workspace_id,
      created_at: p.created_at
    })));

    console.log('\n🔨 Creating teams...\n');

    for (const project of projects) {
      const teamId = createId();
      const teamName = `${project.name} Team`;
      const teamDescription = `Team for ${project.name} project`;

      await client`
        INSERT INTO teams (
          id,
          name,
          description,
          workspace_id,
          project_id,
          created_by,
          is_active,
          settings,
          created_at,
          updated_at
        ) VALUES (
          ${teamId},
          ${teamName},
          ${teamDescription},
          ${project.workspace_id},
          ${project.id},
          ${project.owner_id},
          true,
          ${{ type: 'project', autoCreated: true, retroactive: true }},
          ${project.created_at},
          NOW()
        )
      `;

      console.log(`✅ Created team: "${teamName}" (ID: ${teamId})`);
    }

    console.log('\n🎉 Successfully created teams for all existing projects!');

    // Verify
    console.log('\n📊 Final verification:');
    const allTeams = await client`
      SELECT t.id, t.name, t.project_id, p.name as project_name
      FROM teams t
      LEFT JOIN projects p ON t.project_id = p.id
      ORDER BY t.created_at DESC;
    `;

    console.table(allTeams);

  } catch (error) {
    console.error('❌ Error creating teams:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTeamsForExistingProjects();
