import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Users } from "lucide-react";

interface TeamErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  context?: string;
}

export function TeamErrorFallback({ error, resetError, context = "Teams" }: TeamErrorFallbackProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
          <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        </div>
        <CardTitle className="text-lg font-semibold text-orange-900 dark:text-orange-100">
          {context} Temporarily Unavailable
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          We're having trouble loading your teams. This usually resolves quickly.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && process.env.NODE_ENV === 'development' && (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
            <p className="text-xs text-orange-700 dark:text-orange-300 font-mono">
              {error.message}
            </p>
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          {resetError && (
            <Button onClick={resetError} className="w-full" variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Page
          </Button>
        </div>
        
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          If this issue continues, please check your internet connection or contact support.
        </p>
      </CardContent>
    </Card>
  );
}

export function TeamCardErrorFallback({ error, resetError }: TeamErrorFallbackProps) {
  return (
    <div className="border rounded-lg p-6 bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800">
      <div className="flex items-center justify-center space-x-2 text-orange-600 dark:text-orange-400 mb-3">
        <AlertTriangle className="h-5 w-5" />
        <span className="font-medium">Unable to load team</span>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
        This team card couldn't be displayed properly.
      </p>
      
      {resetError && (
        <Button onClick={resetError} size="sm" variant="outline" className="w-full">
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      )}
    </div>
  );
}