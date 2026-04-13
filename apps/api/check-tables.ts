import db from "./src/database";
import { channelTable, messageTable, channelMembershipTable } from "./src/database/schema";
import { count } from "drizzle-orm";

async function checkTables() {
  console.log('🔍 Checking communication tables...\n');
  
  try {
    // Check channels
    const channelCount = await db.select({ count: count() }).from(channelTable);
    console.log(`📁 Channels: ${channelCount[0]?.count || 0} records`);
    
    // Check messages
    const messageCount = await db.select({ count: count() }).from(messageTable);
    console.log(`💬 Messages: ${messageCount[0]?.count || 0} records`);
    
    // Check channel memberships
    const membershipCount = await db.select({ count: count() }).from(channelMembershipTable);
    console.log(`👥 Channel Memberships: ${membershipCount[0]?.count || 0} records`);
    
    // Get sample channels if any exist
    const sampleChannels = await db.select().from(channelTable).limit(3);
    
    if (sampleChannels.length > 0) {
      console.log('\n📋 Sample Channels:');
      sampleChannels.forEach(channel => {
        console.log(`  - ${channel.name} (${channel.type}) - ${channel.archived ? 'Archived' : 'Active'}`);
      });
    } else {
      console.log('\n⚠️  No channels found - database needs demo data');
    }
    
    console.log('\n✅ Database check complete!');
    
  } catch (error) {
    console.error('❌ Database error:', error);
  }
  
  process.exit(0);
}

checkTables(); 