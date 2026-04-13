import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Cloud,
  CloudOff,
  Download,
  Upload,
  Settings,
  X
} from 'lucide-react';
import { offlineManager } from '../mobile/OfflineManager';
import { syncManager } from '../mobile/SyncManager';
import { nativeFeatures } from '../mobile/NativeFeatures';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = '',
  showDetails = false,
  position = 'top-right',
  autoHide = true,
  autoHideDelay = 5000
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const [showIndicator, setShowIndicator] = useState(true);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [storageUsage, setStorageUsage] = useState<{
    used: number;
    available: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    const updateStatus = () => {
      const syncStatus = syncManager.getSyncStatus();
      const offlineStatus = offlineManager.getSyncStatus();
      
      setIsOnline(offlineStatus.isOnline);
      setIsSyncing(syncStatus.isSyncing);
      setPendingActions(syncStatus.pendingActions);
      setLastSyncTime(syncStatus.lastSyncTime);
      setSyncErrors(syncStatus.syncErrors);
    };

    const updateStorageUsage = async () => {
      try {
        const usage = await offlineManager.getStorageUsage();
        setStorageUsage(usage);
      } catch (error) {
        console.error('Failed to get storage usage:', error);
      }
    };

    // Initial update
    updateStatus();
    updateStorageUsage();

    // Set up event listeners
    const handleNetworkChange = () => {
      setIsOnline(navigator.onLine);
      updateStatus();
    };

    const handleSyncStatusChange = () => {
      updateStatus();
    };

    const handleSyncProgress = (progress: number) => {
      setSyncProgress(progress);
    };

    // Add listeners
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    syncManager.addEventListener('syncStatusChange', handleSyncStatusChange);
    syncManager.addEventListener('syncStart', () => setIsSyncing(true));
    syncManager.addEventListener('syncComplete', () => setIsSyncing(false));
    offlineManager.addEventListener('networkChange', handleNetworkChange);

    // Auto-hide indicator
    if (autoHide && isOnline && !isSyncing && pendingActions === 0) {
      const timer = setTimeout(() => {
        setShowIndicator(false);
      }, autoHideDelay);

      return () => clearTimeout(timer);
    } else {
      setShowIndicator(true);
    }

    // Update storage usage periodically
    const storageInterval = setInterval(updateStorageUsage, 30000);

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
      syncManager.removeEventListener('syncStatusChange', handleSyncStatusChange);
      offlineManager.removeEventListener('networkChange', handleNetworkChange);
      clearInterval(storageInterval);
    };
  }, [isOnline, isSyncing, pendingActions, autoHide, autoHideDelay]);

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      setSyncProgress(0);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await syncManager.forceSync();
      
      clearInterval(progressInterval);
      setSyncProgress(100);
      
      setTimeout(() => {
        setSyncProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  if (!showIndicator) return null;

  return (
    <>
      {/* Main Indicator */}
      <motion.div
        className={`fixed z-50 ${getPositionClasses()} ${className}`}
        initial={{ opacity: 0, scale: 0.8, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="w-80 shadow-lg border-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <CardTitle className="text-sm">
                  {isOnline ? 'Online' : 'Offline'}
                </CardTitle>
              </div>
              
              <div className="flex items-center gap-1">
                {isSyncing && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <RefreshCw className="w-4 h-4 text-blue-500" />
                  </motion.div>
                )}
                
                {pendingActions > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {pendingActions}
                  </Badge>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
                
                {autoHide && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto"
                    onClick={() => setShowIndicator(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-2">
              {/* Sync Progress */}
              {isSyncing && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>Syncing...</span>
                    <span>{syncProgress}%</span>
                  </div>
                  <Progress value={syncProgress} className="h-1" />
                </div>
              )}
              
              {/* Status Info */}
              <div className="text-xs text-gray-600 space-y-1">
                {pendingActions > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{pendingActions} pending changes</span>
                  </div>
                )}
                
                {lastSyncTime > 0 && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span>Last sync: {formatTimeAgo(lastSyncTime)}</span>
                  </div>
                )}
                
                {syncErrors.length > 0 && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-red-500" />
                    <span>{syncErrors.length} sync errors</span>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleManualSync}
                  disabled={isSyncing || !isOnline}
                  className="flex-1"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Sync Now
                </Button>
                
                {!isOnline && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                    className="flex-1"
                  >
                    <CloudOff className="w-3 h-3 mr-1" />
                    Offline Data
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Details Panel */}
      <AnimatePresence>
        {showDetailsPanel && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetailsPanel(false)}
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Offline Status</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetailsPanel(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {/* Connection Status */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Connection</h4>
                    <div className="flex items-center gap-2">
                      {isOnline ? (
                        <>
                          <Wifi className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Connected to internet</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-4 h-4 text-red-500" />
                          <span className="text-sm">No internet connection</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Sync Status */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Sync Status</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Pending changes:</span>
                        <span className="font-medium">{pendingActions}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Last sync:</span>
                        <span className="font-medium">
                          {lastSyncTime > 0 ? formatTimeAgo(lastSyncTime) : 'Never'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Sync errors:</span>
                        <span className="font-medium text-red-500">{syncErrors.length}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Storage Usage */}
                  {storageUsage && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Storage Usage</h4>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Used:</span>
                          <span>{formatBytes(storageUsage.used)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Available:</span>
                          <span>{formatBytes(storageUsage.available)}</span>
                        </div>
                        <Progress 
                          value={storageUsage.percentage} 
                          className="h-2"
                          color={storageUsage.percentage > 80 ? 'red' : 'blue'}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Device Capabilities */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Device Capabilities</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Cloud className="w-3 h-3" />
                        <span>Offline Storage</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        <span>Background Sync</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>Push Notifications</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="space-y-2 pt-4 border-t">
                    <Button
                      onClick={handleManualSync}
                      disabled={isSyncing || !isOnline}
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Force Sync
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Clear offline data
                        offlineManager.clearOfflineData();
                        setShowDetailsPanel(false);
                      }}
                      className="w-full"
                    >
                      <CloudOff className="w-4 h-4 mr-2" />
                      Clear Offline Data
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OfflineIndicator; 