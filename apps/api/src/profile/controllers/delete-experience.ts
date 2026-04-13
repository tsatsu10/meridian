import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userExperienceTable } from "../../database/schema";
import logger from '../../utils/logger';

const deleteExperience = async (userId: string, experienceId: string) => {
  const db = getDatabase();
  
  try {
    const result = await db
      .delete(userExperienceTable)
      .where(and(
        eq(userExperienceTable.id, experienceId),
        eq(userExperienceTable.userId, userId)
      ));

    return { success: true, message: "Experience deleted successfully" };
  } catch (error) {
    logger.error("Error deleting experience:", error);
    throw new Error("Failed to delete experience");
  }
};

export default deleteExperience; 
