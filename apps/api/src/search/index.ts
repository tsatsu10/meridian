/**
 * Universal Search API Routes
 *
 * Provides comprehensive search functionality across all entities
 * in the Meridian platform with advanced filtering and faceted search.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import UniversalSearchService, {
  type UniversalSearchQuery,
  type SearchEntityType,
} from './universal-search-service';
import { auth } from '../middlewares/auth';
import logger from '../utils/logger';
import {
  searchWorkspace,
  searchProjects,
  searchTasks,
  getSearchSuggestions,
} from './controllers/search-workspace';

// Create a requireAuth wrapper that ensures authentication
const requireAuth = async (c: any, next: any) => {
  const result = await auth(c, next);
  if (!c.get('userId')) {
    return c.json({ error: 'Authentication required' }, 401);
  }
  return result;
};

const app = new Hono();

// Validation schemas
const searchQuerySchema = z.object({
  query: z.string().optional(),
  entityTypes: z.array(z.enum([
    'task', 'project', 'workspace', 'message',
    'user', 'file', 'milestone', 'comment', 'all'
  ])).optional(),
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  userId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assigneeId: z.string().optional(),
  authorId: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
  sortBy: z.enum(['relevance', 'date', 'title', 'priority']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const suggestionQuerySchema = z.object({
  prefix: z.string().min(1),
  limit: z.number().min(1).max(20).optional(),
});

const saveSearchSchema = z.object({
  name: z.string().min(1).max(100),
  query: searchQuerySchema,
  isPublic: z.boolean().optional(),
});

// Test endpoint without auth
app.get('/test', async (c) => {
  try {
    return c.json({
      success: true,
      message: 'Search module is working!',
      timestamp: new Date().toISOString(),
      endpoints: [
        'GET /search - Universal search (requires auth)',
        'GET /search/test - Test endpoint (no auth)',
        'GET /search/suggestions - Search suggestions (requires auth)',
        'GET /search/saved - Saved searches (requires auth)',
        'GET /search/fuzzy/workspace - Fuzzy search workspace (requires auth)',
        'GET /search/fuzzy/projects - Fuzzy search projects (requires auth)',
        'GET /search/fuzzy/tasks - Fuzzy search tasks (requires auth)',
      ]
    });
  } catch (error) {
    logger.error('Search test error:', error);
    return c.json({ error: 'Test failed' }, 500);
  }
});

/**
 * Fuzzy search workspace - combined projects and tasks search
 * GET /search/fuzzy/workspace
 */
app.get('/fuzzy/workspace', requireAuth, async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const query = c.req.query('query');
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 30;
    const minScore = c.req.query('minScore') ? parseFloat(c.req.query('minScore')!) : 0.5;
    const projectId = c.req.query('projectId');
    const searchProjects = c.req.query('searchProjects') !== 'false';
    const searchTasks = c.req.query('searchTasks') !== 'false';

    if (!workspaceId || !query) {
      return c.json({ error: 'workspaceId and query are required' }, 400);
    }

    const results = await searchWorkspace(workspaceId, query, {
      limit,
      minScore,
      projectId,
      doSearchProjects: searchProjects,
      doSearchTasks: searchTasks,
    });

    logger.info('🔍 Fuzzy workspace search', {
      workspaceId,
      query,
      resultCount: results.projects.length + results.tasks.length,
      queryTime: results.queryTime,
    });

    return c.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    logger.error('❌ Fuzzy workspace search error:', error);
    return c.json({
      success: false,
      error: error.message || 'Workspace search failed',
    }, 500);
  }
});

/**
 * Fuzzy search projects only
 * GET /search/fuzzy/projects
 */
app.get('/fuzzy/projects', requireAuth, async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const query = c.req.query('query');
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50;
    const minScore = c.req.query('minScore') ? parseFloat(c.req.query('minScore')!) : 0.5;
    const status = c.req.query('status')?.split(',');
    const priority = c.req.query('priority')?.split(',');

    if (!workspaceId || !query) {
      return c.json({ error: 'workspaceId and query are required' }, 400);
    }

    const results = await searchProjects(workspaceId, query, {
      limit,
      minScore,
      status,
      priority,
    });

    return c.json({
      success: true,
      data: {
        results,
        totalCount: results.length,
        query,
      },
    });
  } catch (error: any) {
    logger.error('❌ Fuzzy project search error:', error);
    return c.json({
      success: false,
      error: error.message || 'Project search failed',
    }, 500);
  }
});

