#!/usr/bin/env ts-node
/**
 * 🎭 Run User Seeding Script
 * 
 * Execute this to seed test users with various roles
 */

import seedUsersWithRoles from "./seed-users-with-roles";
import logger from '../../utils/logger';

async function main() {
  logger.debug("🚀 Starting user seeding process...\n");
  
  try {
    await seedUsersWithRoles();
    logger.debug("\n✅ User seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    logger.error("\n❌ User seeding failed:", error);
    process.exit(1);
  }
}

main();


