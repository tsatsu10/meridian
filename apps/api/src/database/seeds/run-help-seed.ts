#!/usr/bin/env tsx
// Script to seed help content into the database
// Usage: npm run db:seed:help

import 'dotenv/config';
import { seedHelpContent } from "./help-content";
import { initializeDatabase, closeDatabase } from "../connection";
import logger from "../../utils/logger";

async function run() {
  try {
    logger.info("🚀 Initializing database connection...");
    await initializeDatabase();
    
    logger.info("🌱 Running help content seed...");
    await seedHelpContent();
    
    logger.info("✅ Help content seed completed successfully!");
    
  } catch (error) {
    logger.error("❌ Failed to seed help content:", error);
    process.exit(1);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

run();


