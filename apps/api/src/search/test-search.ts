import { Hono } from 'hono';

const app = new Hono();

// Simple test search endpoint without auth
app.get('/test', (c) => {
  return c.json({
    success: true,
    message: 'Search module is working!',
    timestamp: new Date().toISOString()
  });
});

export default app;

