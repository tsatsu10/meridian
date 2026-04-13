import { getDatabase } from "../../database/connection";
import { 
  tasks, 
  notifications, 
  kudos, 
  digestSettings,
  digestMetrics,
  users,
  noteComments 
} from "../../database/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { logger } from "../../utils/logger";

export interface DigestData {
  user: {
    email: string;
    name: string;
  };
  period: {
    start: Date;
    end: Date;
    type: 'daily' | 'weekly';
  };
  metrics: {
    tasksCompleted: number;
    commentsReceived: number;
    mentionsCount: number;
    kudosReceived: number;
  };
  content: {
    recentTasks?: any[];
    recentComments?: any[];
    recentMentions?: any[];
    recentKudos?: any[];
  };
}

export async function generateDigest(
  userEmail: string,
  type: 'daily' | 'weekly'
): Promise<DigestData | null> {
  const db = getDatabase();
  
  try {
    // Get user
    const [user] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);
    
    if (!user) {
      logger.warn(`User not found for digest: ${userEmail}`);
      return null;
    }
    
    // Get digest settings
    const [settings] = await db
      .select()
      .from(digestSettings)
      .where(eq(digestSettings.userEmail, userEmail))
      .limit(1);
    
    // Check if digest is enabled
    if (type === 'daily' && settings && !settings.dailyEnabled) {
      return null;
    }
    if (type === 'weekly' && settings && !settings.weeklyEnabled) {
      return null;
    }
    
    // Calculate period
    const now = new Date();
    const periodStart = new Date();
    
    if (type === 'daily') {
      periodStart.setDate(periodStart.getDate() - 1);
    } else {
      periodStart.setDate(periodStart.getDate() - 7);
    }
    
    const periodEnd = now;
    
    // Get digest sections (default to all if not set)
    const sections = settings?.digestSections || ['tasks', 'mentions', 'comments', 'kudos'];
    
    // Initialize digest data
    const digestData: DigestData = {
      user: {
        email: user.email,
        name: user.name || user.email,
      },
      period: {
        start: periodStart,
        end: periodEnd,
        type,
      },
      metrics: {
        tasksCompleted: 0,
        commentsReceived: 0,
        mentionsCount: 0,
        kudosReceived: 0,
      },
      content: {},
    };
    
    // Fetch tasks completed (if enabled)
    if (sections.includes('tasks')) {
      const completedTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userEmail, userEmail),
            eq(tasks.status, 'done'),
            gte(tasks.updatedAt, periodStart),
            lte(tasks.updatedAt, periodEnd)
          )
        )
        .orderBy(desc(tasks.updatedAt))
        .limit(10);
      
      digestData.metrics.tasksCompleted = completedTasks.length;
      digestData.content.recentTasks = completedTasks.slice(0, 5);
    }
    
    // Fetch mentions (if enabled)
    if (sections.includes('mentions')) {
      const mentions = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userEmail, userEmail),
            eq(notifications.type, 'mention'),
            gte(notifications.createdAt, periodStart),
            lte(notifications.createdAt, periodEnd)
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(10);
      
      digestData.metrics.mentionsCount = mentions.length;
      digestData.content.recentMentions = mentions.slice(0, 5);
    }
    
    // Fetch comments received (if enabled)
    if (sections.includes('comments')) {
      const userComments = await db
        .select()
        .from(noteComments)
        .where(
          and(
            gte(noteComments.createdAt, periodStart),
            lte(noteComments.createdAt, periodEnd)
          )
        )
        .orderBy(desc(noteComments.createdAt))
        .limit(10);
      
      digestData.metrics.commentsReceived = userComments.length;
      digestData.content.recentComments = userComments.slice(0, 5);
    }
    
    // Fetch kudos received (if enabled)
    if (sections.includes('kudos')) {
      const receivedKudos = await db
        .select()
        .from(kudos)
        .where(
          and(
            eq(kudos.toUserEmail, userEmail),
            gte(kudos.createdAt, periodStart),
            lte(kudos.createdAt, periodEnd)
          )
        )
        .orderBy(desc(kudos.createdAt))
        .limit(10);
      
      digestData.metrics.kudosReceived = receivedKudos.length;
      digestData.content.recentKudos = receivedKudos.slice(0, 5);
    }
    
    // Save digest metrics
    await db.insert(digestMetrics).values({
      userEmail,
      periodStart,
      periodEnd,
      tasksCompleted: digestData.metrics.tasksCompleted,
      commentsReceived: digestData.metrics.commentsReceived,
      mentionsCount: digestData.metrics.mentionsCount,
      kudosReceived: digestData.metrics.kudosReceived,
      content: digestData,
      emailSent: false,
    });
    
    logger.info(`Digest generated for ${userEmail} (${type})`);
    return digestData;
    
  } catch (error) {
    logger.error(`Failed to generate digest for ${userEmail}:`, error);
    throw error;
  }
}

export async function generateDigestsForAllUsers(type: 'daily' | 'weekly'): Promise<number> {
  const db = getDatabase();
  
  try {
    // Get all users with digest enabled
    const userSettings = await db
      .select()
      .from(digestSettings)
      .where(
        type === 'daily' 
          ? eq(digestSettings.dailyEnabled, true)
          : eq(digestSettings.weeklyEnabled, true)
      );
    
    let generatedCount = 0;
    
    for (const setting of userSettings) {
      try {
        const digest = await generateDigest(setting.userEmail, type);
        if (digest) {
          generatedCount++;
        }
      } catch (error) {
        logger.error(`Failed to generate digest for ${setting.userEmail}:`, error);
      }
    }
    
    logger.info(`Generated ${generatedCount} ${type} digests`);
    return generatedCount;
    
  } catch (error) {
    logger.error(`Failed to generate digests:`, error);
    throw error;
  }
}


