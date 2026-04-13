import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_BASE_URL, API_URL } from '@/constants/urls';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  const isDevelopment = import.meta.env.MODE === 'development';
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-red-700">
            Something went wrong
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            We encountered an unexpected error. Our team has been notified.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Error Details (Development Only) */}
          {isDevelopment && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-start space-x-2">
                <Bug className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-700 mb-2">
                    Development Error Details:
                  </h4>
                  <p className="text-sm text-red-600 font-mono break-all">
                    {error.message}
                  </p>
                  {error.stack && (
                    <details className="mt-2">
                      <summary className="text-sm text-red-600 cursor-pointer hover:text-red-700">
                        Stack Trace
                      </summary>
                      <pre className="text-xs text-red-500 mt-2 overflow-auto max-h-40 bg-white p-2 rounded border">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recovery Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={resetErrorBoundary} 
              className="flex items-center justify-center space-x-2"
              size="lg"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="flex items-center justify-center space-x-2"
              size="lg"
            >
              <Home className="h-4 w-4" />
              <span>Go Home</span>
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => window.location.reload()}
              className="flex items-center justify-center space-x-2"
              size="lg"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reload Page</span>
            </Button>
          </div>

          {/* Help Information */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Need help?</strong> If this error persists, please:
            </p>
            <ul className="text-sm text-blue-600 mt-2 space-y-1">
              <li>• Try refreshing the page or clearing your browser cache</li>
              <li>• Check your internet connection</li>
              <li>• Contact support if the problem continues</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface ErrorBoundaryProviderProps {
  children: React.ReactNode;
}

const logError = (error: Error, errorInfo: any) => {
  // Enhanced error logging
  const errorData = {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    userId: localStorage.getItem('userId') || 'anonymous',
  };

  // Log to console in development
  if (import.meta.env.MODE === 'development') {
    console.group('🚨 Error Boundary Triggered');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Additional Data:', errorData);
    console.groupEnd();
  }

  // TODO: Send to error tracking service (e.g., Sentry)
  // Example: Sentry.captureException(error, { extra: errorData });
  
  // Send to API endpoint for logging
  try {
    fetch(`${API_BASE_URL}/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData),
    }).catch(() => {
      // Silently fail to prevent error loops
    });
  } catch {
    // Silently fail to prevent error loops
  }
};

export const ErrorBoundaryProvider: React.FC<ErrorBoundaryProviderProps> = ({ children }) => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={logError}
      onReset={() => {
        // Clear any error state
        localStorage.removeItem('error-boundary-reset');
        // Optionally reload the page or reset app state
      }}
    >
      {children}
    </ErrorBoundary>
  );
};