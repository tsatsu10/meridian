/**
 * 🖼️ Unsplash Photo Library API Routes
 * 
 * Endpoints for professional stock photography via Unsplash API
 * Supports background images, cover images, and visual customization
 */

import { Hono } from 'hono';
import { unsplashService } from '../services/unsplash-service';
import logger from '../utils/logger';

const app = new Hono();

/**
 * GET /api/unsplash/search
 * Search photos by keyword
 * 
 * Query params:
 * - query: Search term (required)
 * - page: Page number (default: 1)
 * - perPage: Results per page (default: 20, max: 30)
 * - orientation: landscape | portrait | squarish
 * - orderBy: relevant | latest
 */
app.get('/search', async (c) => {
  try {
    const query = c.req.query('query');
    const page = parseInt(c.req.query('page') || '1');
    const perPage = Math.min(parseInt(c.req.query('perPage') || '20'), 30);
    const orientation = c.req.query('orientation') as 'landscape' | 'portrait' | 'squarish' | undefined;
    const orderBy = c.req.query('orderBy') as 'relevant' | 'latest' | undefined;

    if (!query) {
      return c.json({ error: 'Search query is required' }, 400);
    }

    const result = await unsplashService.searchPhotos({
      query,
      page,
      perPage,
      orientation,
      orderBy,
    });

    if (!result) {
      return c.json({ error: 'Photo search failed. Check API configuration.' }, 503);
    }

    return c.json({
      success: true,
      data: {
        photos: result.photos,
        total: result.total,
        page,
        perPage,
        totalPages: Math.ceil(result.total / perPage),
      },
    });

  } catch (error) {
    logger.error('Photo search failed:', error);
    return c.json({ error: 'Failed to search photos' }, 500);
  }
});

/**
 * GET /api/unsplash/random
 * Get random photo(s)
 * 
 * Query params:
 * - query: Search term to filter random selection
 * - orientation: landscape | portrait | squarish
 * - collections: Collection ID(s) comma-separated
 * - count: Number of photos (1-30, default: 1)
 */
app.get('/random', async (c) => {
  try {
    const query = c.req.query('query');
    const orientation = c.req.query('orientation') as 'landscape' | 'portrait' | 'squarish' | undefined;
    const collections = c.req.query('collections');
    const count = Math.min(parseInt(c.req.query('count') || '1'), 30);

    const photos = await unsplashService.getRandomPhoto({
      query,
      orientation,
      collections,
      count,
    });

    if (!photos) {
      return c.json({ error: 'Failed to get random photos. Check API configuration.' }, 503);
    }

    return c.json({
      success: true,
      data: count === 1 ? photos[0] : photos,
    });

  } catch (error) {
    logger.error('Random photo fetch failed:', error);
    return c.json({ error: 'Failed to get random photos' }, 500);
  }
});

/**
 * GET /api/unsplash/photo/:id
 * Get photo details by ID
 */
app.get('/photo/:id', async (c) => {
  try {
    const photoId = c.req.param('id');

    const photo = await unsplashService.getPhoto(photoId);

    if (!photo) {
      return c.json({ error: 'Photo not found' }, 404);
    }

    return c.json({
      success: true,
      data: photo,
    });

  } catch (error) {
    logger.error('Failed to get photo:', error);
    return c.json({ error: 'Failed to retrieve photo' }, 500);
  }
});

/**
 * POST /api/unsplash/download/:id
 * Track photo download (REQUIRED by Unsplash API TOS)
 * Must be called when user selects/uses a photo
 */
app.post('/download/:id', async (c) => {
  try {
    const photoId = c.req.param('id');
    const userEmail = c.req.header('x-user-email');

    const success = await unsplashService.trackDownload(photoId);

    if (!success) {
      logger.warn(`Failed to track download for photo: ${photoId}`);
      // Don't fail the request - tracking is best-effort
    }

    logger.info(`Photo download tracked: ${photoId} by ${userEmail || 'anonymous'}`);

    return c.json({
      success: true,
      message: 'Download tracked successfully',
    });

  } catch (error) {
    logger.error('Failed to track download:', error);
    // Return success anyway - don't block user
    return c.json({
      success: true,
      message: 'Download tracking attempted',
    });
  }
});

/**
 * GET /api/unsplash/collections
 * Get curated photo collections
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - perPage: Results per page (default: 10, max: 30)
 */
