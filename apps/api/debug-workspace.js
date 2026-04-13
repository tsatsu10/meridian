require('dotenv').config({ path: './.env' });
const postgres = require('postgres');

async function debugWorkspaceEndpoint() {
  try {
    console.log('Debugging workspace endpoint...');

    const sql = postgres(process.env.DATABASE_URL);

    // First check if admin user exists
    const adminUsers = await sql`
      SELECT id, email, name FROM users WHERE email = 'elidegbotse@gmail.com'
    `;
    console.log('Admin users found:', adminUsers);

    if (adminUsers.length === 0) {
      console.log('No admin user found!');
      await sql.end();
      return;
    }

    const adminId = adminUsers[0].id;
    console.log('Admin ID:', adminId);

    // Check role assignments for admin
    const roleAssignments = await sql`
      SELECT * FROM role_assignment WHERE user_id = ${adminId} AND is_active = true
    `;
    console.log('Role assignments for admin:', roleAssignments);

    // Check workspaces
    const workspaces = await sql`
      SELECT * FROM workspaces
    `;
    console.log('Workspaces:', workspaces);

    // Simulate the getWorkspaces query
    if (roleAssignments.length > 0) {
      const workspaceIds = roleAssignments.map(ra => ra.workspace_id);
      console.log('Workspace IDs from role assignments:', workspaceIds);

      const userWorkspaces = await sql`
        SELECT DISTINCT
          w.id, w.name, w.owner_id, u.email as owner_email,
          w.created_at as "createdAt", w.description,
          ra.role as "userRole", ra.assigned_at as "assignedAt"
        FROM workspaces w
        INNER JOIN role_assignment ra ON w.id = ra.workspace_id AND ra.user_id = ${adminId} AND ra.is_active = true
        LEFT JOIN users u ON w.owner_id = u.id
      `;
      console.log('User workspaces result:', userWorkspaces);
    }

    await sql.end();
  } catch (error) {
    console.log('Error:', error.message);
  }
}

debugWorkspaceEndpoint();
