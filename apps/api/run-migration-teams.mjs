import postgres from 'postgres';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL not found in environment variables');
  process.exit(1);
}

const client = postgres(connectionString);

async function runMigration() {
  try {
    console.log('🚀 Running migration to add project_id to teams table...\n');

    // Add project_id column
    console.log('Adding project_id column...');
    await client`
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS project_id text;
    `;
    console.log('✅ Column added successfully\n');

    // Add foreign key constraint (drop if exists first)
    console.log('Adding foreign key constraint...');
    try {
      await client`
        ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_project_id_projects_id_fk;
      `;
      await client`
        ALTER TABLE teams
          ADD CONSTRAINT teams_project_id_projects_id_fk
          FOREIGN KEY (project_id)
          REFERENCES projects(id)
          ON DELETE CASCADE;
      `;
      console.log('✅ Foreign key constraint added successfully\n');
    } catch (error) {
      console.log('⚠️  Foreign key constraint may already exist or could not be added');
      console.log(error.message);
    }

    // Verify the column was added
    console.log('Verifying changes...');
    const columns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'teams'
      ORDER BY ordinal_position;
    `;

    console.log('📋 Teams table structure:');
    console.table(columns);

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
