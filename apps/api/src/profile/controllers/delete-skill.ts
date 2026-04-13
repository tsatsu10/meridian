import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userSkillTable } from "../../database/schema";
import logger from '../../utils/logger';

const deleteSkill = async (userId: string, skillId: string) => {
  const db = getDatabase();
  
  try {
    const result = await db
      .delete(userSkillTable)
      .where(and(
        eq(userSkillTable.id, skillId),
        eq(userSkillTable.userId, userId)
      ));

    return { success: true, message: "Skill deleted successfully" };
  } catch (error) {
    logger.error("Error deleting skill:", error);
    throw new Error("Failed to delete skill");
  }
};

export default deleteSkill; 
