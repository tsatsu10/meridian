// Global search API - searches tasks, projects, and users
import { Hono } from "hono";
import { getDatabase } from "../../database/connection";
import {
  taskTable,
  projectTable,
  users,
  workspaceUserTable,
} from "../../database/schema";
import { sql, ilike, or, and, eq, inArray } from "drizzle-orm";
import { auth } from "../../middlewares/auth";
import { checkWorkspacePermission } from "../../middlewares/rbac";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error-utils";

const search = new Hono();

// Apply authentication middleware
search.use("*", auth);

/**
 * Global search endpoint
 * Searches across tasks, projects, and users.
 *
 * Query Parameters:
 * - q: Search query string (required)
 * - workspaceId: Workspace ID to scope the search (optional)
 * - type: Filter by result type (optional: 'task' | 'project' | 'user' | 'all')
 * - limit: Max results per type (optional, default: 10)
 */
search.get("/", async (c) => {
  try {
    const query = c.req.query("q");
    const workspaceId = c.req.query("workspaceId");
    const type = c.req.query("type");
    const limit = Number.parseInt(c.req.query("limit") || "10", 10);
    const userEmail = c.get("userEmail");

    if (!query || query.trim() === "") {
      return c.json({ error: "Search query is required" }, 400);
    }

    if (!userEmail) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // SECURITY: workspaceId was optional and, even when supplied, task
    // results were never filtered by it at all — any authenticated user
    // could search task/project titles and other users' name+email across
    // every workspace in the system, not just their own.
    if (!workspaceId) {
      return c.json({ error: "workspaceId is required" }, 400);
    }
    const permission = await checkWorkspacePermission(
      userEmail,
      workspaceId,
      "canViewProjects",
    );
    if (!permission.allowed) {
      return c.json(permission.body ?? { error: "Forbidden" }, permission.status ?? 403);
    }

    const db = getDatabase();
    const results: Array<{
      title?: string | null;
      createdAt?: string | Date | null;
      [key: string]: unknown;
    }> = [];
    const searchPattern = `%${query}%`;
    const wantsType = (t: string) => !type || type === "all" || type === t;
    // A project-manager/-viewer restricted to specific projects must not
    // see search results outside those projects, even though they have
    // workspace-level search permission — same boundary bulk task
    // operations enforce (see verifyTasksBelongToWorkspace).
    const restrictedToProjectIds = permission.restrictedToProjectIds;

    // Search tasks — scoped via a join to the owning project's workspace
    if (wantsType("task")) {
      try {
        const taskResults = await db
          .select({
            id: taskTable.id,
            type: sql<string>`'task'`,
            title: taskTable.title,
            description: taskTable.description,
            projectId: taskTable.projectId,
            status: taskTable.status,
            priority: taskTable.priority,
            createdAt: taskTable.createdAt,
          })
          .from(taskTable)
          .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
          .where(
            and(
              eq(projectTable.workspaceId, workspaceId),
              restrictedToProjectIds
                ? inArray(taskTable.projectId, restrictedToProjectIds)
                : undefined,
              or(
                ilike(taskTable.title, searchPattern),
                ilike(taskTable.description, searchPattern),
              ),
            ),
          )
          .orderBy(sql`${taskTable.createdAt} DESC`)
          .limit(limit);

        results.push(...taskResults);
      } catch (error) {
        logger.error("Error searching tasks:", error);
      }
    }

    // Search projects
    if (wantsType("project") || type === "projects") {
      try {
        const projectResults = await db
          .select({
            id: projectTable.id,
            type: sql<string>`'project'`,
            title: projectTable.name,
            description: projectTable.description,
            workspaceId: projectTable.workspaceId,
            createdAt: projectTable.createdAt,
          })
          .from(projectTable)
          .where(
            and(
              eq(projectTable.workspaceId, workspaceId),
              restrictedToProjectIds
                ? inArray(projectTable.id, restrictedToProjectIds)
                : undefined,
              or(
                ilike(projectTable.name, searchPattern),
                ilike(projectTable.description, searchPattern),
              ),
            ),
          )
          .orderBy(sql`${projectTable.name} ASC`)
          .limit(limit);

        results.push(...projectResults);
      } catch (error) {
        logger.error("Error searching projects:", error);
      }
    }

    // Search users — only within the same workspace
    if (wantsType("user")) {
      try {
        const userResults = await db
          .select({
            id: users.id,
            type: sql<string>`'user'`,
            title: users.name,
            description: users.email,
            createdAt: users.createdAt,
          })
          .from(users)
          .innerJoin(
            workspaceUserTable,
            eq(users.email, workspaceUserTable.userEmail),
          )
          .where(
            and(
              eq(workspaceUserTable.workspaceId, workspaceId),
              or(
                ilike(users.name, searchPattern),
                ilike(users.email, searchPattern),
              ),
            ),
          )
          .limit(limit);

        results.push(...userResults);
      } catch (error) {
        logger.error("Error searching users:", error);
      }
    }

    // Exact-title matches first, then newest first
    const queryLower = query.toLowerCase();
    const sortedResults = results.sort((a, b) => {
      const aExact = a.title?.toLowerCase() === queryLower ? 1 : 0;
      const bExact = b.title?.toLowerCase() === queryLower ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;

      if (a.createdAt && b.createdAt) {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }

      return 0;
    });

    return c.json(
      {
        results: sortedResults,
        query,
        totalResults: sortedResults.length,
        workspaceId: workspaceId || null,
      },
      200,
    );
  } catch (error) {
    logger.error("Search API error:", error);
    return c.json(
      {
        error: "Failed to perform search",
        message: getErrorMessage(error),
      },
      500,
    );
  }
});

