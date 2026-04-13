/**
 * 🤖 Phase 9: Advanced Features Seed
 * 
 * Creates:
 * - Automation rules (8 rules)
 * - Workflow templates
 * - Integration connections
 * - User preferences
 */

import { config } from "dotenv";
config();

import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { getDatabase, initializeDatabase } from "../connection";
import {
  automationRuleTable,
  workflowTemplateTable,
  integrationConnectionTable,
  userPreferencesTable,
  notificationPreferenceTable,
  users,
  workspaces,
  projects,
} from "../schema";
import logger from "../../utils/logger";
import {
  randomInt,
  randomElement,
  randomElements,
  randomBool,
  daysAgo,
} from "./seed-utils";

// ==========================================
// AUTOMATION RULES
// ==========================================

const AUTOMATION_RULES = [
  {
    name: "Auto-assign high priority tasks",
    description: "Automatically assign high priority tasks to team lead",
    trigger: { type: "task_created", event: "task.created" },
    conditions: [{ field: "priority", operator: "equals", value: "high" }],
    actions: [{ type: "assign_to_role", role: "team-lead" }],
  },
  {
    name: "Notify on overdue tasks",
    description: "Send notification when tasks become overdue",
    trigger: { type: "task_overdue", schedule: "daily" },
    conditions: [],
    actions: [
      { type: "send_notification", template: "overdue-reminder" },
      { type: "change_priority", value: "urgent" },
    ],
  },
  {
    name: "Celebrate task completion",
    description: "Show celebration when tasks are completed",
    trigger: { type: "task_completed", event: "task.completed" },
    conditions: [{ field: "priority", operator: "in", value: ["high", "urgent"] }],
    actions: [{ type: "trigger_celebration", style: "confetti" }],
  },
  {
    name: "Project progress update",
    description: "Update stakeholders on weekly progress",
    trigger: { type: "scheduled", schedule: "weekly", day: "friday" },
    conditions: [],
    actions: [{ type: "send_summary", recipients: "project_stakeholders" }],
  },
  {
    name: "Label by priority",
    description: "Auto-label urgent tasks",
    trigger: { type: "task_created", event: "task.created" },
    conditions: [{ field: "priority", operator: "equals", value: "urgent" }],
    actions: [{ type: "add_label", label: "urgent" }],
  },
];

// ==========================================
// WORKFLOW TEMPLATES
// ==========================================

const WORKFLOW_TEMPLATES = [
  {
    name: "New Employee Onboarding",
    description: "Automated onboarding process for new team members",
    category: "hr",
    triggerConfig: { type: "user_joined_workspace" },
    actionConfig: [
      { action: "create_task", template: "setup_accounts" },
      { action: "send_welcome_email" },
      { action: "assign_mentor" },
    ],
  },
  {
    name: "Sprint Planning",
    description: "Automated sprint planning workflow",
    category: "project_management",
    triggerConfig: { type: "scheduled", frequency: "biweekly" },
    actionConfig: [
      { action: "generate_sprint_report" },
      { action: "create_planning_tasks" },
      { action: "notify_team" },
    ],
  },
  {
    name: "Bug Triage",
    description: "Automated bug triage and assignment",
    category: "task_automation",
    triggerConfig: { type: "task_labeled", label: "bug" },
    actionConfig: [
      { action: "set_priority", value: "high" },
      { action: "assign_to_team", team: "QA" },
      { action: "notify_manager" },
    ],
  },
];

// ==========================================
// INTEGRATIONS
// ==========================================

const INTEGRATIONS = [
  {
    name: "Slack Integration",
    provider: "slack",
    config: { webhookUrl: "https://hooks.slack.com/services/..." },
    status: "active",
  },
  {
    name: "GitHub Integration",
    provider: "github",
    config: { repository: "meridianhq/platform", accessToken: "ghp_..." },
    status: "active",
  },
  {
    name: "Google Calendar",
    provider: "google_calendar",
    config: { calendarId: "primary", syncEnabled: true },
    status: "active",
  },
];

// ==========================================
// MAIN SEED FUNCTION
// ==========================================

