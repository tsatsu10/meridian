import { getDatabase } from "../database/connection";
import { workspaceTable, workspaceUserTable, userTable } from "../database/schema";
import { eq } from "drizzle-orm";
import logger from '../utils/logger';

async function checkWorkspaceData() {
  const db = getDatabase();
  const adminEmail = process.env.ADMIN_EMAIL || "admin@meridian.app";
  
  logger.info("🔍 Checking workspace data for admin user...");
  
  // Check all workspaces
  const workspaces = await db.select().from(workspaceTable);
  logger.info("📋 All workspaces:");
  workspaces.forEach(ws => {
    logger.info(`  - ${ws.name} (${ws.id}) owned by ${ws.ownerEmail}`);
  });
  
  // Check all workspace users
  const workspaceUsers = await db.select().from(workspaceUserTable);
  logger.info("\n👥 All workspace users:");
  workspaceUsers.forEach(wu => {
    logger.info(`  - ${wu.userEmail} in workspace ${wu.workspaceId} with role ${wu.role}`);
  });
  
  // Check specific admin user workspace access
  logger.info(`\n🔍 Checking admin user ${adminEmail} workspace access:`);
  const adminWorkspaceUsers = await db.select()
    .from(workspaceUserTable)
    .where(eq(workspaceUserTable.userEmail, adminEmail));
    
  adminWorkspaceUsers.forEach(wu => {
    logger.info(`  ✅ ${wu.userEmail} has access to workspace ${wu.workspaceId} with role ${wu.role}`);
  });
  
  if (adminWorkspaceUsers.length === 0) {
    logger.info(`  ❌ Admin user ${adminEmail} has no workspace access!`);
  }
}

checkWorkspaceData().catch(console.error);

