/**
 * 🛡️ Chat Error Boundary
 * Prevents entire chat from crashing when component errors occur
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import * as Sentry from '@sentry/react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ChatErrorBoundary extends Component<Props, State> {
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
    logger.error('Chat Error Boundary caught error', { error, errorInfo });

    // Send to Sentry
    Sentry.captureException(error, {
      tags: {
        component: 'ChatErrorBoundary',
        feature: 'chat',
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
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50/50 dark:bg-gradient-dark">
          <Card className="w-full max-w-lg glass-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle>Chat Error</CardTitle>
                  <CardDescription>
                    Something went wrong with the chat interface
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200 font-mono">
                  {this.state.error?.message || 'Unknown error occurred'}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex-1"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Reload Chat
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                If the problem persists, please contact support or try again later.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Compact error fallback for inline usage
 */
export function ChatErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-lg mb-2">Chat Error</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {error.message || 'Something went wrong'}
        </p>
        <Button onClick={resetError} size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );
}

