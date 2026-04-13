const postgres = require('postgres');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const sql = postgres(connectionString, { ssl: 'require' });

  try {
    const workspaces = await sql`select id, name from workspaces limit 10`;
    console.log(JSON.stringify(workspaces, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await sql.end();
  }
}

main();

