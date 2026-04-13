import { and, eq, or, sql } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { projectTable, taskTable, userTable, workspaceUserTable } from "../../database/schema";

interface GetAllTasksOptions {
  workspaceId: string;
  userEmail?: string;
  status?: string[];
  priority?: string[];
  assignedToMe?: boolean;
  projectIds?: string[];
  dueAfter?: Date;
  dueBefore?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

async function getAllTasks({
  workspaceId,
  userEmail,
  status,
  priority,
  assignedToMe,
  projectIds,
  dueAfter,
  dueBefore,
  search,
  limit = 50,
  offset = 0,
}: GetAllTasksOptions) {
  const db = getDatabase();
  // Base query conditions
  const conditions = [eq(projectTable.workspaceId, workspaceId)];

  // Get user ID from email for filters
  let userId: string | undefined;
  if (userEmail) {
    const [user] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail));
    userId = user?.id;
  }

  // Add filters
  if (assignedToMe && userId) {
    conditions.push(eq(taskTable.assigneeId, userId)); // Use assigneeId instead of userEmail
  }

  if (status && status.length > 0) {
    conditions.push(
      or(...status.map((s) => eq(taskTable.status, s)))!
    );
  }

  if (priority && priority.length > 0) {
    conditions.push(
      or(...priority.map((p) => eq(taskTable.priority, p)))!
    );
  }

  if (projectIds && projectIds.length > 0) {
    conditions.push(
      or(...projectIds.map((id) => eq(taskTable.projectId, id)))!
    );
  }

  if (dueAfter) {
    conditions.push(sql`${taskTable.dueDate} >= ${dueAfter.toISOString()}`);
  }

  if (dueBefore) {
    conditions.push(sql`${taskTable.dueDate} <= ${dueBefore.toISOString()}`);
  }

  if (search) {
    conditions.push(
      or(
        sql`${taskTable.title} LIKE ${'%' + search + '%'}`,
        sql`${taskTable.description} LIKE ${'%' + search + '%'}`
      )!
    );
  }

  // Get total count for pagination
  const totalCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(and(...conditions));

  const totalCount = totalCountResult[0]?.count || 0;

  // Get tasks with assignee information
  const tasksRaw = await db
    .select({
      task: taskTable,
      project: projectTable,
      assignee: userTable,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .leftJoin(userTable, eq(taskTable.assigneeId, userTable.id)) // Add user join for assignee info
    .where(and(...conditions))
    .limit(limit)
    .offset(offset);

  // Transform to expected format with nested project object
  const tasks = tasksRaw.map(row => ({
    id: row.task.id,
    title: row.task.title,
    number: row.task.number,
    description: row.task.description,
    status: row.task.status,
    priority: row.task.priority,
    dueDate: row.task.dueDate,
    position: row.task.position,
    createdAt: row.task.createdAt,
    assigneeId: row.task.assigneeId, // Use assigneeId instead of userEmail
    assigneeName: row.assignee?.name || null, // Get from join
    assigneeEmail: row.assignee?.email || null, // Get from join
    projectId: row.task.projectId,
    parentTaskId: row.task.parentTaskId, // Use parentTaskId instead of parentId
    project: {
      id: row.project.id,
      name: row.project.name,
      slug: row.project.slug,
      icon: row.project.icon,
      workspaceId: row.project.workspaceId,
    },
  }));

  // Get projects for filter options
  const projects = await db
    .select({
      id: projectTable.id,
      name: projectTable.name,
      slug: projectTable.slug,
      icon: projectTable.icon,
    })
    .from(projectTable)
    .where(eq(projectTable.workspaceId, workspaceId));

  // TODO: Add custom status columns when statusColumnTable schema is created
  const projectsWithColumns = projects.map(project => ({
    ...project,
    columns: [], // Empty array until statusColumnTable is implemented
  }));

  // Get team members for filter options
  const teamMembers = await db
    .select({
      email: userTable.email,
      name: userTable.name,
    })
    .from(userTable)
    .innerJoin(workspaceUserTable, eq(workspaceUserTable.userEmail, userTable.email))
    .where(eq(workspaceUserTable.workspaceId, workspaceId));

  return {
    tasks,
    pagination: {
      total: totalCount,
      limit,
      offset,
      pages: Math.ceil(totalCount / limit),
      currentPage: Math.floor(offset / limit) + 1,
    },
    filters: {
      projects: projectsWithColumns,
      teamMembers,
      statuses: ["todo", "in_progress", "done"],
      priorities: ["low", "medium", "high", "urgent"],
    },
  };
}

export default getAllTasks; 
