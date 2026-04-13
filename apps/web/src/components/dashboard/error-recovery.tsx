/**
 * 🔄 Error Recovery Component
 * 
 * Provides automatic error recovery with retry logic, user feedback,
 * and graceful fallbacks for dashboard errors.
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/cn';
import { logger } from '@/lib/logger';

interface ErrorRecoveryProps {
  error: Error;
  resetError: () => void;
  onRetry?: () => Promise<void>;
  maxRetries?: number;
  autoRetry?: boolean;
  autoRetryDelay?: number;
  componentName?: string;
  /** SPA-friendly refresh (e.g. query invalidation) instead of full page reload */
  onRefreshPage?: () => void | Promise<void>;
  /** SPA navigation to home instead of window.location */
  onNavigateHome?: () => void;
}

/**
 * Classify error types for better handling
 */
function classifyError(error: Error): {
  type: 'network' | 'permission' | 'data' | 'unknown';
  severity: 'low' | 'medium' | 'high';
  recoverable: boolean;
} {
  const message = error.message.toLowerCase();
  
  // Network errors
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('timeout')
  ) {
    return { type: 'network', severity: 'medium', recoverable: true };
  }
  
  // Permission errors
  if (
    message.includes('permission') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('401') ||
    message.includes('403')
  ) {
    return { type: 'permission', severity: 'high', recoverable: false };
  }
  
  // Data errors
  if (
    message.includes('parse') ||
    message.includes('json') ||
    message.includes('invalid') ||
    message.includes('validation')
  ) {
    return { type: 'data', severity: 'medium', recoverable: true };
  }
  
  // Unknown errors
  return { type: 'unknown', severity: 'high', recoverable: true };
}

