import { eq, and } from "drizzle-orm";
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

const updateEducation = async (userId: string, educationId: string, educationData: EducationData) => {
  const db = getDatabase();
  
  try {
    const result = await db
      .update(userEducationTable)
      .set({
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
        updatedAt: new Date(),
      })
      .where(and(
        eq(userEducationTable.id, educationId),
        eq(userEducationTable.userId, userId)
      ))
      .returning();

    return result[0];
  } catch (error) {
    logger.error("Error updating education:", error);
    throw new Error("Failed to update education");
  }
};

export default updateEducation; 
