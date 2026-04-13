import { getDatabase } from "./connection";
import { 
  workspaceTable, 
  projectTable, 
  taskTable, 
  userTable, 
  workspaceUserTable,
  roleAssignmentTable,
  timeEntryTable 
} from "./schema";
import { eq } from "drizzle-orm";
import logger from '../utils/logger';

// @epic-3.1-analytics: Seed script for testing enhanced analytics
// Creates production-like test data with historical records

interface SeedOptions {
  workspaceId?: string;
  projectCount?: number;
  tasksPerProject?: number;
  teamMembers?: number;
  historicalDays?: number;
}

export async function seedAnalyticsData(options: SeedOptions = {}) {
  const db = getDatabase();
  
  const {
    workspaceId: existingWorkspaceId,
    projectCount = 5,
    tasksPerProject = 20,
    teamMembers = 8,
    historicalDays = 90
  } = options;

  logger.debug("🌱 Starting analytics data seeding...");
  logger.debug(`   Projects: ${projectCount}`);
  logger.debug(`   Tasks per project: ${tasksPerProject}`);
  logger.debug(`   Team members: ${teamMembers}`);
  logger.debug(`   Historical data: ${historicalDays} days`);

  try {
    // 0. Create or get admin user
    const adminEmail = "admin@meridian.app";
    let adminUserId: string;
    
    const existingAdmin = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, adminEmail))
      .limit(1);

    if (existingAdmin.length === 0) {
      const [newAdmin] = await db.insert(userTable).values({
        id: `user-admin-${Date.now()}`,
        email: adminEmail,
        name: "Admin User",
        password: "hashed_password_placeholder", // password field, not passwordHash
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      adminUserId = newAdmin.id;
      logger.debug(`\n✅ Created admin user: ${adminEmail} (ID: ${adminUserId})`);
    } else {
      adminUserId = existingAdmin[0].id;
      logger.debug(`\n✅ Using existing admin user: ${adminEmail} (ID: ${adminUserId})`);
    }
    
    // 1. Create or use existing workspace
    let workspaceId: string;
    if (existingWorkspaceId) {
      workspaceId = existingWorkspaceId;
      logger.debug(`\n✅ Using existing workspace: ${workspaceId}`);
    } else {
      const [workspace] = await db
        .insert(workspaceTable)
        .values({
          id: `ws-analytics-${Date.now()}`,
          name: "Analytics Test Workspace",
          slug: `analytics-test-${Date.now()}`,
          ownerId: adminUserId, // Use admin user ID, not email
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      workspaceId = workspace.id;
      logger.debug(`\n✅ Created workspace: ${workspaceId}`);
    }

    // 2. Create team members
    const userEmails: string[] = [];
    const roles = ["member", "team-lead", "project-manager", "admin"];
    
    for (let i = 0; i < teamMembers; i++) {
      const email = `user${i + 1}@analytics.test`;
      const role = roles[i % roles.length];
      
      // Create user if doesn't exist
      const existingUser = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, email))
        .limit(1);

      if (existingUser.length === 0) {
        await db.insert(userTable).values({
          id: `user-${i + 1}-${Date.now()}`,
          email,
          name: `Test User ${i + 1}`,
          password: "hashed_password_placeholder", // password field, not passwordHash
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Add to workspace
      const existingWorkspaceUser = await db
        .select()
        .from(workspaceUserTable)
        .where(eq(workspaceUserTable.userEmail, email))
        .limit(1);

      if (existingWorkspaceUser.length === 0) {
        await db.insert(workspaceUserTable).values({
          id: `wu-${i + 1}-${Date.now()}`,
          workspaceId,
          userEmail: email,
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Assign role
      const existingRoleAssignment = await db
        .select()
        .from(roleAssignmentTable)
        .where(eq(roleAssignmentTable.userEmail, email))
        .limit(1);

      if (existingRoleAssignment.length === 0) {
        await db.insert(roleAssignmentTable).values({
          id: `ra-${i + 1}-${Date.now()}`,
          userEmail: email,
          workspaceId,
          role,
          assignedBy: "admin@meridian.app",
          assignedAt: new Date(),
        });
      }

      userEmails.push(email);
    }
    logger.debug(`\n✅ Created ${userEmails.length} team members`);

    // 3. Create projects with varying health
    const projectIds: string[] = [];
    const projectHealthTypes = ["excellent", "good", "warning", "critical"];
    
    for (let i = 0; i < projectCount; i++) {
      const healthType = projectHealthTypes[i % projectHealthTypes.length];
      const daysAgo = Math.floor((historicalDays * i) / projectCount); // Stagger project creation
      
      const [project] = await db
        .insert(projectTable)
        .values({
          id: `proj-${i + 1}-${Date.now()}`,
          workspaceId,
          name: `${healthType.charAt(0).toUpperCase() + healthType.slice(1)} Project ${i + 1}`,
          slug: `${healthType}-project-${i + 1}-${Date.now()}`,
          description: `Test project for analytics with ${healthType} health status`,
          createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        })
        .returning();

      projectIds.push(project.id);
    }
    logger.debug(`\n✅ Created ${projectIds.length} projects`);

    // 4. Create tasks with realistic distribution
    let totalTasks = 0;
    const taskStatuses = ["todo", "in-progress", "done", "blocked"];
    const priorities = ["low", "medium", "high", "critical"];
    
    for (const [projectIndex, projectId] of projectIds.entries()) {
      const healthType = projectHealthTypes[projectIndex % projectHealthTypes.length];
      
      // Adjust task completion based on project health
      let doneRatio = 0.7; // Default 70% complete
      if (healthType === "excellent") doneRatio = 0.9;
      else if (healthType === "good") doneRatio = 0.75;
      else if (healthType === "warning") doneRatio = 0.5;
      else if (healthType === "critical") doneRatio = 0.3;

      for (let t = 0; t < tasksPerProject; t++) {
        const isDone = Math.random() < doneRatio;
        const status = isDone ? "done" : taskStatuses[Math.floor(Math.random() * (taskStatuses.length - 1))];
        const priority = priorities[Math.floor(Math.random() * priorities.length)];
        const assignee = userEmails[Math.floor(Math.random() * userEmails.length)];
        
        // Spread tasks across historical period
        const taskAgeRatio = t / tasksPerProject;
        const taskDaysAgo = Math.floor(historicalDays * taskAgeRatio);
        const createdAt = new Date(Date.now() - taskDaysAgo * 24 * 60 * 60 * 1000);
        
        // Set due dates - some overdue for critical/warning projects
        let dueDate: Date | null = null;
        if (healthType === "critical" || healthType === "warning") {
          // 30% of tasks are overdue
          if (Math.random() < 0.3 && !isDone) {
            dueDate = new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000);
          } else {
            dueDate = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000);
          }
        } else {
          dueDate = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000);
        }

        const [task] = await db
          .insert(taskTable)
          .values({
            id: `task-${projectIndex}-${t}-${Date.now()}`,
            projectId,
            title: `Task ${t + 1}: ${status === "done" ? "Completed" : "In Progress"} ${priority} Priority`,
            description: `Analytics test task with ${priority} priority and ${status} status`,
            status,
            priority,
            userEmail: assignee,
            assigneeEmail: assignee,
            dueDate: dueDate || null,
            createdAt,
            updatedAt: isDone ? new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : createdAt,
          })
          .returning();

        // 5. Create time entries for completed and in-progress tasks
        if (isDone || status === "in-progress") {
          const hoursSpent = Math.random() * 8 + 1; // 1-9 hours
          const timeEntryCount = Math.floor(Math.random() * 3) + 1; // 1-3 time entries per task
          
          for (let e = 0; e < timeEntryCount; e++) {
            const entryHours = hoursSpent / timeEntryCount;
            const entryDaysAgo = taskDaysAgo - Math.floor(Math.random() * (taskDaysAgo || 1));
            
            const entryDate = new Date(Date.now() - entryDaysAgo * 24 * 60 * 60 * 1000);
            await db.insert(timeEntryTable).values({
              id: `time-${projectIndex}-${t}-${e}-${Date.now()}`,
              taskId: task.id,
              userEmail: assignee,
              duration: Math.floor(entryHours * 3600), // Convert to seconds
              description: `Time entry ${e + 1} for task`,
              createdAt: entryDate,
              updatedAt: entryDate,
            });
          }
        }

        totalTasks++;
      }
    }
    logger.debug(`\n✅ Created ${totalTasks} tasks with time entries`);

    // 6. Summary
    logger.debug("\n📊 Analytics Data Seed Complete!");
    logger.debug(`   Workspace ID: ${workspaceId}`);
    logger.debug(`   Projects: ${projectIds.length}`);
    logger.debug(`   Tasks: ${totalTasks}`);
    logger.debug(`   Team Members: ${userEmails.length}`);
    logger.debug(`   Time Range: ${historicalDays} days`);
    logger.debug("\n🚀 Ready to test analytics dashboard!");

    return {
      workspaceId,
      projectIds,
      userEmails,
      totalTasks
    };

  } catch (error) {
    logger.error("❌ Error seeding analytics data:", error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  seedAnalyticsData({
    projectCount: 5,
    tasksPerProject: 20,
    teamMembers: 8,
    historicalDays: 90
  })
    .then(() => {
      logger.debug("\n✅ Seed completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("\n❌ Seed failed:", error);
      process.exit(1);
    });
}

export default seedAnalyticsData;


