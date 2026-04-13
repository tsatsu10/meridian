// Script to manually run time_entries table migration
import { config } from "dotenv";
config();

import postgres from "postgres";
import fs from "fs";
import path from "path";

async function runMigration() {
  // Database connection
  const sql = postgres(process.env.DATABASE_URL, {
    ssl: process.env.NODE_ENV === "production" ? "require" : false,
  });

  console.log("🔄 Running time_entries table migration...");

  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'migrations', 'add_time_entries_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await sql.unsafe(migrationSQL);
    
    console.log("✅ Migration completed successfully!");
    console.log("📋 time_entries table created with indexes");
    
    // Verify table creation
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'time_entries'
      );
    `;
    
    if (tableExists[0].exists) {
      console.log("✅ Verified: time_entries table exists in database");
    } else {
      console.log("❌ Warning: table verification failed");
    }

  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await sql.end();
  }
}

runMigration().catch(console.error);