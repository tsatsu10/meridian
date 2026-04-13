import { getDatabase } from "../../database/connection";
import { digestSettings } from "../../database/schema";
import { eq } from "drizzle-orm";
import { logger } from "../../utils/logger";

export async function getDigestSettings(userEmail: string) {
  const db = getDatabase();
  
  try {
    const [settings] = await db
      .select()
      .from(digestSettings)
      .where(eq(digestSettings.userEmail, userEmail))
      .limit(1);
    
    // Return default settings if none exist
    if (!settings) {
      return {
        userEmail,
        dailyEnabled: true,
        dailyTime: '09:00',
        weeklyEnabled: true,
        weeklyDay: 1, // Monday
        digestSections: ['tasks', 'mentions', 'comments', 'kudos'],
      };
    }
    
    return settings;
  } catch (error) {
    logger.error("Failed to get digest settings:", error);
    throw new Error("Failed to fetch digest settings");
  }
}

export async function updateDigestSettings(
  userEmail: string,
  data: {
    dailyEnabled?: boolean;
    dailyTime?: string;
    weeklyEnabled?: boolean;
    weeklyDay?: number;
    digestSections?: string[];
  }
) {
  const db = getDatabase();
  
  try {
    // Check if settings exist
    const [existing] = await db
      .select()
      .from(digestSettings)
      .where(eq(digestSettings.userEmail, userEmail))
      .limit(1);
    
    if (existing) {
      // Update existing settings
      const [updated] = await db
        .update(digestSettings)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(digestSettings.userEmail, userEmail))
        .returning();
      
      logger.info(`Digest settings updated for ${userEmail}`);
      return updated;
    } else {
      // Create new settings
      const [created] = await db
        .insert(digestSettings)
        .values({
          userEmail,
          dailyEnabled: data.dailyEnabled !== undefined ? data.dailyEnabled : true,
          dailyTime: data.dailyTime || '09:00',
          weeklyEnabled: data.weeklyEnabled !== undefined ? data.weeklyEnabled : true,
          weeklyDay: data.weeklyDay !== undefined ? data.weeklyDay : 1,
          digestSections: data.digestSections || ['tasks', 'mentions', 'comments', 'kudos'],
        })
        .returning();
      
      logger.info(`Digest settings created for ${userEmail}`);
      return created;
    }
  } catch (error) {
    logger.error("Failed to update digest settings:", error);
    throw new Error("Failed to update digest settings");
  }
}


