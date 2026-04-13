/**
 * 📂 Phase 3: Projects, Tasks & Milestones Seed
 * 
 * Creates:
 * - 10 projects with various statuses
 * - 200 tasks with realistic distribution
 * - Task dependencies
 * - Milestones (2-3 per project)
 * - Project members
 * - Status columns for Kanban
 * - Labels/tags
 */

import { config } from "dotenv";
config();

import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { getDatabase, initializeDatabase } from "../connection";
import {
  projects,
  projectMembers,
  tasks,
  taskDependencies,
  milestone,
  statusColumns,
  label,
  users,
  workspaces,
  teams,
} from "../schema";
import logger from "../../utils/logger";
import {
  randomInt,
  randomElement,
  randomElements,
  randomBool,
  randomDate,
  daysAgo,
  getTaskStatus,
  getPriority,
  generateProjectName,
  generateTaskTitle,
  generateDescription,
  generateDueDate,
  generateCompletedDate,
  randomColor,
} from "./seed-utils";

// ==========================================
// PROJECT DATA
// ==========================================

const PROJECT_TEMPLATES = [
  { name: "Mobile App Launch", status: "active", priority: "high", progress: 65 },
  { name: "API v2 Migration", status: "active", priority: "urgent", progress: 40 },
  { name: "Design System Overhaul", status: "in_progress", priority: "medium", progress: 80 },
  { name: "Customer Portal", status: "completed", priority: "high", progress: 100 },
  { name: "Analytics Dashboard", status: "planning", priority: "medium", progress: 15 },
  { name: "Security Audit Implementation", status: "active", priority: "urgent", progress: 50 },
  { name: "Performance Optimization", status: "in_progress", priority: "high", progress: 70 },
  { name: "Integration Hub", status: "active", priority: "medium", progress: 35 },
  { name: "Documentation Portal", status: "planning", priority: "low", progress: 10 },
  { name: "Mobile Responsive Update", status: "on_hold", priority: "medium", progress: 25 },
];

// ==========================================
// STATUS COLUMNS (Kanban)
// ==========================================

const DEFAULT_COLUMNS = [
  { name: "To Do", slug: "todo", color: "#6b7280", position: 0, isDefault: true },
  { name: "In Progress", slug: "in-progress", color: "#3b82f6", position: 1 },
  { name: "In Review", slug: "review", color: "#f59e0b", position: 2 },
  { name: "Done", slug: "done", color: "#10b981", position: 3 },
];

// ==========================================
// LABELS
// ==========================================

const LABELS = [
  { name: "bug", color: "#ef4444" },
  { name: "feature", color: "#3b82f6" },
  { name: "enhancement", color: "#8b5cf6" },
  { name: "documentation", color: "#06b6d4" },
  { name: "urgent", color: "#f97316" },
  { name: "backend", color: "#10b981" },
  { name: "frontend", color: "#ec4899" },
  { name: "database", color: "#f59e0b" },
];

// ==========================================
// MAIN SEED FUNCTION
// ==========================================

