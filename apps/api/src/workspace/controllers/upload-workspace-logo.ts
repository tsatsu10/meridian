/**
 * Upload Workspace Logo Controller
 * Handles file upload and updates workspace logo
 */

import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceTable } from "../../database/schema";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { createId } from "@paralleldrive/cuid2";

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'workspace-logos');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default async function uploadWorkspaceLogo(
  workspaceId: string,
  file: File | Blob,
  filename: string,
  mimetype: string
): Promise<string> {
  const db = getDatabase();
  
  // Validate file type
  if (!ALLOWED_TYPES.includes(mimetype)) {
    throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed');
  }
  
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 5MB limit');
  }
  
  // Verify workspace exists
  const [workspace] = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.id, workspaceId))
    .limit(1);
  
  if (!workspace) {
    throw new Error('Workspace not found');
  }
  
  // Create upload directory if it doesn't exist
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  
  // Generate unique filename
  const ext = filename.split('.').pop() || 'png';
  const uniqueFilename = `${workspaceId}-${createId()}.${ext}`;
  const filepath = join(UPLOAD_DIR, uniqueFilename);
  
  // Convert Blob to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Save file
  await writeFile(filepath, buffer);
  
  // Generate URL (adjust based on your server setup)
  const logoUrl = `/uploads/workspace-logos/${uniqueFilename}`;
  
  // Update workspace with logo URL
  await db
    .update(workspaceTable)
    .set({
      logo: logoUrl,
      updatedAt: new Date(),
    })
    .where(eq(workspaceTable.id, workspaceId));
  
  return logoUrl;
}


