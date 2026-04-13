/**
 * 🔴 Cache Invalidation Utilities
 * 
 * Centralized cache invalidation logic for maintaining data consistency
 * 
 * When to invalidate:
 * - Project updated → Invalidate project overview
 * - Task created/updated/deleted → Invalidate project overview
 * - Milestone created/updated/deleted → Invalidate project overview
 * - Project member added/removed → Invalidate project overview
 * - Project deleted → Invalidate all project caches
 */

import { deletePattern, CacheKeys } from './redis-client';
import logger from '../utils/logger';

/**
 * Invalidate all caches for a specific project
 */
export async function invalidateProjectCaches(projectId: string): Promise<void> {
  try {
    const deletedCount = await deletePattern(CacheKeys.allProjectCaches(projectId));
    if (deletedCount > 0) {
      logger.debug(`🔴 Cache invalidated: ${deletedCount} keys for project ${projectId}`);
    }
  } catch (error) {
    logger.error(`🔴 Failed to invalidate project caches for ${projectId}:`, error.message);
  }
}

/**
 * Invalidate all caches for a specific workspace
 */
export async function invalidateWorkspaceCaches(workspaceId: string): Promise<void> {
  try {
    const deletedCount = await deletePattern(CacheKeys.allWorkspaceCaches(workspaceId));
    if (deletedCount > 0) {
      logger.debug(`🔴 Cache invalidated: ${deletedCount} keys for workspace ${workspaceId}`);
    }
  } catch (error) {
    logger.error(`🔴 Failed to invalidate workspace caches for ${workspaceId}:`, error.message);
  }
}

/**
 * Invalidate specific project overview cache
 */
export async function invalidateProjectOverview(
  projectId: string,
  workspaceId: string
): Promise<void> {
  try {
    // Invalidate all variations of the overview cache (different query params)
    const pattern = `project-overview:id=${projectId}*workspace*=${workspaceId}*`;
    const deletedCount = await deletePattern(pattern);
    if (deletedCount > 0) {
      logger.debug(`🔴 Cache invalidated: Project overview for ${projectId}`);
    }
  } catch (error) {
    logger.error(`🔴 Failed to invalidate project overview for ${projectId}:`, error.message);
  }
}

/**
 * Batch invalidation for multiple projects
 */
export async function invalidateMultipleProjects(projectIds: string[]): Promise<void> {
  try {
    await Promise.all(projectIds.map(id => invalidateProjectCaches(id)));
    logger.debug(`🔴 Cache invalidated: ${projectIds.length} projects`);
  } catch (error) {
    logger.error(`🔴 Failed to batch invalidate projects:`, error.message);
  }
}

/**
 * Invalidation helpers for specific operations
 */
export const CacheInvalidation = {
  /**
   * Called when a project is updated
   */
  onProjectUpdate: async (projectId: string, workspaceId: string) => {
    await invalidateProjectOverview(projectId, workspaceId);
  },
  
  /**
   * Called when a project is deleted
   */
  onProjectDelete: async (projectId: string, workspaceId: string) => {
    await invalidateProjectCaches(projectId);
    await invalidateWorkspaceCaches(workspaceId);
  },
  
  /**
   * Called when a project is archived/restored
   */
  onProjectArchive: async (projectId: string, workspaceId: string) => {
    await invalidateProjectOverview(projectId, workspaceId);
    await invalidateWorkspaceCaches(workspaceId); // Workspace project lists
  },
  
  /**
   * Called when a task is created/updated/deleted
   */
  onTaskChange: async (projectId: string, workspaceId: string) => {
    await invalidateProjectOverview(projectId, workspaceId);
  },
  
  /**
   * Called when a milestone is created/updated/deleted
   */
  onMilestoneChange: async (projectId: string, workspaceId: string) => {
    await invalidateProjectOverview(projectId, workspaceId);
  },
  
  /**
   * Called when a project member is added/removed
   */
  onTeamChange: async (projectId: string, workspaceId: string) => {
    await invalidateProjectOverview(projectId, workspaceId);
  },
  
  /**
   * Called when multiple projects are bulk updated
   */
  onBulkUpdate: async (projectIds: string[], workspaceId: string) => {
    await invalidateMultipleProjects(projectIds);
    await invalidateWorkspaceCaches(workspaceId);
  },
};


