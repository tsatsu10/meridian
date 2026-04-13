/**
 * 🛡️ Route Error Boundary Component
 * 
 * Lighter-weight error boundary for individual routes.
 * Shows inline error UI without breaking the entire app layout.
 * 
 * @epic-infrastructure: Route-level error handling
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Route-level error boundary for individual pages/routes
 */
export class RouteErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console
    console.error('Route Error Boundary caught:', error, errorInfo);

    // Could send to analytics here if needed
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <RouteErrorFallback 
          error={this.state.error} 
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default fallback UI for route errors
 */
function RouteErrorFallback({ 
  error, 
  onReset 
}: { 
  error?: Error; 
  onReset: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
            <AlertCircle className="w-12 h-12 text-orange-600 dark:text-orange-400" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Something went wrong on this page
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We encountered an error while loading this page. Please try again.
        </p>

        {import.meta.env.DEV && error && (
          <div className="mb-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-left">
            <p className="text-xs font-mono text-red-600 dark:text-red-400 break-words">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={onReset}
            className="flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button
            onClick={() => navigate({ to: '/dashboard' })}
            variant="outline"
            className="flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}

export default RouteErrorBoundary;

