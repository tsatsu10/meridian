/**
 * 🛡️ Root Error Boundary Component
 * 
 * Catches and handles React errors gracefully throughout the application.
 * Integrates with Sentry for error tracking and provides user-friendly error UI.
 * 
 * @epic-infrastructure: Production-ready error handling
 */

import React from 'react';
import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorCount: number;
}

/**
 * Root Error Boundary that catches all unhandled React errors
 */
export class RootErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('🚨 Error Boundary caught an error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
    }

    // Send to Sentry in production
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      level: 'error',
      tags: {
        errorBoundary: 'root',
        errorCount: this.state.errorCount + 1,
      },
    });

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      errorCount: this.state.errorCount + 1,
    });

    // Track error in analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: true,
      });
    }
  }

  handleReset = () => {
    // Clear error state
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });

    // Call custom reset handler if provided
    if (this.props.onReset) {
      this.props.onReset();
    }

    // Reload the page as fallback
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-12">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="w-16 h-16 text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* Error Message */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Oops! Something went wrong
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                We're sorry for the inconvenience. An unexpected error occurred.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {this.state.errorCount > 1 && (
                  <span className="text-orange-600 dark:text-orange-400 font-semibold">
                    Multiple errors detected ({this.state.errorCount}). 
                  </span>
                )}
                {' '}Our team has been notified and will investigate.
              </p>
            </div>

            {/* Error Details (Development Only) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">
                  Error Details (Development Mode)
                </h3>
                <div className="text-xs font-mono text-red-600 dark:text-red-400 overflow-auto max-h-40">
                  <p className="font-semibold mb-1">{this.state.error.name}: {this.state.error.message}</p>
                  {this.state.error.stack && (
                    <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-6 py-3 text-base"
                size="lg"
              >
                <RefreshCw className="w-5 h-5" />
                Reload Page
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex items-center justify-center gap-2 px-6 py-3 text-base"
                size="lg"
              >
                <Home className="w-5 h-5" />
                Go to Dashboard
              </Button>
            </div>

            {/* Help Text */}
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                If this problem persists, please{' '}
                <a
                  href="mailto:support@meridian.app"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  contact support
                </a>
                {' '}or try{' '}
                <button
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  clearing your browser cache
                </button>
                .
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <RootErrorBoundary fallback={fallback}>
        <Component {...props} />
      </RootErrorBoundary>
    );
  };
}

export default RootErrorBoundary;

