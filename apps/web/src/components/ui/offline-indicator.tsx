import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  MessageSquare, 
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useOfflineSupport } from '@/hooks/useOfflineSupport';

interface OfflineIndicatorProps {
  className?: string;
  showQueue?: boolean;
}

export function OfflineIndicator({ className, showQueue = false }: OfflineIndicatorProps) {
  const {
    isOnline,
    serviceWorkerRegistered,
    offlineQueue,
    syncInProgress,
    forceSyncMessages,
    clearOfflineQueue
  } = useOfflineSupport();

  if (!serviceWorkerRegistered) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Connection Status */}
      <Card className={cn(
        "flex items-center gap-3 p-3 transition-colors",
        isOnline 
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
          : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
      )}>
        <div className={cn(
          "w-3 h-3 rounded-full",
          isOnline ? "bg-green-500 animate-pulse" : "bg-orange-500"
        )} />
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span className="font-medium text-sm">
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {offlineQueue.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {offlineQueue.length} queued
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isOnline 
              ? 'All features available' 
              : 'Messages will be sent when connection is restored'
            }
          </p>
        </div>

        {!isOnline && offlineQueue.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={forceSyncMessages}
            disabled={syncInProgress}
            className="h-8"
          >
            <RefreshCw className={cn("w-3 h-3 mr-1", syncInProgress && "animate-spin")} />
            {syncInProgress ? 'Syncing...' : 'Retry'}
          </Button>
        )}
      </Card>

      {/* Offline Queue */}
      {showQueue && offlineQueue.length > 0 && (
        <Card className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium text-sm">Queued Messages</span>
              <Badge variant="outline" className="text-xs">
                {offlineQueue.length}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearOfflineQueue}
              className="h-6 text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>

          <div className="space-y-2 max-h-32 overflow-y-auto">
            {offlineQueue.map((message, index) => (
              <div
                key={message.id}
                className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs"
              >
                <div className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  message.retryCount > 0 
                    ? "bg-orange-500" 
                    : "bg-blue-500"
                )} />
                
                <div className="flex-1 min-w-0">
                  <p className="truncate">
                    Message #{index + 1}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                    {message.retryCount > 0 && (
                      <span className="text-orange-600">
                        {message.retryCount} retries
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {message.retryCount > 0 ? (
                    <AlertCircle className="w-3 h-3 text-orange-500" />
                  ) : (
                    <Clock className="w-3 h-3 text-blue-500" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {syncInProgress && (
            <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Syncing messages...
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}