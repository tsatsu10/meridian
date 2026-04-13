/**
 * 🎯 Phase 5: Goals & OKRs Seed
 * 
 * Creates:
 * - 25 goals (personal, team, strategic)
 * - 75 key results (3 per goal)
 * - Progress snapshots (weekly updates)
 * - Goal reflections
 */

import { config } from "dotenv";
config();

import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { getDatabase, initializeDatabase } from "../connection";
import {
  goals,
  goalKeyResults,
  goalReflections,
} from "../schema/goals";
import { users, workspaces } from "../schema";
import logger from "../../utils/logger";
import {
  randomInt,
  randomElement,
  randomBool,
  daysAgo,
  generateDescription,
} from "./seed-utils";

// ==========================================
// GOAL TEMPLATES
// ==========================================

const PERSONAL_GOALS = [
  "Master TypeScript advanced patterns",
  "Improve code review quality",
  "Learn system design fundamentals",
  "Contribute to open source projects",
  "Improve communication skills",
];

const TEAM_GOALS = [
  "Increase sprint velocity by 25%",
  "Reduce bug count by 50%",
  "Improve code coverage to 80%",
  "Decrease deployment time to under 10 minutes",
  "Enhance team collaboration efficiency",
];

const STRATEGIC_GOALS = [
  "Increase platform user engagement",
  "Reduce customer churn rate",
  "Improve platform performance",
  "Expand feature adoption",
  "Enhance security posture",
];

// ==========================================
// MAIN SEED FUNCTION
// ==========================================

