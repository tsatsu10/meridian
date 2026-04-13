import { eq, desc } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userSkillTable } from "../../database/schema";
import logger from '../../utils/logger';

const getSkills = async (userId: string) => {
  const db = getDatabase();
  
  try {
    const skills = await db
      .select()
      .from(userSkillTable)
      .where(eq(userSkillTable.userId, userId))
      .orderBy(desc(userSkillTable.createdAt));

    return skills;
  } catch (error) {
    logger.error("Error fetching skills:", error);
    throw new Error("Failed to fetch skills");
  }
};

export default getSkills; 
