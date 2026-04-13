/**
 * 🌍 Geolocation API Routes
 * 
 * Endpoints for geolocation services, IP lookup, and usage monitoring
 */

import { Hono } from 'hono';
import { geolocationService } from '../services/geolocation-service';
import logger from '../utils/logger';
import { getClientIP } from '../utils/request-helpers';

const app = new Hono();

/**
 * GET /api/geolocation/lookup/:ip
 * Lookup geolocation data for a specific IP address
 * 
 * @role admin, workspace-manager
 */
app.get('/lookup/:ip', async (c) => {
  try {
    const ip = c.req.param('ip');
    const userEmail = c.req.header('x-user-email');
    const userRole = c.req.header('x-user-role');

    // Only admin and workspace-manager can lookup arbitrary IPs
    if (userRole !== 'admin' && userRole !== 'workspace-manager') {
      return c.json({ error: 'Unauthorized: Admin or Workspace Manager role required' }, 403);
    }

    const location = await geolocationService.getLocation(ip);

    if (!location) {
      return c.json({ error: 'Location data not available for this IP' }, 404);
    }

    logger.info(`IP lookup performed by ${userEmail}`, { ip, location: `${location.city}, ${location.country}` });

    return c.json({
      success: true,
      data: location,
    });

  } catch (error) {
    logger.error('IP lookup failed:', error);
    return c.json({ error: 'Failed to lookup IP address' }, 500);
  }
});

/**
 * GET /api/geolocation/current
 * Get geolocation data for the current request IP
 */
app.get('/current', async (c) => {
  try {
    const ip = getClientIP(c);
    
    if (ip === 'unknown') {
      return c.json({ error: 'Unable to determine client IP address' }, 400);
    }

    const location = await geolocationService.getLocation(ip);

    if (!location) {
      return c.json({ error: 'Location data not available' }, 404);
    }

    return c.json({
      success: true,
      data: location,
    });

  } catch (error) {
    logger.error('Current IP lookup failed:', error);
    return c.json({ error: 'Failed to lookup current location' }, 500);
  }
});

/**
 * GET /api/geolocation/stats
 * Get geolocation service usage statistics
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

    const stats = geolocationService.getUsageStats();

    return c.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('Failed to get geolocation stats:', error);
    return c.json({ error: 'Failed to retrieve statistics' }, 500);
  }
});

/**
 * GET /api/geolocation/quota
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

    const quota = geolocationService.getQuotaUsage();

    return c.json({
      success: true,
      data: quota,
      warning: quota.percentage >= 80 ? 'Approaching quota limit' : undefined,
      critical: quota.percentage >= 95 ? 'Critical: Near quota limit' : undefined,
    });

  } catch (error) {
    logger.error('Failed to get quota info:', error);
    return c.json({ error: 'Failed to retrieve quota information' }, 500);
  }
});

/**
 * POST /api/geolocation/check-suspicious/:ip
 * Check if an IP address is suspicious (proxy/VPN/Tor/threats)
 * 
 * @role admin, workspace-manager
 */
app.post('/check-suspicious/:ip', async (c) => {
  try {
    const ip = c.req.param('ip');
    const userEmail = c.req.header('x-user-email');
    const userRole = c.req.header('x-user-role');

    // Only admin and workspace-manager can check suspicious IPs
    if (userRole !== 'admin' && userRole !== 'workspace-manager') {
      return c.json({ error: 'Unauthorized: Admin or Workspace Manager role required' }, 403);
    }

    const isSuspicious = await geolocationService.isSuspiciousIP(ip);
    const location = await geolocationService.getLocation(ip);

    logger.info(`Suspicious IP check by ${userEmail}`, { 
      ip, 
      isSuspicious,
      location: location ? `${location.city}, ${location.country}` : 'Unknown',
    });

    return c.json({
      success: true,
      data: {
        ip,
        isSuspicious,
        location,
        details: location ? {
          isProxy: location.isProxy,
          isTor: location.isTor,
          threatLevel: location.threatLevel,
        } : null,
      },
    });

  } catch (error) {
    logger.error('Suspicious IP check failed:', error);
    return c.json({ error: 'Failed to check IP' }, 500);
  }
});

/**
 * DELETE /api/geolocation/cache
 * Clear the geolocation cache
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

    await geolocationService.clearCache();

    logger.info(`Geolocation cache cleared by ${userEmail}`);

    return c.json({
      success: true,
      message: 'Geolocation cache cleared successfully (Redis + Memory)',
    });

  } catch (error) {
    logger.error('Failed to clear cache:', error);
    return c.json({ error: 'Failed to clear cache' }, 500);
  }
});

export default app;

