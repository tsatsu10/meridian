import db from './src/database/index.js';

async function checkActivityTable() {
  try {
    const result = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'activity'
    `);
    
    console.log('Activity table check result:', result);
    console.log('Activity table exists:', result.length > 0 || (result.rows && result.rows.length > 0));
    
    // Also check what tables do exist
    const allTables = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('All tables in database:');
    if (allTables.rows) {
      allTables.rows.forEach(row => console.log('  -', row.table_name));
    } else {
      allTables.forEach(row => console.log('  -', row.table_name));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkActivityTable();