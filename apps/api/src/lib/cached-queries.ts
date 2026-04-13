/**
 * 🚀 Cached Database Queries
 * 
 * Wrapper functions for common database queries with Redis caching.
 * Automatically handles cache invalidation on updates.
 * 
 * @epic-infrastructure: Performance optimization
 */

import { getDatabase } from '../database/connection';
import { redisCache, CacheKeys, CacheTTL } from './redis-cache';
import { projectTable, taskTable, userTable, workspaceTable } from '../database/schema';
import { eq } from 'drizzle-orm';
import logger from '../utils/logger';

/**
 * Get project with caching
 */
export async function getCachedProject(projectId: string) {
  return redisCache.getOrSet(
    CacheKeys.project(projectId),
    async () => {
      const db = getDatabase();
      const projects = await db.query.projects.findFirst({
        where: eq(projectTable.id, projectId),
      });
      return projects;
    },
    CacheTTL.MEDIUM
  );
}

/**
 * Get projects for workspace with caching
 */
export async function getCachedProjects(workspaceId: string) {
  return redisCache.getOrSet(
    CacheKeys.projectList(workspaceId),
    async () => {
      const db = getDatabase();
      const projects = await db.query.projects.findMany({
        where: eq(projectTable.workspaceId, workspaceId),
      });
      return projects;
    },
    CacheTTL.SHORT // Projects change frequently
  );
}

/**
 * Get tasks for project with caching
 */
export async function getCachedTasks(projectId: string) {
  return redisCache.getOrSet(
    CacheKeys.taskList(projectId),
    async () => {
      const db = getDatabase();
      const tasks = await db.query.tasks.findMany({
        where: eq(taskTable.projectId, projectId),
      });
      return tasks;
    },
    CacheTTL.SHORT // Tasks change very frequently
  );
}

/**
 * Get user by ID with caching
 */
export async function getCachedUser(userId: string) {
  return redisCache.getOrSet(
    CacheKeys.user(userId),
    async () => {
      const db = getDatabase();
      const user = await db.query.users.findFirst({
        where: eq(userTable.id, userId),
      });
      return user;
    },
    CacheTTL.LONG // User data changes infrequently
  );
}

/**
 * Get user by email with caching
 */
export async function getCachedUserByEmail(email: string) {
  return redisCache.getOrSet(
    CacheKeys.userByEmail(email),
    async () => {
      const db = getDatabase();
      const user = await db.query.users.findFirst({
        where: eq(userTable.email, email),
      });
      return user;
    },
    CacheTTL.LONG
  );
}

/**
 * Get workspace with caching
 */
export async function getCachedWorkspace(workspaceId: string) {
  return redisCache.getOrSet(
    CacheKeys.workspace(workspaceId),
    async () => {
      const db = getDatabase();
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaceTable.id, workspaceId),
      });
      return workspace;
    },
    CacheTTL.MEDIUM
  );
}

/**
 * Invalidate cache after mutations
 */
export class CacheInvalidator {
  /**
   * Invalidate project-related caches
   */
  static async project(projectId: string, workspaceId?: string) {
    await redisCache.delete(CacheKeys.project(projectId));
    await redisCache.delete(CacheKeys.projectTasks(projectId));
    
    if (workspaceId) {
      await redisCache.delete(CacheKeys.projectList(workspaceId));
    }
    
    logger.debug(`Cache invalidated for project: ${projectId}`);
  }

  /**
   * Invalidate task-related caches
   */
  static async task(taskId: string, projectId: string) {
    await redisCache.delete(CacheKeys.task(taskId));
    await redisCache.delete(CacheKeys.taskList(projectId));
    await redisCache.delete(CacheKeys.projectTasks(projectId));
    
    logger.debug(`Cache invalidated for task: ${taskId}`);
  }

  /**
   * Invalidate user-related caches
   */
  static async user(userId: string, email?: string) {
    await redisCache.delete(CacheKeys.user(userId));
    
    if (email) {
      await redisCache.delete(CacheKeys.userByEmail(email));
    }
    
    // Invalidate workspace memberships
    await redisCache.invalidatePattern(cacheKey('workspace', '*', 'users'));
    
    logger.debug(`Cache invalidated for user: ${userId}`);
  }

  /**
   * Invalidate workspace-related caches
   */
  static async workspace(workspaceId: string) {
    await redisCache.delete(CacheKeys.workspace(workspaceId));
    await redisCache.delete(CacheKeys.workspaceUsers(workspaceId));
    await redisCache.delete(CacheKeys.projectList(workspaceId));
    
    logger.debug(`Cache invalidated for workspace: ${workspaceId}`);
  }

  /**
   * Invalidate all analytics caches
   */
  static async analytics() {
    await redisCache.invalidatePattern(cacheKey('analytics', '*'));
    logger.debug('All analytics caches invalidated');
  }

  /**
   * Clear all caches (use sparingly!)
   */
  static async clearAll() {
    await redisCache.clear();
    logger.warn('All caches cleared');
  }
}

/**
 * Middleware to track cache hits/misses
 */
export class CacheMetrics {
  private static hits = 0;
  private static misses = 0;
  private static errors = 0;

  static recordHit() {
    this.hits++;
  }

  static recordMiss() {
    this.misses++;
  }

  static recordError() {
    this.errors++;
  }

  static getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      total,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
    };
  }

  static reset() {
    this.hits = 0;
    this.misses = 0;
    this.errors = 0;
  }
}

export { redisCache, CacheInvalidator, CacheMetrics };

// Helper function
function cacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}



