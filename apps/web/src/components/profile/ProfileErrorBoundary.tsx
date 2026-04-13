/**
 * Error Boundary for Profile Components
 * Catches and gracefully handles errors in profile-related components
 */
"use client";

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCcw } from 'lucide-react';

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

export class ProfileErrorBoundary extends Component<Props, State> {
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error('ProfileErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Update state with error details
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
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/20">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-destructive">Something went wrong</CardTitle>
                <CardDescription>
                  There was an error loading the profile information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {this.state.error && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm font-mono text-muted-foreground">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={this.handleReset}
                variant="outline"
                className="gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Try Again
              </Button>
              
              <Button 
                onClick={() => window.location.reload()}
                variant="secondary"
              >
                Reload Page
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4 p-4 rounded-lg bg-muted/30 border border-border">
                <summary className="cursor-pointer text-sm font-medium mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="text-xs overflow-auto p-2 bg-muted rounded">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error handler for functional components
 * Use with try-catch blocks to show user-friendly errors
 */
export function useProfileErrorHandler() {
  const handleError = React.useCallback((error: unknown, context?: string) => {
    console.error(`Profile error ${context ? `(${context})` : ''}:`, error);
    
    // Determine user-friendly error message
    let message = 'An unexpected error occurred';
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        message = 'Please sign in again to continue';
      } else if (error.message.includes('403') || error.message.includes('forbidden')) {
        message = 'You don\'t have permission to perform this action';
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        message = 'Profile not found';
      } else if (error.message.includes('500') || error.message.includes('server')) {
        message = 'Server error. Please try again later';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        message = 'Network error. Please check your connection';
      } else {
        message = error.message;
      }
    }
    
    return {
      message,
      isAuthError: message.includes('sign in'),
      isPermissionError: message.includes('permission'),
      isNetworkError: message.includes('Network') || message.includes('connection'),
    };
  }, []);

  return { handleError };
}

/**
 * Simple error display component
 * Use this for inline error messages within forms
 */
export function ProfileErrorMessage({ 
  error, 
  retry 
}: { 
  error: string | Error; 
  retry?: () => void;
}) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
      <p className="text-sm text-destructive flex-1">{errorMessage}</p>
      {retry && (
        <Button 
          onClick={retry} 
          size="sm" 
          variant="outline"
          className="gap-2 flex-shrink-0"
        >
          <RefreshCcw className="h-3 w-3" />
          Retry
        </Button>
      )}
    </div>
  );
}

