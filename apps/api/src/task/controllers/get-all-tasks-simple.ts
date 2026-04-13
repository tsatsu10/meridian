import { and, eq, desc, or, sql } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { projectTable, taskTable, userTable } from "../../database/schema";
import logger from '../../utils/logger';

interface GetAllTasksOptions {
  workspaceId: string;
  search?: string;
  limit?: number;
  offset?: number;
}

async function getAllTasksSimple(options: GetAllTasksOptions) {
  const db = getDatabase();
  const {
    workspaceId,
    search,
    limit = 50,
    offset = 0,
  } = options;

  logger.debug("🔍 getAllTasksSimple called with:", { workspaceId, search, limit, offset });

  const conditions = [eq(projectTable.workspaceId, workspaceId)];

  if (search) {
    conditions.push(
      or(
        sql`${taskTable.title} ILIKE ${'%' + search + '%'}`,
        sql`${taskTable.description} ILIKE ${'%' + search + '%'}`
      )!
    );
  }

  // Get count first
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(and(...conditions));

  const count = countResult[0]?.count || 0;

  logger.debug(`📊 Found ${count} tasks`);

  // Get tasks with simplified select to avoid missing columns
  const tasks = await db
    .select({
      id: taskTable.id,
      title: taskTable.title,
      description: taskTable.description,
      status: taskTable.status,
      priority: taskTable.priority,
      createdAt: taskTable.createdAt,
      updatedAt: taskTable.updatedAt,
      dueDate: taskTable.dueDate,
      projectId: taskTable.projectId,
      assigneeId: taskTable.assigneeId,
      createdBy: taskTable.createdBy,
      project: {
        id: projectTable.id,
        name: projectTable.name,
        slug: projectTable.slug,
      },
      assignee: {
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
      },
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .leftJoin(userTable, eq(taskTable.assigneeId, userTable.id))
    .where(and(...conditions))
    .orderBy(desc(taskTable.createdAt))
    .limit(limit)
    .offset(offset);

  logger.debug(`✅ Retrieved ${tasks.length} tasks`);

  // Simplified status columns - just return basic statuses
  const statusColumns = [
    { id: "todo", name: "To Do", color: "#6366f1", position: 0 },
    { id: "in_progress", name: "In Progress", color: "#f59e0b", position: 1 },
    { id: "done", name: "Done", color: "#10b981", position: 2 },
  ];

  return {
    tasks,
    statusColumns,
    totalCount: count,
    hasMore: offset + limit < count,
  };
}

export default getAllTasksSimple;