export async function seedGoals() {
  await initializeDatabase();
  const db = getDatabase();
  logger.info("🌱 Phase 5: Seeding goals and OKRs...\n");

  try {
    const [workspace] = await db.select().from(workspaces).limit(1);
    const allUsers = await db.select().from(users);

    if (!workspace || allUsers.length === 0) {
      throw new Error("Workspace and users required. Run phases 1-2 first.");
    }

    const createdGoals: any[] = [];
    const createdKeyResults: any[] = [];

    // 1. CREATE PERSONAL GOALS
    logger.info("🎯 Creating personal goals...");
    
    for (const user of allUsers) {
      const goalCount = randomInt(2, 4);

      for (let i = 0; i < goalCount; i++) {
        const title = randomElement(PERSONAL_GOALS);
        const startDate = daysAgo(randomInt(30, 90));
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 90); // 90 days from start

        const progress = randomInt(20, 90);
        const status = progress === 100 ? 'completed' : 
                       progress < 30 ? 'at_risk' : 
                       'active';

        const [goal] = await db
          .insert(goals)
          .values({
            workspaceId: workspace.id,
            userId: user.id,
            title,
            description: generateDescription('goal'),
            type: 'personal',
            timeframe: 'Q1 2025',
            startDate,
            endDate,
            status: status as any,
            progress,
            privacy: 'private',
            priority: randomElement(['low', 'medium', 'high']),
          })
          .returning();

        createdGoals.push(goal);

        // Create 2-3 key results per goal
        const krCount = randomInt(2, 3);

        for (let j = 0; j < krCount; j++) {
          const krProgress = randomInt(progress - 20, progress + 20);
          const currentValue = randomInt(0, 100);
          const target = 100;

          const krTitle = `KR${j + 1}: ${title.substring(0, 40)}`;
          const [kr] = await db
            .insert(goalKeyResults)
            .values({
              goalId: goal.id,
              title: krTitle,
              description: `Key result ${j + 1} for ${title.substring(0, 30)}...`,
              targetValue: target.toString(),
              currentValue: currentValue.toString(),
              unit: randomElement(['percent', 'number', 'hours', 'count']),
              status: krProgress >= 70 ? 'on_track' : krProgress >= 40 ? 'at_risk' : 'behind',
              dueDate: endDate,
            })
            .returning();

          createdKeyResults.push(kr);

          // NOTE: Progress snapshots skipped - table not in schema
          // If needed, this can be added later when the table is defined
        }
      }

      logger.info(`   ✅ ${user.name}: Created ${goalCount} personal goals with ${goalCount * 2.5} key results (avg)`);
    }

    // 2. CREATE TEAM GOALS
    logger.info("\n👥 Creating team goals...");
    
    const teamLeads = allUsers.filter(u => u.role === 'team-lead' || u.role === 'project-manager');

    for (const lead of teamLeads) {
      const goalCount = randomInt(2, 3);

      for (let i = 0; i < goalCount; i++) {
        const title = randomElement(TEAM_GOALS);
        const startDate = daysAgo(randomInt(60, 120));
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 90);

        const progress = randomInt(30, 85);

        const [goal] = await db
          .insert(goals)
          .values({
            workspaceId: workspace.id,
            userId: lead.id,
            title,
            description: generateDescription('goal'),
            type: 'team',
            timeframe: 'Q4 2024',
            startDate,
            endDate,
            status: 'active',
            progress,
            privacy: 'team',
            priority: randomElement(['medium', 'high']),
          })
          .returning();

        createdGoals.push(goal);

        // 3 key results per team goal
        for (let j = 0; j < 3; j++) {
          const krProgress = randomInt(progress - 15, progress + 15);

          const teamKrTitle = `Team KR ${j + 1}`;
          await db.insert(goalKeyResults).values({
            goalId: goal.id,
            title: teamKrTitle,
            description: `Team KR ${j + 1}: ${title.substring(0, 40)}`,
            targetValue: "100",
            currentValue: krProgress.toString(),
            unit: 'percent',
            status: krProgress >= 70 ? 'on_track' : krProgress >= 40 ? 'at_risk' : 'behind',
            dueDate: endDate,
          });

          createdKeyResults.push({} as any);
        }
      }

      logger.info(`   ✅ ${lead.name}: Created ${goalCount} team goals`);
    }

    // 3. CREATE STRATEGIC GOALS
    logger.info("\n🏢 Creating strategic goals...");
    
    const executives = allUsers.filter(u => 
      u.role === 'workspace-manager' || u.role === 'department-head'
    );

    for (const exec of executives) {
      const goalCount = randomInt(1, 2);

      for (let i = 0; i < goalCount; i++) {
        const title = randomElement(STRATEGIC_GOALS);
        const startDate = daysAgo(randomInt(90, 180));
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 365); // 1 year

        const progress = randomInt(25, 65);

        const [goal] = await db
          .insert(goals)
          .values({
            workspaceId: workspace.id,
            userId: exec.id,
            title,
            description: generateDescription('goal'),
            type: 'strategic',
            timeframe: '2025',
            startDate,
            endDate,
            status: 'active',
            progress,
            privacy: 'organization',
            priority: 'high',
          })
          .returning();

        createdGoals.push(goal);

        // 4-5 key results per strategic goal
        for (let j = 0; j < randomInt(4, 5); j++) {
          const stratKrTitle = `Strategic KR ${j + 1}`;
          const stratCurrent = randomInt(20, 80);
          await db.insert(goalKeyResults).values({
            goalId: goal.id,
            title: stratKrTitle,
            description: `Strategic KR ${j + 1}`,
            targetValue: "100",
            currentValue: stratCurrent.toString(),
            unit: 'percent',
            status: stratCurrent >= 70 ? 'on_track' : stratCurrent >= 40 ? 'at_risk' : 'behind',
            dueDate: endDate,
          });

          createdKeyResults.push({} as any);
        }
      }

      logger.info(`   ✅ ${exec.name}: Created ${goalCount} strategic goals`);
    }

    // 4. CREATE GOAL REFLECTIONS
    logger.info("\n💭 Creating goal reflections...");
    logger.info("   ⏭️  Skipping reflections (schema mismatch - many required fields)");
    
    let reflectionCount = 0;

    // NOTE: Goal reflections skipped due to complex schema requirements
    // The goal_reflections table has many required fields that would need
    // proper mapping from the goals table. Can be added later if needed.

    logger.info("\n✅ Phase 5 complete: Created goals and OKRs");
    logger.info(`   🎯 Goals: ${createdGoals.length} (personal, team, strategic)`);
    logger.info(`   📊 Key Results: ${createdKeyResults.length}`);
    logger.info(`   📈 Progress Snapshots: 0 (skipped - table not in schema)`);
    logger.info(`   💭 Reflections: ${reflectionCount} (skipped - schema mismatch)`);

    return {
      goals: createdGoals,
      keyResults: createdKeyResults,
    };

  } catch (error) {
    logger.error("❌ Error seeding goals:", error);
    throw error;
  }
}

export default seedGoals;

// Run if executed directly
if (require.main === module) {
  seedGoals().catch((error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
