const { config } = require("dotenv");
config();

async function testWorkspaceQuery() {
  try {
    console.log("🧪 Testing workspace query...");
    
    // Simple PostgreSQL connection test
    const { Client } = require('pg');
    
    const client = new Client({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/meridian'
    });
    
    await client.connect();
    console.log("✅ Connected to database");
    
    // Test 1: Check if admin user exists
    console.log("\n1. Checking admin user...");
    const userResult = await client.query(
      'SELECT id, email FROM users WHERE email = $1 LIMIT 1',
      ['elidegbotse@gmail.com']
    );
    
    console.log("Admin user:", userResult.rows);
    
    if (!userResult.rows.length) {
      console.log("❌ Admin user not found!");
      await client.end();
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log("✅ Found admin user ID:", userId);
    
    // Test 2: Check all workspaces in database
    console.log("\n2. Checking all workspaces...");
    const allWorkspacesResult = await client.query('SELECT * FROM workspaces');
    console.log("All workspaces:", allWorkspacesResult.rows);
    
    // Test 3: Check workspaces owned by admin user
    console.log("\n3. Checking workspaces owned by admin...");
    const userWorkspacesResult = await client.query(
      'SELECT * FROM workspaces WHERE owner_id = $1',
      [userId]
    );
    console.log("User workspaces:", userWorkspacesResult.rows);
    
    await client.end();
    
  } catch (error) {
    console.error("❌ Error testing workspace query:", error);
  }
}

testWorkspaceQuery();