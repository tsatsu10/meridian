import cron from 'node-cron';
import { getDatabase } from '../../database/connection';
import { digestSettings } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { generateDigest } from './digest-generator';
import { sendDigestEmail } from './email-service';
import { logger } from '../../utils/logger';

class DigestScheduler {
  private dailyJob: cron.ScheduledTask | null = null;
  private weeklyJob: cron.ScheduledTask | null = null;

  /**
   * Initialize daily digest scheduler
   * Runs at each user's preferred time (default 9:00 AM)
   */
  public startDailyDigests() {
    // Run every hour to check for users whose digest time has arrived
    this.dailyJob = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running daily digest check...');
        await this.processDailyDigests();
      } catch (error) {
        logger.error('Daily digest job failed:', error);
      }
    });

    logger.info('✅ Daily digest scheduler started (runs hourly)');
  }

  /**
   * Initialize weekly digest scheduler
   * Runs on users' preferred day (default Monday at 9:00 AM)
   */
  public startWeeklyDigests() {
    // Run every day at midnight to check for users whose weekly digest day has arrived
    this.weeklyJob = cron.schedule('0 0 * * *', async () => {
      try {
        logger.info('Running weekly digest check...');
        await this.processWeeklyDigests();
      } catch (error) {
        logger.error('Weekly digest job failed:', error);
      }
    });

    logger.info('✅ Weekly digest scheduler started (runs daily at midnight)');
  }

  /**
   * Process daily digests for users
   */
  private async processDailyDigests() {
    const db = getDatabase();
    const currentHour = new Date().getHours();
    const currentTime = `${String(currentHour).padStart(2, '0')}:00`;

    try {
      // Get all users with daily digests enabled for this hour
      const usersToProcess = await db
        .select()
        .from(digestSettings)
        .where(eq(digestSettings.dailyEnabled, true));

      const filteredUsers = usersToProcess.filter(setting => {
        const [hour] = setting.dailyTime?.split(':') || ['09'];
        return parseInt(hour) === currentHour;
      });

      logger.info(`Found ${filteredUsers.length} users for daily digest at ${currentTime}`);

      for (const setting of filteredUsers) {
        try {
          const digest = await generateDigest(setting.userEmail, 'daily');
          
          if (digest) {
            await sendDigestEmail(digest);
            logger.info(`✅ Daily digest sent to ${setting.userEmail}`);
          }
        } catch (error) {
          logger.error(`Failed to send daily digest to ${setting.userEmail}:`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to process daily digests:', error);
    }
  }

  /**
   * Process weekly digests for users
   */
  private async processWeeklyDigests() {
    const db = getDatabase();
    const currentDay = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

    try {
      // Get all users with weekly digests enabled for this day
      const usersToProcess = await db
        .select()
        .from(digestSettings)
        .where(eq(digestSettings.weeklyEnabled, true));

      const filteredUsers = usersToProcess.filter(setting => {
        return setting.weeklyDay === currentDay;
      });

      logger.info(`Found ${filteredUsers.length} users for weekly digest on day ${currentDay}`);

      for (const setting of filteredUsers) {
        try {
          const digest = await generateDigest(setting.userEmail, 'weekly');
          
          if (digest) {
            await sendDigestEmail(digest);
            logger.info(`✅ Weekly digest sent to ${setting.userEmail}`);
          }
        } catch (error) {
          logger.error(`Failed to send weekly digest to ${setting.userEmail}:`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to process weekly digests:', error);
    }
  }

  /**
   * Stop all schedulers
   */
  public stop() {
    if (this.dailyJob) {
      this.dailyJob.stop();
      logger.info('Daily digest scheduler stopped');
    }
    if (this.weeklyJob) {
      this.weeklyJob.stop();
      logger.info('Weekly digest scheduler stopped');
    }
  }

  /**
   * Start all schedulers
   */
  public start() {
    this.startDailyDigests();
    this.startWeeklyDigests();
    logger.info('🚀 All digest schedulers started');
  }
}

// Singleton instance
export const digestScheduler = new DigestScheduler();


