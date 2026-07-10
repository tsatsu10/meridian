/**
 * Get Audit Logs Controller
 * Retrieves workspace activity logs with filtering and pagination.
 *
 * NOTE: the `activities` table is task-scoped (id, taskId, userId, type,
 * content, metadata, createdAt) — there is no workspace/entity/ip metadata on
 * it. Workspace filtering goes through tasks -> projects, "action" maps to
 * activities.type, and every row's entityType is "task". A previous revision
 * queried columns that never existed and could not return data.
 */

import { eq, and, gte, lte, desc, like, or, sql } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { activityTable, userTable, taskTable, projectTable } from "../../database/schema";

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

function buildWorkspaceConditions(
  workspaceId: string,
  filters: Pick<AuditLogFilters, "startDate" | "endDate" | "userEmail" | "action" | "searchTerm">
) {
  const conditions = [eq(projectTable.workspaceId, workspaceId)];

  if (filters.startDate) {
    conditions.push(gte(activityTable.createdAt, new Date(filters.startDate)));
  }
  if (filters.endDate) {
    conditions.push(lte(activityTable.createdAt, new Date(filters.endDate)));
  }
  if (filters.userEmail) {
    conditions.push(eq(userTable.email, filters.userEmail));
  }
  if (filters.action) {
    conditions.push(eq(activityTable.type, filters.action));
  }
  if (filters.searchTerm) {
    const search = or(
      like(activityTable.type, `%${filters.searchTerm}%`),
      like(taskTable.title, `%${filters.searchTerm}%`)
    );
    if (search) {
      conditions.push(search);
    }
  }

  return conditions;
}

export default async function getAuditLogs(
  workspaceId: string,
  filters: AuditLogFilters = {}
): Promise<AuditLogsResponse> {
  const db = getDatabase();

  const { entityType, page = 1, pageSize = 50 } = filters;
  const offset = (page - 1) * pageSize;

  // All activity rows are task activities; any other entity filter has no data
  if (entityType && entityType !== "task") {
    return { logs: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const whereConditions = buildWorkspaceConditions(workspaceId, filters);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(activityTable)
    .innerJoin(taskTable, eq(activityTable.taskId, taskTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .leftJoin(userTable, eq(activityTable.userId, userTable.id))
    .where(and(...whereConditions));

  const total = Number(countResult?.count || 0);

  // Get paginated logs with user information
  const rows = await db
    .select({
      id: activityTable.id,
      userEmail: userTable.email,
      userName: userTable.name,
      action: activityTable.type,
      entityId: activityTable.taskId,
      entityName: taskTable.title,
      changes: activityTable.content,
      metadata: activityTable.metadata,
      timestamp: activityTable.createdAt,
    })
    .from(activityTable)
    .innerJoin(taskTable, eq(activityTable.taskId, taskTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .leftJoin(userTable, eq(activityTable.userId, userTable.id))
    .where(and(...whereConditions))
    .orderBy(desc(activityTable.createdAt))
    .limit(pageSize)
    .offset(offset);

  const logs: AuditLog[] = rows.map((row) => ({
    id: row.id,
    userEmail: row.userEmail ?? "unknown",
    userName: row.userName ?? row.userEmail ?? "Unknown User",
    action: row.action,
    entityType: "task",
    entityId: row.entityId,
    entityName: row.entityName ?? null,
    changes: row.changes,
    metadata: row.metadata,
    // Not captured by the activities schema
    ipAddress: null,
    userAgent: null,
    timestamp: row.timestamp,
  }));

  const totalPages = Math.ceil(total / pageSize);

  return {
    logs,
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

  const whereConditions = buildWorkspaceConditions(workspaceId, { startDate, endDate });

  const baseQuery = () =>
    db
      .select({
        type: activityTable.type,
        userEmail: userTable.email,
        createdAt: activityTable.createdAt,
      })
      .from(activityTable)
      .innerJoin(taskTable, eq(activityTable.taskId, taskTable.id))
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .leftJoin(userTable, eq(activityTable.userId, userTable.id))
      .where(and(...whereConditions));

  const rows = await baseQuery();

  const totalActions = rows.length;

  const actionsByType: Record<string, number> = {};
  const actionsByUser: Record<string, number> = {};
  const actionsOverTime: Record<string, number> = {};

  for (const row of rows) {
    actionsByType[row.type] = (actionsByType[row.type] ?? 0) + 1;
    const email = row.userEmail ?? "unknown";
    actionsByUser[email] = (actionsByUser[email] ?? 0) + 1;
    const date = row.createdAt.toISOString().slice(0, 10);
    actionsOverTime[date] = (actionsOverTime[date] ?? 0) + 1;
  }

  return {
    totalActions,
    actionsByType,
    actionsByUser,
    // All activity rows are task activities in this schema
    actionsByEntity: totalActions > 0 ? { task: totalActions } : {},
    actionsOverTime: Object.entries(actionsOverTime)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count })),
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

  // Get unique actions (activity types)
  const actionResults = await db
    .selectDistinct({ action: activityTable.type })
    .from(activityTable)
    .innerJoin(taskTable, eq(activityTable.taskId, taskTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(projectTable.workspaceId, workspaceId));

  const actions = actionResults.map((r) => r.action).filter(Boolean);

  // Get unique users
  const userResults = await db
    .selectDistinct({
      email: userTable.email,
      name: userTable.name,
    })
    .from(activityTable)
    .innerJoin(taskTable, eq(activityTable.taskId, taskTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .innerJoin(userTable, eq(activityTable.userId, userTable.id))
    .where(eq(projectTable.workspaceId, workspaceId));

  const users = userResults
    .filter((r) => r.email)
    .map((r) => ({ email: r.email, name: r.name || r.email }));

  return {
    actions,
    // All activity rows are task activities in this schema
    entityTypes: ["task"],
    users
  };
}
