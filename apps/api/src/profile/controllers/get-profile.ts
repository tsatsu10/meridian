import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userTable, userProfileTable } from "../../database/schema";
import logger from '../../utils/logger';

/**
 * Fetches complete user profile data including basic info and extended profile
 * @param userId - The unique identifier of the user
 * @returns User profile object with completeness score
 * @throws Error if user is not found or database query fails
 */
const getProfile = async (userId: string) => {
  const db = getDatabase();
  
  try {
    logger.debug("🔍 getProfile called with userId:", userId);
    
    // Get user basic info and profile data
    const result = await db
      .select({
        // User basic info
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        createdAt: userTable.createdAt,
        
        // Profile extended info
        jobTitle: userProfileTable.jobTitle,
        company: userProfileTable.company,
        industry: userProfileTable.industry,
        bio: userProfileTable.bio,
        headline: userProfileTable.headline,
        phone: userProfileTable.phone,
        website: userProfileTable.website,
        linkedinUrl: userProfileTable.linkedinUrl,
        githubUrl: userProfileTable.githubUrl,
        twitterUrl: userProfileTable.twitterUrl,
        location: userProfileTable.location,
        timezone: userProfileTable.timezone,
        language: userProfileTable.language,
        profilePicture: userProfileTable.profilePicture,
        coverImage: userProfileTable.coverImage,
        isPublic: userProfileTable.isPublic,
        allowDirectMessages: userProfileTable.allowDirectMessages,
        showOnlineStatus: userProfileTable.showOnlineStatus,
        showEmail: userProfileTable.showEmail,
        showPhone: userProfileTable.showPhone,
        emailVerified: userProfileTable.emailVerified,
        phoneVerified: userProfileTable.phoneVerified,
        profileVerified: userProfileTable.profileVerified,
        viewCount: userProfileTable.viewCount,
        connectionCount: userProfileTable.connectionCount,
        endorsementCount: userProfileTable.endorsementCount,
        completenessScore: userProfileTable.completenessScore,
        lastProfileUpdate: userProfileTable.lastProfileUpdate,
        profileCreatedAt: userProfileTable.createdAt,
        profileUpdatedAt: userProfileTable.updatedAt,
      })
      .from(userTable)
      .leftJoin(userProfileTable, eq(userTable.id, userProfileTable.userId))
      .where(eq(userTable.id, userId))
      .limit(1);

    if (result.length === 0) {
      throw new Error("User not found");
    }

    const user = result[0];

    // Calculate completeness score if not set
    let completenessScore = user.completenessScore || 0;
    if (completenessScore === 0) {
      const fields = [
        user.name,
        user.email,
        user.jobTitle,
        user.company,
        user.bio,
        user.location,
        user.profilePicture,
      ];
      completenessScore = Math.round((fields.filter(field => field && String(field).trim()).length / fields.length) * 100);
    }

    return {
      ...user,
      completenessScore,
    };
  } catch (error) {
    logger.error("❌ Error fetching profile:", error);
    logger.error("❌ Error details:", error instanceof Error ? error.message : String(error));
    logger.error("❌ Stack:", error instanceof Error ? error.stack : "No stack");
    throw error; // Re-throw the original error instead of wrapping it
  }
};

export default getProfile; 
