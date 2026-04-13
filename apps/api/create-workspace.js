const { Client } = require('pg');

// Test database connection and create workspace
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_PoJlUnKCf32a@ep-dry-mode-ae1fy7m1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function createWorkspace() {
  try {
    await client.connect();
    console.log('✅ PostgreSQL connection successful');

    // Check if workspace exists
    const workspaceId = 'k8a0u6k7qmayguubd3f8t18s';
    const result = await client.query('SELECT id FROM workspaces WHERE id = $1', [workspaceId]);

    if (result.rows.length > 0) {
      console.log('✅ Workspace exists:', result.rows[0].id);
    } else {
      console.log('❌ Workspace not found');
      console.log('🔄 Creating workspace...');

      // Create the workspace
      const createResult = await client.query(
        'INSERT INTO workspaces (id, name, description, owner_id) VALUES ($1, $2, $3, $4)',
        [workspaceId, 'Meridian Development Workspace', 'Main development workspace', 'demo-user-1']
      );
      console.log('✅ Workspace created successfully');
    }

    await client.end();
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
}

createWorkspace();
