// Global search API - searches tasks, projects, and users
import { Hono } from "hono";
import { getDatabase } from "../../database/connection";
import {
  taskTable,
  projectTable,
  users,
  workspaceUserTable,
} from "../../database/schema";
import { sql, ilike, or, and, eq } from "drizzle-orm";
import { auth } from "../../middlewares/auth";
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

    const db = getDatabase();
    const results: Array<{
      title?: string | null;
      createdAt?: string | Date | null;
      [key: string]: unknown;
    }> = [];
    const searchPattern = `%${query}%`;
    const wantsType = (t: string) => !type || type === "all" || type === t;

    // Search tasks
    if (wantsType("task")) {
      try {
        const taskWhere = [
          or(
            ilike(taskTable.title, searchPattern),
            ilike(taskTable.description, searchPattern),
          ),
        ];

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
          .where(and(...taskWhere))
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
        const projectWhere = [
          or(
            ilike(projectTable.name, searchPattern),
            ilike(projectTable.description, searchPattern),
          ),
        ];

        if (workspaceId) {
          projectWhere.push(eq(projectTable.workspaceId, workspaceId));
        }

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
          .where(and(...projectWhere))
          .orderBy(sql`${projectTable.name} ASC`)
          .limit(limit);

        results.push(...projectResults);
      } catch (error) {
        logger.error("Error searching projects:", error);
      }
    }

    // Search users
    if (wantsType("user")) {
      try {
        const userResults = workspaceId
          ? await db
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
              .limit(limit)
          : await db
              .select({
                id: users.id,
                type: sql<string>`'user'`,
                title: users.name,
                description: users.email,
                createdAt: users.createdAt,
              })
              .from(users)
              .where(
                or(
                  ilike(users.name, searchPattern),
                  ilike(users.email, searchPattern),
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

    if (!query || query.trim() === "") {
      return c.json({ suggestions: [] }, 200);
    }

    const db = getDatabase();
    const searchPattern = `%${query}%`;
    const suggestions: string[] = [];

    if (type === "tasks") {
      const tasks = await db
        .select({ title: taskTable.title })
        .from(taskTable)
        .where(ilike(taskTable.title, searchPattern))
        .limit(limit);
      suggestions.push(...tasks.map((t) => t.title));
    } else {
      const projects = await db
        .select({ name: projectTable.name })
        .from(projectTable)
        .where(ilike(projectTable.name, searchPattern))
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
