import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

await client.connect();

const result = await client.query(`
  SELECT id, name, workspace_id, created_at 
  FROM projects 
  ORDER BY created_at DESC 
  LIMIT 10
`);

console.log('Projects in database:');
console.log(result.rows);

await client.end();
