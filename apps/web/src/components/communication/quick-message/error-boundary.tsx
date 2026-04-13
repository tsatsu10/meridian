import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from '@/lib/toast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class QuickMessageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for monitoring
    console.error('QuickMessage Error:', error);
    console.error('Error Info:', errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Show user-friendly error toast
    toast.error('Something went wrong with the message composer. Please try again.');
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 bg-white dark:bg-gray-900 rounded-lg border">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Something went wrong</h3>
          </div>
          
          <p className="text-sm text-muted-foreground text-center max-w-md">
            The message composer encountered an error. This might be due to a network issue or a temporary problem.
          </p>

          <div className="flex gap-2">
            <Button
              onClick={this.handleRetry}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded border text-xs">
              <summary className="cursor-pointer font-semibold text-red-800 dark:text-red-200">
                Error Details (Development)
              </summary>
              <div className="mt-2 space-y-2">
                <div>
                  <strong>Error:</strong> {this.state.error.message}
                </div>
                <div>
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap text-xs mt-1">
                    {this.state.error.stack}
                  </pre>
                </div>
                {this.state.errorInfo && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="whitespace-pre-wrap text-xs mt-1">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default QuickMessageErrorBoundary;