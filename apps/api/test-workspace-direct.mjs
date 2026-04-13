import { config } from "dotenv";
config();

import getWorkspaces from "./src/workspace/controllers/get-workspaces.js";

console.log('🧪 Testing workspace controller directly with PostgreSQL...');

try {
  const workspaces = await getWorkspaces('admin@meridian.app');
  console.log('✅ POSTGRES API INTEGRATION CONFIRMED! 🎉');
  console.log('📊 Workspaces found:', JSON.stringify(workspaces, null, 2));
  console.log('🔗 Database connection: WORKING');
  console.log('🗄️ Schema mapping: WORKING');  
  console.log('⚡ Drizzle ORM queries: WORKING');
} catch (error) {
  console.error('❌ Test FAILED:', error.message);
  console.error('Stack trace:', error.stack);
}