/**
 * Fuzzy search tasks in a project
 * GET /search/fuzzy/tasks
 */
app.get('/fuzzy/tasks', requireAuth, async (c) => {
  try {
    const projectId = c.req.query('projectId');
    const query = c.req.query('query');
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50;
    const minScore = c.req.query('minScore') ? parseFloat(c.req.query('minScore')!) : 0.5;
    const status = c.req.query('status')?.split(',');
    const priority = c.req.query('priority')?.split(',');
    const assigneeId = c.req.query('assigneeId');

    if (!projectId || !query) {
      return c.json({ error: 'projectId and query are required' }, 400);
    }

    const results = await searchTasks(projectId, query, {
      limit,
      minScore,
      status,
      priority,
      assigneeId,
    });

    return c.json({
      success: true,
      data: {
        results,
        totalCount: results.length,
        query,
        projectId,
      },
    });
  } catch (error: any) {
    logger.error('❌ Fuzzy task search error:', error);
    return c.json({
      success: false,
      error: error.message || 'Task search failed',
    }, 500);
  }
});

/**
 * Fuzzy search suggestions for autocomplete
 * GET /search/fuzzy/suggestions
 */
app.get('/fuzzy/suggestions', requireAuth, async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const query = c.req.query('query');
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 10;

    if (!workspaceId || !query) {
      return c.json({ error: 'workspaceId and query are required' }, 400);
    }

    const suggestions = await getSearchSuggestions(workspaceId, query, limit);

    return c.json({
      success: true,
      data: {
        suggestions,
        query,
      },
    });
  } catch (error: any) {
    logger.error('❌ Fuzzy suggestions error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to fetch suggestions',
    }, 500);
  }
});

/**
 * Universal search endpoint
 * GET /search
 */
app.get('/', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    // Parse and validate query parameters
    const queryParams = c.req.query();

    // Handle array parameters
    const entityTypes = queryParams.entityTypes
      ? (Array.isArray(queryParams.entityTypes)
          ? queryParams.entityTypes
          : [queryParams.entityTypes])
      : undefined;

    const tags = queryParams.tags
      ? (Array.isArray(queryParams.tags)
          ? queryParams.tags
          : [queryParams.tags])
      : undefined;

    const searchQuery: UniversalSearchQuery = {
      query: queryParams.query,
      entityTypes: entityTypes as SearchEntityType[],
      workspaceId: queryParams.workspaceId,
      projectId: queryParams.projectId,
      userId: queryParams.userId,
      dateFrom: queryParams.dateFrom,
      dateTo: queryParams.dateTo,
      tags,
      status: queryParams.status,
      priority: queryParams.priority,
      assigneeId: queryParams.assigneeId,
      authorId: queryParams.authorId,
      limit: queryParams.limit ? parseInt(queryParams.limit) : undefined,
      offset: queryParams.offset ? parseInt(queryParams.offset) : undefined,
      sortBy: queryParams.sortBy as any,
      sortOrder: queryParams.sortOrder as any,
    };

    // Validate the search query
    const validatedQuery = searchQuerySchema.parse(searchQuery);

    // Perform the search
    const searchResults = await UniversalSearchService.search(
      validatedQuery,
      user.id
    );

    logger.info('🔍 Universal search performed', {
      userId: user.id,
      query: validatedQuery.query,
      entityTypes: validatedQuery.entityTypes,
      resultCount: searchResults.results.length,
      queryTime: searchResults.performance.queryTime,
    });

    return c.json({
      success: true,
      data: searchResults,
    });
  } catch (error) {
    logger.error('❌ Universal search error:', error);

    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid search parameters',
        details: error.errors,
      }, 400);
    }

    return c.json({
      success: false,
      error: 'SEARCH_ERROR',
      message: 'Search failed',
    }, 500);
  }
});

/**
 * Search suggestions endpoint
 * GET /suggestions
 */
