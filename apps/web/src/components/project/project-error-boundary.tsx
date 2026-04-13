import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  Bug, 
  Shield,
  ArrowLeft,
  Home,
  FileText
} from 'lucide-react';
import { toast } from '@/lib/toast';

// Error types for categorization
enum ErrorType {
  NETWORK = 'network',
  PERMISSION = 'permission',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown',
  CHUNK_LOAD = 'chunk_load',
  MEMORY = 'memory'
}

// Enhanced error info with context
interface EnhancedErrorInfo extends ErrorInfo {
  projectId?: string;
  workspaceId?: string;
  view?: string;
  userAgent?: string;
  timestamp?: Date;
  errorBoundary?: string;
}

// Error boundary state
interface ProjectErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: EnhancedErrorInfo | null;
  errorType: ErrorType;
  retryCount: number;
  isRecovering: boolean;
}

// Props for the error boundary
interface ProjectErrorBoundaryProps {
  children: ReactNode;
  projectId?: string;
  workspaceId?: string;
  view?: string;
  fallback?: (error: Error, errorInfo: EnhancedErrorInfo, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: EnhancedErrorInfo) => void;
  maxRetries?: number;
  autoRetryDelay?: number;
  showDetailedError?: boolean;
}

// Error classification utility
const classifyError = (error: Error): ErrorType => {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';
  
  if (message.includes('network') || message.includes('fetch')) {
    return ErrorType.NETWORK;
  }
  
  if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
    return ErrorType.PERMISSION;
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return ErrorType.VALIDATION;
  }
  
  if (message.includes('loading chunk') || stack.includes('chunk')) {
    return ErrorType.CHUNK_LOAD;
  }
  
  if (message.includes('memory') || message.includes('heap')) {
    return ErrorType.MEMORY;
  }
  
  return ErrorType.UNKNOWN;
};

// Error reporting utility
const reportError = async (error: Error, errorInfo: EnhancedErrorInfo) => {
  try {
    // In a real app, this would send to error tracking service
    console.group('🚨 Project Error Boundary');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Stack:', error.stack);
    console.groupEnd();
    
    // Could integrate with Sentry, LogRocket, etc.
    // await errorTrackingService.captureException(error, { extra: errorInfo });
  } catch (reportingError) {
    console.error('Failed to report error:', reportingError);
  }
};

