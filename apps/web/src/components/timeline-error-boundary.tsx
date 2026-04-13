import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary for Timeline Components
 * Catches rendering errors and displays a user-friendly fallback
 */
class TimelineErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Timeline Error:', error);
      console.error('Error Info:', errorInfo);
    }

    this.setState({
      error,
      errorInfo
    });

    // TODO: Send to error tracking service (e.g., Sentry)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle = 'Timeline Error', fallbackMessage = 'Something went wrong displaying the timeline' } = this.props;

      return (
        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{fallbackTitle}</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {fallbackMessage}. Please try refreshing the page or contact support if the problem persists.
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="w-full max-w-2xl text-left">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto">
                    {this.state.error.toString()}
                    {this.state.errorInfo && (
                      <>
                        {'\n\n'}
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </details>
              )}

              <div className="flex gap-3">
                <Button onClick={this.handleReset} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Refresh Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default TimelineErrorBoundary;

