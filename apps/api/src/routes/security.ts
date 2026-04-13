import { Hono } from 'hono';
import { z } from 'zod';
import { createError } from '../lib/errors';
import { authMiddleware, apiKeyMiddleware } from '../lib/security';
import logger from '../utils/logger';

const securityRouter = new Hono();

// Apply authentication to all security routes
securityRouter.use('*', authMiddleware);

// Security event schema
const SecurityEventSchema = z.object({
  requestId: z.string(),
  method: z.string(),
  url: z.string(),
  userAgent: z.string().optional(),
  ip: z.string().optional(),
  duration: z.number(),
  status: z.number(),
  timestamp: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  type: z.enum(['request', 'error', 'auth_failure', 'rate_limit', 'suspicious']).optional(),
});

// Report security event
securityRouter.post('/events', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = SecurityEventSchema.parse(body);

    // Log security event
    logger.debug('Security event:', validatedData);

    // Store in database (mock implementation)
    // await storeSecurityEvent(validatedData);

    // Send alert for critical events
    if (validatedData.severity === 'critical') {
      await sendCriticalAlert(validatedData);
    }

    return c.json({
      success: true,
      message: 'Security event recorded',
    });
  } catch (error) {
    logger.error('Failed to process security event:', error);
    throw createError.internalError('Failed to process security event');
  }
});

// Get security events
securityRouter.get('/events', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const severity = c.req.query('severity');
    const type = c.req.query('type');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    // Mock implementation - in real app, query database
    const events = [];

    return c.json({
      success: true,
      data: events,
      pagination: {
        limit,
        total: events.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get security events:', error);
    throw createError.internalError('Failed to retrieve security events');
  }
});

// Get security statistics
securityRouter.get('/stats', async (c) => {
  try {
    const period = c.req.query('period') || '24h';
    
    // Mock implementation - in real app, calculate from database
    const stats = {
      totalEvents: 0,
      criticalEvents: 0,
      authFailures: 0,
      rateLimitHits: 0,
      suspiciousActivity: 0,
      topIPs: [],
      topUserAgents: [],
      eventsByType: {},
      eventsBySeverity: {},
    };

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get security stats:', error);
    throw createError.internalError('Failed to retrieve security statistics');
  }
});

// Get security recommendations
securityRouter.get('/recommendations', async (c) => {
  try {
    // Mock implementation - in real app, analyze patterns
    const recommendations = [
      {
        id: 'enable-2fa',
        title: 'Enable Two-Factor Authentication',
        description: 'Consider enabling 2FA for all admin users',
        severity: 'high',
        category: 'authentication',
      },
      {
        id: 'update-csp',
        title: 'Update Content Security Policy',
        description: 'Review and update CSP headers for better protection',
        severity: 'medium',
        category: 'headers',
      },
      {
        id: 'rate-limit-review',
        title: 'Review Rate Limiting',
        description: 'Consider adjusting rate limits based on usage patterns',
        severity: 'low',
        category: 'rate-limiting',
      },
    ];

    return c.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    logger.error('Failed to get security recommendations:', error);
    throw createError.internalError('Failed to retrieve security recommendations');
  }
});

// Security scan endpoint
securityRouter.post('/scan', async (c) => {
  try {
    const scanType = c.req.query('type') || 'full';
    
    // Mock implementation - in real app, run security scan
    const scanResults = {
      scanId: crypto.randomUUID(),
      type: scanType,
      status: 'completed',
      timestamp: new Date().toISOString(),
      findings: [
        {
          id: 'weak-passwords',
          title: 'Weak Password Policy',
          severity: 'medium',
          description: 'Some users have weak passwords',
          recommendation: 'Enforce stronger password requirements',
        },
        {
          id: 'missing-headers',
          title: 'Missing Security Headers',
          severity: 'low',
          description: 'Some security headers are missing',
          recommendation: 'Add missing security headers',
        },
      ],
      score: 85,
    };

    return c.json({
      success: true,
      data: scanResults,
    });
  } catch (error) {
    logger.error('Failed to run security scan:', error);
    throw createError.internalError('Failed to run security scan');
  }
});

// Get security scan results
securityRouter.get('/scans/:scanId', async (c) => {
  try {
    const scanId = c.req.param('scanId');
    
    // Mock implementation - in real app, get from database
    const scanResult = {
      scanId,
      status: 'completed',
      timestamp: new Date().toISOString(),
      findings: [],
      score: 85,
    };

    return c.json({
      success: true,
      data: scanResult,
    });
  } catch (error) {
    logger.error('Failed to get security scan:', error);
    throw createError.internalError('Failed to retrieve security scan');
  }
});

// Security configuration endpoint
securityRouter.get('/config', async (c) => {
  try {
    const config = {
      rateLimiting: {
        enabled: true,
        windowMs: 900000, // 15 minutes
        maxRequests: 100,
      },
      cors: {
        enabled: true,
        allowedOrigins: ['https://meridian.app', 'https://app.meridian.com'],
      },
      headers: {
        enabled: true,
        strictTransportSecurity: true,
        contentSecurityPolicy: true,
        xFrameOptions: 'DENY',
      },
      authentication: {
        jwtExpiry: '24h',
        refreshTokenExpiry: '7d',
        require2FA: false,
      },
      logging: {
        enabled: true,
        level: 'info',
        retentionDays: 30,
      },
    };

    return c.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Failed to get security config:', error);
    throw createError.internalError('Failed to retrieve security configuration');
  }
});

// Update security configuration
securityRouter.put('/config', async (c) => {
  try {
    const body = await c.req.json();
    
    // Validate configuration update
    const configSchema = z.object({
      rateLimiting: z.object({
        enabled: z.boolean(),
        windowMs: z.number().min(60000), // Min 1 minute
        maxRequests: z.number().min(1),
      }).optional(),
      cors: z.object({
        enabled: z.boolean(),
        allowedOrigins: z.array(z.string().url()),
      }).optional(),
      headers: z.object({
        enabled: z.boolean(),
        strictTransportSecurity: z.boolean(),
        contentSecurityPolicy: z.boolean(),
        xFrameOptions: z.enum(['DENY', 'SAMEORIGIN']),
      }).optional(),
      authentication: z.object({
        jwtExpiry: z.string(),
        refreshTokenExpiry: z.string(),
        require2FA: z.boolean(),
      }).optional(),
      logging: z.object({
        enabled: z.boolean(),
        level: z.enum(['debug', 'info', 'warn', 'error']),
        retentionDays: z.number().min(1).max(365),
      }).optional(),
    });

    const validatedConfig = configSchema.parse(body);
    
    // Update configuration (mock implementation)
    logger.debug('Updating security config:', validatedConfig);

    return c.json({
      success: true,
      message: 'Security configuration updated',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError.validationError('Invalid configuration', {
        errors: error.errors,
      });
    }
    logger.error('Failed to update security config:', error);
    throw createError.internalError('Failed to update security configuration');
  }
});

// Helper functions
async function sendCriticalAlert(event: any) {
  try {
    // Send alert to security team
    const alert = {
      title: 'Critical Security Event',
      message: `Critical security event detected: ${event.type}`,
      severity: 'critical',
      event,
      timestamp: new Date().toISOString(),
    };

    // Send to Slack, email, etc.
    logger.debug('Critical security alert:', alert);
  } catch (error) {
    logger.error('Failed to send critical alert:', error);
  }
}

export default securityRouter;

