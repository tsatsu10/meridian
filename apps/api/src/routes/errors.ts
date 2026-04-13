import { Hono } from 'hono';
import { z } from 'zod';
import { createError, ErrorCode } from '../lib/errors';
import logger from '../utils/logger';

const errorRouter = new Hono();

// Schema for error reporting
const ErrorReportSchema = z.object({
  error: z.object({
    message: z.string(),
    stack: z.string().optional(),
    name: z.string().optional(),
    filename: z.string().optional(),
    lineno: z.number().optional(),
    colno: z.number().optional(),
    resourceType: z.string().optional(),
    resourceUrl: z.string().optional(),
  }),
  errorInfo: z.object({
    componentStack: z.string().optional(),
    type: z.string().optional(),
    reason: z.any().optional(),
  }).optional(),
  errorId: z.string().optional(),
  timestamp: z.string(),
  userAgent: z.string(),
  url: z.string(),
  userId: z.string().optional(),
  workspaceId: z.string().optional(),
});

// Report client-side errors
errorRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = ErrorReportSchema.parse(body);

    // Log the error
    logger.error('Client error reported:', {
      error: validatedData.error,
      errorInfo: validatedData.errorInfo,
      errorId: validatedData.errorId,
      timestamp: validatedData.timestamp,
      url: validatedData.url,
      userAgent: validatedData.userAgent,
    });

    // Store error in database (if you have an errors table)
    // await storeErrorInDatabase(validatedData);

    // Send to external monitoring service
    await sendToMonitoringService(validatedData);

    // Send alert for critical errors
    if (isCriticalError(validatedData.error)) {
      await sendCriticalErrorAlert(validatedData);
    }

    return c.json({
      success: true,
      message: 'Error reported successfully',
      errorId: validatedData.errorId,
    });
  } catch (error) {
    logger.error('Failed to process error report:', error);
    return c.json({
      success: false,
      message: 'Failed to process error report',
    }, 400);
  }
});

// Get error statistics (for admin dashboard)
errorRouter.get('/stats', async (c) => {
  try {
    // This would typically query your error database
    const stats = {
      totalErrors: 0,
      errorsLast24h: 0,
      errorsLast7d: 0,
      criticalErrors: 0,
      errorTypes: {},
      topErrors: [],
    };

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get error stats:', error);
    throw createError.internalError('Failed to retrieve error statistics');
  }
});

// Get recent errors (for admin dashboard)
errorRouter.get('/recent', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const severity = c.req.query('severity');

    // This would typically query your error database
    const recentErrors = [];

    return c.json({
      success: true,
      data: recentErrors,
    });
  } catch (error) {
    logger.error('Failed to get recent errors:', error);
    throw createError.internalError('Failed to retrieve recent errors');
  }
});

// Helper functions
async function sendToMonitoringService(errorData: any) {
  try {
    // Send to Sentry, DataDog, or other monitoring service
    if (process.env.SENTRY_DSN) {
      // Sentry integration would go here
      logger.debug('Sending to Sentry:', errorData);
    }

    // Send to custom monitoring endpoint
    if (process.env.MONITORING_WEBHOOK_URL) {
      await fetch(process.env.MONITORING_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'error_report',
          data: errorData,
        }),
      });
    }
  } catch (error) {
    logger.error('Failed to send to monitoring service:', error);
  }
}

function isCriticalError(error: any): boolean {
  const criticalPatterns = [
    'ChunkLoadError',
    'Loading chunk',
    'Script error',
    'Network error',
    'Failed to fetch',
  ];

  return criticalPatterns.some(pattern => 
    error.message?.includes(pattern) || error.name?.includes(pattern)
  );
}

async function sendCriticalErrorAlert(errorData: any) {
  try {
    // Send alert to Slack, Discord, or email
    if (process.env.ALERT_WEBHOOK_URL) {
      await fetch(process.env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `🚨 Critical Error Alert`,
          attachments: [
            {
              color: 'danger',
              fields: [
                {
                  title: 'Error Message',
                  value: errorData.error.message,
                  short: false,
                },
                {
                  title: 'URL',
                  value: errorData.url,
                  short: true,
                },
                {
                  title: 'User Agent',
                  value: errorData.userAgent,
                  short: false,
                },
                {
                  title: 'Timestamp',
                  value: errorData.timestamp,
                  short: true,
                },
              ],
            },
          ],
        }),
      });
    }
  } catch (error) {
    logger.error('Failed to send critical error alert:', error);
  }
}

export default errorRouter;

