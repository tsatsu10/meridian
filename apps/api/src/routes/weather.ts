/**
 * 🌤️ Weather API Routes
 * 
 * Endpoints for weather services, forecasts, and usage monitoring
 * Powered by OpenWeatherMap API
 */

import { Hono } from 'hono';
import { OpenWeatherApiKeyError, weatherService } from '../services/weather-service';
import { geolocationService } from '../services/geolocation-service';
import logger from '../utils/logger';
import { getClientIP } from '../utils/request-helpers';

const app = new Hono();

/**
 * GET /api/weather/current
 * Get current weather for a location
 * 
 * Query params:
 * - city: City name (e.g., "Mountain View")
 * - country: Country code (e.g., "US")
 * - lat: Latitude
 * - lon: Longitude
 * - autoDetect: Use client IP to detect location (default: false)
 */
app.get('/current', async (c) => {
  try {
    const city = c.req.query('city');
    const country = c.req.query('country');
    const lat = c.req.query('lat');
    const lon = c.req.query('lon');
    const autoDetect = c.req.query('autoDetect') === 'true';

    let weather;

    if (autoDetect) {
      // Auto-detect location from IP
      const clientIP = getClientIP(c);
      weather = await weatherService.getWeatherForIP(clientIP);
      
      if (!weather) {
        return c.json({ error: 'Could not detect location from IP' }, 404);
      }
    } else if (lat && lon) {
      // Use coordinates
      weather = await weatherService.getCurrentWeather({
        lat: parseFloat(lat),
        lon: parseFloat(lon),
      });
    } else if (city) {
      // Use city name
      weather = await weatherService.getCurrentWeather({
        city,
        country,
      });
    } else {
      return c.json({ error: 'Missing location parameters. Provide city, coordinates, or autoDetect=true' }, 400);
    }

    if (!weather) {
      return c.json({ error: 'Weather data not available for this location' }, 404);
    }

    return c.json({
      success: true,
      data: weather,
    });

  } catch (error) {
    if (error instanceof OpenWeatherApiKeyError) {
      logger.error(error.message);
      return c.json({
        error: 'Weather service authentication failed. Verify OPENWEATHERMAP_API_KEY on the API server and restart after updating the environment variable.'
      }, 502);
    }
    logger.error('Failed to fetch weather:', error);
    return c.json({ error: 'Failed to fetch weather data' }, 500);
  }
});

/**
 * GET /api/weather/forecast
 * Get 5-day weather forecast
 * 
 * Query params: same as /current
 */
app.get('/forecast', async (c) => {
  try {
    const city = c.req.query('city');
    const country = c.req.query('country');
    const lat = c.req.query('lat');
    const lon = c.req.query('lon');

    let forecast;

    if (lat && lon) {
      forecast = await weatherService.getForecast({
        lat: parseFloat(lat),
        lon: parseFloat(lon),
      });
    } else if (city) {
      forecast = await weatherService.getForecast({
        city,
        country,
      });
    } else {
      return c.json({ error: 'Missing location parameters. Provide city or coordinates' }, 400);
    }

    if (!forecast) {
      return c.json({ error: 'Forecast data not available' }, 404);
    }

    return c.json({
      success: true,
      data: forecast,
    });

  } catch (error) {
    if (error instanceof OpenWeatherApiKeyError) {
      logger.error(error.message);
      return c.json({
        error: 'Weather service authentication failed. Verify OPENWEATHERMAP_API_KEY on the API server and restart after updating the environment variable.'
      }, 502);
    }
    logger.error('Failed to fetch forecast:', error);
    return c.json({ error: 'Failed to fetch forecast data' }, 500);
  }
});

/**
 * GET /api/weather/location/:ip
 * Get weather for a specific IP address
 * Uses ipstack to detect location, then fetches weather
 * 
 * @role admin, workspace-manager
 */
app.get('/location/:ip', async (c) => {
  try {
    const ip = c.req.param('ip');
    const userRole = c.req.header('x-user-role');

    // Only admin and workspace-manager can lookup arbitrary IPs
    if (userRole !== 'admin' && userRole !== 'workspace-manager') {
      return c.json({ error: 'Unauthorized: Admin or Workspace Manager role required' }, 403);
    }

    const weather = await weatherService.getWeatherForIP(ip);

    if (!weather) {
      return c.json({ error: 'Could not get weather for this IP' }, 404);
    }

    return c.json({
      success: true,
      data: weather,
    });

  } catch (error) {
    if (error instanceof OpenWeatherApiKeyError) {
      logger.error(error.message);
      return c.json({
        error: 'Weather service authentication failed. Verify OPENWEATHERMAP_API_KEY on the API server and restart after updating the environment variable.'
      }, 502);
    }
    logger.error('Failed to get weather for IP:', error);
    return c.json({ error: 'Failed to fetch weather' }, 500);
  }
});

/**
 * GET /api/weather/stats
 * Get weather service usage statistics
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

    const stats = weatherService.getUsageStats();

    return c.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('Failed to get weather stats:', error);
    return c.json({ error: 'Failed to retrieve statistics' }, 500);
  }
});

/**
 * GET /api/weather/quota
 * Get API quota usage information (calls per minute)
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

    const quota = weatherService.getQuotaUsage();

    return c.json({
      success: true,
      data: quota,
      warning: quota.percentage >= 80 ? 'Approaching rate limit' : undefined,
      critical: quota.percentage >= 95 ? 'Critical: Near rate limit' : undefined,
    });

  } catch (error) {
    logger.error('Failed to get quota info:', error);
    return c.json({ error: 'Failed to retrieve quota information' }, 500);
  }
});

/**
 * POST /api/weather/by-location
 * Get weather by location name with optional ipstack enrichment
 * 
 * Body: { city: string, country?: string, enrichWithGeo?: boolean }
 */
app.post('/by-location', async (c) => {
  try {
    const body = await c.req.json();
    const { city, country, enrichWithGeo } = body;

    if (!city) {
      return c.json({ error: 'City name is required' }, 400);
    }

    const weather = await weatherService.getCurrentWeather({
      city,
      country,
    });

    if (!weather) {
      return c.json({ error: 'Weather data not available for this location' }, 404);
    }

    // Optionally enrich with geolocation data
    let geoData = null;
    if (enrichWithGeo) {
      // Try to find IP for this city (reverse lookup not supported)
      // This would require additional service
      logger.debug('Geo enrichment requested but not yet implemented');
    }

    return c.json({
      success: true,
      data: weather,
      geo: geoData,
    });

  } catch (error) {
    logger.error('Failed to fetch weather by location:', error);
    return c.json({ error: 'Failed to fetch weather' }, 500);
  }
});

/**
 * DELETE /api/weather/cache
 * Clear the weather cache
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

    weatherService.clearCache();

    logger.info(`Weather cache cleared by ${userEmail}`);

    return c.json({
      success: true,
      message: 'Weather cache cleared successfully (Current + Forecast)',
    });

  } catch (error) {
    logger.error('Failed to clear cache:', error);
    return c.json({ error: 'Failed to clear cache' }, 500);
  }
});

export default app;

