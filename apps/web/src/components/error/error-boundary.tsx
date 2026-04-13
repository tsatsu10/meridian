import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from "../../lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showErrorDetails?: boolean;
  context?: string; // e.g., "Teams", "Messages", "Dashboard"
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console and external service
    console.error('🔥 Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // Report to error tracking service (e.g., Sentry)
    // this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // TODO: Integrate with error tracking service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId,
    };
    
    logger.error("📊 Error report:");
    // Example: sendToErrorService(errorReport);
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, errorId } = this.state;
      const context = this.props.context || 'Application';

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-red-900 dark:text-red-100">
                Something went wrong in {context}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                We apologize for the inconvenience. An unexpected error occurred.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Error ID for support */}
              {errorId && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Error ID:</span> 
                    <code className="ml-2 font-mono text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                      {errorId}
                    </code>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Please include this ID when reporting the issue.
                  </p>
                </div>
              )}

              {/* Error details (only in development or when explicitly enabled) */}
              {(this.props.showErrorDetails || process.env.NODE_ENV === 'development') && error && (
                <details className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <summary className="cursor-pointer font-medium text-red-800 dark:text-red-200 mb-2">
                    <Bug className="inline h-4 w-4 mr-1" />
                    Technical Details (Click to expand)
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">Error Message:</h4>
                      <pre className="text-xs bg-red-100 dark:bg-red-900/40 p-2 rounded overflow-x-auto">
                        {error.message}
                      </pre>
                    </div>
                    {error.stack && (
                      <div>
                        <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">Stack Trace:</h4>
                        <pre className="text-xs bg-red-100 dark:bg-red-900/40 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div>
                        <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">Component Stack:</h4>
                        <pre className="text-xs bg-red-100 dark:bg-red-900/40 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={this.handleRetry} 
                  className="flex items-center gap-2"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                
                <Button 
                  onClick={this.handleReload} 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>
                
                <Button 
                  onClick={this.handleGoHome} 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Button>
              </div>

              {/* Help text */}
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                <p>If this problem persists, please contact support with the error ID above.</p>
              </div>
            </CardContent>
          </Card>
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

// Specialized error boundaries for different contexts
export const TeamsErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary context="Teams" showErrorDetails={false}>
    {children}
  </ErrorBoundary>
);

export const MessagingErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary context="Messaging" showErrorDetails={false}>
    {children}
  </ErrorBoundary>
);

export const DashboardErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary context="Dashboard" showErrorDetails={false}>
    {children}
  </ErrorBoundary>
);