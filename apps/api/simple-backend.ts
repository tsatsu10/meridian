/**
 * Simple Backend Test - Minimal server to test live connection
 */

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// CORS
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    message: 'Live backend is working!',
    timestamp: new Date().toISOString() 
  });
});

// Mock API endpoints for testing
app.get('/api/user/me', (c) => {
  return c.json({ 
    user: { 
      id: 'live-user-1', 
      email: 'live@meridian.app', 
      name: 'Live User' 
    } 
  });
});

app.get('/api/workspaces', (c) => {
  return c.json({ 
    workspaces: [
      { 
        id: 'live-workspace-1', 
        name: 'Live Workspace', 
        description: 'This is a live workspace from the backend' 
      }
    ] 
  });
});

app.get('/api/workspace/:workspaceId/projects', (c) => {
  return c.json({ 
    projects: [
      { 
        id: 'live-project-1', 
        name: 'Live Project', 
        description: 'This is a live project from the backend',
        workspaceId: c.req.param('workspaceId')
      }
    ] 
  });
});

app.get('/api/project/:projectId/tasks', (c) => {
  return c.json({ 
    tasks: [
      { 
        id: 'live-task-1', 
        title: 'Live Task', 
        description: 'This is a live task from the backend',
        status: 'in-progress',
        projectId: c.req.param('projectId')
      }
    ] 
  });
});

const port = 3005;

console.log('🚀 Starting simple live backend...');

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`✅ Live Backend running at http://localhost:${info.port}`);
  console.log('🔗 Test endpoints:');
  console.log(`   GET http://localhost:${info.port}/health`);
  console.log(`   GET http://localhost:${info.port}/api/user/me`);
  console.log(`   GET http://localhost:${info.port}/api/workspaces`);
});

export default app;