// Clean API server with comprehensive process lifecycle management
// Robust server setup with proper startup/shutdown handling

import 'dotenv/config';
import { Hono } from 'hono';
import { logger as honoLogger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { performanceTracker } from './middlewares/performance-tracking';
import userRouter from './user/user-routes';
import helpRouter from './help';
import { initializeDatabase, closeDatabase } from './database/connection';
import { initRedis, closeRedis } from './utils/redis-client';
import logger from './utils/logger';
import { DEFAULT_API_PORT } from './config/default-api-port';
import processLifecycleManager from './utils/process-lifecycle-manager';

const app = new Hono();

// No CORS policy - completely disabled for development

app.use('*', honoLogger());
app.use('*', performanceTracker); // 📊 Performance tracking

// Health check endpoint with comprehensive system monitoring
app.get('/health', async (c) => {
  try {
    const { checkDatabaseHealth } = await import('./database/connection');
    const dbHealth = await checkDatabaseHealth();
    
    // Get comprehensive health check including process metrics
    const systemHealth = await processLifecycleManager.healthCheck();
    
    const overallHealthy = dbHealth.healthy && systemHealth.healthy;
    
    return c.json({
      status: overallHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        status: dbHealth.healthy ? 'connected' : 'error',
        message: dbHealth.message,
      },
      system: {
        healthy: systemHealth.healthy,
        details: systemHealth.details,
      },
      processes: systemHealth.processHealth ? {
        total: systemHealth.processHealth.totalProcesses,
        meridian: systemHealth.processHealth.meridianProcesses.length,
        orphaned: systemHealth.processHealth.orphanedProcesses.length,
        zombies: systemHealth.processHealth.zombieProcesses.length,
        portConflicts: systemHealth.processHealth.portConflicts.length,
        systemLoad: systemHealth.processHealth.systemLoad,
      } : null,
    });
  } catch (error) {
    return c.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: { status: 'error', message: 'Health check failed' },
      system: { healthy: false, details: { 'Health Check': false } },
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// API routes
app.route('/api/user', userRouter);
app.route('/api/help', helpRouter);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    message: 'Meridian API Server - PostgreSQL Edition',
    version: '2.0.0',
    database: 'PostgreSQL (Neon)',
    endpoints: [
      'GET /health - Health check',
      'POST /api/user/sign-up - User registration',
      'POST /api/user/sign-in - User sign-in',
      'POST /api/user/sign-out - User sign-out',
      'GET /api/user/me - Get current user',
    ],
  });
});

// Error handler
app.onError((err, c) => {
  logger.error('API Error:', err);
  return c.json(
    { 
      error: 'Internal Server Error',
      message: err.message 
    }, 
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

const port = Number(process.env.API_PORT) || DEFAULT_API_PORT;
let server: any;

async function startServer() {
  try {
    logger.info('🚀 Starting Meridian API Server...');
    
    // Initialize process lifecycle manager
    processLifecycleManager.initialize();
    
    // Register database cleanup handler
    processLifecycleManager.register({
      name: 'Database Connection',
      cleanup: async () => {
        await closeDatabase();
      },
      priority: 100, // High priority - close database first
    });
    
    // Initialize database with timeout protection
    await processLifecycleManager.waitForStartup(
      initializeDatabase(),
      'Database Connection'
    );
    logger.info('✅ Database initialized');
    
    // Initialize Redis cache (optional - continues without it)
    try {
      await initRedis();
      processLifecycleManager.register({
        name: 'Redis Cache',
        cleanup: async () => {
          await closeRedis();
        },
        priority: 95, // Close Redis before server
      });
    } catch (error) {
      logger.warn('⚠️  Redis cache unavailable, continuing without caching');
    }
    
    // Start server with timeout protection
    const serverPromise = new Promise<void>((resolve, reject) => {
      try {
        server = serve({
          fetch: app.fetch,
          port,
        });
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    
    await processLifecycleManager.waitForStartup(
      serverPromise,
      'HTTP Server'
    );
    
    // Register server cleanup handler
    processLifecycleManager.register({
      name: 'HTTP Server',
      cleanup: async () => {
        if (server && typeof server.close === 'function') {
          await new Promise<void>((resolve) => {
            server.close(() => {
              logger.info('🌐 HTTP server closed');
              resolve();
            });
          });
        }
      },
      priority: 90, // Close server after database
    });
    
    logger.info(`🌐 Server running on http://localhost:${port}`);
    logger.info('📡 API endpoints available:');
    logger.info('   GET  /health');
    logger.info('   POST /api/user/sign-up');
    logger.info('   POST /api/user/sign-in');
    logger.info('   POST /api/user/sign-out');
    logger.info('   GET  /api/user/me');
    logger.info('✅ Server startup completed successfully');
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;

