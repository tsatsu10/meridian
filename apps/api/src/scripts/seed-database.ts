#!/usr/bin/env tsx
/**
 * Database Seeding Script
 * Creates essential data for both API and frontend functionality including:
 * - Default channels for messaging
 * - Sample teams for collaboration
 * - Status columns for kanban boards
 * - User presence data
 */

import { config } from "dotenv";
import logger from '../utils/logger';
config();

import { getDatabase } from "../database/connection";
import { 
  channelTable,
  channelMembershipTable,
  teamTable,
  statusColumnTable,
  userPresenceTable,
  messageDeliveryStatusTable,
  directMessageConversationsTable,
  userTable,
  workspaceTable,
  workspaceUserTable,
  projectTable
} from "../database/schema";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

async function seedDatabase() {
  logger.info("🌱 Starting database seeding...");

  try {
    // Initialize database connection first
    const { initializeDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    // Get the admin user and first workspace
    const [adminUser] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, "admin@meridian.app"))
      .limit(1);

    if (!adminUser) {
      logger.error("❌ Admin user not found. Please run the server first to create admin user.");
      return;
    }

    const [workspace] = await db
      .select()
      .from(workspaceTable)
      .limit(1);

    if (!workspace) {
      logger.error("❌ No workspace found. Please create a workspace first.");
      return;
    }

    logger.info(`✅ Found admin user: ${adminUser.email}`);
    logger.info(`✅ Found workspace: ${workspace.name} (${workspace.id})`);

    // 1. Create default channels for messaging
    await createDefaultChannels(workspace.id, adminUser.email);

    // 2. Create sample teams
    await createSampleTeams(workspace.id, adminUser.email);

    // 3. Create default status columns for projects
    await createDefaultStatusColumns(workspace.id);

    // 4. Initialize user presence
    await initializeUserPresence(workspace.id, adminUser.email);

    // 5. Create sample projects if none exist
    await createSampleProjects(workspace.id, adminUser.email);

    logger.info("🎉 Database seeding completed successfully!");

  } catch (error) {
    logger.error("❌ Database seeding failed:", error);
    process.exit(1);
  }
}

