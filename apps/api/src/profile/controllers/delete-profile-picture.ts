import { eq } from "drizzle-orm";
import { unlink } from "node:fs/promises";
import { basename, join } from "node:path";
import { getDatabase } from "../../database/connection";
import { userProfileTable } from "../../database/schema";
import logger from "../../utils/logger";

/**
 * Clears a user's profile picture.
 *
 * The UI had a "Remove Photo" button that only reset local component state and
 * toasted "Profile photo removed" — nothing was sent to the server, so the
 * picture reappeared on the next reload.
 */
const deleteProfilePicture = async (userId: string) => {
  const db = getDatabase();

  const [existing] = await db
    .select({ profilePicture: userProfileTable.profilePicture })
    .from(userProfileTable)
    .where(eq(userProfileTable.userId, userId))
    .limit(1);

  await db
    .update(userProfileTable)
    .set({ profilePicture: null, updatedAt: new Date() })
    .where(eq(userProfileTable.userId, userId));

  // Best-effort cleanup of the stored file. Only ever touches files we wrote
  // into the uploads directory — seeded/external avatars are plain URLs and
  // basename() keeps any stored value from walking out of the directory.
  const current = existing?.profilePicture;
  if (current?.startsWith("/uploads/profile-pictures/")) {
    try {
      await unlink(
        join(process.cwd(), "uploads", "profile-pictures", basename(current)),
      );
    } catch (error) {
      logger.warn("⚠️ Could not remove profile picture file:", error);
    }
  }

  return { success: true, message: "Profile picture removed" };
};

export default deleteProfilePicture;
