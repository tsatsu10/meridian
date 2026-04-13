/**
 * 📊 Phase 8: Analytics & Historical Data Seed
 * 
 * Creates:
 * - Project health scores (30 days history)
 * - Health recommendations
 * - Risk alerts
 * - Notifications (50 per user)
 */

import { config } from "dotenv";
config();

import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { getDatabase, initializeDatabase } from "../connection";
import {
  projectHealthTable,
  healthHistoryTable,
  healthRecommendationsTable,
  healthAlertsTable,
  riskAlerts,
  notifications,
  users,
  projects,
  workspaces,
} from "../schema";
import logger from "../../utils/logger";
import {
  randomInt,
  randomElement,
  randomBool,
  daysAgo,
} from "./seed-utils";

// ==========================================
// MAIN SEED FUNCTION
// ==========================================

export async function seedAnalytics() {
  const db = getDatabase();
  logger.info("🌱 Phase 8: Seeding analytics and historical data...\n");

  try {
    const [workspace] = await db.select().from(workspaces).limit(1);
    const allUsers = await db.select().from(users);
    const allProjects = await db.select().from(projects).limit(20);

    if (!workspace || allUsers.length === 0 || allProjects.length === 0) {
      throw new Error("Workspace, users, and projects required. Run phases 1-3 first.");
    }

    // 1. CREATE PROJECT HEALTH
    logger.info("❤️ Creating project health scores...");
    
    let healthCount = 0;

    for (const project of allProjects) {
      // Skip completed/archived projects
      if (project.status === 'completed' || project.isArchived) continue;

      const score = randomInt(40, 95);
      const status = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'critical';
      const trend = randomElement(['improving', 'stable', 'declining']);

      await db.insert(projectHealthTable).values({
        projectId: project.id,
        score,
        status,
        trend,
        completionRate: randomInt(30, 90),
        timelineHealth: randomInt(50, 100),
        taskHealth: randomInt(60, 95),
        resourceAllocation: randomInt(70, 100),
        riskLevel: randomInt(0, 40),
        metadata: {
          onTimeTasksPercent: randomInt(70, 95),
          blockedTasksCount: randomInt(0, 5),
          overdueTasksCount: randomInt(0, 8),
        },
        cachedAt: new Date(),
      });

      healthCount++;

      // Create 30 days of health history
      for (let i = 0; i < 30; i++) {
        const historicalScore = Math.max(20, score + randomInt(-15, 15));
        
        await db.insert(healthHistoryTable).values({
          projectId: project.id,
          score: historicalScore,
          status: historicalScore >= 80 ? 'excellent' : historicalScore >= 60 ? 'good' : 'fair',
          completionRate: randomInt(30, 90),
          timelineHealth: randomInt(50, 100),
          taskHealth: randomInt(60, 95),
          resourceAllocation: randomInt(70, 100),
          riskLevel: randomInt(0, 40),
          recordedAt: daysAgo(i),
        });
      }

      logger.info(`   ✅ ${project.name}: Score ${score}/100 (${status}) + 30 days history`);
    }

    // 2. CREATE HEALTH RECOMMENDATIONS
    logger.info("\n💡 Creating health recommendations...");
    
    let recommendationCount = 0;

    for (const project of allProjects.slice(0, 5)) {
      const recCount = randomInt(2, 5);

      for (let i = 0; i < recCount; i++) {
        await db.insert(healthRecommendationsTable).values({
          projectId: project.id,
          title: randomElement([
            "Reduce task backlog",
            "Address overdue tasks",
            "Improve resource allocation",
            "Update project timeline",
            "Review blocked tasks",
          ]),
          description: randomElement([
            "Consider breaking down large tasks into smaller, manageable pieces.",
            "Review and prioritize the current task backlog to improve velocity.",
            "Some tasks are approaching deadlines - plan accordingly.",
            "Resource utilization is below optimal levels.",
          ]),
          priority: randomElement(['high', 'medium', 'low']),
          category: randomElement(['performance', 'timeline', 'resources', 'quality', 'risk']),
          actionItems: [
            "Review current sprint capacity",
            "Reassign tasks if needed",
            "Update task estimates",
          ] as any,
          estimatedImpact: randomInt(40, 90),
          isResolved: randomBool(0.3),
          resolvedAt: randomBool(0.3) ? daysAgo(randomInt(1, 15)) : null,
        });

        recommendationCount++;
      }
    }

    logger.info(`   ✅ Created ${recommendationCount} health recommendations`);

    // 3. CREATE RISK ALERTS
    logger.info("\n⚠️ Creating risk alerts...");
    
    let riskCount = 0;

    for (const project of allProjects.slice(0, 7)) {
      const alertCount = randomInt(1, 3);

      for (let i = 0; i < alertCount; i++) {
        const severity = randomElement(['low', 'medium', 'high', 'critical']);
        const alertType = randomElement(['overdue', 'blocked', 'resource_conflict', 'deadline_risk', 'dependency_chain', 'quality_risk']);

        await db.insert(riskAlerts).values({
          workspaceId: workspace.id,
          projectId: project.id,
          alertType,
          severity,
          title: `${severity.toUpperCase()}: ${alertType.replace(/_/g, ' ')}`,
          description: generateRiskDescription(alertType),
          status: randomElement(['active', 'acknowledged', 'resolved']),
          riskScore: severity === 'critical' ? randomInt(80, 100) : 
                     severity === 'high' ? randomInt(60, 79) :
                     severity === 'medium' ? randomInt(40, 59) :
                     randomInt(20, 39),
          affectedTaskCount: randomInt(1, 15),
          metadata: { source: 'automated_detection' },
          resolvedAt: randomBool(0.4) ? daysAgo(randomInt(1, 10)) : null,
          acknowledgedAt: randomBool(0.6) ? hoursAgo(randomInt(1, 48)) : null,
          createdAt: daysAgo(randomInt(1, 20)),
        });

        riskCount++;
      }
    }

    logger.info(`   ✅ Created ${riskCount} risk alerts`);

    // 4. CREATE NOTIFICATIONS
    logger.info("\n🔔 Creating notifications...");
    
    let notificationCount = 0;

    for (const user of allUsers) {
      const notifCount = randomInt(40, 60);

      for (let i = 0; i < notifCount; i++) {
        const type = randomElement([
          'task_assigned',
          'task_completed',
          'mention',
          'comment',
          'deadline_approaching',
          'achievement_unlocked',
          'kudos_received',
          'goal_progress',
          'project_update',
        ]);

        await db.insert(notifications).values({
          userId: user.id,
          userEmail: user.email,
          title: generateNotificationTitle(type),
          content: generateNotificationContent(type),
          message: generateNotificationContent(type),
          type,
          isRead: randomBool(0.6),
          isPinned: randomBool(0.05),
          isArchived: randomBool(0.1),
          priority: randomElement(['low', 'normal', 'high', 'urgent']),
          createdAt: daysAgo(randomInt(0, 30)),
        });

        notificationCount++;
      }

      logger.info(`   ✅ ${user.name}: Created ${notifCount} notifications`);
    }

    logger.info("\n✅ Phase 8 complete: Created analytics and historical data");
    logger.info(`   ❤️ Project Health: ${healthCount} current + ${healthCount * 30} historical`);
    logger.info(`   💡 Recommendations: ${recommendationCount}`);
    logger.info(`   ⚠️  Risk Alerts: ${riskCount}`);
    logger.info(`   🔔 Notifications: ${notificationCount}`);

    return {
      healthCount,
      recommendationCount,
      riskCount,
      notificationCount,
    };

  } catch (error) {
    logger.error("❌ Error seeding analytics:", error);
    throw error;
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function generateRiskDescription(alertType: string): string {
  const descriptions: Record<string, string> = {
    overdue: "Multiple tasks are past their due dates and require attention.",
    blocked: "Tasks are blocked by dependencies that haven't been completed.",
    resource_conflict: "Resource allocation conflicts detected across multiple projects.",
    deadline_risk: "Project deadline is at risk based on current velocity.",
    dependency_chain: "Complex dependency chain may cause delays.",
    quality_risk: "Quality metrics are below acceptable thresholds.",
  };

  return descriptions[alertType] || "Risk detected in project execution.";
}

function generateNotificationTitle(type: string): string {
  const titles: Record<string, string> = {
    task_assigned: "New task assigned to you",
    task_completed: "Task completed",
    mention: "You were mentioned",
    comment: "New comment on your task",
    deadline_approaching: "Deadline approaching",
    achievement_unlocked: "Achievement unlocked! 🏆",
    kudos_received: "You received kudos! 👏",
    goal_progress: "Goal progress update",
    project_update: "Project update",
  };

  return titles[type] || "Notification";
}

function generateNotificationContent(type: string): string {
  const contents: Record<string, string> = {
    task_assigned: "A new task has been assigned to you. Check your dashboard for details.",
    task_completed: "Great job! A task you were tracking has been completed.",
    mention: "Someone mentioned you in a conversation. Click to view.",
    comment: "Someone commented on a task you're following.",
    deadline_approaching: "A task deadline is approaching in the next 24 hours.",
    achievement_unlocked: "Congratulations! You've unlocked a new achievement.",
    kudos_received: "A teammate recognized your great work!",
    goal_progress: "Your goal has been updated. Review your progress.",
    project_update: "A project you're following has been updated.",
  };

  return contents[type] || "You have a new notification.";
}

function hoursAgo(hours: number): Date {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}

export default seedAnalytics;
// Run if executed directly
if (require.main === module) {
  seedAnalytics().catch((error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
