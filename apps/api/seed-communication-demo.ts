import db from "./src/database";
import { channelTable, messageTable, channelMembershipTable, workspaceTable, userTable } from "./src/database/schema";
import { eq } from "drizzle-orm";

async function seedCommunicationDemo() {
  console.log('🌱 Seeding communication demo data...\n');

  try {
    // Get the demo workspace and user
    const demoWorkspace = await db.select().from(workspaceTable).limit(1);
    const demoUser = await db.select().from(userTable).where(eq(userTable.email, "elidegbotse@gmail.com")).limit(1);

    if (demoWorkspace.length === 0) {
      console.error('❌ No workspace found. Please ensure demo workspace exists.');
      return;
    }

    if (demoUser.length === 0) {
      console.error('❌ Demo user not found. Please ensure demo user exists.');
      return;
    }

    const workspaceId = demoWorkspace[0].id;
    const userEmail = demoUser[0].email;

    console.log(`📋 Using workspace: ${demoWorkspace[0].name} (${workspaceId})`);
    console.log(`👤 Using user: ${userEmail}\n`);

    // Clear existing demo data
    console.log('🧹 Clearing existing demo communication data...');
    await db.delete(messageTable);
    await db.delete(channelMembershipTable);
    await db.delete(channelTable);

    // Create demo channels
    console.log('📁 Creating demo channels...');
    
    const channelsToCreate = [
      {
        name: "general",
        description: "General team discussions and updates",
        type: "team",
        workspaceId,
        createdBy: userEmail
      },
      {
        name: "announcements",
        description: "Important company and team announcements",
        type: "announcement",
        workspaceId,
        createdBy: userEmail
      },
      {
        name: "project-meridian",
        description: "Meridian project development discussions",
        type: "project",
        workspaceId,
        createdBy: userEmail
      },
      {
        name: "design-reviews",
        description: "Design feedback and UI/UX discussions",
        type: "team",
        workspaceId,
        createdBy: userEmail
      },
      {
        name: "random",
        description: "Random conversations and fun discussions",
        type: "team",
        workspaceId,
        createdBy: userEmail
      }
    ];

    const createdChannels = await db.insert(channelTable).values(channelsToCreate).returning();
    
    console.log(`✅ Created ${createdChannels.length} channels:`);
    createdChannels.forEach(channel => {
      console.log(`  - #${channel.name} (${channel.type})`);
    });

    // Create channel memberships - add demo user as admin to all channels
    console.log('\n👥 Creating channel memberships...');
    
    const memberships = createdChannels.map(channel => ({
      channelId: channel.id,
      userEmail,
      role: "admin" as const
    }));

    await db.insert(channelMembershipTable).values(memberships);
    console.log(`✅ Added ${memberships.length} channel memberships`);

    // Create demo messages
    console.log('\n💬 Creating demo messages...');
    
    const generalChannel = createdChannels.find(c => c.name === "general");
    const projectChannel = createdChannels.find(c => c.name === "project-meridian");
    const announcementsChannel = createdChannels.find(c => c.name === "announcements");

    const messagesToCreate = [
      // General channel messages
      {
        channelId: generalChannel!.id,
        userEmail,
        content: "Welcome to the Meridian communication system! 🎉 This is working great!",
        messageType: "text"
      },
      {
        channelId: generalChannel!.id,
        userEmail,
        content: "I'm really excited about the progress we're making on the project management features. The real-time updates are fantastic!",
        messageType: "text"
      },
      {
        channelId: generalChannel!.id,
        userEmail,
        content: "Quick reminder: We have our weekly team sync tomorrow at 2 PM. Looking forward to seeing everyone! 📅",
        messageType: "text"
      },
      
      // Project channel messages
      {
        channelId: projectChannel!.id,
        userEmail,
        content: "Just pushed the latest communication system updates. The messaging is now fully functional with real-time support! 🚀",
        messageType: "text"
      },
      {
        channelId: projectChannel!.id,
        userEmail,
        content: "Next up: implementing file uploads and emoji reactions. The architecture is solid and ready for these features.",
        messageType: "text"
      },
      
      // Announcements channel
      {
        channelId: announcementsChannel!.id,
        userEmail,
        content: "🎯 Major milestone achieved! The Meridian communication system is now live and fully operational. Great work team!",
        messageType: "text"
      }
    ];

    const createdMessages = await db.insert(messageTable).values(messagesToCreate).returning();
    
    console.log(`✅ Created ${createdMessages.length} demo messages`);

    // Summary
    console.log('\n📊 Demo Data Summary:');
    console.log('=====================================');
    console.log(`📁 Channels: ${createdChannels.length}`);
    console.log(`👥 Memberships: ${memberships.length}`);
    console.log(`💬 Messages: ${createdMessages.length}`);
    console.log(`🏢 Workspace: ${demoWorkspace[0].name}`);
    console.log(`👤 User: ${userEmail}`);
    
    console.log('\n✅ Communication demo data seeded successfully!');
    console.log('🔗 You can now test the communication system at /dashboard/communication');

  } catch (error) {
    console.error('❌ Error seeding communication demo data:', error);
    throw error;
  }
}

// Run the seeding function
seedCommunicationDemo()
  .then(() => {
    console.log('\n🎉 Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  }); 