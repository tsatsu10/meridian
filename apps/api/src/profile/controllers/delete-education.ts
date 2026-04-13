import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userEducationTable } from "../../database/schema";
import logger from '../../utils/logger';

const deleteEducation = async (userId: string, educationId: string) => {
  const db = getDatabase();
  
  try {
    const result = await db
      .delete(userEducationTable)
      .where(and(
        eq(userEducationTable.id, educationId),
        eq(userEducationTable.userId, userId)
      ));

    return { success: true, message: "Education deleted successfully" };
  } catch (error) {
    logger.error("Error deleting education:", error);
    throw new Error("Failed to delete education");
  }
};

export default deleteEducation; 
