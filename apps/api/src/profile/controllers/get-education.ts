import { eq, desc } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userEducationTable } from "../../database/schema";
import logger from '../../utils/logger';

const getEducation = async (userId: string) => {
  const db = getDatabase();
  
  try {
    const education = await db
      .select()
      .from(userEducationTable)
      .where(eq(userEducationTable.userId, userId))
      .orderBy(desc(userEducationTable.createdAt));

    return education.map(edu => ({
      ...edu,
      activities: edu.activities ? JSON.parse(edu.activities) : [],
    }));
  } catch (error) {
    logger.error("Error fetching education:", error);
    throw new Error("Failed to fetch education");
  }
};

export default getEducation; 
