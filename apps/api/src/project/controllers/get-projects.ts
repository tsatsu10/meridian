import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import {
  projectTable,
  workspaceTable,
  statusColumnTable,
  taskTable,
  workspaceUserTable,
  userTable,
  projectMembers,
} from "../../database/schema";
import logger from "../../utils/logger";

export type GetProjectsSortBy =
  | "name"
  | "status"
  | "priority"
  | "dueDate"
  | "progress";

export interface GetProjectsOptions {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  archivedOnly?: boolean;
  q?: string;
  status?: string[];
  priority?: string[];
  ownerIds?: string[];
  teamMemberIds?: string[];
  sortBy?: GetProjectsSortBy;
  sortOrder?: "asc" | "desc";
}

async function getProjects(workspaceId: string, options?: GetProjectsOptions) {
  const limit = options?.limit;
  const offset = options?.offset || 0;
  const includeArchived = options?.includeArchived ?? false;
  const archivedOnly = options?.archivedOnly ?? false;
  const sortBy = options?.sortBy ?? "name";
  const sortOrder = options?.sortOrder ?? "asc";

  logger.debug("get-projects", {
    workspaceId,
    limit,
    offset,
    includeArchived,
    archivedOnly,
    sortBy,
    sortOrder,
  });

  const { initializeDatabase, getDatabase } = await import("../../database/connection");
  await initializeDatabase();
  const db = getDatabase();

  const whereConditions: SQL[] = [eq(projectTable.workspaceId, workspaceId)];

  if (archivedOnly) {
    whereConditions.push(eq(projectTable.isArchived, true));
  } else if (!includeArchived) {
    whereConditions.push(eq(projectTable.isArchived, false));
  }

  const q = options?.q?.trim();
  if (q) {
    const term = `%${q}%`;
    whereConditions.push(
      or(ilike(projectTable.name, term), ilike(projectTable.description, term))!,
    );
  }

  if (options?.status?.length) {
    whereConditions.push(inArray(projectTable.status, options.status));
  }
  if (options?.priority?.length) {
    whereConditions.push(inArray(projectTable.priority, options.priority));
  }
  if (options?.ownerIds?.length) {
    whereConditions.push(inArray(projectTable.ownerId, options.ownerIds));
  }
  if (options?.teamMemberIds?.length) {
    const ids = options.teamMemberIds;
    whereConditions.push(
      or(
        inArray(projectTable.ownerId, ids),
        sql`EXISTS (
          SELECT 1 FROM ${taskTable} t
          WHERE t.project_id = ${projectTable.id}
          AND t.assignee_id IN (${sql.join(
            ids.map((id) => sql`${id}`),
            sql`, `,
          )})
        )`,
        sql`EXISTS (
          SELECT 1 FROM ${projectMembers} pm
          INNER JOIN ${userTable} u ON pm.user_email = u.email
          WHERE pm.project_id = ${projectTable.id}
          AND u.id IN (${sql.join(
            ids.map((id) => sql`${id}`),
            sql`, `,
          )})
        )`,
      )!,
    );
  }
  const whereClause = and(...whereConditions);

  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(projectTable)
    .where(whereClause);

  const total = Number(totalResult[0]?.count || 0);

  const dir = sortOrder === "desc" ? desc : asc;
  const orderBy =
    sortBy === "name"
      ? [dir(projectTable.name)]
      : sortBy === "status"
        ? [dir(projectTable.status)]
        : sortBy === "priority"
          ? [dir(projectTable.priority)]
          : sortBy === "dueDate"
            ? [
                sql`CASE WHEN ${projectTable.dueDate} IS NULL THEN 1 ELSE 0 END`,
                dir(projectTable.dueDate),
                asc(projectTable.name),
              ]
            : sortBy === "progress"
              ? [
                  dir(
                    sql`(
        SELECT COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE t.status = 'done') / NULLIF(COUNT(t.id), 0)), 0)
        FROM ${taskTable} t WHERE t.project_id = ${projectTable.id}
      )`,
                  ),
                  asc(projectTable.name),
                ]
              : [asc(projectTable.name)];

  let query = db
    .select({
      id: projectTable.id,
      name: projectTable.name,
      description: projectTable.description,
      workspaceId: projectTable.workspaceId,
      ownerId: projectTable.ownerId,
      icon: projectTable.icon,
      slug: projectTable.slug,
      color: projectTable.color,
      status: projectTable.status,
      priority: projectTable.priority,
      startDate: projectTable.startDate,
      dueDate: projectTable.dueDate,
      completedAt: projectTable.completedAt,
      settings: projectTable.settings,
      isArchived: projectTable.isArchived,
      createdAt: projectTable.createdAt,
      updatedAt: projectTable.updatedAt,
      workspace: {
        id: workspaceTable.id,
        name: workspaceTable.name,
      },
    })
    .from(projectTable)
    .leftJoin(workspaceTable, eq(projectTable.workspaceId, workspaceTable.id))
    .where(whereClause)
    .orderBy(...orderBy);

  if (limit !== undefined) {
    query = query.limit(limit).offset(offset) as typeof query;
  }

  const projects = await query;

  const projectsWithData = await Promise.all(
    projects.map(async (project) => {
      const columns = await db
        .select()
        .from(statusColumnTable)
        .where(eq(statusColumnTable.projectId, project.id));

      const tasks = await db
        .select()
        .from(taskTable)
        .where(eq(taskTable.projectId, project.id));

      const workspaceMembers = await db
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
          avatar: userTable.avatar,
          role: workspaceUserTable.role,
        })
        .from(workspaceUserTable)
        .leftJoin(userTable, eq(workspaceUserTable.userId, userTable.id))
        .where(eq(workspaceUserTable.workspaceId, project.workspaceId));

      const owner = await db
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
          avatar: userTable.avatar,
        })
        .from(userTable)
        .where(eq(userTable.id, project.ownerId))
        .limit(1);

      const allMembers = [...workspaceMembers];
      if (owner.length > 0 && !workspaceMembers.find((m) => m.id === owner[0].id)) {
        allMembers.push({
          ...owner[0],
          role: "owner",
        });
      }

      const ownerName = owner[0]?.name ?? "Unknown";

      return {
        ...project,
        ownerName,
        columns: columns || [],
        tasks: tasks || [],
        members: allMembers || [],
        teamSize: allMembers.length,
        plannedTasks: [],
        archivedTasks: [],
      };
    }),
  );

  if (limit !== undefined) {
    const pages = Math.ceil(total / limit);
    return {
      projects: projectsWithData,
      pagination: {
        total,
        limit,
        offset,
        pages,
        currentPage: Math.floor(offset / limit) + 1,
      },
    };
  }

  return projectsWithData;
}

export default getProjects;
