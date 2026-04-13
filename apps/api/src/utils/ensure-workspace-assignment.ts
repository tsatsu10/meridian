import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { userTable, roleAssignmentTable, roleHistoryTable, workspaceTable } from "../database/schema";
import logger from '../utils/logger';

/**
 * 🚨 SECURITY VULNERABILITY - DISABLED
 * This function was auto-granting workspace access to ANY user
 * Users should only access workspaces they own or were explicitly invited to
 * 
 * @deprecated This function creates security vulnerabilities - use invitation system instead
 */
/*
export async function ensureWorkspaceAssignment(userEmail: string, workspaceId: string) {
  throw new Error("🚨 SECURITY: ensureWorkspaceAssignment is disabled - use invitation system instead");
}
*/

/**
 * Secure replacement: Users get workspace access ONLY through:
 * 1. Creating a workspace (automatic workspace-manager role)
 * 2. Being invited by workspace owner/manager via invitation token
 * 3. NO auto-assignment based on email patterns or other heuristics
 */
export async function ensureWorkspaceAssignment(userEmail: string, workspaceId: string) {
  logger.error(`🚨 SECURITY VIOLATION: Attempted to auto-assign workspace access to ${userEmail} for workspace ${workspaceId}`);
  logger.error("🚨 Users can only access workspaces they own or were explicitly invited to");
  throw new Error("Access denied - No workspace membership found. Contact workspace owner for invitation.");
} 
