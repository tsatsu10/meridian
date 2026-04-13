#!/usr/bin/env tsx

/**
 * 🛠️ Migration Script: Assign Workspace-Manager Roles to Creators
 * 
 * This script retroactively assigns workspace-manager roles to existing workspace creators.
 * It should be run once to migrate existing workspaces to the new RBAC system.
 * 
 * Usage:
 *   npm run migrate:workspace-creators
 *   or
 *   tsx apps/api/src/scripts/migrate-workspace-creators.ts
 */

import assignWorkspaceManagerToCreators from "../workspace-user/controllers/assign-workspace-manager-to-creators";
import logger from '../utils/logger';

async function runMigration() {
  logger.debug("🚀 Starting workspace creator migration...\n");
  
  try {
    const result = await assignWorkspaceManagerToCreators();
    
    if (result.success) {
      logger.debug("\n✅ Migration completed successfully!");
      process.exit(0);
    } else {
      logger.debug("\n❌ Migration failed!");
      process.exit(1);
    }
  } catch (error) {
    logger.error("\n💥 Migration error:", error);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

export default runMigration; 