app.get('/collections', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const perPage = Math.min(parseInt(c.req.query('perPage') || '10'), 30);

    const collections = await unsplashService.getCollections(page, perPage);

    if (!collections) {
      return c.json({ error: 'Failed to get collections' }, 503);
    }

    return c.json({
      success: true,
      data: collections,
    });

  } catch (error) {
    logger.error('Failed to get collections:', error);
    return c.json({ error: 'Failed to retrieve collections' }, 500);
  }
});

/**
 * GET /api/unsplash/stats
 * Get service usage statistics
 * 
 * @role admin, workspace-manager
 */
app.get('/stats', async (c) => {
  try {
    const userRole = c.req.header('x-user-role');

    // Only admin and workspace-manager can view stats
    if (userRole !== 'admin' && userRole !== 'workspace-manager') {
      return c.json({ error: 'Unauthorized: Admin or Workspace Manager role required' }, 403);
    }

    const stats = unsplashService.getUsageStats();

    return c.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('Failed to get Unsplash stats:', error);
    return c.json({ error: 'Failed to retrieve statistics' }, 500);
  }
});

/**
 * GET /api/unsplash/quota
 * Get API quota usage information
 * 
 * @role admin, workspace-manager
 */
app.get('/quota', async (c) => {
  try {
    const userRole = c.req.header('x-user-role');

    // Only admin and workspace-manager can view quota
    if (userRole !== 'admin' && userRole !== 'workspace-manager') {
      return c.json({ error: 'Unauthorized: Admin or Workspace Manager role required' }, 403);
    }

    const quota = unsplashService.getQuotaUsage();

    return c.json({
      success: true,
      data: quota,
      warning: quota.percentage >= 80 ? 'Approaching hourly rate limit' : undefined,
      critical: quota.percentage >= 95 ? 'Critical: Near rate limit' : undefined,
    });

  } catch (error) {
    logger.error('Failed to get quota info:', error);
    return c.json({ error: 'Failed to retrieve quota information' }, 500);
  }
});

/**
 * DELETE /api/unsplash/cache
 * Clear the Unsplash cache
 * 
 * @role admin
 */
app.delete('/cache', async (c) => {
  try {
    const userEmail = c.req.header('x-user-email');
    const userRole = c.req.header('x-user-role');

    // Only admin can clear cache
    if (userRole !== 'admin') {
      return c.json({ error: 'Unauthorized: Admin role required' }, 403);
    }

    unsplashService.clearCache();

    logger.info(`Unsplash cache cleared by ${userEmail}`);

    return c.json({
      success: true,
      message: 'Unsplash cache cleared successfully (Search + Photos)',
    });

  } catch (error) {
    logger.error('Failed to clear cache:', error);
    return c.json({ error: 'Failed to clear cache' }, 500);
  }
});

/**
 * GET /api/unsplash/categories
 * Get predefined photo categories for quick access
 * (Curated list for Meridian use cases)
 */
app.get('/categories', async (c) => {
  try {
    const categories = [
      {
        id: 'productivity',
        name: 'Productivity',
        description: 'Professional workspaces and productivity scenes',
        query: 'workspace productivity minimal',
        icon: '💼',
      },
      {
        id: 'teamwork',
        name: 'Teamwork',
        description: 'Collaboration and team activities',
        query: 'team collaboration meeting',
        icon: '👥',
      },
      {
        id: 'technology',
        name: 'Technology',
        description: 'Tech, coding, and digital workspace',
        query: 'technology coding computer',
        icon: '💻',
      },
      {
        id: 'nature',
        name: 'Nature',
        description: 'Calming natural landscapes',
        query: 'nature landscape mountains',
        icon: '🌿',
      },
      {
        id: 'minimal',
        name: 'Minimal',
        description: 'Clean, minimalist aesthetics',
        query: 'minimal clean simple',
        icon: '◻️',
      },
      {
        id: 'business',
        name: 'Business',
        description: 'Professional business environments',
        query: 'business professional office',
        icon: '🏢',
      },
      {
        id: 'creative',
        name: 'Creative',
        description: 'Artistic and creative workspaces',
        query: 'creative design studio art',
        icon: '🎨',
      },
      {
        id: 'motivation',
        name: 'Motivation',
        description: 'Inspiring and motivational imagery',
        query: 'motivation inspiration success',
        icon: '⭐',
      },
    ];

    return c.json({
      success: true,
      data: categories,
    });

  } catch (error) {
    logger.error('Failed to get categories:', error);
    return c.json({ error: 'Failed to retrieve categories' }, 500);
  }
});

export default app;

