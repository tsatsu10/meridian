import * as Sentry from "@sentry/react";
import { logger } from "@/lib/logger";

export function initSentry() {
  // Only initialize Sentry in production
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,

      // Set environment
      environment: import.meta.env.MODE,

      // Performance Monitoring
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      // Performance monitoring sample rate
      tracesSampleRate: 0.1, // 10% of transactions

      // Session Replay sample rate
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

      // Filter out known errors
      beforeSend(event, hint) {
        // Filter out browser extension errors
        if (event.exception?.values?.[0]?.value?.includes('Extension context')) {
          return null;
        }

        // Filter out network errors (let query library handle these)
        if (event.message?.includes('NetworkError')) {
          return null;
        }

        return event;
      },

      // Set user context (if available)
      beforeBreadcrumb(breadcrumb) {
        // Don't log sensitive data in breadcrumbs
        if (breadcrumb.category === 'console') {
          return null;
        }
        return breadcrumb;
      },
    });

    logger.info('📊 Sentry error monitoring initialized');
  } else {
    logger.info('🔧 Sentry disabled in development mode');
  }
}

// Export Sentry for manual error reporting
export { Sentry };
