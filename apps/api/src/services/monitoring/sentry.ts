/**
 * Sentry Integration
 * Error tracking and performance monitoring
 * Phase 1 - Monitoring & Observability
 * 
 * NOTE: Sentry is optional - app works without it
 * Install with: cd apps/api && pnpm add @sentry/node @sentry/profiling-node
 */

import { Logger } from '../logging/logger';

// 🔧 Optional Sentry import - gracefully handle if not installed
let Sentry: any = null;
let ProfilingIntegration: any = null;
let isSentryAvailable = false;

try {
  Sentry = require('@sentry/node');
  ProfilingIntegration = require('@sentry/profiling-node').ProfilingIntegration;
  isSentryAvailable = true;
  Logger.info('✅ Sentry package loaded successfully');
} catch (error) {
  Logger.warn('⚠️ Sentry not installed - error tracking disabled');
  Logger.info('💡 To enable Sentry: cd apps/api && pnpm add @sentry/node @sentry/profiling-node');
  isSentryAvailable = false;
}

interface SentryConfig {
  dsn: string;
  environment?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  enabled?: boolean;
}

/**
 * Initialize Sentry
 */
export function initializeSentry(config: SentryConfig) {
  if (!isSentryAvailable) {
    Logger.info('Sentry not available - skipping initialization');
    return;
  }

  if (!config.enabled || !config.dsn) {
    Logger.info('Sentry is disabled or DSN not configured');
    return;
  }

  try {
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment || process.env.NODE_ENV || 'development',
      
      // Performance Monitoring
      tracesSampleRate: config.tracesSampleRate || 0.1, // 10% of transactions
      
      // Profiling
      profilesSampleRate: config.profilesSampleRate || 0.1, // 10% of transactions
      integrations: [
        new ProfilingIntegration(),
      ],
      
      // Error sampling
      sampleRate: config.sampleRate || 1.0, // 100% of errors
      
      // Additional options
      beforeSend(event, hint) {
        // Filter out sensitive data
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers?.['authorization'];
          delete event.request.headers?.['cookie'];
        }
        
        return event;
      },
      
      beforeBreadcrumb(breadcrumb) {
        // Filter sensitive breadcrumbs
        if (breadcrumb.category === 'http' && breadcrumb.data) {
          delete breadcrumb.data.Authorization;
          delete breadcrumb.data.Cookie;
        }
        
        return breadcrumb;
      },
    });

    Logger.info('✅ Sentry initialized successfully', {
      environment: config.environment,
      dsn: `${config.dsn.substring(0, 20)}...`,
    });
  } catch (error) {
    Logger.error('❌ Failed to initialize Sentry', error);
  }
}

/**
 * Capture exception
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (!isSentryAvailable || !Sentry) {
    // Fallback: Just log to console if Sentry not available
    Logger.error('Error (Sentry not available):', error, context);
    return;
  }

  try {
    Sentry.captureException(error, {
      extra: context,
    });
  } catch (err) {
    Logger.error('Failed to capture exception in Sentry', err);
  }
}

/**
 * Capture message
 */
export function captureMessage(message: string, level: string = 'info', context?: Record<string, any>) {
  if (!isSentryAvailable || !Sentry) {
    Logger.info(message, context);
    return;
  }

  try {
    Sentry.captureMessage(message, {
      level: level as any,
      extra: context,
    });
  } catch (err) {
    Logger.error('Failed to capture message in Sentry', err);
  }
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; username?: string }) {
  if (!isSentryAvailable || !Sentry) return;
  
  try {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } catch (err) {
    Logger.error('Failed to set user in Sentry', err);
  }
}

/**
 * Clear user context
 */
export function clearUser() {
  if (!isSentryAvailable || !Sentry) return;
  
  try {
    Sentry.setUser(null);
  } catch (err) {
    Logger.error('Failed to clear user in Sentry', err);
  }
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: string = 'info',
  data?: Record<string, any>
) {
  if (!isSentryAvailable || !Sentry) {
    // Fallback: Log as debug message
    Logger.debug(`[${category}] ${message}`, data);
    return;
  }
  
  try {
    Sentry.addBreadcrumb({
      message,
      category,
      level: level as any,
      data,
    });
  } catch (err) {
    Logger.error('Failed to add breadcrumb in Sentry', err);
  }
}

/**
 * Start transaction for performance monitoring
 */
export function startTransaction(name: string, op: string) {
  if (!isSentryAvailable || !Sentry) return null;
  
  try {
    return Sentry.startTransaction({
      name,
      op,
    });
  } catch (err) {
    Logger.error('Failed to start transaction in Sentry', err);
    return null;
  }
}

/**
 * Set tag
 */
export function setTag(key: string, value: string) {
  if (!isSentryAvailable || !Sentry) return;
  
  try {
    Sentry.setTag(key, value);
  } catch (err) {
    Logger.error('Failed to set tag in Sentry', err);
  }
}

/**
 * Set context
 */
export function setContext(name: string, context: Record<string, any>) {
  if (!isSentryAvailable || !Sentry) return;
  
  try {
    Sentry.setContext(name, context);
  } catch (err) {
    Logger.error('Failed to set context in Sentry', err);
  }
}

/**
 * Flush events
 */
export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  if (!isSentryAvailable || !Sentry) return true;
  
  try {
    return await Sentry.flush(timeout);
  } catch (err) {
    Logger.error('Failed to flush Sentry', err);
    return false;
  }
}

/**
 * Close Sentry
 */
export async function closeSentry(timeout: number = 2000): Promise<boolean> {
  if (!isSentryAvailable || !Sentry) return true;
  
  try {
    return await Sentry.close(timeout);
  } catch (err) {
    Logger.error('Failed to close Sentry', err);
    return false;
  }
}

export default Sentry;


