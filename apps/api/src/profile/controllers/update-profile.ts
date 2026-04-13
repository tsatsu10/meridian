import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userProfileTable, userTable } from "../../database/schema";
import logger from '../../utils/logger';

interface ProfileUpdateData {
  jobTitle?: string;
  company?: string;
  industry?: string;
  bio?: string;
  headline?: string;
  phone?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  location?: string;
  timezone?: string;
  language?: string;
  isPublic?: boolean;
  allowDirectMessages?: boolean;
  showOnlineStatus?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
}

const updateProfile = async (userId: string, profileData: ProfileUpdateData) => {
  const db = getDatabase();
  
  try {
    // Check if user exists
    const userExists = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    if (userExists.length === 0) {
      throw new Error("User not found");
    }

    // Check if profile exists
    const existingProfile = await db
      .select({ id: userProfileTable.id })
      .from(userProfileTable)
      .where(eq(userProfileTable.userId, userId))
      .limit(1);

    const now = new Date();

    if (existingProfile.length === 0) {
      // Create new profile
      const result = await db
        .insert(userProfileTable)
        .values({
          userId,
          ...profileData,
          lastProfileUpdate: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return result[0];
    } else {
      // Update existing profile
      const result = await db
        .update(userProfileTable)
        .set({
          ...profileData,
          lastProfileUpdate: now,
          updatedAt: now,
        })
        .where(eq(userProfileTable.userId, userId))
        .returning();

      return result[0];
    }
  } catch (error) {
    logger.error("Error updating profile:", error);
    throw new Error("Failed to update profile");
  }
};

export default updateProfile; 
