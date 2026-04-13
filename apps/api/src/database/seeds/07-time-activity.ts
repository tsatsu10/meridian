/**
 * ⏱️ Phase 7: Time Tracking & Activity Seed
 * 
 * Creates:
 * - 300 time entries (last 30 days)
 * - 500 activity feed entries (last 90 days)
 * - User activity sessions
 * - Mood check-ins (last 30 days)
 */

import { config } from "dotenv";
config();

import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { getDatabase, initializeDatabase } from "../connection";
import {
  timeEntries,
  activities,
  userActivitySessions,
  moodCheckins,
  moodAnalytics,
  users,
  tasks,
  projects,
  workspaces,
} from "../schema";
import logger from "../../utils/logger";
import {
  randomInt,
  randomElement,
  randomBool,
  daysAgo,
  hoursAgo,
} from "./seed-utils";

// ==========================================
// ACTIVITY TYPES
// ==========================================

const ACTIVITY_TYPES = [
  'task_created',
  'task_completed',
  'task_updated',
  'task_assigned',
  'comment_added',
  'project_created',
  'team_joined',
  'milestone_achieved',
  'goal_completed',
  'kudos_given',
  'kudos_received',
] as const;

// ==========================================
// MAIN SEED FUNCTION
// ==========================================

export async function seedTimeAndActivity() {
  const db = getDatabase();
  logger.info("🌱 Phase 7: Seeding time tracking and activities...\n");

  try {
    const [workspace] = await db.select().from(workspaces).limit(1);
    const allUsers = await db.select().from(users);
    const allTasks = await db.select().from(tasks).limit(100);
    const allProjects = await db.select().from(projects).limit(20);

    if (!workspace || allUsers.length === 0) {
      throw new Error("Workspace and users required. Run phases 1-3 first.");
    }

    // 1. CREATE TIME ENTRIES
    logger.info("⏱️ Creating time entries...");
    
    let timeEntryCount = 0;

    for (const user of allUsers) {
      // Each user has 30-50 time entries over last 30 days
      const entryCount = randomInt(30, 50);

      for (let i = 0; i < entryCount; i++) {
        const task = randomElement(allTasks);
        const startTime = randomDate(daysAgo(30), new Date());
        const duration = randomInt(30, 480); // 30 min to 8 hours
        const endTime = new Date(startTime.getTime() + duration * 60000);

        await db.insert(timeEntries).values({
          taskId: task?.id || null,
          userEmail: user.email,
          description: randomElement([
            "Feature development",
            "Bug fix",
            "Code review",
            "Meeting",
            "Documentation",
            "Testing",
            "Planning",
            "Research",
          ]),
          startTime,
          endTime,
          duration,
          isActive: false,
          createdAt: startTime,
          updatedAt: endTime,
        });

        timeEntryCount++;
      }

      logger.info(`   ✅ ${user.name}: Created ${entryCount} time entries`);
    }

    // 2. CREATE ACTIVITIES
    logger.info("\n📊 Creating activity feed...");
    
    let activityCount = 0;

    for (let i = 0; i < 500; i++) {
      const user = randomElement(allUsers);
      const activityType = randomElement(ACTIVITY_TYPES);
      const task = randomElement(allTasks);
      const project = randomElement(allProjects);

      const content = {
        type: activityType,
        description: generateActivityDescription(activityType, user.name, task, project),
        taskId: task?.id,
        projectId: project?.id,
        taskTitle: task?.title,
        projectName: project?.name,
      };

      await db.insert(activities).values({
        taskId: activityType.includes('task') ? task?.id : null,
        userId: user.id,
        type: activityType,
        content: content as any,
        metadata: {
          icon: getActivityIcon(activityType),
          color: getActivityColor(activityType),
        },
        createdAt: daysAgo(randomInt(0, 90)),
      });

      activityCount++;
    }

    logger.info(`   ✅ Created ${activityCount} activity entries`);

    // 3. CREATE ACTIVITY SESSIONS
    logger.info("\n🔄 Creating activity sessions...");
    
    let sessionCount = 0;

    for (const user of allUsers) {
      // Active users have ongoing sessions
      if (randomBool(0.4)) {
        const task = randomElement(allTasks);
        const project = randomElement(allProjects);

        await db.insert(userActivitySessions).values({
          userEmail: user.email,
          workspaceId: workspace.id,
          currentTaskId: task?.id || null,
          currentProjectId: project?.id || null,
          activityType: randomElement(['editing', 'viewing', 'commenting']),
          startedAt: hoursAgo(randomInt(1, 4)),
          lastActive: hoursAgo(randomInt(0, 1)),
        });

        sessionCount++;
      }
    }

    logger.info(`   ✅ Created ${sessionCount} active sessions`);

    // 4. CREATE MOOD CHECK-INS
    logger.info("\n😊 Creating mood check-ins...");
    
    let moodCount = 0;
    const moods = ['great', 'good', 'okay', 'bad', 'stressed'] as const;

    for (const user of allUsers) {
      // 15-30 mood check-ins per user over last 30 days
      const checkInCount = randomInt(15, 30);

      for (let i = 0; i < checkInCount; i++) {
        await db.insert(moodCheckins).values({
          userEmail: user.email,
          workspaceId: workspace.id,
          mood: randomElement(moods),
          notes: randomBool(0.3) ? randomElement([
            "Productive day!",
            "Feeling a bit overwhelmed",
            "Great team collaboration",
            "Making good progress",
            "Need to prioritize better",
          ]) : null,
          isAnonymous: randomBool(0.2),
          createdAt: daysAgo(randomInt(0, 30)),
        });

        moodCount++;
      }
    }

    logger.info(`   ✅ Created ${moodCount} mood check-ins`);

    // 5. CREATE MOOD ANALYTICS
    logger.info("\n📊 Creating mood analytics...");
    
    for (let i = 0; i < 30; i++) {
      const date = daysAgo(i);
      date.setHours(0, 0, 0, 0);

      const totalCheckins = randomInt(5, allUsers.length);
      
      await db.insert(moodAnalytics).values({
        workspaceId: workspace.id,
        date,
        moodDistribution: {
          great: randomInt(0, totalCheckins / 2),
          good: randomInt(0, totalCheckins / 2),
          okay: randomInt(0, totalCheckins / 3),
          bad: randomInt(0, totalCheckins / 5),
          stressed: randomInt(0, totalCheckins / 5),
        } as any,
        averageScore: (3.0 + Math.random() * 2).toFixed(2), // 3.0 to 5.0
        totalCheckins,
      });
    }

    logger.info(`   ✅ Created 30 days of mood analytics`);

    logger.info("\n✅ Phase 7 complete: Created time tracking and activities");
    logger.info(`   ⏱️  Time Entries: ${timeEntryCount}`);
    logger.info(`   📊 Activities: ${activityCount}`);
    logger.info(`   🔄 Active Sessions: ${sessionCount}`);
    logger.info(`   😊 Mood Check-ins: ${moodCount}`);
    logger.info(`   📊 Mood Analytics: 30 days`);

    return {
      timeEntryCount,
      activityCount,
    };

  } catch (error) {
    logger.error("❌ Error seeding time and activity:", error);
    throw error;
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function generateActivityDescription(type: typeof ACTIVITY_TYPES[number], userName: string, task: any, project: any): string {
  const descriptions: Record<string, string> = {
    task_created: `${userName} created task "${task?.title || 'New Task'}"`,
    task_completed: `${userName} completed "${task?.title || 'Task'}"`,
    task_updated: `${userName} updated "${task?.title || 'Task'}"`,
    task_assigned: `${userName} was assigned to "${task?.title || 'Task'}"`,
    comment_added: `${userName} commented on "${task?.title || 'Task'}"`,
    project_created: `${userName} created project "${project?.name || 'New Project'}"`,
    team_joined: `${userName} joined the team`,
    milestone_achieved: `${userName} achieved a milestone`,
    goal_completed: `${userName} completed a goal`,
    kudos_given: `${userName} gave kudos to a teammate`,
    kudos_received: `${userName} received kudos`,
  };

  return descriptions[type] || `${userName} performed an action`;
}

function getActivityIcon(type: typeof ACTIVITY_TYPES[number]): string {
  const icons: Record<string, string> = {
    task_created: '➕',
    task_completed: '✅',
    task_updated: '📝',
    task_assigned: '👤',
    comment_added: '💬',
    project_created: '📁',
    team_joined: '👥',
    milestone_achieved: '🎯',
    goal_completed: '🏆',
    kudos_given: '👏',
    kudos_received: '⭐',
  };

  return icons[type] || '📌';
}

function getActivityColor(type: typeof ACTIVITY_TYPES[number]): string {
  const colors: Record<string, string> = {
    task_created: '#3b82f6',
    task_completed: '#10b981',
    task_updated: '#f59e0b',
    task_assigned: '#8b5cf6',
    comment_added: '#06b6d4',
    project_created: '#6366f1',
    team_joined: '#ec4899',
    milestone_achieved: '#f97316',
    goal_completed: '#eab308',
    kudos_given: '#14b8a6',
    kudos_received: '#a855f7',
  };

  return colors[type] || '#6b7280';
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export default seedTimeAndActivity;
// Run if executed directly
if (require.main === module) {
  seedTimeAndActivity().catch((error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