/**
 * Search suggestions endpoint
 *
 * Query Parameters:
 * - q: Search query string (required)
 * - type: 'projects' | 'tasks' (optional, default: 'projects')
 * - limit: Max suggestions (optional, default: 5)
 */
search.get("/suggestions", async (c) => {
  try {
    const query = c.req.query("q");
    const type = c.req.query("type") || "projects";
    const limit = Number.parseInt(c.req.query("limit") || "5", 10);
    const workspaceId = c.req.query("workspaceId");
    const userEmail = c.get("userEmail");

    if (!query || query.trim() === "") {
      return c.json({ suggestions: [] }, 200);
    }

    // SECURITY: previously unscoped — leaked task/project titles across
    // every workspace to any authenticated caller.
    if (!workspaceId) {
      return c.json({ error: "workspaceId is required" }, 400);
    }
    const permission = await checkWorkspacePermission(
      userEmail,
      workspaceId,
      "canViewProjects",
    );
    if (!permission.allowed) {
      return c.json(permission.body ?? { error: "Forbidden" }, permission.status ?? 403);
    }

    const db = getDatabase();
    const searchPattern = `%${query}%`;
    const suggestions: string[] = [];
    const restrictedToProjectIds = permission.restrictedToProjectIds;

    if (type === "tasks") {
      const tasks = await db
        .select({ title: taskTable.title })
        .from(taskTable)
        .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
        .where(
          and(
            eq(projectTable.workspaceId, workspaceId),
            restrictedToProjectIds
              ? inArray(taskTable.projectId, restrictedToProjectIds)
              : undefined,
            ilike(taskTable.title, searchPattern),
          ),
        )
        .limit(limit);
      suggestions.push(...tasks.map((t) => t.title));
    } else {
      const projects = await db
        .select({ name: projectTable.name })
        .from(projectTable)
        .where(
          and(
            eq(projectTable.workspaceId, workspaceId),
            restrictedToProjectIds
              ? inArray(projectTable.id, restrictedToProjectIds)
              : undefined,
            ilike(projectTable.name, searchPattern),
          ),
        )
        .limit(limit);
      suggestions.push(...projects.map((p) => p.name));
    }

    return c.json(
      { suggestions: [...new Set(suggestions)].slice(0, limit) },
      200,
    );
  } catch (error) {
    logger.error("Search suggestions error:", error);
    return c.json({ suggestions: [] }, 200);
  }
});

export default search;
