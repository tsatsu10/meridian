/**
 * Consolidated Database Helper Functions
 * Common database operations and query builders
 */

import { eq, and, or, like, gte, lte, sql } from 'drizzle-orm';
import { getDatabase } from '../database/connection';
import { userTable, workspaceTable, projectTable, taskTable, workspaceUserTable } from '../database/schema';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Apply pagination to query results
 */
export function applyPagination<T>(
  data: T[],
  total: number,
  options: PaginationOptions = {}
): PaginationResult<T> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 10));
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Check if user exists and return user data
 */
export async function getUserByEmail(email: string) {
  const db = await getDatabase();
  const users = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);
  
  return users[0] || null;
}

/**
 * Check if user has access to workspace
 */
export async function checkWorkspaceAccess(userEmail: string, workspaceId: string): Promise<boolean> {
  const db = getDatabase();
  
  // First get the user ID from email
  const user = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, userEmail))
    .limit(1);
    
  if (user.length === 0) return false;
  
  const access = await db
    .select()
    .from(workspaceUserTable)
    .where(
      and(
        eq(workspaceUserTable.userId, user[0].id),
        eq(workspaceUserTable.workspaceId, workspaceId)
      )
    )
    .limit(1);
  
  return access.length > 0;
}

/**
 * Check if user has access to project
 */
export async function checkProjectAccess(userEmail: string, projectId: string): Promise<boolean> {
  const db = await getDatabase();
  const projectAccess = await db
    .select({
      workspaceId: projectTable.workspaceId,
    })
    .from(projectTable)
    .where(eq(projectTable.id, projectId))
    .limit(1);
  
  if (!projectAccess.length) return false;
  
  return checkWorkspaceAccess(userEmail, projectAccess[0]!.workspaceId);
}

/**
 * Get workspace details with user role
 */
export async function getWorkspaceWithUserRole(workspaceId: string, userEmail: string) {
  const db = getDatabase();
  
  // First get the user ID from email
  const user = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, userEmail))
    .limit(1);
    
  if (user.length === 0) return null;
  
  const result = await db
    .select({
      workspace: workspaceTable,
      userRole: workspaceUserTable.role,
    })
    .from(workspaceTable)
    .leftJoin(
      workspaceUserTable,
      and(
        eq(workspaceUserTable.workspaceId, workspaceTable.id),
        eq(workspaceUserTable.userId, user[0].id)
      )
    )
    .where(eq(workspaceTable.id, workspaceId))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Get next task number for a project
 */
export async function getNextTaskNumber(projectId: string): Promise<number> {
  const db = await getDatabase();
  const result = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(taskTable)
    .where(eq(taskTable.projectId, projectId));
  
  const taskCount = result[0]?.count || 0;
  return taskCount + 1;
}

/**
 * Build search conditions for text fields
 */
export function buildSearchConditions(searchTerm: string, fields: any[]) {
  if (!searchTerm?.trim()) return undefined;
  
  const term = `%${searchTerm.trim()}%`;
  return or(...fields.map(field => like(field, term)));
}

/**
 * Build date range conditions
 */
export function buildDateRangeConditions(
  field: any,
  startDate?: Date,
  endDate?: Date
) {
  const conditions = [];
  
  if (startDate) {
    conditions.push(gte(field, startDate));
  }
  
  if (endDate) {
    conditions.push(lte(field, endDate));
  }
  
  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Get task counts by status for a project
 */
export async function getTaskCountsByStatus(projectId: string) {
  const db = await getDatabase();
  const result = await db
    .select({
      status: taskTable.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(taskTable)
    .where(eq(taskTable.projectId, projectId))
    .groupBy(taskTable.status);
  
  const counts: Record<string, number> = {};
  result.forEach(row => {
    if (row.status) {
      counts[row.status] = row.count;
    }
  });
  
  return counts;
}

/**
 * Soft delete helper (if needed in future)
 */
export function buildSoftDeleteCondition(deletedAtField: any, includeDeleted: boolean = false) {
  return includeDeleted ? undefined : eq(deletedAtField, null);
}

