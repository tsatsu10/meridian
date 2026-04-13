// Minimal auth-only server to test database authentication
// Bypasses all the broken schema compilation issues

import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import userRouter from './user';
import { initializeDatabase } from './database/connection-auth-only';
import logger from './utils/logger';

const app = new Hono();

// CORS middleware
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Auth-only test server running'
  });
});

// User routes
app.route('/api/user', userRouter);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    message: 'Auth-Only Test Server',
    endpoints: [
      'GET /health',
      'POST /api/user/sign-up',
      'POST /api/user/sign-in',
      'POST /api/user/sign-out',
      'GET /api/user/me'
    ]
  });
});

const port = 3006;

async function startServer() {
  try {
    logger.info('🚀 Starting auth-only test server...');

    // Initialize database
    await initializeDatabase();

    // Start server
    serve({
      fetch: app.fetch,
      port
    });

    logger.info(`✅ Auth-only test server running on http://localhost:${port}`);
    logger.info('📡 Available endpoints:');
    logger.info('   GET  /health');
    logger.info('   POST /api/user/sign-up');
    logger.info('   POST /api/user/sign-in');
    logger.info('   GET  /api/user/me');

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

