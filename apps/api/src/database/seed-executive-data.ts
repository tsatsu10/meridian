/**
 * Seed script for Executive Dashboard data
 * Creates realistic portfolio data for testing and demos
 */

import { config } from "dotenv";
config({ path: "./apps/api/.env" });

import { getDatabase, initializeDatabase } from "./connection";
import { 
  projectTable, 
  taskTable, 
  workspaceTable,
  workspaceUserTable,
  userTable 
} from "./schema";
import { eq } from "drizzle-orm";
import logger from '../utils/logger';

interface SeedOptions {
  workspaceId?: string;
  workspaceName?: string;
  projectCount?: number;
  tasksPerProject?: number;
}

export async function seedExecutiveData(options: SeedOptions = {}) {
  // Initialize database connection first
  await initializeDatabase();
  
  const db = getDatabase();
  
  const {
    workspaceId: providedWorkspaceId,
    workspaceName = "Demo Executive Workspace",
    projectCount = 16,
    tasksPerProject = 25
  } = options;

  logger.debug("🌱 Starting executive data seeding...");

  try {
    // Step 1: Get or create workspace
    let workspaceId = providedWorkspaceId;
    
    if (!workspaceId) {
      const existingWorkspaces = await db
        .select()
        .from(workspaceTable)
        .limit(1);
      
      if (existingWorkspaces.length > 0) {
        workspaceId = existingWorkspaces[0].id;
        logger.debug(`✓ Using existing workspace: ${workspaceId}`);
      } else {
        const [newWorkspace] = await db
          .insert(workspaceTable)
          .values({
            name: workspaceName,
            slug: workspaceName.toLowerCase().replace(/\s+/g, "-"),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        workspaceId = newWorkspace.id;
        logger.debug(`✓ Created new workspace: ${workspaceId}`);
      }
    }

    // Step 1.5: Get a workspace user to use as project owner
    const [workspaceUser] = await db
      .select()
      .from(workspaceUserTable)
      .where(eq(workspaceUserTable.workspaceId, workspaceId))
      .limit(1);
    
    let ownerId: string;
    
    if (workspaceUser) {
      // Get the user ID from their email
      const [user] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, workspaceUser.userEmail))
        .limit(1);
      ownerId = user?.id!;
    } else {
      // Get any user from the database
      const [anyUser] = await db
        .select()
        .from(userTable)
        .limit(1);
      ownerId = anyUser?.id!;
    }
    
    if (!ownerId) {
      throw new Error("No users found in database. Please create a user first.");
    }
    
    logger.debug(`✓ Using owner ID: ${ownerId}`);

    // Step 2: Create demo projects with varying health scores
    const projectTemplates = [
      // On Track Projects (12)
      { name: "Mobile App Redesign", health: 85, budget: 125000, status: "in_progress", priority: "high" },
      { name: "Cloud Migration", health: 90, budget: 98000, status: "in_progress", priority: "high" },
      { name: "API Platform v2", health: 80, budget: 87000, status: "in_progress", priority: "high" },
      { name: "Dashboard Improvements", health: 88, budget: 65000, status: "in_progress", priority: "medium" },
      { name: "Performance Optimization", health: 92, budget: 45000, status: "in_progress", priority: "medium" },
      { name: "Mobile SDK Development", health: 85, budget: 78000, status: "in_progress", priority: "medium" },
      { name: "Analytics Platform", health: 83, budget: 92000, status: "in_progress", priority: "medium" },
      { name: "Customer Portal", health: 87, budget: 55000, status: "in_progress", priority: "low" },
      { name: "Internal Tools Suite", health: 81, budget: 38000, status: "in_progress", priority: "low" },
      { name: "Documentation Rewrite", health: 89, budget: 22000, status: "in_progress", priority: "low" },
      { name: "Design System v2", health: 84, budget: 48000, status: "in_progress", priority: "medium" },
      { name: "Search Optimization", health: 86, budget: 35000, status: "in_progress", priority: "low" },
      
      // At Risk Projects (3)
      { name: "Payment Gateway Integration", health: 65, budget: 72000, status: "in_progress", priority: "high" },
      { name: "Legacy System Migration", health: 70, budget: 105000, status: "in_progress", priority: "medium" },
      { name: "Third-party API Updates", health: 68, budget: 28000, status: "in_progress", priority: "medium" },
      
      // Critical Project (1)
      { name: "Security Compliance Audit", health: 55, budget: 85000, status: "in_progress", priority: "urgent" },
    ];

    const projects = [];
    const now = new Date();

    for (let i = 0; i < Math.min(projectCount, projectTemplates.length); i++) {
      const template = projectTemplates[i];
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 90));
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 90 + Math.floor(Math.random() * 90));

      const [project] = await db
        .insert(projectTable)
        .values({
          workspaceId,
          ownerId,
          name: template.name,
          slug: template.name.toLowerCase().replace(/\s+/g, "-"),
          description: `${template.name} project for ${workspaceName}`,
          status: template.status as any,
          priority: template.priority as any,
          startDate,
          endDate,
          healthScore: template.health,
          budget: template.budget,
          actualSpent: Math.floor(template.budget * (0.6 + Math.random() * 0.3)), // 60-90% spent
          createdAt: startDate,
          updatedAt: now,
        })
        .returning();
      
      projects.push(project);
      logger.debug(`  ✓ Created project: ${project.name} (Health: ${template.health}%)`);

      // Step 3: Create tasks for each project
      const taskStatuses = ["todo", "in_progress", "done", "blocked"];
      const taskPriorities = ["low", "medium", "high", "urgent"];
      
      const completionRate = template.health / 100;
      const tasksToCreate = Math.floor(tasksPerProject * (0.8 + Math.random() * 0.4));
      
      for (let j = 0; j < tasksToCreate; j++) {
        const isCompleted = Math.random() < completionRate;
        const status = isCompleted ? "done" : taskStatuses[Math.floor(Math.random() * 3)];
        const priority = taskPriorities[Math.floor(Math.random() * taskPriorities.length)];
        
        const taskStartDate = new Date(startDate);
        taskStartDate.setDate(taskStartDate.getDate() + Math.floor(Math.random() * 60));
        
        const dueDate = new Date(taskStartDate);
        dueDate.setDate(dueDate.getDate() + 7 + Math.floor(Math.random() * 21));

        await db.insert(taskTable).values({
          projectId: project.id,
          title: `Task ${j + 1} for ${project.name}`,
          description: `Implementation task for ${project.name}`,
          status: status as any,
          priority: priority as any,
          dueDate,
          createdAt: taskStartDate,
          updatedAt: status === "done" ? dueDate : now,
          estimatedHours: 8 + Math.floor(Math.random() * 32),
        });
      }
    }

    logger.debug(`✓ Created ${projects.length} projects with tasks`);

    // Step 4: Skipping milestones (table may not exist in schema yet)
    logger.debug(`ℹ️  Skipping milestone creation (feature in development)`);

    logger.debug("✅ Executive data seeding completed successfully!");
    
    return {
      workspaceId,
      projectCount: projects.length,
      message: "Seeding completed successfully"
    };

  } catch (error) {
    logger.error("❌ Error seeding data:", error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  seedExecutiveData()
    .then(() => {
      logger.debug("✅ Seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}