async function createDefaultChannels(workspaceId: string, adminEmail: string) {
  const db = getDatabase();
  logger.info("📢 Creating default channels...");

  const defaultChannels = [
    {
      name: "general",
      description: "General workspace discussions",
      type: "text",
      isPrivate: false,
    },
    {
      name: "announcements",
      description: "Important announcements and updates",
      type: "text",
      isPrivate: false,
    },
    {
      name: "random",
      description: "Random conversations and team bonding",
      type: "text",
      isPrivate: false,
    },
    {
      name: "development",
      description: "Development discussions and updates",
      type: "text",
      isPrivate: false,
    }
  ];

  for (const channelData of defaultChannels) {
    // Check if channel already exists
    const existingChannel = await db
      .select()
      .from(channelTable)
      .where(
        and(
          eq(channelTable.name, channelData.name),
          eq(channelTable.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (existingChannel.length === 0) {
      const channelId = createId();
      
      // Create channel
      await db.insert(channelTable).values({
        id: channelId,
        name: channelData.name,
        description: channelData.description,
        type: channelData.type as any,
        isPrivate: channelData.isPrivate,
        workspaceId,
        createdBy: adminEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Add admin as channel member
      await db.insert(channelMembershipTable).values({
        id: createId(),
        channelId,
        userEmail: adminEmail,
        role: "admin",
        joinedAt: new Date(),
      });

      logger.info(`✅ Created channel: #${channelData.name}`);
    } else {
      logger.info(`ℹ️ Channel #${channelData.name} already exists`);
    }
  }
}

async function createSampleTeams(workspaceId: string, adminEmail: string) {
  const db = getDatabase();
  logger.info("👥 Creating sample teams...");

  const sampleTeams = [
    {
      name: "Development Team",
      description: "Frontend and backend developers",
      type: "development",
    },
    {
      name: "Design Team", 
      description: "UI/UX designers and product designers",
      type: "design",
    },
    {
      name: "Product Team",
      description: "Product managers and product owners",
      type: "product",
    }
  ];

  for (const teamData of sampleTeams) {
    // Check if team already exists
    const existingTeam = await db
      .select()
      .from(teamTable)
      .where(
        and(
          eq(teamTable.name, teamData.name),
          eq(teamTable.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (existingTeam.length === 0) {
      await db.insert(teamTable).values({
        id: createId(),
        name: teamData.name,
        description: teamData.description,
        workspaceId,
        createdBy: adminEmail,
        memberEmails: JSON.stringify([adminEmail]),
        settings: JSON.stringify({
          allowDirectMessages: true,
          allowFileSharing: true,
          allowChannelCreation: true,
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logger.info(`✅ Created team: ${teamData.name}`);
    } else {
      logger.info(`ℹ️ Team ${teamData.name} already exists`);
    }
  }
}

async function createDefaultStatusColumns(workspaceId: string) {
  const db = getDatabase();
  logger.info("📋 Creating default status columns...");

  // Get the first project in the workspace
  const [project] = await db
    .select()
    .from(projectTable)
    .where(eq(projectTable.workspaceId, workspaceId))
    .limit(1);

  if (!project) {
    logger.info("ℹ️ No projects found, will create status columns when projects are created");
    return;
  }

  const defaultColumns = [
    { name: "To Do", slug: "todo", color: "#6B7280", position: 0, isDefault: true },
    { name: "In Progress", slug: "in-progress", color: "#3B82F6", position: 1, isDefault: false },
    { name: "Review", slug: "review", color: "#F59E0B", position: 2, isDefault: false },
    { name: "Done", slug: "done", color: "#10B981", position: 3, isDefault: false },
  ];

  for (const columnData of defaultColumns) {
    // Check if column already exists
    const existingColumn = await db
      .select()
      .from(statusColumnTable)
      .where(
        and(
          eq(statusColumnTable.slug, columnData.slug),
          eq(statusColumnTable.projectId, project.id)
        )
      )
      .limit(1);

    if (existingColumn.length === 0) {
      await db.insert(statusColumnTable).values({
        id: createId(),
        projectId: project.id,
        name: columnData.name,
        slug: columnData.slug,
        color: columnData.color,
        position: columnData.position,
        isDefault: columnData.isDefault,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logger.info(`✅ Created status column: ${columnData.name}`);
    } else {
      logger.info(`ℹ️ Status column ${columnData.name} already exists`);
    }
  }
}

async function initializeUserPresence(workspaceId: string, adminEmail: string) {
  const db = getDatabase();
  logger.info("👤 Initializing user presence...");

  // Check if presence record already exists
  const existingPresence = await db
    .select()
    .from(userPresenceTable)
    .where(
      and(
        eq(userPresenceTable.userEmail, adminEmail),
        eq(userPresenceTable.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (existingPresence.length === 0) {
    await db.insert(userPresenceTable).values({
      id: createId(),
      userEmail: adminEmail,
      workspaceId,
      status: "offline",
      lastSeen: new Date(),
      updatedAt: new Date(),
    });

    logger.info(`✅ Initialized presence for ${adminEmail}`);
  } else {
    logger.info(`ℹ️ Presence already exists for ${adminEmail}`);
  }
}

async function createSampleProjects(workspaceId: string, adminEmail: string) {
  const db = getDatabase();
  logger.info("📁 Creating sample projects...");

  // Check if projects already exist
  const existingProjects = await db
    .select()
    .from(projectTable)
    .where(eq(projectTable.workspaceId, workspaceId))
    .limit(1);

  if (existingProjects.length === 0) {
    const sampleProjects = [
      {
        name: "Meridian Platform Development",
        description: "Core platform development and feature implementation",
        status: "active",
      },
      {
        name: "Product Design System",
        description: "Design system and component library",
        status: "active",
      }
    ];

    for (const projectData of sampleProjects) {
      await db.insert(projectTable).values({
        id: createId(),
        name: projectData.name,
        description: projectData.description,
        status: projectData.status as any,
        workspaceId,
        createdBy: adminEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logger.info(`✅ Created project: ${projectData.name}`);
    }
  } else {
    logger.info(`ℹ️ Projects already exist in workspace`);
  }
}

// Run the seeding
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info("✅ Database seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("❌ Database seeding failed:", error);
      process.exit(1);
    });
}

export default seedDatabase;

