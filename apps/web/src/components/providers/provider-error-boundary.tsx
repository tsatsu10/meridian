/**
 * Provider Error Boundary - Phase 2 Implementation
 * 
 * Granular error boundaries for provider-level failures with specific
 * recovery strategies and fallback components.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Settings, Users, Wifi } from 'lucide-react';

// ===== PROVIDER ERROR TYPES =====

type ProviderType = 'auth' | 'workspace' | 'settings' | 'realtime' | 'query' | 'unknown';

interface ProviderError extends Error {
  providerType?: ProviderType;
  retryable?: boolean;
  fallbackAvailable?: boolean;
}

interface Props {
  children: ReactNode;
  providerType: ProviderType;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  enableFallback?: boolean;
}

interface State {
  hasError: boolean;
  error?: ProviderError;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

// ===== PROVIDER ICONS =====

const getProviderIcon = (type: ProviderType) => {
  switch (type) {
    case 'auth': return Users;
    case 'workspace': return Home;
    case 'settings': return Settings;
    case 'realtime': return Wifi;
    default: return AlertTriangle;
  }
};

// ===== ERROR BOUNDARY COMPONENT =====

export class ProviderErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const providerError = error as ProviderError;
    return { 
      hasError: true, 
      error: providerError 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { providerType, onError } = this.props;
    
    // Enhanced error with provider context
    const enhancedError = error as ProviderError;
    enhancedError.providerType = providerType;
    enhancedError.retryable = this.isRetryableError(error);
    enhancedError.fallbackAvailable = this.props.enableFallback;
    
    this.setState({ error: enhancedError, errorInfo });
    
    // Log provider-specific error
    console.group(`🚨 ${providerType.toUpperCase()} Provider Error`);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Retry Count:', this.state.retryCount);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();
    
    // Call custom error handler
    if (onError) {
      onError(enhancedError, errorInfo);
    }
    
    // Auto-retry for specific errors
    if (this.shouldAutoRetry(enhancedError)) {
      this.scheduleAutoRetry();
    }
  }

  private isRetryableError = (error: Error): boolean => {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('temporary')
    );
  };

  private shouldAutoRetry = (error: ProviderError): boolean => {
    return (
      this.props.enableRetry !== false &&
      this.state.retryCount < this.maxRetries &&
      error.retryable &&
      this.props.providerType !== 'auth' // Don't auto-retry auth errors
    );
  };

  private scheduleAutoRetry = () => {
    this.retryTimeout = setTimeout(() => {
      this.handleRetry();
    }, Math.pow(2, this.state.retryCount) * 1000); // Exponential backoff
  };

  private clearRetryTimeout = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  };

  componentWillUnmount() {
    this.clearRetryTimeout();
  }

  private handleRetry = () => {
    this.clearRetryTimeout();
    this.setState(prevState => ({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1
    }));
  };

  private handleReset = () => {
    this.clearRetryTimeout();
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: 0
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { providerType } = this.props;
      const { error, retryCount } = this.state;
      const Icon = getProviderIcon(providerType);
      
      // Provider-specific error messages
      const getProviderMessage = () => {
        switch (providerType) {
          case 'auth':
            return 'Authentication system encountered an error. Please sign in again.';
          case 'workspace':
            return 'Workspace data could not be loaded. Some features may be unavailable.';
          case 'settings':
            return 'Settings could not be loaded. Default settings are being used.';
          case 'realtime':
            return 'Real-time features are temporarily unavailable. The app will work in offline mode.';
          case 'query':
            return 'Data synchronization is experiencing issues. Some information may be outdated.';
          default:
            return 'A system component encountered an error.';
        }
      };

      const getProviderActions = () => {
        const actions = [];

        // Retry button (if retryable and under limit)
        if (this.props.enableRetry !== false && error.retryable && retryCount < this.maxRetries) {
          actions.push(
            <Button key="retry" onClick={this.handleRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry ({this.maxRetries - retryCount} attempts left)
            </Button>
          );
        }

        // Reset button
        actions.push(
          <Button key="reset" variant="outline" onClick={this.handleReset} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset {providerType}
          </Button>
        );

        // Navigation options
        if (providerType !== 'auth') {
          actions.push(
            <Button key="home" variant="outline" onClick={this.handleGoHome} className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          );
        }

        // Reload as last resort
        actions.push(
          <Button key="reload" variant="ghost" onClick={this.handleReload} className="w-full">
            Reload Page
          </Button>
        );

        return actions;
      };

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl text-gray-900 dark:text-gray-100">
                {providerType.charAt(0).toUpperCase() + providerType.slice(1)} Error
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-center">
                {getProviderMessage()}
              </p>

              {/* Retry count indicator */}
              {retryCount > 0 && (
                <div className="text-sm text-gray-500 text-center">
                  Retry attempts: {retryCount}/{this.maxRetries}
                </div>
              )}
              
              {/* Development error details */}
              {import.meta.env.DEV && error && (
                <details className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Error Details (Development)
                  </summary>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div><strong>Provider:</strong> {providerType}</div>
                    <div><strong>Retryable:</strong> {error.retryable ? 'Yes' : 'No'}</div>
                    <div><strong>Message:</strong> {error.message}</div>
                    <div><strong>Stack:</strong></div>
                    <pre className="whitespace-pre-wrap overflow-x-auto text-xs">
                      {error.stack}
                    </pre>
                    {this.state.errorInfo && (
                      <>
                        <div><strong>Component Stack:</strong></div>
                        <pre className="whitespace-pre-wrap overflow-x-auto text-xs">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </>
                    )}
                  </div>
                </details>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                {getProviderActions()}
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {providerType === 'auth' 
                  ? 'If this problem persists, please clear your browser data and try again.'
                  : 'If this problem persists, please contact support.'
                }
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// ===== CONVENIENCE WRAPPERS =====

export function AuthErrorBoundary({ children, ...props }: Omit<Props, 'providerType'>) {
  return (
    <ProviderErrorBoundary providerType="auth" {...props}>
      {children}
    </ProviderErrorBoundary>
  );
}

export function WorkspaceErrorBoundary({ children, ...props }: Omit<Props, 'providerType'>) {
  return (
    <ProviderErrorBoundary providerType="workspace" enableFallback {...props}>
      {children}
    </ProviderErrorBoundary>
  );
}

export function SettingsErrorBoundary({ children, ...props }: Omit<Props, 'providerType'>) {
  return (
    <ProviderErrorBoundary providerType="settings" enableFallback {...props}>
      {children}
    </ProviderErrorBoundary>
  );
}

export function RealtimeErrorBoundary({ children, ...props }: Omit<Props, 'providerType'>) {
  return (
    <ProviderErrorBoundary providerType="realtime" enableRetry enableFallback {...props}>
      {children}
    </ProviderErrorBoundary>
  );
}

export function QueryErrorBoundary({ children, ...props }: Omit<Props, 'providerType'>) {
  return (
    <ProviderErrorBoundary providerType="query" enableRetry {...props}>
      {children}
    </ProviderErrorBoundary>
  );
}

export default ProviderErrorBoundary;