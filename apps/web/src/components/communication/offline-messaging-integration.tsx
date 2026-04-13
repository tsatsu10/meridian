import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  MessageSquare, 
  AlertTriangle, 
  Settings,
  Info,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';
import { OfflineIndicator } from '@/components/ui/offline-indicator';
import { MessageConflictResolver } from '@/components/ui/message-conflict-resolver';
import { useOfflineSupport } from '@/hooks/useOfflineSupport';
import { logger } from "../../lib/logger";

interface MessageConflict {
  messageId: string;
  offlineMessage: {
    content: string;
    timestamp: number;
    author: string;
  };
  serverMessage: {
    content: string;
    timestamp: number;
    author: string;
  };
  conflictReason: string;
}

interface OfflineMessagingIntegrationProps {
  className?: string;
  showDetailedQueue?: boolean;
}

export function OfflineMessagingIntegration({ 
  className,
  showDetailedQueue = false 
}: OfflineMessagingIntegrationProps) {
  const {
    isOnline,
    serviceWorkerRegistered,
    offlineQueue,
    syncInProgress,
    forceSyncMessages,
    clearOfflineQueue
  } = useOfflineSupport();

  const [conflicts, setConflicts] = useState<MessageConflict[]>([]);
  const [showConflictDetails, setShowConflictDetails] = useState(false);

  // Listen for conflict messages from service worker
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data.type === 'MESSAGE_CONFLICT') {
        const conflict: MessageConflict = {
          messageId: event.data.messageId,
          offlineMessage: event.data.offlineMessage,
          serverMessage: event.data.serverMessage,
          conflictReason: event.data.conflictReason || 'Message already exists'
        };
        
        setConflicts(prev => [...prev, conflict]);
        setShowConflictDetails(true);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  const handleResolveConflict = async (messageId: string, resolution: 'keep-offline' | 'keep-server' | 'merge') => {
    // In a real implementation, this would send the resolution to the server
    logger.info("Resolving conflict ${messageId} with resolution: ${resolution}");
    
    // Remove the conflict from the list
    setConflicts(prev => prev.filter(c => c.messageId !== messageId));
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleDismissConflict = (messageId: string) => {
    setConflicts(prev => prev.filter(c => c.messageId !== messageId));
  };

  if (!serviceWorkerRegistered) {
    return (
      <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Offline support unavailable</span>
          </div>
          <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
            Service worker registration failed. Messages may not be saved when offline.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Offline Indicator */}
      <OfflineIndicator showQueue={showDetailedQueue} />
      
      {/* Message Conflicts */}
      {conflicts.length > 0 && (
        <MessageConflictResolver
          conflicts={conflicts}
          onResolveConflict={handleResolveConflict}
          onDismiss={handleDismissConflict}
        />
      )}

      {/* Offline Features Info */}
      {!isOnline && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-blue-800 dark:text-blue-200">
                  Offline Mode Active
                </h4>
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <p>✓ Your messages are being saved locally</p>
                  <p>✓ They'll sync automatically when connection returns</p>
                  <p>✓ You can continue using most chat features</p>
                </div>
                {offlineQueue.length > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <Badge variant="outline" className="text-blue-700 dark:text-blue-300">
                      {offlineQueue.length} messages queued
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={forceSyncMessages}
                      disabled={syncInProgress}
                      className="h-6 text-xs"
                    >
                      <RefreshCw className={cn("w-3 h-3 mr-1", syncInProgress && "animate-spin")} />
                      Retry Now
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Status */}
      {isOnline && syncInProgress && (
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-green-600 dark:text-green-400 animate-spin" />
              <div>
                <h4 className="font-medium text-green-800 dark:text-green-200">
                  Syncing Messages
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Sending {offlineQueue.length} queued messages to the server...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {isOnline && !syncInProgress && offlineQueue.length === 0 && (
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <h4 className="font-medium text-green-800 dark:text-green-200">
                  All Messages Synced
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your chat is fully up to date with the server.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}