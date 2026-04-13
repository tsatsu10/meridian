#!/usr/bin/env tsx
/**
 * Fix Database Enum - Add Missing User Roles
 * 
 * This script adds the missing user role enum values to the database.
 */

import { config } from "dotenv";
config();

import { sql } from "drizzle-orm";
import { getDatabase, initializeDatabase } from "../connection";
import logger from "../../utils/logger";

async function fixEnum() {
  logger.info("🔧 Fixing user_role enum...\n");
  
  try {
    await initializeDatabase();
    const db = getDatabase();
    
    logger.info("📝 Adding missing enum values...");
    
    const enumValues = [
      'workspace-manager',
      'team-lead',
      'project-manager',
      'department-head',
      'project-viewer',
      'guest'
    ];
    
    for (const value of enumValues) {
      try {
        logger.info(`   Adding '${value}'...`);
        await db.execute(sql.raw(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_enum 
              WHERE enumlabel = '${value}' 
              AND enumtypid = 'user_role'::regtype
            ) THEN
              ALTER TYPE user_role ADD VALUE '${value}';
            END IF;
          END $$;
        `));
        logger.info(`   ✅ '${value}' added or already exists`);
      } catch (err: any) {
        if (err.message.includes('already exists')) {
          logger.info(`   ⏭️  '${value}' already exists`);
        } else {
          logger.error(`   ❌ Failed to add '${value}': ${err.message}`);
        }
      }
    }
    
    logger.info("\n✅ Enum fix complete!");
    logger.info("\n📋 Next step: Run 'pnpm run seed:all' to populate database\n");
    
  } catch (error) {
    logger.error("❌ Error fixing enum:", error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  fixEnum()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error("Fatal error:", error);
      process.exit(1);
    });
}

export default fixEnum;

