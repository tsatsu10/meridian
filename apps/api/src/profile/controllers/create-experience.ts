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

const createExperience = async (userId: string, experienceData: ExperienceData) => {
  const db = getDatabase();
  
  try {
    const result = await db
      .insert(userExperienceTable)
      .values({
        userId,
        ...experienceData,
        skills: experienceData.skills ? JSON.stringify(experienceData.skills) : null,
        achievements: experienceData.achievements ? JSON.stringify(experienceData.achievements) : null,
      })
      .returning();

    return result[0];
  } catch (error) {
    logger.error("Error creating experience:", error);
    throw new Error("Failed to create experience");
  }
};

export default createExperience; 
