/**
 * Project & Task Search Controller
 * 
 * Handles full-text search across projects and tasks with fuzzy matching
 * Supports filtering, ranking, and real-time results
 * 
 * @category Search
 */

import { eq, and, or, ilike, inArray } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { projects, tasks, users } from "../../database/schema";
import { FuzzyMatcher, searchMultiField } from "../fuzzy-matcher";

export interface SearchableProject {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  ownerId: string;
}

export interface SearchableTask {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  projectId: string;
}

export interface SearchResponse {
  projects: Array<SearchableProject & { score: number }>;
  tasks: Array<SearchableTask & { score: number }>;
  totalResults: number;
  queryTime: number;
}

/**
 * Search projects by name and description with fuzzy matching
 */
export async function searchProjects(
  workspaceId: string,
  query: string,
  options?: {
    limit?: number;
    minScore?: number;
    status?: string[];
    priority?: string[];
  }
): Promise<Array<SearchableProject & { score: number }>> {
  const db = getDatabase();
  const limit = options?.limit ?? 50;
  const minScore = options?.minScore ?? 0.5;

  // Get all projects for workspace
  let projectsData = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        eq(projects.isArchived, false)
      )
    );

  // Apply status filter if provided
  if (options?.status && options.status.length > 0) {
    projectsData = projectsData.filter((p) =>
      p.status && options.status!.includes(p.status)
    );
  }

  // Apply priority filter if provided
  if (options?.priority && options.priority.length > 0) {
    projectsData = projectsData.filter((p) =>
      p.priority && options.priority!.includes(p.priority)
    );
  }

  // Perform fuzzy search across name and description
  const searchResults = searchMultiField(projectsData, query, ["name", "description"], {
    threshold: minScore,
    limit,
    boost: {
      name: 1.5,        // Name matches weighted higher
      description: 0.8, // Description matches weighted lower
    },
  });

  return searchResults.results.map((result) => ({
    ...result.item,
    score: result.score,
  }));
}

/**
 * Search tasks by title and description with fuzzy matching
 */
export async function searchTasks(
  projectId: string,
  query: string,
  options?: {
    limit?: number;
    minScore?: number;
    status?: string[];
    priority?: string[];
    assigneeId?: string;
  }
): Promise<Array<SearchableTask & { score: number }>> {
  const db = getDatabase();
  const limit = options?.limit ?? 50;
  const minScore = options?.minScore ?? 0.5;

  // Get all tasks for project
  let tasksData = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  // Apply status filter if provided
  if (options?.status && options.status.length > 0) {
    tasksData = tasksData.filter((t) =>
      t.status && options.status!.includes(t.status)
    );
  }

  // Apply priority filter if provided
  if (options?.priority && options.priority.length > 0) {
    tasksData = tasksData.filter((t) =>
      t.priority && options.priority!.includes(t.priority)
    );
  }

  // Apply assignee filter if provided
  if (options?.assigneeId) {
    tasksData = tasksData.filter((t) => t.assigneeId === options.assigneeId);
  }

  // Perform fuzzy search across title and description
  const searchResults = searchMultiField(tasksData, query, ["title", "description"], {
    threshold: minScore,
    limit,
    boost: {
      title: 1.8,        // Title matches heavily weighted
      description: 0.6,  // Description matches lightly weighted
    },
  });

  return searchResults.results.map((result) => ({
    ...result.item,
    score: result.score,
  }));
}

/**
 * Perform combined search across projects and tasks
 */
export async function searchWorkspace(
  workspaceId: string,
  query: string,
  options?: {
    limit?: number;
    minScore?: number;
    doSearchProjects?: boolean;
    doSearchTasks?: boolean;
    projectId?: string;
  }
): Promise<SearchResponse> {
  const db = getDatabase();
  const startTime = performance.now();
  const limit = options?.limit ?? 30;
  const doSearchProjects = options?.doSearchProjects !== false;
  const doSearchTasks = options?.doSearchTasks !== false;

  const results: SearchResponse = {
    projects: [],
    tasks: [],
    totalResults: 0,
    queryTime: 0,
  };

  // Search projects if enabled
  if (doSearchProjects) {
    results.projects = await searchProjects(workspaceId, query, {
      limit: Math.ceil(limit / 2),
      minScore: options?.minScore,
    });
  }

  // Search tasks if enabled
  if (doSearchTasks) {
    if (options?.projectId) {
      // Search specific project only
      results.tasks = await searchTasks(options.projectId, query, {
        limit: Math.ceil(limit / 2),
        minScore: options?.minScore,
      });
    } else {
      // Search all projects in workspace
      const projectList = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.workspaceId, workspaceId),
            eq(projects.isArchived, false)
          )
        );

      const allTasks: Array<SearchableTask & { score: number }> = [];
      for (const project of projectList) {
        const projectTasks = await searchTasks(project.id, query, {
          limit,
          minScore: options?.minScore,
        });
        allTasks.push(...projectTasks);
      }

      // Sort all tasks by score and limit
      results.tasks = allTasks
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.ceil(limit / 2));
    }
  }

  results.totalResults = results.projects.length + results.tasks.length;
  results.queryTime = performance.now() - startTime;

  return results;
}

/**
 * Get search suggestions for autocomplete
 */
export async function getSearchSuggestions(
  workspaceId: string,
  query: string,
  limit: number = 10
): Promise<{
  projects: string[];
  tasks: string[];
}> {
  const db = getDatabase();
  const matcher = new FuzzyMatcher(query);
  const threshold = 0.5;

  // Get project name suggestions
  const projectData = await db
    .select({ name: projects.name })
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        eq(projects.isArchived, false)
      )
    )
    .limit(100);

  const projectSuggestions = projectData
    .filter((p) => matcher.isMatch(p.name, threshold))
    .map((p) => p.name)
    .slice(0, limit);

  // Get task title suggestions
  const taskData = await db
    .select({ title: tasks.title })
    .from(tasks)
    .where(
      and(
        inArray(
          tasks.projectId,
          db
            .select({ id: projects.id })
            .from(projects)
            .where(
              and(
                eq(projects.workspaceId, workspaceId),
                eq(projects.isArchived, false)
              )
            )
        ),
      )
    )
    .limit(100);

  const taskSuggestions = taskData
    .filter((t) => matcher.isMatch(t.title, threshold))
    .map((t) => t.title)
    .slice(0, limit);

  return {
    projects: projectSuggestions,
    tasks: taskSuggestions,
  };
}

