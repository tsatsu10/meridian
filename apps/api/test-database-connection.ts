import { config } from "dotenv";
config();

import db from "./src/database";
import { users, workspaces } from "./src/database/schema-minimal";

async function testDatabaseConnection() {
  try {
    console.log("🔍 Testing PostgreSQL connection...");
    
    // Test basic query
    const userCount = await db.select().from(users).limit(1);
    console.log("✅ Users table accessible");
    
    const workspaceCount = await db.select().from(workspaces).limit(1);
    console.log("✅ Workspaces table accessible");
    
    console.log("🎉 Database connection test PASSED!");
    console.log("🌐 Connected to PostgreSQL (Neon) successfully");
    
  } catch (error) {
    console.error("❌ Database connection test FAILED:", error);
  }
  
  process.exit(0);
}

testDatabaseConnection();