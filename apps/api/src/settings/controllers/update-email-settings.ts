/**
 * Update Email & Communication Settings Controller
 * Updates workspace-level email and communication configuration
 */

import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceTable } from "../../database/schema";
import { EmailSettings } from "./get-email-settings";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

// Simple encryption for SMTP password (use proper encryption in production)
function encryptPassword(password: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export default async function updateEmailSettings(
  workspaceId: string,
  updates: Partial<EmailSettings>
): Promise<any> {
  const db = getDatabase();
  
  // Get current workspace
  const [workspace] = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.id, workspaceId))
    .limit(1);
  
  if (!workspace) {
    throw new Error('Workspace not found');
  }
  
  // Encrypt SMTP password if provided
  if (updates.smtpPassword) {
    updates.smtpPassword = encryptPassword(updates.smtpPassword);
  }
  
  // Get current settings
  const currentSettings = (workspace.settings as any) || {};
  const currentEmailSettings = currentSettings.email || {};
  
  // Merge updates
  const updatedEmailSettings = { ...currentEmailSettings, ...updates };
  
  // Update workspace settings
  const [updatedWorkspace] = await db
    .update(workspaceTable)
    .set({
      settings: {
        ...currentSettings,
        email: updatedEmailSettings,
      },
      updatedAt: new Date(),
    })
    .where(eq(workspaceTable.id, workspaceId))
    .returning();
  
  return updatedWorkspace;
}