app.get('/suggestions', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const { prefix, limit } = suggestionQuerySchema.parse({
      prefix: c.req.query('prefix'),
      limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined,
    });

    const suggestions = await UniversalSearchService.getSuggestions(
      prefix,
      limit || 10
    );

    return c.json({
      success: true,
      data: {
        suggestions,
        prefix,
      },
    });
  } catch (error) {
    logger.error('❌ Search suggestions error:', error);

    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid suggestion parameters',
        details: error.errors,
      }, 400);
    }

    return c.json({
      success: false,
      error: 'SUGGESTIONS_ERROR',
      message: 'Failed to get suggestions',
    }, 500);
  }
});

/**
 * Save search endpoint
 * POST /saved-searches
 */
app.post('/saved-searches', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const body = await c.req.json();
    const { name, query, isPublic } = saveSearchSchema.parse(body);

    const savedSearch = await UniversalSearchService.saveSearch(
      user.id,
      name,
      query
    );

    logger.info('💾 Search saved', {
      userId: user.id,
      searchName: name,
      query: query.query,
    });

    return c.json({
      success: true,
      data: savedSearch,
    });
  } catch (error) {
    logger.error('❌ Save search error:', error);

    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid save search data',
        details: error.errors,
      }, 400);
    }

    return c.json({
      success: false,
      error: 'SAVE_SEARCH_ERROR',
      message: 'Failed to save search',
    }, 500);
  }
});

/**
 * Get saved searches endpoint
 * GET /saved-searches
 */
app.get('/saved-searches', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const savedSearches = await UniversalSearchService.getSavedSearches(user.id);

    return c.json({
      success: true,
      data: {
        savedSearches,
      },
    });
  } catch (error) {
    logger.error('❌ Get saved searches error:', error);

    return c.json({
      success: false,
      error: 'GET_SAVED_SEARCHES_ERROR',
      message: 'Failed to get saved searches',
    }, 500);
  }
});

/**
 * Delete saved search endpoint
 * DELETE /saved-searches/:id
 */
app.delete('/saved-searches/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const searchId = c.req.param('id');

    // TODO: Implement deletion of saved search
    // await UniversalSearchService.deleteSavedSearch(searchId, user.id);

    logger.info('🗑️ Saved search deleted', {
      userId: user.id,
      searchId,
    });

    return c.json({
      success: true,
      message: 'Saved search deleted',
    });
  } catch (error) {
    logger.error('❌ Delete saved search error:', error);

    return c.json({
      success: false,
      error: 'DELETE_SAVED_SEARCH_ERROR',
      message: 'Failed to delete saved search',
    }, 500);
  }
});

/**
 * Search analytics endpoint
 * GET /analytics
 */
app.get('/analytics', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    // Get cache statistics and search performance metrics
    const cacheStats = UniversalSearchService.getCacheStats();

    return c.json({
      success: true,
      data: {
        cache: cacheStats,
        performance: {
          // TODO: Add performance metrics
          averageQueryTime: 0,
          totalSearches: 0,
          popularQueries: [],
        },
      },
    });
  } catch (error) {
    logger.error('❌ Search analytics error:', error);

    return c.json({
      success: false,
      error: 'ANALYTICS_ERROR',
      message: 'Failed to get search analytics',
    }, 500);
  }
});

/**
 * Clear search cache endpoint
 * POST /cache/clear
 */
app.post('/cache/clear', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    // TODO: Add admin role check
    // if (!user.isAdmin) {
    //   return c.json({ error: 'Admin access required' }, 403);
    // }

    UniversalSearchService.clearCache();

    logger.info('🧹 Search cache cleared', {
      userId: user.id,
    });

    return c.json({
      success: true,
      message: 'Search cache cleared',
    });
  } catch (error) {
    logger.error('❌ Clear cache error:', error);

    return c.json({
      success: false,
      error: 'CLEAR_CACHE_ERROR',
      message: 'Failed to clear cache',
    }, 500);
  }
});

/**
 * Search health check endpoint
 * GET /health
 */
app.get('/health', async (c) => {
  try {
    const cacheStats = UniversalSearchService.getCacheStats();

    return c.json({
      success: true,
      status: 'healthy',
      data: {
        cache: cacheStats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('❌ Search health check error:', error);

    return c.json({
      success: false,
      status: 'unhealthy',
      error: 'HEALTH_CHECK_ERROR',
    }, 500);
  }
});

export default app;

