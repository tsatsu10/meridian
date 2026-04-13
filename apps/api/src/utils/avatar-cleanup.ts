import { eq, isNotNull } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { userProfileTable } from "../database/schema";
import logger from './logger';

/**
 * Clean up invalid avatar URLs from the database
 */
export async function cleanupInvalidAvatarUrls() {
  try {
    const db = getDatabase();
    logger.info("🧹 Cleaning up invalid avatar URLs...");

    // Get all user profiles with avatar URLs containing invalid domains
    const invalidProfiles = await db
      .select()
      .from(userProfileTable)
      .where(isNotNull(userProfileTable.profilePicture));
    
    let cleanedCount = 0;
    const invalidDomains = ['meridian-images.example.com', 'example.com'];
    
    for (const profile of invalidProfiles) {
      if (profile.profilePicture) {
        const hasInvalidDomain = invalidDomains.some(domain => 
          profile.profilePicture?.includes(domain)
        );
        
        if (hasInvalidDomain) {
          // Set to null to use fallback
          await db
            .update(userProfileTable)
            .set({ profilePicture: null })
            .where(eq(userProfileTable.id, profile.id));
          
          cleanedCount++;
          logger.info(`🧹 Removed invalid avatar URL for profile: ${profile.id}`);
        }
      }
    }
    
    if (cleanedCount > 0) {
      logger.info(`✅ Cleaned up ${cleanedCount} invalid avatar URLs`);
    } else {
      logger.info("✅ No invalid avatar URLs found");
    }
    
    return { cleanedCount, success: true };
  } catch (error) {
    logger.error("❌ Failed to cleanup invalid avatar URLs:", error);
    throw error;
  }
}

