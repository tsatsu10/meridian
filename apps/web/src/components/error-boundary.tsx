import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallbackUI?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the whole app.
 * 
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('❌ Error Boundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error monitoring service (e.g., Sentry)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI if provided
      if (this.props.fallbackUI) {
        return this.props.fallbackUI;
      }

      // Render default error UI
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
          <Card className="w-full max-w-2xl shadow-lg">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-destructive/10 p-3">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Something went wrong</CardTitle>
                  <CardDescription>
                    We encountered an unexpected error. Don't worry, your data is safe.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error message */}
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Error Details:</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {this.state.error?.message || 'Unknown error occurred'}
                </p>
              </div>

              {/* Development mode: Show stack trace */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="rounded-lg bg-muted p-4 space-y-2">
                  <summary className="text-sm font-medium text-foreground cursor-pointer">
                    Component Stack (Development Only)
                  </summary>
                  <pre className="text-xs text-muted-foreground font-mono overflow-auto max-h-64 mt-2">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              {/* Help text */}
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <FileQuestion className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  This error has been logged. If the problem persists, please try refreshing the page
                  or contact support with the error details above.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-wrap gap-2">
              <Button onClick={this.handleReset} variant="default" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={this.handleRefresh} variant="outline" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Go to Dashboard
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

/**
 * Hook-based wrapper for error boundary (for use with functional components)
 * Note: This doesn't catch errors in the component itself, only in children
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

// Default export for convenience
export default ErrorBoundary;
