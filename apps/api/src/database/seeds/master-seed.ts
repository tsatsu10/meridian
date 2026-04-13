#!/usr/bin/env tsx
/**
 * Master seed orchestrator (phases run in order).
 * Gamification seed file removed; `--only=gamification` is a no-op.
 */

import { config } from "dotenv";
config();

import { initializeDatabase } from "../connection";
import logger from "../../utils/logger";

import seedUsers from "./01-users";
import seedWorkspaces from "./02-workspaces";
import seedProjectsAndTasks from "./03-projects-tasks";
import seedGoals from "./05-goals";
import seedCommunication from "./06-communication";
import seedTimeAndActivity from "./07-time-activity";
import seedAnalytics from "./08-analytics";
import seedAdvancedFeatures from "./09-advanced";
import { seedWidgetMarketplace } from "./10-widget-marketplace";

type SeedPhase = {
  id: number;
  name: string;
  fn: () => Promise<void>;
  emoji: string;
};

const SEED_PHASES: SeedPhase[] = [
  { id: 1, name: "Users & Authentication", fn: seedUsers, emoji: "👥" },
  { id: 2, name: "Workspaces & Teams", fn: seedWorkspaces, emoji: "🏢" },
  { id: 3, name: "Projects & Tasks", fn: seedProjectsAndTasks, emoji: "📂" },
  { id: 5, name: "Goals & OKRs", fn: seedGoals, emoji: "🎯" },
  { id: 6, name: "Communication", fn: seedCommunication, emoji: "💬" },
  { id: 7, name: "Time & Activity", fn: seedTimeAndActivity, emoji: "⏱️" },
  { id: 8, name: "Analytics", fn: seedAnalytics, emoji: "📊" },
  { id: 9, name: "Advanced Features", fn: seedAdvancedFeatures, emoji: "🤖" },
  { id: 10, name: "Widget Marketplace", fn: seedWidgetMarketplace, emoji: "🏪" },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseArgs(): {
  startPhase?: number;
  only?: string;
  skip?: string[];
} {
  const args = process.argv.slice(2);
  const options: {
    startPhase?: number;
    only?: string;
    skip?: string[];
  } = {};

  for (const arg of args) {
    if (arg.startsWith("--phase=")) {
      options.startPhase = parseInt(arg.split("=")[1] || "1", 10);
    } else if (arg.startsWith("--only=")) {
      options.only = arg.split("=")[1];
    } else if (arg.startsWith("--skip=")) {
      options.skip = arg.split("=")[1]?.split(",").map((s) => s.trim());
    }
  }

  return options;
}

async function masterSeed(): Promise<void> {
  const startTime = Date.now();
  const options = parseArgs();

  logger.info("╔══════════════════════════════════════════════╗");
  logger.info("║   🌱 MERIDIAN DATABASE SEED - MASTER SCRIPT   ║");
  logger.info("╚══════════════════════════════════════════════╝\n");

  await initializeDatabase();

  if (options.only === "gamification") {
    logger.warn(
      "⚠️  Phase 'gamification' was removed from the default pipeline. Skipping.",
    );
    return;
  }

  for (const phase of SEED_PHASES) {
    if (options.startPhase != null && phase.id < options.startPhase) {
      continue;
    }
    if (options.only) {
      const want = options.only.toLowerCase().replace(/_/g, "-");
      const slug = slugify(phase.name);
      if (want !== slug && want !== String(phase.id)) {
        continue;
      }
    }
    if (options.skip?.includes(String(phase.id))) {
      logger.info(`⏭️  Skipping phase ${phase.id} (${phase.name})`);
      continue;
    }

    logger.info(`${phase.emoji} Phase ${phase.id}: ${phase.name}...`);
    await phase.fn();
  }

  const ms = Date.now() - startTime;
  logger.info(`\n✅ Master seed finished in ${ms}ms`);
}

masterSeed().catch((err) => {
  logger.error("❌ Master seed failed:", err);
  process.exit(1);
});
