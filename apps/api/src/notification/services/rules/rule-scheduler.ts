import cron from 'node-cron';
import { evaluateAllRules } from './rule-engine';
import { logger } from '../../../utils/logger';

class RuleScheduler {
  private job: cron.ScheduledTask | null = null;

  /**
   * Start the rule evaluation scheduler
   * Runs every 5 minutes to check all active rules
   */
  public start() {
    // Run every 5 minutes
    this.job = cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info('🔔 Running scheduled alert rule evaluation...');
        await evaluateAllRules();
      } catch (error) {
        logger.error('❌ Alert rule evaluation failed:', error);
      }
    });

    logger.info('✅ Alert rule scheduler started (runs every 5 minutes)');
  }

  /**
   * Stop the scheduler
   */
  public stop() {
    if (this.job) {
      this.job.stop();
      logger.info('⏹️ Alert rule scheduler stopped');
    }
  }
}

// Singleton instance
export const ruleScheduler = new RuleScheduler();


