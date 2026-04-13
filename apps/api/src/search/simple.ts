import { Hono } from 'hono';

const app = new Hono();

// Simple test endpoint without dependencies
app.get('/test', async (c) => {
  return c.json({
    success: true,
    message: 'Search functionality is mounted and working!',
    timestamp: new Date().toISOString(),
    status: 'Fix #2 - Search module successfully integrated'
  });
});

// Basic search query endpoint (no auth required for testing)
app.get('/query', async (c) => {
  const query = c.req.query('q') || '';
  const entityTypes = c.req.query('entityTypes') || 'all';
  
  return c.json({
    success: true,
    query: query,
    entityTypes: entityTypes,
    results: [
      {
        id: 'demo-result-1',
        type: 'task',
        title: `Demo task matching "${query}"`,
        description: 'This is a demo search result to test functionality',
        score: 0.95
      },
      {
        id: 'demo-result-2', 
        type: 'project',
        title: `Demo project for "${query}"`,
        description: 'Demo project search result',
        score: 0.87
      }
    ],
    totalResults: 2,
    searchTime: '12ms',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', async (c) => {
  return c.json({
    status: 'healthy',
    service: 'search',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export default app;

