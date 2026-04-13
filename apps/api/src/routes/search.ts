/**
 * Search API Routes
 * Endpoints for advanced search functionality
 * Phase 0 - Advanced Search Implementation
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getSearchService } from '../services/search/search-service';
import logger from '../utils/logger';
import { 
  indexAllData, 
  reindexWorkspace, 
  rebuildAllIndices 
} from '../services/search/indexing-utils';

const search = new Hono();

/**
 * Search validation schemas
 */
const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(['users', 'projects', 'tasks', 'files', 'messages', 'all']).optional(),
  workspace: z.string().optional(),
  project: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort: z.string().optional(),
});

const suggestionSchema = z.object({
  q: z.string().min(1).max(100),
  type: z.enum(['users', 'projects', 'tasks', 'files', 'messages']),
  limit: z.coerce.number().min(1).max(10).default(5),
});

const indexSchema = z.object({
  type: z.enum(['all', 'users', 'projects', 'tasks', 'files', 'messages']),
  workspaceId: z.string().optional(),
});

/**
 * GET /api/search
 * Main search endpoint
 */
search.get(
  '/',
  zValidator('query', searchQuerySchema),
  async (c) => {
    try {
      const { q, type, workspace, project, limit, offset, sort } = c.req.valid('query');
      const searchService = getSearchService();

      // Build filters
      const filters: string[] = [];
      if (workspace) {
        filters.push(`workspaceId = "${workspace}"`);
      }
      if (project) {
        filters.push(`projectId = "${project}"`);
      }

      const filterString = filters.length > 0 ? filters.join(' AND ') : undefined;

      // Search options
      const searchOptions = {
        query: q,
        filters: filterString,
        limit,
        offset,
        sort: sort ? [sort] : undefined,
      };

      // Perform search
      let results;
      if (type === 'all' || !type) {
        results = await searchService.searchAll(searchOptions);
      } else {
        const typeResult = await searchService.search(type, searchOptions);
        results = { [type]: typeResult };
      }

      return c.json({
        success: true,
        query: q,
        results,
      });
    } catch (error: any) {
      logger.error('❌ Search error:', error);
      return c.json(
        {
          success: false,
          error: 'Search failed',
          message: error.message,
        },
        500
      );
    }
  }
);

/**
 * GET /api/search/suggestions
 * Get search suggestions/autocomplete
 */
search.get(
  '/suggestions',
  zValidator('query', suggestionSchema),
  async (c) => {
    try {
      const { q, type, limit } = c.req.valid('query');
      const searchService = getSearchService();

      const suggestions = await searchService.getSuggestions(type, q, limit);

      return c.json({
        success: true,
        query: q,
        suggestions,
      });
    } catch (error: any) {
      logger.error('❌ Suggestions error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to get suggestions',
          message: error.message,
        },
        500
      );
    }
  }
);

/**
 * GET /api/search/stats
 * Get search index statistics
 */
search.get('/stats', async (c) => {
  try {
    const searchService = getSearchService();
    const types = ['users', 'projects', 'tasks', 'files', 'messages'];

    const stats: any = {};
    for (const type of types) {
      stats[type] = await searchService.getStats(type);
    }

    return c.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    logger.error('❌ Stats error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get stats',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/search/health
 * Check search service health
 */
search.get('/health', async (c) => {
  try {
    const searchService = getSearchService();
    const isHealthy = await searchService.healthCheck();

    return c.json({
      success: true,
      healthy: isHealthy,
      status: isHealthy ? 'available' : 'unavailable',
    });
  } catch (error: any) {
    logger.error('❌ Health check error:', error);
    return c.json(
      {
        success: false,
        healthy: false,
        status: 'error',
        error: error.message,
      },
      503
    );
  }
});

/**
 * POST /api/search/index
 * Trigger data indexing (admin only)
 */
search.post(
  '/index',
  zValidator('json', indexSchema),
  async (c) => {
    try {
      // TODO: Add admin authentication check
      const { type, workspaceId } = c.req.valid('json');

      let results;

      if (workspaceId) {
        // Reindex specific workspace
        const count = await reindexWorkspace(workspaceId);
        results = { reindexed: count, workspace: workspaceId };
      } else if (type === 'all') {
        // Index all data
        results = await indexAllData();
      } else {
        return c.json(
          {
            success: false,
            error: 'Specific type indexing not yet implemented',
          },
          400
        );
      }

      return c.json({
        success: true,
        message: 'Indexing completed',
        results,
      });
    } catch (error: any) {
      logger.error('❌ Indexing error:', error);
      return c.json(
        {
          success: false,
          error: 'Indexing failed',
          message: error.message,
        },
        500
      );
    }
  }
);

/**
 * POST /api/search/rebuild
 * Rebuild all indices (admin only)
 */
search.post('/rebuild', async (c) => {
  try {
    // TODO: Add admin authentication check
    await rebuildAllIndices();

    return c.json({
      success: true,
      message: 'All indices rebuilt successfully',
    });
  } catch (error: any) {
    logger.error('❌ Rebuild error:', error);
    return c.json(
      {
        success: false,
        error: 'Rebuild failed',
        message: error.message,
      },
      500
    );
  }
});

/**
 * DELETE /api/search/:type/:id
 * Delete a document from search index
 */
search.delete('/:type/:id', async (c) => {
  try {
    const type = c.req.param('type');
    const id = c.req.param('id');

    if (!['users', 'projects', 'tasks', 'files', 'messages'].includes(type)) {
      return c.json(
        {
          success: false,
          error: 'Invalid type',
        },
        400
      );
    }

    const searchService = getSearchService();
    await searchService.deleteDocument(type, id);

    return c.json({
      success: true,
      message: `Document ${id} deleted from ${type} index`,
    });
  } catch (error: any) {
    logger.error('❌ Delete error:', error);
    return c.json(
      {
        success: false,
        error: 'Delete failed',
        message: error.message,
      },
      500
    );
  }
});

export default search;


