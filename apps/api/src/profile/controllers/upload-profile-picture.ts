import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userProfileTable } from "../../database/schema";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error-utils";
import { HTTPException } from "hono/http-exception";
import sharp from "sharp";

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const RECOMMENDED_SIZE = 400; // 400x400px

/**
 * Validate uploaded file
 * Note: Hono's parseBody() returns Blob-like object, not File
 */
function validateFile(file: File): void {
  if (!file) {
    throw new HTTPException(400, { message: "No file uploaded" });
  }

  // Validate file has required properties
  if (!file.size || typeof file.size !== "number") {
    throw new HTTPException(400, {
      message: "Invalid file data - missing size",
    });
  }

  if (!file.type || typeof file.type !== "string") {
    throw new HTTPException(400, {
      message: "Invalid file data - missing type",
    });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new HTTPException(413, {
      message: `File too large (${sizeMB}MB). Maximum size is 5MB`,
    });
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new HTTPException(415, {
      message:
        "Invalid file type. Please upload a valid image (JPG, PNG, GIF, or WebP)",
    });
  }
}

/**
 * Upload and process profile picture
 */
const uploadProfilePicture = async (c: Context, userId: string) => {
  const db = getDatabase();

  try {
    logger.info(`📸 Uploading profile picture for user: ${userId}`);

    const body = await c.req.parseBody();
    const file = (body.file || body.avatar) as File; // Support both 'file' and 'avatar' field names

    // Validate file
    validateFile(file);

    // Ensure upload directory exists (using async fs)
    const uploadDir = join(process.cwd(), "uploads", "profile-pictures");
    try {
      const { access } = await import("node:fs/promises");
      await access(uploadDir);
    } catch {
      // Directory doesn't exist, create it
      await mkdir(uploadDir, { recursive: true });
      logger.info(`📁 Created upload directory: ${uploadDir}`);
    }

    // Always .jpg — sharp re-encodes to JPEG below, so the uploaded file's own
    // extension is both meaningless and dangerous: it was attacker-controlled
    // and interpolated straight into join(), so a name like "x.jpg/../../evil"
    // escaped the upload directory. userId is a server-issued cuid.
    const fileName = `${userId}-${Date.now()}.jpg`;
    const filePath = join(uploadDir, fileName);

    // Process image with sharp
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      // Get image metadata for validation
      const metadata = await sharp(buffer).metadata();

      logger.info(`📐 Image dimensions: ${metadata.width}x${metadata.height}`);

      // Warn if image is smaller than recommended size (but allow it)
      if (
        metadata.width &&
        metadata.height &&
        (metadata.width < RECOMMENDED_SIZE ||
          metadata.height < RECOMMENDED_SIZE)
      ) {
        logger.warn(
          `⚠️ Image dimensions (${metadata.width}x${metadata.height}) smaller than recommended (${RECOMMENDED_SIZE}x${RECOMMENDED_SIZE})`,
        );
      }

      // Resize and optimize image
      await sharp(buffer)
        .resize(RECOMMENDED_SIZE, RECOMMENDED_SIZE, {
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: 90 }) // Convert to JPEG for consistency
        .toFile(filePath);

      logger.info(`✅ Image processed and saved: ${fileName}`);
    } catch (sharpError) {
      // Deliberately no fallback to writing the original bytes. The MIME type
      // checked above is client-supplied, so "sharp couldn't decode it" is the
      // only real evidence that the upload isn't an image — writing the raw
      // buffer anyway is precisely how a non-image gets onto disk under an
      // image's name.
      logger.warn("⚠️ Rejected upload that sharp could not decode:", sharpError);
      throw new HTTPException(415, {
        message:
          "Invalid image. Please upload a valid JPG, PNG, GIF, or WebP file.",
      });
    }

    // URL for the uploaded file
    const fileUrl = `/uploads/profile-pictures/${fileName}`;

    // Upsert: a bare UPDATE silently matched zero rows for any user without a
    // user_profiles row yet, so the upload reported success and a URL while
    // persisting nothing. (update-profile.ts already creates the row on demand;
    // this path didn't.)
    const updated = await db
      .update(userProfileTable)
      .set({
        profilePicture: fileUrl,
        updatedAt: new Date(),
      })
      .where(eq(userProfileTable.userId, userId))
      .returning({ id: userProfileTable.id });

    if (updated.length === 0) {
      const now = new Date();
      await db.insert(userProfileTable).values({
        userId,
        profilePicture: fileUrl,
        createdAt: now,
        updatedAt: now,
      });
    }

    logger.info(`✅ Profile picture updated for user: ${userId}`);

    return {
      success: true,
      avatarUrl: fileUrl,
      url: fileUrl, // Support both field names
      message: "Profile picture uploaded successfully",
    };
  } catch (error) {
    logger.error("❌ Error uploading profile picture:", error);

    // Re-throw HTTPExceptions (they have proper status codes)
    if (error instanceof HTTPException) {
      throw error;
    }

    // Wrap other errors
    throw new HTTPException(500, {
      message: getErrorMessage(error) || "Failed to upload profile picture",
    });
  }
};

export default uploadProfilePicture;
