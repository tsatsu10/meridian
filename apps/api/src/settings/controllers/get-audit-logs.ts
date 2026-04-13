/**
 * Get Audit Logs Controller
 * Retrieves workspace activity logs with filtering and pagination
 */

import { eq, and, gte, lte, desc, like, or, sql } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { activityTable, userTable } from "../../database/schema";

export interface AuditLog {
  id: string;
  userEmail: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  changes: any;
  metadata: any;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
}

export interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  userEmail?: string;
  action?: string;
  entityType?: string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default async function getAuditLogs(
  workspaceId: string,
  filters: AuditLogFilters = {}
): Promise<AuditLogsResponse> {
  const db = getDatabase();
  
  const {
    startDate,
    endDate,
    userEmail,
    action,
    entityType,
    searchTerm,
    page = 1,
    pageSize = 50
  } = filters;
  
  const offset = (page - 1) * pageSize;
  
  // Build where conditions
  const whereConditions: any[] = [
    eq(activityTable.workspaceId, workspaceId)
  ];
  
  if (startDate) {
    whereConditions.push(gte(activityTable.createdAt, new Date(startDate)));
  }
  
  if (endDate) {
    whereConditions.push(lte(activityTable.createdAt, new Date(endDate)));
  }
  
  if (userEmail) {
    whereConditions.push(eq(activityTable.userEmail, userEmail));
  }
  
  if (action) {
    whereConditions.push(eq(activityTable.action, action));
  }
  
  if (entityType) {
    whereConditions.push(eq(activityTable.entityType, entityType));
  }
  
  if (searchTerm) {
    whereConditions.push(
      or(
        like(activityTable.action, `%${searchTerm}%`),
        like(activityTable.entityType, `%${searchTerm}%`),
        like(activityTable.entityName, `%${searchTerm}%`)
      )
    );
  }
  
  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(activityTable)
    .where(and(...whereConditions));
  
  const total = Number(countResult?.count || 0);
  
  // Get paginated logs with user information
  const logs = await db
    .select({
      id: activityTable.id,
      userEmail: activityTable.userEmail,
      userName: userTable.name,
      action: activityTable.action,
      entityType: activityTable.entityType,
      entityId: activityTable.entityId,
      entityName: activityTable.entityName,
      changes: activityTable.changes,
      metadata: activityTable.metadata,
      ipAddress: activityTable.ipAddress,
      userAgent: activityTable.userAgent,
      timestamp: activityTable.createdAt,
    })
    .from(activityTable)
    .leftJoin(userTable, eq(activityTable.userEmail, userTable.email))
    .where(and(...whereConditions))
    .orderBy(desc(activityTable.createdAt))
    .limit(pageSize)
    .offset(offset);
  
  const totalPages = Math.ceil(total / pageSize);
  
  return {
    logs: logs as AuditLog[],
    total,
    page,
    pageSize,
    totalPages
  };
}

// Get audit log statistics
export async function getAuditStats(
  workspaceId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByUser: Record<string, number>;
  actionsByEntity: Record<string, number>;
  actionsOverTime: Array<{ date: string; count: number }>;
}> {
  const db = getDatabase();
  
  const whereConditions: any[] = [
    eq(activityTable.workspaceId, workspaceId)
  ];
  
  if (startDate) {
    whereConditions.push(gte(activityTable.createdAt, new Date(startDate)));
  }
  
  if (endDate) {
    whereConditions.push(lte(activityTable.createdAt, new Date(endDate)));
  }
  
  // Get total actions
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(activityTable)
    .where(and(...whereConditions));
  
  const totalActions = Number(totalResult?.count || 0);
  
  // Get actions by type
  const actionTypeResults = await db
    .select({
      action: activityTable.action,
      count: sql<number>`count(*)`
    })
    .from(activityTable)
    .where(and(...whereConditions))
    .groupBy(activityTable.action);
  
  const actionsByType: Record<string, number> = {};
  actionTypeResults.forEach(result => {
    actionsByType[result.action] = Number(result.count);
  });
  
  // Get actions by user
  const userResults = await db
    .select({
      userEmail: activityTable.userEmail,
      count: sql<number>`count(*)`
    })
    .from(activityTable)
    .where(and(...whereConditions))
    .groupBy(activityTable.userEmail);
  
  const actionsByUser: Record<string, number> = {};
  userResults.forEach(result => {
    actionsByUser[result.userEmail] = Number(result.count);
  });
  
  // Get actions by entity type
  const entityResults = await db
    .select({
      entityType: activityTable.entityType,
      count: sql<number>`count(*)`
    })
    .from(activityTable)
    .where(and(...whereConditions))
    .groupBy(activityTable.entityType);
  
  const actionsByEntity: Record<string, number> = {};
  entityResults.forEach(result => {
    actionsByEntity[result.entityType] = Number(result.count);
  });
  
  // Get actions over time (daily)
  const timeResults = await db
    .select({
      date: sql<string>`DATE(${activityTable.createdAt})`,
      count: sql<number>`count(*)`
    })
    .from(activityTable)
    .where(and(...whereConditions))
    .groupBy(sql`DATE(${activityTable.createdAt})`)
    .orderBy(sql`DATE(${activityTable.createdAt})`);
  
  const actionsOverTime = timeResults.map(result => ({
    date: result.date,
    count: Number(result.count)
  }));
  
  return {
    totalActions,
    actionsByType,
    actionsByUser,
    actionsByEntity,
    actionsOverTime
  };
}

// Get available filter options
export async function getAuditFilterOptions(
  workspaceId: string
): Promise<{
  actions: string[];
  entityTypes: string[];
  users: Array<{ email: string; name: string }>;
}> {
  const db = getDatabase();
  
  // Get unique actions
  const actionResults = await db
    .selectDistinct({ action: activityTable.action })
    .from(activityTable)
    .where(eq(activityTable.workspaceId, workspaceId));
  
  const actions = actionResults.map(r => r.action).filter(Boolean);
  
  // Get unique entity types
  const entityResults = await db
    .selectDistinct({ entityType: activityTable.entityType })
    .from(activityTable)
    .where(eq(activityTable.workspaceId, workspaceId));
  
  const entityTypes = entityResults.map(r => r.entityType).filter(Boolean);
  
  // Get unique users
  const userResults = await db
    .selectDistinct({
      email: activityTable.userEmail,
      name: userTable.name
    })
    .from(activityTable)
    .leftJoin(userTable, eq(activityTable.userEmail, userTable.email))
    .where(eq(activityTable.workspaceId, workspaceId));
  
  const users = userResults
    .filter(r => r.email)
    .map(r => ({ email: r.email!, name: r.name || r.email! }));
  
  return {
    actions,
    entityTypes,
    users
  };
}


