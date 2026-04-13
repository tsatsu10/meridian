import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userExperienceTable } from "../../database/schema";
import logger from '../../utils/logger';

interface ExperienceData {
  title: string;
  company: string;
  location?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  skills?: string[];
  achievements?: string[];
  companyLogo?: string;
  order?: number;
}

const updateExperience = async (userId: string, experienceId: string, experienceData: ExperienceData) => {
  const db = getDatabase();
  
  try {
    const result = await db
      .update(userExperienceTable)
      .set({
        ...experienceData,
        skills: experienceData.skills ? JSON.stringify(experienceData.skills) : null,
        achievements: experienceData.achievements ? JSON.stringify(experienceData.achievements) : null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(userExperienceTable.id, experienceId),
        eq(userExperienceTable.userId, userId)
      ))
      .returning();

    return result[0];
  } catch (error) {
    logger.error("Error updating experience:", error);
    throw new Error("Failed to update experience");
  }
};

export default updateExperience; 
