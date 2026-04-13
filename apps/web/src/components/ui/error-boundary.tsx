import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: any[];
  className?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
    this.setState({ error, errorInfo });
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when specified props change
    if (hasError && resetOnPropsChange && resetOnPropsChange.length > 0) {
      const hasChanged = resetOnPropsChange.some(
        (dep, index) => dep !== prevProps.resetOnPropsChange?.[index]
      );

      if (hasChanged) {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              We encountered an unexpected error while loading this component.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-xs">
                <summary className="cursor-pointer font-medium text-red-700 dark:text-red-300">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-red-100 p-2 dark:bg-red-900">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="text-red-700 border-red-300 hover:bg-red-100 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-900"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="text-red-700 border-red-300 hover:bg-red-100 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-900"
              >
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};

export default ErrorBoundary;