export function ErrorRecovery({
  error,
  resetError,
  onRetry,
  maxRetries = 3,
  autoRetry = true,
  autoRetryDelay = 5,
  componentName = 'Dashboard',
  onRefreshPage,
  onNavigateHome,
}: ErrorRecoveryProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(autoRetryDelay);
  const [retryHistory, setRetryHistory] = useState<Array<{ time: Date; success: boolean }>>([]);
  
  const errorInfo = classifyError(error);
  const canRetry = retryCount < maxRetries && errorInfo.recoverable;

  // Auto-retry countdown logic (deps intentionally narrow to avoid resetting the countdown on every render)
  useEffect(() => {
    if (autoRetry && canRetry && !isRetrying) {
      if (countdown > 0) {
        const timer = setTimeout(() => {
          setCountdown(prev => prev - 1);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        // Countdown reached 0, trigger retry
        handleRetry();
        setCountdown(autoRetryDelay);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handleRetry/autoRetryDelay omitted to preserve countdown behavior
  }, [countdown, autoRetry, canRetry, isRetrying]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      if (onRetry) {
        await onRetry();
      }
      
      // Success - record it
      setRetryHistory(prev => [...prev, { time: new Date(), success: true }]);
      
      // Reset error state
      resetError();
      setRetryCount(0);
      setCountdown(autoRetryDelay);
    } catch (err) {
      // Retry failed - record it
      setRetryHistory(prev => [...prev, { time: new Date(), success: false }]);
      logger.error(
        'Error recovery retry failed',
        err instanceof Error ? err : new Error(String(err))
      );
    } finally {
      setIsRetrying(false);
    }
  };

  const handleManualRetry = () => {
    setCountdown(0); // Trigger immediate retry
  };

  const handleGoHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      window.location.href = '/dashboard';
    }
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const handleReload = async () => {
    if (onRefreshPage) {
      await onRefreshPage();
    } else {
      window.location.reload();
    }
  };

  // Error severity styling
  const severityColors = {
    low: 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800/30 dark:bg-yellow-900/10',
    medium: 'border-orange-200 bg-orange-50/50 dark:border-orange-800/30 dark:bg-orange-900/10',
    high: 'border-red-200 bg-red-50/50 dark:border-red-800/30 dark:bg-red-900/10'
  };

  const severityTextColors = {
    low: 'text-yellow-800 dark:text-yellow-200',
    medium: 'text-orange-800 dark:text-orange-200',
    high: 'text-red-800 dark:text-red-200'
  };

  // Error type messages
  const errorMessages = {
    network: {
      title: 'Connection Issue',
      description: 'Unable to connect to the server. Please check your internet connection.',
      icon: '🌐'
    },
    permission: {
      title: 'Access Denied',
      description: 'You don\'t have permission to access this resource. Please contact your administrator.',
      icon: '🔒'
    },
    data: {
      title: 'Data Error',
      description: 'There was a problem processing the data. This is usually temporary.',
      icon: '📊'
    },
    unknown: {
      title: 'Something Went Wrong',
      description: 'An unexpected error occurred. Our team has been notified.',
      icon: '⚠️'
    }
  };

  const errorMsg = errorMessages[errorInfo.type];
  const progressPercentage = ((maxRetries - retryCount) / maxRetries) * 100;

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className={cn('w-full max-w-2xl', severityColors[errorInfo.severity])}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <AlertTriangle className={cn('h-8 w-8', severityTextColors[errorInfo.severity])} />
              </div>
              <div>
                <CardTitle className={cn('text-xl', severityTextColors[errorInfo.severity])}>
                  {errorMsg.icon} {errorMsg.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {componentName} Error
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {errorInfo.type}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Description */}
          <div>
            <p className={cn('text-sm font-medium', severityTextColors[errorInfo.severity])}>
              {errorMsg.description}
            </p>
            {error.message && (
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                {error.message}
              </p>
            )}
          </div>

          {/* Retry Status */}
          {canRetry && (
            <div className="space-y-3">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Retry attempts remaining
                  </span>
                  <span className="font-medium">
                    {maxRetries - retryCount} / {maxRetries}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              {/* Auto-retry countdown */}
              {autoRetry && !isRetrying && (
                <div className="flex items-center justify-between p-3 bg-background/50 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
                    <span className="text-sm">
                      {isRetrying ? 'Retrying...' : `Auto-retrying in ${countdown}s`}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Attempt {retryCount + 1}/{maxRetries}
                  </span>
                </div>
              )}

              {/* Manual retry in progress */}
              {isRetrying && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-800 dark:text-blue-200">
                    Attempting to recover... Please wait.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Max retries reached */}
          {!canRetry && retryCount >= maxRetries && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Maximum retry attempts reached
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                    Please try refreshing the page or contact support if the issue persists.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Permission error - non-recoverable */}
          {!errorInfo.recoverable && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    This error cannot be automatically recovered
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
                    Please check your permissions or contact your workspace administrator.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Retry History */}
          {retryHistory.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Recovery History ({retryHistory.length} attempts)
              </summary>
              <div className="mt-2 space-y-1 pl-4">
                {retryHistory.map((attempt, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {attempt.success ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-muted-foreground">
                      {attempt.time.toLocaleTimeString()} - {attempt.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            {canRetry && (
              <Button
                onClick={handleManualRetry}
                disabled={isRetrying}
                variant="default"
                size="sm"
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', isRetrying && 'animate-spin')} />
                Retry Now
              </Button>
            )}
            
            <Button
              onClick={handleReload}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>

            <Button
              onClick={handleGoBack}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>

            <Button
              onClick={handleGoHome}
              variant="ghost"
              size="sm"
            >
              <Home className="h-4 w-4 mr-2" />
              Dashboard Home
            </Button>
          </div>

          {/* Development Details */}
          {import.meta.env.DEV && (
            <details className="mt-4 pt-4 border-t">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Error Details (Development Only)
              </summary>
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <pre className="text-xs overflow-auto max-h-32 text-muted-foreground">
                  {error.stack || error.message}
                </pre>
                <div className="mt-2 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Error Type:</span>
                    <span className="font-mono">{errorInfo.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Severity:</span>
                    <span className="font-mono">{errorInfo.severity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recoverable:</span>
                    <span className="font-mono">{errorInfo.recoverable ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Compact error recovery for smaller sections
 */
export function CompactErrorRecovery({
  error,
  resetError,
  onRetry,
  componentName = 'Component'
}: Omit<ErrorRecoveryProps, 'maxRetries' | 'autoRetry' | 'autoRetryDelay'>) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      }
      resetError();
    } catch (err) {
      logger.error(
        'Compact error recovery retry failed',
        err instanceof Error ? err : new Error(String(err))
      );
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="p-4 border border-orange-200 bg-orange-50/50 dark:border-orange-800/30 dark:bg-orange-900/10 rounded-lg">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
            {componentName} failed to load
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-300 mt-0.5">
            {error.message || 'An error occurred'}
          </p>
        </div>
        <Button
          onClick={handleRetry}
          disabled={isRetrying}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={cn('h-3 w-3 mr-1', isRetrying && 'animate-spin')} />
          Retry
        </Button>
      </div>
    </div>
  );
}

