import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userProfileTable, userTable } from "../../database/schema";
import { sanitizeText } from "../../lib/universal-sanitization";
import logger from "../../utils/logger";

interface ProfileUpdateData {
  /** Lives on `users`, not `user_profiles` — written separately below. */
  name?: string;
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

const updateProfile = async (
  userId: string,
  profileData: ProfileUpdateData,
) => {
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

    // `name` is a column on `users`; everything else belongs to
    // `user_profiles`. Splitting them keeps the profile payload valid — the
    // page previously offered an editable name field that nothing persisted.
    const { name, ...profileFields } = profileData;

    if (name !== undefined) {
      await db
        .update(userTable)
        .set({
          name: sanitizeText(name, { maxLength: 100, stripHtmlTags: true }),
          updatedAt: now,
        })
        .where(eq(userTable.id, userId));
    }

    if (existingProfile.length === 0) {
      // Create new profile
      const result = await db
        .insert(userProfileTable)
        .values({
          userId,
          ...profileFields,
          lastProfileUpdate: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return result[0];
    }
    // Update existing profile
    const result = await db
      .update(userProfileTable)
      .set({
        ...profileFields,
        lastProfileUpdate: now,
        updatedAt: now,
      })
      .where(eq(userProfileTable.userId, userId))
      .returning();

    return result[0];
  } catch (error) {
    logger.error("Error updating profile:", error);
    throw new Error("Failed to update profile");
  }
};

export default updateProfile;
