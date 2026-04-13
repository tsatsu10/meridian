import { Hono } from 'hono';
import { DEFAULT_API_PORT } from '../config/default-api-port';

export const apiDocsController = new Hono();

// API Documentation Routes
apiDocsController.get('/', (c) => {
  return c.json({
    title: 'Meridian API Documentation',
    version: '1.0.0',
    description: 'Comprehensive API documentation for Meridian collaboration platform',
    baseUrl: `http://localhost:${DEFAULT_API_PORT}`,
    rateLimiting: {
      general: '100 requests per 15 minutes',
      authentication: '5 requests per 15 minutes',
      analytics: '20 requests per minute',
      ai: '30 requests per minute',
      workflows: '50 requests per minute',
    },
    authentication: {
      type: 'Session-based',
      header: 'Cookie: session=<session-id>',
      description: 'All authenticated endpoints require a valid session cookie',
    },
    errorResponses: {
      400: 'Bad Request - Invalid input data',
      401: 'Unauthorized - Authentication required',
      403: 'Forbidden - Insufficient permissions',
      404: 'Not Found - Resource not found',
      429: 'Too Many Requests - Rate limit exceeded',
      500: 'Internal Server Error - Server error',
    },
  });
});

export default apiDocsController; 