export async function seedProjectsAndTasks() {
  const db = getDatabase();
  logger.info("🌱 Phase 3: Seeding projects, tasks, and milestones...\n");

  try {
    // Get workspace and users
    const [workspace] = await db.select().from(workspaces).limit(1);
    const allUsers = await db.select().from(users);
    const allTeams = await db.select().from(teams);

    if (!workspace) {
      throw new Error("No workspace found. Run Phase 2 first.");
    }

    if (allUsers.length === 0) {
      throw new Error("No users found. Run Phase 1 first.");
    }

    // 1. CREATE PROJECTS
    logger.info("📁 Creating projects...");
    
    const createdProjects: any[] = [];

    for (const projectTemplate of PROJECT_TEMPLATES) {
      const projectOwner = randomElement(allUsers.filter(u => 
        ['admin', 'manager', 'project-manager', 'team-lead'].includes(u.role || '')
      ));

      const startDate = daysAgo(randomInt(30, 180));
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + randomInt(60, 120));

      const [project] = await db
        .insert(projects)
        .values({
          name: projectTemplate.name,
          description: generateDescription('project'),
          workspaceId: workspace.id,
          ownerId: projectOwner.id,
          slug: projectTemplate.name.toLowerCase().replace(/\s+/g, '-'),
          color: randomColor(),
          icon: randomElement(['📱', '🚀', '🎨', '⚡', '🔐', '📊', '🛠️', '🔗', '📝', '📱']),
          status: projectTemplate.status as any,
          priority: projectTemplate.priority as any,
          startDate,
          dueDate,
          completedAt: projectTemplate.status === 'completed' ? daysAgo(randomInt(1, 30)) : null,
          settings: { enableTimeTracking: true, enableComments: true },
          isArchived: false,
        })
        .returning();

      createdProjects.push(project);
      logger.info(`   ✅ Created project: ${project.name} (${projectTemplate.status})`);

      // Add project members (3-6 per project)
      const memberCount = randomInt(3, 6);
      const projectMemberUsers = randomElements(allUsers, memberCount);

      for (const memberUser of projectMemberUsers) {
        const isLead = memberUser.id === projectOwner.id;

        await db.insert(projectMembers).values({
          projectId: project.id,
          userEmail: memberUser.email,
          role: isLead ? "lead" : "member",
          permissions: [],
          assignedBy: projectOwner.id,
          hoursPerWeek: randomInt(10, 40),
          isActive: true,
        });
      }

      logger.info(`   ✅ Added ${memberCount} members to project`);

      // Create status columns for this project
      for (const columnData of DEFAULT_COLUMNS) {
        await db.insert(statusColumns).values({
          projectId: project.id,
          name: columnData.name,
          slug: columnData.slug,
          color: columnData.color,
          position: columnData.position,
          isDefault: columnData.isDefault || false,
        });
      }

      // Create labels for this project
      const projectLabels = randomElements(LABELS, randomInt(4, 8));
      
      for (const labelData of projectLabels) {
        await db.insert(label).values({
          name: labelData.name,
          color: labelData.color,
          projectId: project.id,
        });
      }
    }

    // 2. CREATE TASKS
    logger.info("\n📋 Creating tasks...");
    
    const allTasks: any[] = [];
    const tasksPerProject = 20; // Average

    for (const project of createdProjects) {
      const taskCount = randomInt(15, 25);
      const projectMembers = allUsers.filter(u => randomBool(0.6)); // 60% chance per user

      for (let i = 0; i < taskCount; i++) {
        const status = getTaskStatus();
        const priority = getPriority();
        const createdAt = randomDate(project.startDate, new Date());
        const dueDate = generateDueDate(createdAt);
        const assignee = randomBool(0.8) ? randomElement(projectMembers) : null;

        const [task] = await db
          .insert(tasks)
          .values({
            title: generateTaskTitle(),
            description: generateDescription('task'),
            projectId: project.id,
            assigneeId: assignee?.id || null,
            userEmail: assignee?.email || null,
            status,
            priority,
            position: i,
            number: i + 1,
            dueDate,
            startDate: status !== 'todo' ? createdAt : null,
            completedAt: status === 'done' ? generateCompletedDate(createdAt, dueDate) : null,
            estimatedHours: randomInt(2, 16),
            actualHours: status === 'done' ? randomInt(2, 20) : (status === 'in_progress' ? randomInt(1, 10) : null),
            createdAt,
            updatedAt: new Date(),
          })
          .returning();

        allTasks.push(task);
      }

      logger.info(`   ✅ Created ${taskCount} tasks for ${project.name}`);
    }

    // 3. CREATE TASK DEPENDENCIES
    logger.info("\n🔗 Creating task dependencies...");
    
    let dependencyCount = 0;

    // Group tasks by project
    const tasksByProject = createdProjects.map(project => ({
      project,
      tasks: allTasks.filter(t => t.projectId === project.id),
    }));

    for (const { project, tasks: projectTasks } of tasksByProject) {
      // Create 3-8 dependencies per project
      const depCount = randomInt(3, 8);
      
      for (let i = 0; i < depCount && projectTasks.length > 1; i++) {
        const dependentTask = randomElement(projectTasks);
        const requiredTask = randomElement(projectTasks.filter(t => t.id !== dependentTask.id));

        // Avoid duplicates
        const existing = await db
          .select()
          .from(taskDependencies)
          .where(
            and(
              eq(taskDependencies.dependentTaskId, dependentTask.id),
              eq(taskDependencies.requiredTaskId, requiredTask.id)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          await db.insert(taskDependencies).values({
            dependentTaskId: dependentTask.id,
            requiredTaskId: requiredTask.id,
            type: "blocks",
          });
          
          dependencyCount++;
        }
      }
    }

    logger.info(`   ✅ Created ${dependencyCount} task dependencies`);

    // 4. CREATE MILESTONES
    logger.info("\n🎯 Creating milestones...");
    
    let milestoneCount = 0;

    for (const project of createdProjects) {
      // Skip completed/planning projects
      if (project.status === 'completed' || project.status === 'planning') continue;

      const count = randomInt(2, 4);
      const projectTasks = allTasks.filter(t => t.projectId === project.id);

      for (let i = 0; i < count; i++) {
        const dueDate = new Date(project.startDate);
        dueDate.setDate(dueDate.getDate() + (i + 1) * 30); // 30 days apart

        const status = dueDate < new Date() 
          ? (randomBool(0.7) ? 'completed' : 'missed')
          : (randomBool(0.3) ? 'in_progress' : 'not_started');

        await db.insert(milestone).values({
          title: `${randomElement(['Phase', 'Sprint', 'Release', 'Beta'])} ${i + 1}`,
          description: `Key milestone for ${project.name}`,
          type: randomElement(['phase', 'deadline', 'review', 'release']),
          status,
          dueDate,
          completedAt: status === 'completed' ? daysAgo(randomInt(1, 30)) : null,
          projectId: project.id,
          riskLevel: randomElement(['low', 'medium', 'high']),
          dependencyTaskIds: JSON.stringify(
            randomElements(projectTasks, randomInt(0, 3)).map(t => t.id)
          ),
          stakeholderIds: JSON.stringify(
            randomElements(allUsers, randomInt(2, 4)).map(u => u.id)
          ),
          createdBy: project.ownerId,
        });

        milestoneCount++;
      }

      logger.info(`   ✅ Created ${count} milestones for ${project.name}`);
    }

    logger.info("\n✅ Phase 3 complete: Created projects and tasks");
    logger.info(`   📁 Projects: ${createdProjects.length}`);
    logger.info(`   📋 Tasks: ${allTasks.length}`);
    logger.info(`   🔗 Dependencies: ${dependencyCount}`);
    logger.info(`   🎯 Milestones: ${milestoneCount}`);
    logger.info(`   🏷️  Labels: ${createdProjects.length * 6} (avg)`);

    return {
      projects: createdProjects,
      tasks: allTasks,
    };

  } catch (error) {
    logger.error("❌ Error seeding projects and tasks:", error);
    throw error;
  }
}

export default seedProjectsAndTasks;
// Run if executed directly
if (require.main === module) {
  seedProjectsAndTasks().catch((error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
