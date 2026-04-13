import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_PoJlUnKCf32a@ep-dry-mode-ae1fy7m1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  connect_timeout: 10,
  prepare: false
});

try {
  console.log('🔗 Testing database connection...');
  const result = await sql`SELECT version()`;
  console.log('✅ Database connected successfully!');
  console.log('📊 PostgreSQL version:', result[0].version.substring(0, 60));

  // Test if tables exist
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('project_templates', 'template_tasks', 'role_assignment')
    ORDER BY table_name
  `;

  console.log('\n📋 Checking for required tables:');
  console.log('Found tables:', tables.map(t => t.table_name).join(', ') || 'NONE');

  const allTables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;

  console.log('\n📦 All tables in database:');
  allTables.forEach(t => console.log(`  - ${t.table_name}`));

  await sql.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  await sql.end();
  process.exit(1);
}
