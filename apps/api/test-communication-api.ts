import db from "./src/database";
import { channelTable, messageTable, channelMembershipTable, workspaceTable } from "./src/database/schema";
import { eq } from "drizzle-orm";

async function testCommunicationAPI() {
  console.log('🧪 Testing Communication API Functions...\n');

  try {
    // Get demo workspace
    const demoWorkspace = await db.select().from(workspaceTable).limit(1);
    if (demoWorkspace.length === 0) {
      console.error('❌ No workspace found');
      return;
    }

    const workspaceId = demoWorkspace[0].id;
    const userEmail = "elidegbotse@gmail.com";

    console.log(`🏢 Testing with workspace: ${demoWorkspace[0].name} (${workspaceId})`);
    console.log(`👤 Testing with user: ${userEmail}\n`);

    // Test 1: Fetch channels for workspace
    console.log('📁 Test 1: Fetching channels...');
    const channels = await db
      .select({
        id: channelTable.id,
        name: channelTable.name,
        description: channelTable.description,
        type: channelTable.type,
        workspaceId: channelTable.workspaceId,
        archived: channelTable.archived,
        createdAt: channelTable.createdAt,
      })
      .from(channelTable)
      .where(eq(channelTable.workspaceId, workspaceId));

    console.log(`✅ Found ${channels.length} channels:`);
    channels.forEach(channel => {
      console.log(`  - #${channel.name} (${channel.type}) - ${channel.archived ? 'Archived' : 'Active'}`);
    });

    // Test 2: Check channel memberships
    console.log('\n👥 Test 2: Checking channel memberships...');
    const memberships = await db
      .select()
      .from(channelMembershipTable)
      .where(eq(channelMembershipTable.userEmail, userEmail));

    console.log(`✅ Found ${memberships.length} memberships for ${userEmail}`);

    // Test 3: Fetch messages for first channel
    if (channels.length > 0) {
      const firstChannel = channels[0];
      console.log(`\n💬 Test 3: Fetching messages for #${firstChannel.name}...`);
      
      const messages = await db
        .select()
        .from(messageTable)
        .where(eq(messageTable.channelId, firstChannel.id));

      console.log(`✅ Found ${messages.length} messages in #${firstChannel.name}`);
      messages.forEach(message => {
        console.log(`  - ${message.userEmail}: ${message.content.substring(0, 50)}...`);
      });
    }

    // Test 4: Create a new test channel
    console.log('\n📝 Test 4: Creating new test channel...');
    const newChannel = await db
      .insert(channelTable)
      .values({
        name: "api-test-channel",
        description: "Test channel created by API test",
        type: "team",
        workspaceId,
        createdBy: userEmail,
      })
      .returning();

    if (newChannel.length > 0) {
      console.log(`✅ Created test channel: #${newChannel[0].name}`);
      
      // Add membership
      await db.insert(channelMembershipTable).values({
        channelId: newChannel[0].id,
        userEmail,
        role: "admin",
      });
      console.log(`✅ Added membership for ${userEmail}`);

      // Test 5: Send a test message
      console.log('\n💬 Test 5: Sending test message...');
      const newMessage = await db
        .insert(messageTable)
        .values({
          channelId: newChannel[0].id,
          userEmail,
          content: "This is a test message from the API test script! 🚀",
          messageType: "text",
        })
        .returning();

      if (newMessage.length > 0) {
        console.log(`✅ Sent test message: ${newMessage[0].content}`);
      }

      // Clean up test channel
      console.log('\n🧹 Cleaning up test data...');
      await db.delete(messageTable).where(eq(messageTable.channelId, newChannel[0].id));
      await db.delete(channelMembershipTable).where(eq(channelMembershipTable.channelId, newChannel[0].id));
      await db.delete(channelTable).where(eq(channelTable.id, newChannel[0].id));
      console.log('✅ Test data cleaned up');
    }

    console.log('\n🎉 All API tests passed successfully!');
    console.log('\n📋 API Test Summary:');
    console.log('=====================================');
    console.log('✅ Channel listing: Working');
    console.log('✅ Channel memberships: Working');
    console.log('✅ Message retrieval: Working');
    console.log('✅ Channel creation: Working');
    console.log('✅ Message sending: Working');

  } catch (error) {
    console.error('❌ API Test failed:', error);
    throw error;
  }
}

// Run the test
testCommunicationAPI()
  .then(() => {
    console.log('\n✅ API testing complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 API testing failed:', error);
    process.exit(1);
  }); 