// Default error fallback component
const DefaultErrorFallback: React.FC<{
  error: Error;
  errorInfo: EnhancedErrorInfo;
  errorType: ErrorType;
  retryCount: number;
  onRetry: () => void;
  onGoHome: () => void;
  onGoBack: () => void;
  showDetails: boolean;
  onToggleDetails: () => void;
}> = ({ 
  error, 
  errorInfo, 
  errorType, 
  retryCount, 
  onRetry, 
  onGoHome, 
  onGoBack,
  showDetails,
  onToggleDetails
}) => {
  const getErrorTitle = () => {
    switch (errorType) {
      case ErrorType.NETWORK:
        return 'Connection Error';
      case ErrorType.PERMISSION:
        return 'Access Denied';
      case ErrorType.VALIDATION:
        return 'Data Validation Error';
      case ErrorType.CHUNK_LOAD:
        return 'Loading Error';
      case ErrorType.MEMORY:
        return 'Memory Error';
      default:
        return 'Unexpected Error';
    }
  };
  
  const getErrorMessage = () => {
    switch (errorType) {
      case ErrorType.NETWORK:
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case ErrorType.PERMISSION:
        return 'You don\'t have permission to access this resource. Please contact your administrator.';
      case ErrorType.VALIDATION:
        return 'There was a problem with the data. Please refresh the page and try again.';
      case ErrorType.CHUNK_LOAD:
        return 'Failed to load application resources. This may be due to a new version being deployed.';
      case ErrorType.MEMORY:
        return 'The application is using too much memory. Please close other tabs and refresh.';
      default:
        return 'Something went wrong. Our team has been notified and is working on a fix.';
    }
  };
  
  const getErrorIcon = () => {
    switch (errorType) {
      case ErrorType.NETWORK:
        return <AlertTriangle className="h-8 w-8 text-orange-500" />;
      case ErrorType.PERMISSION:
        return <Shield className="h-8 w-8 text-red-500" />;
      case ErrorType.CHUNK_LOAD:
        return <RefreshCw className="h-8 w-8 text-blue-500" />;
      default:
        return <Bug className="h-8 w-8 text-red-500" />;
    }
  };
  
  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getErrorIcon()}
          </div>
          <CardTitle className="text-2xl font-bold">
            {getErrorTitle()}
          </CardTitle>
          <div className="flex justify-center space-x-2 mt-2">
            <Badge variant="secondary">
              {errorInfo.view || 'Project View'}
            </Badge>
            {retryCount > 0 && (
              <Badge variant="outline">
                Retry #{retryCount}
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            {getErrorMessage()}
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onRetry} className="flex items-center">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <Button variant="outline" onClick={onGoBack} className="flex items-center">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            
            <Button variant="outline" onClick={onGoHome} className="flex items-center">
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>
          
          {/* Error Details Toggle */}
          <div className="border-t pt-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onToggleDetails}
              className="w-full flex items-center justify-center"
            >
              <FileText className="h-4 w-4 mr-2" />
              {showDetails ? 'Hide' : 'Show'} Technical Details
            </Button>
            
            {showDetails && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="space-y-2 text-sm font-mono">
                  <div><strong>Error:</strong> {error.message}</div>
                  <div><strong>Component:</strong> {errorInfo.componentStack?.split('\n')[1]?.trim()}</div>
                  <div><strong>Timestamp:</strong> {errorInfo.timestamp?.toISOString()}</div>
                  {errorInfo.projectId && (
                    <div><strong>Project ID:</strong> {errorInfo.projectId}</div>
                  )}
                  {errorInfo.workspaceId && (
                    <div><strong>Workspace ID:</strong> {errorInfo.workspaceId}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main error boundary class
class ProjectErrorBoundary extends Component<ProjectErrorBoundaryProps, ProjectErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private showDetailsState = false;

  constructor(props: ProjectErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: ErrorType.UNKNOWN,
      retryCount: 0,
      isRecovering: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ProjectErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorType: classifyError(error)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const enhancedErrorInfo: EnhancedErrorInfo = {
      ...errorInfo,
      projectId: this.props.projectId,
      workspaceId: this.props.workspaceId,
      view: this.props.view,
      userAgent: navigator.userAgent,
      timestamp: new Date(),
      errorBoundary: 'ProjectErrorBoundary'
    };

    this.setState({
      errorInfo: enhancedErrorInfo
    });

    // Report error
    reportError(error, enhancedErrorInfo);

    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, enhancedErrorInfo);
    }

    // Auto-retry for certain error types
    if (this.shouldAutoRetry(error) && this.state.retryCount < (this.props.maxRetries || 3)) {
      this.scheduleAutoRetry();
    }

    // Show toast notification
    toast.error(`${classifyError(error)} Error`, {
      description: error.message,
      action: {
        label: 'Retry',
        onClick: () => this.handleRetry()
      }
    });
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private shouldAutoRetry = (error: Error): boolean => {
    const errorType = classifyError(error);
    return errorType === ErrorType.NETWORK || errorType === ErrorType.CHUNK_LOAD;
  };

  private scheduleAutoRetry = () => {
    const delay = this.props.autoRetryDelay || 3000;
    
    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry();
    }, delay);
  };

  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isRecovering: true
    }));

    // Clear recovery state after a short delay
    setTimeout(() => {
      this.setState({ isRecovering: false });
    }, 1000);

    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  };

  private handleGoBack = () => {
    window.history.back();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private handleToggleDetails = () => {
    this.showDetailsState = !this.showDetailsState;
    this.forceUpdate();
  };

  render() {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo,
          this.handleRetry
        );
      }

      // Use default fallback
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorType={this.state.errorType}
          retryCount={this.state.retryCount}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
          onGoBack={this.handleGoBack}
          showDetails={this.showDetailsState}
          onToggleDetails={this.handleToggleDetails}
        />
      );
    }

    return this.props.children;
  }
}

export default ProjectErrorBoundary;
export { ErrorType, type EnhancedErrorInfo, type ProjectErrorBoundaryProps };