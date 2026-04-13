require('dotenv').config({ path: './.env' });
const postgres = require('postgres');

async function checkAllTables() {
  try {
    console.log('Checking all tables in database...');

    const sql = postgres(process.env.DATABASE_URL);

    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log('All tables:', tables.map(t => t.table_name));

    await sql.end();
  } catch (error) {
    console.log('Error checking tables:', error.message);
  }
}

checkAllTables();
