import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Cloud
} from 'lucide-react';
import { offlineManager } from '@/mobile/OfflineManager';
import { syncManager } from '@/mobile/SyncManager';
import { toast } from '@/lib/toast';

interface OfflineStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const OfflineStatusIndicator: React.FC<OfflineStatusIndicatorProps> = ({
  className = '',
  showDetails = false
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

  useEffect(() => {
    const updateStatus = () => {
      const offlineStatus = offlineManager.getSyncStatus();
      const syncStatus = syncManager.getSyncStatus();
      
      setIsOnline(offlineStatus.isOnline);
      setIsSyncing(syncStatus.isSyncing);
      setPendingActions(offlineStatus.pendingActions);
      setLastSyncTime(syncStatus.lastSyncTime);
    };

    // Initial status
    updateStatus();

    // Listen for status changes
    const handleNetworkChange = (data: { isOnline: boolean }) => {
      setIsOnline(data.isOnline);
      updateStatus();
    };

    const handleSyncStatusChange = () => {
      updateStatus();
    };

    const handleSyncQueueUpdate = (data: { pendingActions: number }) => {
      setPendingActions(data.pendingActions);
    };

    offlineManager.addEventListener('networkChange', handleNetworkChange);
    syncManager.addEventListener('syncStatusChange', handleSyncStatusChange);
    syncManager.addEventListener('syncQueueUpdate', handleSyncQueueUpdate);

    // Update status periodically
    const interval = setInterval(updateStatus, 5000);

    return () => {
      offlineManager.removeEventListener('networkChange', handleNetworkChange);
      syncManager.removeEventListener('syncStatusChange', handleSyncStatusChange);
      syncManager.removeEventListener('syncQueueUpdate', handleSyncQueueUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      await syncManager.forceSync();
      toast.success('Your data has been synchronized successfully.');
    } catch (error) {
      toast.error('Failed to synchronize data. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (isSyncing) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (pendingActions > 0) return <Clock className="w-4 h-4" />;
    return <Wifi className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (pendingActions > 0) return `${pendingActions} pending`;
    return 'Online';
  };

  const getStatusVariant = () => {
    if (!isOnline) return 'destructive';
    if (isSyncing || pendingActions > 0) return 'secondary';
    return 'default';
  };

  if (!showDetails) {
    return (
      <Badge 
        variant={getStatusVariant()} 
        className={`flex items-center gap-1 ${className}`}
        data-testid="offline-status-indicator"
      >
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
    );
  }

  return (
    <Card className={`w-80 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">Connection Status</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleManualSync}
            disabled={isSyncing || !isOnline}
          >
            <Cloud className="w-4 h-4 mr-1" />
            Sync
          </Button>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={!isOnline ? 'text-red-600' : 'text-green-600'}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Sync Status:</span>
            <span className={isSyncing ? 'text-blue-600' : 'text-gray-600'}>
              {isSyncing ? 'Syncing...' : 'Idle'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Pending Actions:</span>
            <span className={pendingActions > 0 ? 'text-orange-600' : 'text-gray-600'}>
              {pendingActions}
            </span>
          </div>
          
          {lastSyncTime > 0 && (
            <div className="flex justify-between">
              <span>Last Sync:</span>
              <span className="text-gray-600">
                {new Date(lastSyncTime).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
        
        {!isOnline && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                You're offline. Changes will be synced when connection is restored.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OfflineStatusIndicator; 