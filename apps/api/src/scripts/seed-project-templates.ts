#!/usr/bin/env ts-node
/**
 * Standalone Script to Seed Project Templates (PostgreSQL)
 * Usage: npm run seed:templates
 * or: ts-node src/scripts/seed-project-templates.ts
 */

import "dotenv/config";
import { seedProjectTemplates } from "../database/seeds/seed-templates";
import logger from '../utils/logger';

async function main() {
  logger.debug("🚀 Starting project template seeding to PostgreSQL...\n");
  
  try {
    const result = await seedProjectTemplates();
    
    logger.debug("\n🎉 Success! Project templates have been seeded to PostgreSQL.");
    logger.debug("\nYou can now:");
    logger.debug("  • View templates at: GET /templates");
    logger.debug("  • Filter by industry: GET /templates?industry=Technology");
    logger.debug("  • Apply to projects: POST /templates/:id/apply");
    
    // Exit cleanly
    process.exit(0);
    
  } catch (error) {
    logger.error("\n❌ Error seeding templates:", error);
    process.exit(1);
  }
}

main();


