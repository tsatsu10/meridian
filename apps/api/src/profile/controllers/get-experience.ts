import { eq, desc } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userExperienceTable } from "../../database/schema";
import logger from '../../utils/logger';

/**
 * Retrieves all work experience entries for a user
 * @param userId - The unique identifier of the user
 * @returns Array of experience objects ordered by creation date (newest first)
 * @throws Error if database query fails
 */
const getExperience = async (userId: string) => {
  try {
    logger.debug("🔍 getExperience: Starting with userId:", userId);
    const db = getDatabase();
    logger.debug("🔍 getExperience: Database instance obtained");
    
    logger.debug("🔍 getExperience: Executing query...");
    const experience = await db
      .select()
      .from(userExperienceTable)
      .where(eq(userExperienceTable.userId, userId))
      .orderBy(desc(userExperienceTable.createdAt));

    logger.debug("🔍 getExperience: Query complete, got", experience.length, "rows");
    logger.debug("🔍 getExperience: Mapping results...");
    
    const mapped = experience.map(exp => {
      logger.debug("🔍 getExperience: Mapping exp:", exp.id, "skills type:", typeof exp.skills);
      return {
        ...exp,
        skills: exp.skills || [], // Already parsed by postgres JSONB driver
        achievements: exp.achievements ? JSON.parse(exp.achievements) : [],
      };
    });
    
    logger.debug("🔍 getExperience: Mapping complete");
    return mapped;
  } catch (error) {
    logger.error("❌ getExperience: Error fetching experience:", error);
    logger.error("❌ getExperience: Error details:", error instanceof Error ? error.message : String(error));
    logger.error("❌ getExperience: Stack:", error instanceof Error ? error.stack : "No stack");
    throw error; // Re-throw the original error
  }
};

export default getExperience; 
