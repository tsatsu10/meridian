import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service (Sentry, etc.)
    this.reportError(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetOnPropsChange) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Report to external error tracking service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        tags: {
          errorBoundary: true,
          errorId: this.state.errorId,
        },
      });
    }

    // Send to custom error reporting endpoint
    this.sendErrorReport(error, errorInfo);
  };

  private sendErrorReport = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          errorInfo: {
            componentStack: errorInfo.componentStack,
          },
          errorId: this.state.errorId,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleRetry = () => {
    this.resetErrorBoundary();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full mx-auto">
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-red-100 dark:bg-red-900 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Something went wrong
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  We're sorry, but something unexpected happened. Our team has been notified.
                </p>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-left">
                    <summary className="cursor-pointer font-medium text-gray-900 dark:text-white mb-2">
                      Error Details (Development)
                    </summary>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <div className="mb-2">
                        <strong>Error:</strong> {this.state.error.message}
                      </div>
                      <div className="mb-2">
                        <strong>Error ID:</strong> {this.state.errorId}
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <strong>Stack Trace:</strong>
                          <pre className="mt-1 text-xs overflow-auto max-h-32">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={this.handleRetry}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </button>
                  
                  <button
                    onClick={this.handleGoHome}
                    className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Go Home
                  </button>
                  
                  <button
                    onClick={this.handleReload}
                    className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload Page
                  </button>
                </div>

                <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
                  Error ID: {this.state.errorId}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for functional components to trigger error boundary
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    throw error;
  };
}

// Specialized error boundaries for different contexts
export const DashboardErrorBoundary = withErrorBoundary(
  ({ children }: { children: ReactNode }) => <>{children}</>,
  {
    fallback: (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center mb-4">
          <Bug className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
          <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
            Dashboard Error
          </h3>
        </div>
        <p className="text-red-700 dark:text-red-300 mb-4">
          There was an error loading the dashboard. Please refresh the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Refresh Dashboard
        </button>
      </div>
    ),
  }
);

export const ChartErrorBoundary = withErrorBoundary(
  ({ children }: { children: ReactNode }) => <>{children}</>,
  {
    fallback: (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">
            Chart failed to load
          </p>
        </div>
      </div>
    ),
  }
);

export const FormErrorBoundary = withErrorBoundary(
  ({ children }: { children: ReactNode }) => <>{children}</>,
  {
    fallback: (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-center mb-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2" />
          <span className="text-yellow-800 dark:text-yellow-200 font-medium">
            Form Error
          </span>
        </div>
        <p className="text-yellow-700 dark:text-yellow-300 text-sm">
          There was an error with the form. Please try again.
        </p>
      </div>
    ),
  }
);
