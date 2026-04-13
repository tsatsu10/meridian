/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays a fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Home, Bug, Copy } from 'lucide-react';
import { ErrorHandler, ErrorSeverity } from '@/utils/error-handling';
import { logger } from '@/lib/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'critical';
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error using our standardized error handling
    const frontendError = ErrorHandler.handle(error, {
      context: 'ErrorBoundary',
      showToast: false, // Don't show toast as we'll show UI
      logError: true
    });

    this.setState({
      error,
      errorInfo,
      errorId: frontendError.code
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportErrorToService(error, errorInfo);
    }
  }

  private reportErrorToService(error: Error, errorInfo: ErrorInfo) {
    // In a real app, you would send this to an error reporting service like Sentry
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('userId') // if available
    };

    logger.error('🚨 Error reported to service:', errorReport);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  private copyErrorDetails = () => {
    const errorDetails = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        // Could show a toast here})
      .catch(err => {
        console.error('Failed to copy error details:', err);
      });
  };

  private renderErrorUI() {
    const { level = 'component', showDetails = process.env.NODE_ENV === 'development' } = this.props;
    const { error, errorInfo, errorId } = this.state;

    // Critical level errors take over the entire screen
    if (level === 'critical') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl text-red-600 dark:text-red-400">
                Critical Application Error
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                The application encountered a critical error and cannot continue.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {showDetails && error && (
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Error Details</span>
                    <Button variant="outline" size="sm" onClick={this.copyErrorDetails}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {error.message}
                  </pre>
                  {errorId && (
                    <Badge variant="secondary" className="mt-2">
                      ID: {errorId}
                    </Badge>
                  )}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={this.handleReload} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Application
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="flex-1">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Page level errors
    if (level === 'page') {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-lg">Page Error</CardTitle>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                This page encountered an error and cannot be displayed.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {showDetails && error && (
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm">
                  <code>{error.message}</code>
                  {errorId && (
                    <Badge variant="secondary" className="mt-2">
                      {errorId}
                    </Badge>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={this.handleRetry} size="sm" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Component level errors (default)
    return (
      <Card className="w-full border-orange-200 dark:border-orange-800">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Component Error
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                This section encountered an error and cannot be displayed.
              </p>
              {showDetails && error && (
                <details className="mt-2">
                  <summary className="text-xs text-orange-600 dark:text-orange-400 cursor-pointer">
                    Show Details
                  </summary>
                  <pre className="text-xs mt-1 text-orange-700 dark:text-orange-300 whitespace-pre-wrap">
                    {error.message}
                  </pre>
                </details>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleRetry}
              className="flex-shrink-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Otherwise, render our error UI
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

// Higher-Order Component for easy wrapping
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default ErrorBoundary;