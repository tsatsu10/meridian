/**
 * 🛡️ Universal Error Boundary
 * Reusable error boundary for all dashboard routes
 * Prevents full page crashes and provides consistent error UX
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  routeName?: string;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class UniversalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ Error Boundary caught error:', error, errorInfo);

    // Send to Sentry
    Sentry.captureException(error, {
      tags: {
        component: 'UniversalErrorBoundary',
        route: this.props.routeName || 'unknown',
      },
      extra: {
        componentStack: errorInfo.componentStack,
        errorInfo,
      },
      level: 'error',
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50/50 dark:bg-gradient-dark">
          <Card className="w-full max-w-lg">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    {this.props.routeName ? `${this.props.routeName} Error` : 'Something Went Wrong'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {this.state.error?.message || 'An unexpected error occurred'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={this.handleReset} variant="default">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  If the problem persists, please contact support.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for easier usage
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  routeName?: string
) {
  return function WrappedComponent(props: P) {
    return (
      <UniversalErrorBoundary routeName={routeName}>
        <Component {...props} />
      </UniversalErrorBoundary>
    );
  };
}