export async function seedAdvancedFeatures() {
  const db = getDatabase();
  logger.info("🌱 Phase 9: Seeding advanced features...\n");

  try {
    const [workspace] = await db.select().from(workspaces).limit(1);
    const allUsers = await db.select().from(users);
    const allProjects = await db.select().from(projects).limit(10);

    if (!workspace || allUsers.length === 0) {
      throw new Error("Workspace and users required. Run phases 1-3 first.");
    }

    // 1. CREATE AUTOMATION RULES
    logger.info("🤖 Creating automation rules...");
    
    for (const ruleData of AUTOMATION_RULES) {
      const creator = randomElement(allUsers.filter(u => 
        u.role === 'admin' || u.role === 'workspace-manager'
      ));

      const [rule] = await db
        .insert(automationRuleTable)
        .values({
          name: ruleData.name,
          description: ruleData.description,
          workspaceId: workspace.id,
          projectId: randomBool(0.5) ? randomElement(allProjects)?.id : null,
          trigger: ruleData.trigger as any,
          conditions: ruleData.conditions as any,
          actions: ruleData.actions as any,
          isActive: randomBool(0.9),
          executionCount: randomInt(0, 50),
          lastExecuted: randomBool(0.7) ? daysAgo(randomInt(0, 7)) : null,
          priority: randomInt(0, 10),
          createdBy: creator.id,
        })
        .returning();

      logger.info(`   ✅ Created automation: ${rule.name}`);
    }

    // 2. CREATE WORKFLOW TEMPLATES
    logger.info("\n📋 Creating workflow templates...");
    
    for (const templateData of WORKFLOW_TEMPLATES) {
      const creator = randomElement(allUsers.filter(u => 
        u.role === 'admin' || u.role === 'workspace-manager'
      ));

      await db.insert(workflowTemplateTable).values({
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        workspaceId: workspace.id,
        triggerConfig: JSON.stringify(templateData.triggerConfig),
        actionConfig: JSON.stringify(templateData.actionConfig),
        conditionConfig: JSON.stringify([]),
        isActive: true,
        isGlobal: false,
        usageCount: randomInt(0, 25),
        createdBy: creator.id,
      });

      logger.info(`   ✅ Created workflow: ${templateData.name}`);
    }

    // 3. CREATE INTEGRATION CONNECTIONS
    logger.info("\n🔗 Creating integration connections...");
    
    for (const integData of INTEGRATIONS) {
      const creator = randomElement(allUsers.filter(u => 
        u.role === 'admin' || u.role === 'workspace-manager'
      ));

      await db.insert(integrationConnectionTable).values({
        name: integData.name,
        provider: integData.provider,
        workspaceId: workspace.id,
        config: integData.config as any,
        credentials: { encrypted: true } as any,
        status: integData.status as any,
        lastSync: daysAgo(randomInt(0, 1)),
        syncStatus: 'success',
        createdBy: creator.id,
      });

      logger.info(`   ✅ Created integration: ${integData.name}`);
    }

    // 4. CREATE USER PREFERENCES
    logger.info("\n⚙️ Creating user preferences...");
    
    for (const user of allUsers) {
      const existing = await db
        .select()
        .from(userPreferencesTable)
        .where(eq(userPreferencesTable.userId, user.id))
        .limit(1);

      if (existing.length > 0) {
        logger.info(`   ⏭️  Preferences exist for ${user.name}`);
        continue;
      }

      await db.insert(userPreferencesTable).values({
        userId: user.id,
        workspaceId: workspace.id,
        pinnedProjects: randomElements(allProjects, randomInt(1, 3)).map(p => p.id) as any,
        dashboardLayout: {
          taskChartType: randomElement(['bar', 'line', 'pie']),
          healthChartType: randomElement(['bar', 'line', 'donut']),
        },
        theme: randomElement(['light', 'dark', 'system']),
        notifications: {
          email: true,
          push: true,
          inApp: true,
        },
        settings: {
          showCompletedTasks: randomBool(0.7),
          groupByProject: randomBool(0.5),
        },
      });

      logger.info(`   ✅ ${user.name}: Created preferences`);
    }

    // 5. CREATE NOTIFICATION PREFERENCES
    logger.info("\n🔔 Creating notification preferences...");
    
    for (const user of allUsers) {
      const existing = await db
        .select()
        .from(notificationPreferenceTable)
        .where(eq(notificationPreferenceTable.userId, user.id))
        .limit(1);

      if (existing.length > 0) {
        logger.info(`   ⏭️  Notification preferences exist for ${user.name}`);
        continue;
      }

      await db.insert(notificationPreferenceTable).values({
        userId: user.id,
        mentionsEnabled: true,
        directMessagesEnabled: true,
        conversationUpdatesEnabled: randomBool(0.5),
        activityEnabled: randomBool(0.7),
        dailyDigestEnabled: randomBool(0.6),
        notificationFrequency: randomElement(['instant', 'daily', 'weekly']),
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
      });

      logger.info(`   ✅ ${user.name}: Created notification preferences`);
    }

    logger.info("\n✅ Phase 9 complete: Created advanced features");
    logger.info(`   🤖 Automation Rules: ${AUTOMATION_RULES.length}`);
    logger.info(`   📋 Workflow Templates: ${WORKFLOW_TEMPLATES.length}`);
    logger.info(`   🔗 Integrations: ${INTEGRATIONS.length}`);
    logger.info(`   ⚙️  User Preferences: ${allUsers.length}`);
    logger.info(`   🔔 Notification Preferences: ${allUsers.length}`);

    return {
      automationRules: AUTOMATION_RULES.length,
      workflowTemplates: WORKFLOW_TEMPLATES.length,
      integrations: INTEGRATIONS.length,
    };

  } catch (error) {
    logger.error("❌ Error seeding advanced features:", error);
    throw error;
  }
}

export default seedAdvancedFeatures;
// Run if executed directly
if (require.main === module) {
  seedAdvancedFeatures().catch((error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
