import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL not found in environment variables');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function checkDatabase() {
  try {
    // Check if teams table exists and has projectId column
    console.log('🔍 Checking teams table structure...\n');

    const tableInfo = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'teams'
      ORDER BY ordinal_position;
    `;

    console.log('📋 Teams table columns:');
    console.table(tableInfo);

    // Check existing teams
    console.log('\n📊 Existing teams:');
    const teams = await client`
      SELECT id, name, description, workspace_id, project_id, created_by, is_active, created_at
      FROM teams
      ORDER BY created_at DESC
      LIMIT 10;
    `;

    if (teams.length === 0) {
      console.log('No teams found in database.');
    } else {
      console.table(teams);
    }

    // Check projects for reference
    console.log('\n📦 Existing projects:');
    const projects = await client`
      SELECT id, name, workspace_id, owner_id, created_at
      FROM projects
      ORDER BY created_at DESC
      LIMIT 10;
    `;

    if (projects.length === 0) {
      console.log('No projects found in database.');
    } else {
      console.table(projects);
    }

  } catch (error) {
    console.error('Error checking database:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

checkDatabase();
