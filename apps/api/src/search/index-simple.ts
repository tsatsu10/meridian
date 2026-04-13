import { Hono } from 'hono';

const app = new Hono();

// Simple test endpoint
app.get('/test', async (c) => {
  return c.json({
    success: true,
    message: 'Search module is working!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /search/test - Test endpoint (no auth required)',
      'GET /search - Full search (requires auth)',
    ]
  });
});

// Health check endpoint  
app.get('/health', async (c) => {
  return c.json({
    status: 'healthy',
    service: 'search',
    timestamp: new Date().toISOString()
  });
});

export default app;

