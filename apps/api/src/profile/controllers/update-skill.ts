import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userSkillTable } from "../../database/schema";
import logger from '../../utils/logger';

interface SkillData {
  name: string;
  category: string;
  level?: number;
  yearsOfExperience?: number;
  endorsements?: number;
  verified?: boolean;
  order?: number;
}

const updateSkill = async (userId: string, skillId: string, skillData: SkillData) => {
  const db = getDatabase();
  
  try {
    const result = await db
      .update(userSkillTable)
      .set({
        name: skillData.name,
        category: skillData.category,
        level: skillData.level || 1,
        yearsOfExperience: skillData.yearsOfExperience || 0,
        endorsements: skillData.endorsements || 0,
        verified: skillData.verified || false,
        order: skillData.order || 0,
        updatedAt: new Date(),
      })
      .where(and(
        eq(userSkillTable.id, skillId),
        eq(userSkillTable.userId, userId)
      ))
      .returning();

    return result[0];
  } catch (error) {
    logger.error("Error updating skill:", error);
    throw new Error("Failed to update skill");
  }
};

export default updateSkill; 
