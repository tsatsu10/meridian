require('dotenv').config({ path: './.env' });
const postgres = require('postgres');

async function checkTables() {
  try {
    console.log('Checking database tables...');

    const sql = postgres(process.env.DATABASE_URL);

    // Check if main tables exist
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('user', 'workspace', 'role_assignment', 'project', 'task')
      ORDER BY table_name
    `;

    console.log('Found tables:', tables.map(t => t.table_name));

    if (tables.length === 0) {
      console.log('No tables found! Database might not be initialized.');
    }

    await sql.end();
  } catch (error) {
    console.log('Error checking tables:', error.message);
  }
}

checkTables();
