/**
 * Daily reset hook (gamification removed). Safe to schedule via node-cron when needed.
 */

import logger from "../utils/logger";

export async function dailyReset() {
  logger.debug("dailyReset: no-op (gamification cleanup disabled)");
  return {
    success: true,
    expiredChallenges: 0,
    cleanedRingData: 0,
    duration: 0,
  };
}

export function initializeCronJobs() {
  logger.debug("Cron jobs stub: daily reset available as dailyReset()");
}
