import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userProfileTable } from "../../database/schema";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import logger from '../../utils/logger';
import { HTTPException } from 'hono/http-exception';
import sharp from 'sharp';

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const RECOMMENDED_SIZE = 400; // 400x400px

/**
 * Validate uploaded file
 * Note: Hono's parseBody() returns Blob-like object, not File
 */
function validateFile(file: any): void {
  if (!file) {
    throw new HTTPException(400, { message: 'No file uploaded' });
  }

  // Validate file has required properties
  if (!file.size || typeof file.size !== 'number') {
    throw new HTTPException(400, { message: 'Invalid file data - missing size' });
  }

  if (!file.type || typeof file.type !== 'string') {
    throw new HTTPException(400, { message: 'Invalid file data - missing type' });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new HTTPException(413, { 
      message: `File too large (${sizeMB}MB). Maximum size is 5MB` 
    });
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new HTTPException(415, { 
      message: 'Invalid file type. Please upload a valid image (JPG, PNG, GIF, or WebP)' 
    });
  }
}

/**
 * Upload and process profile picture
 */
const uploadProfilePicture = async (c: any, userId: string) => {
  const db = getDatabase();
  
  try {
    logger.info(`📸 Uploading profile picture for user: ${userId}`);
    
    const body = await c.req.parseBody();
    const file = body.file || body.avatar; // Support both 'file' and 'avatar' field names
    
    // Validate file
    validateFile(file);

    // Ensure upload directory exists (using async fs)
    const uploadDir = join(process.cwd(), 'uploads', 'profile-pictures');
    try {
      const { access } = await import('fs/promises');
      await access(uploadDir);
    } catch {
      // Directory doesn't exist, create it
      await mkdir(uploadDir, { recursive: true });
      logger.info(`📁 Created upload directory: ${uploadDir}`);
    }

    // Create unique filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}-${Date.now()}.${fileExtension}`;
    const filePath = join(uploadDir, fileName);
    
    // Process image with sharp
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    try {
      // Get image metadata for validation
      const metadata = await sharp(buffer).metadata();
      
      logger.info(`📐 Image dimensions: ${metadata.width}x${metadata.height}`);
      
      // Warn if image is smaller than recommended size (but allow it)
      if (metadata.width && metadata.height && 
          (metadata.width < RECOMMENDED_SIZE || metadata.height < RECOMMENDED_SIZE)) {
        logger.warn(
          `⚠️ Image dimensions (${metadata.width}x${metadata.height}) smaller than recommended (${RECOMMENDED_SIZE}x${RECOMMENDED_SIZE})`
        );
      }
      
      // Resize and optimize image
      await sharp(buffer)
        .resize(RECOMMENDED_SIZE, RECOMMENDED_SIZE, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 90 }) // Convert to JPEG for consistency
        .toFile(filePath);
        
      logger.info(`✅ Image processed and saved: ${fileName}`);
      
    } catch (sharpError) {
      // Fallback: If sharp processing fails, save original file
      logger.warn('⚠️ Sharp processing failed, saving original file:', sharpError);
      await writeFile(filePath, buffer);
    }
    
    // URL for the uploaded file
    const fileUrl = `/uploads/profile-pictures/${fileName}`;
    
    // Update user profile with new picture URL
    await db
      .update(userProfileTable)
      .set({
        profilePicture: fileUrl,
        updatedAt: new Date(),
      })
      .where(eq(userProfileTable.userId, userId));

    logger.info(`✅ Profile picture updated for user: ${userId}`);

    return { 
      success: true,
      avatarUrl: fileUrl,
      url: fileUrl, // Support both field names
      message: 'Profile picture uploaded successfully'
    };
    
  } catch (error: any) {
    logger.error("❌ Error uploading profile picture:", error);
    
    // Re-throw HTTPExceptions (they have proper status codes)
    if (error instanceof HTTPException) {
      throw error;
    }
    
    // Wrap other errors
    throw new HTTPException(500, { 
      message: error.message || "Failed to upload profile picture" 
    });
  }
};

export default uploadProfilePicture; 
