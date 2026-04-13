import { getDatabase } from "../../database/connection";
import { userEducationTable } from "../../database/schema";
import logger from '../../utils/logger';

interface EducationData {
  school: string;
  degree: string;
  fieldOfStudy?: string;
  location?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  activities?: string[];
  grade?: string;
  schoolLogo?: string;
  order?: number;
}

const createEducation = async (userId: string, educationData: EducationData) => {
  const db = getDatabase();
  
  try {
    const result = await db
      .insert(userEducationTable)
      .values({
        userId,
        school: educationData.school,
        degree: educationData.degree,
        fieldOfStudy: educationData.fieldOfStudy,
        location: educationData.location,
        description: educationData.description,
        startDate: educationData.startDate,
        endDate: educationData.endDate,
        isCurrent: educationData.isCurrent || false,
        grade: educationData.grade,
        activities: educationData.activities ? JSON.stringify(educationData.activities) : null,
        schoolLogo: educationData.schoolLogo,
        order: educationData.order || 0,
      })
      .returning();

    return result[0];
  } catch (error) {
    logger.error("Error creating education:", error);
    throw new Error("Failed to create education");
  }
};

export default createEducation; 
