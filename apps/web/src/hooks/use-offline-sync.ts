// Phase 2: Offline Sync React Hook
// React integration for offline synchronization service

import { useState, useEffect, useCallback } from 'react';
import { offlineSyncService } from '@/services/offline-sync-service';

export interface OfflineSyncState {
  isOnline: boolean;
  pendingOperations: number;
  isSyncing: boolean;
  lastSyncTime: number | null;
}

export function useOfflineSync() {
  const [syncState, setSyncState] = useState<OfflineSyncState>({
    isOnline: navigator.onLine,
    pendingOperations: 0,
    isSyncing: false,
    lastSyncTime: null,
  });

  const [syncEvents, setSyncEvents] = useState<{
    lastMessageSync: { id: string; success: boolean; timestamp: number } | null;
    lastActivitySync: { id: string; success: boolean; timestamp: number } | null;
    lastFileSync: { id: string; success: boolean; timestamp: number } | null;
  }>({
    lastMessageSync: null,
    lastActivitySync: null,
    lastFileSync: null,
  });

  // Update sync state from service
  const updateSyncState = useCallback(async () => {
    const state = await offlineSyncService.getSyncState();
    if (state) {
      setSyncState(prev => ({
        ...prev,
        pendingOperations: state.pendingOperations,
        lastSyncTime: state.lastSyncTime,
      }));
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    // Online status changes
    const handleOnlineStatusChange = (isOnline: boolean) => {
      setSyncState(prev => ({ ...prev, isOnline }));
    };

    // Sync status changes
    const handleSyncStatusChange = (status: { pending: number; syncing: boolean }) => {
      setSyncState(prev => ({
        ...prev,
        pendingOperations: status.pending,
        isSyncing: status.syncing,
      }));
    };

    // Message sync events
    const handleMessageSynced = (messageId: string, success: boolean) => {
      setSyncEvents(prev => ({
        ...prev,
        lastMessageSync: {
          id: messageId,
          success,
          timestamp: Date.now(),
        },
      }));
    };

    // Activity sync events
    const handleActivitySynced = (activityId: string, success: boolean) => {
      setSyncEvents(prev => ({
        ...prev,
        lastActivitySync: {
          id: activityId,
          success,
          timestamp: Date.now(),
        },
      }));
    };

    // File sync events
    const handleFileSynced = (fileId: string, success: boolean) => {
      setSyncEvents(prev => ({
        ...prev,
        lastFileSync: {
          id: fileId,
          success,
          timestamp: Date.now(),
        },
      }));
    };

    // Register event listeners
    offlineSyncService.addEventListener('onOnlineStatusChange', handleOnlineStatusChange);
    offlineSyncService.addEventListener('onSyncStatusChange', handleSyncStatusChange);
    offlineSyncService.addEventListener('onMessageSynced', handleMessageSynced);
    offlineSyncService.addEventListener('onActivitySynced', handleActivitySynced);
    offlineSyncService.addEventListener('onFileSynced', handleFileSynced);

    // Initial state update
    updateSyncState();

    // Cleanup
    return () => {
      offlineSyncService.removeEventListener('onOnlineStatusChange', handleOnlineStatusChange);
      offlineSyncService.removeEventListener('onSyncStatusChange', handleSyncStatusChange);
      offlineSyncService.removeEventListener('onMessageSynced', handleMessageSynced);
      offlineSyncService.removeEventListener('onActivitySynced', handleActivitySynced);
      offlineSyncService.removeEventListener('onFileSynced', handleFileSynced);
    };
  }, [updateSyncState]);

  // Store message for offline sending
  const storeMessage = useCallback(async (messageData: {
    id: string;
    teamId: string;
    userEmail: string;
    content: string;
    messageType?: 'text' | 'file' | 'announcement';
    mentions?: string[];
    metadata?: Record<string, any>;
    replyTo?: string;
  }) => {
    try {
      const messageId = await offlineSyncService.storeMessage(messageData);
      await updateSyncState();
      return messageId;
    } catch (error) {
      console.error('Failed to store message offline:', error);
      throw error;
    }
  }, [updateSyncState]);

  // Store activity for offline logging
  const storeActivity = useCallback(async (activityData: {
    id: string;
    teamId: string;
    userEmail: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Record<string, any>;
  }) => {
    try {
      const activityId = await offlineSyncService.storeActivity(activityData);
      await updateSyncState();
      return activityId;
    } catch (error) {
      console.error('Failed to store activity offline:', error);
      throw error;
    }
  }, [updateSyncState]);

  // Store file for offline upload
  const storeFile = useCallback(async (fileData: {
    id: string;
    teamId: string;
    file: File;
    messageContent?: string;
  }) => {
    try {
      const fileId = await offlineSyncService.storeFile(fileData);
      await updateSyncState();
      return fileId;
    } catch (error) {
      console.error('Failed to store file offline:', error);
      throw error;
    }
  }, [updateSyncState]);

  // Force sync all pending operations
  const forcSync = useCallback(async () => {
    try {
      await offlineSyncService.syncPendingOperations();
      await updateSyncState();
    } catch (error) {
      console.error('Failed to force sync:', error);
      throw error;
    }
  }, [updateSyncState]);

  // Clear all offline data
  const clearOfflineData = useCallback(async () => {
    try {
      await offlineSyncService.clearOfflineData();
      await updateSyncState();
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }, [updateSyncState]);

  return {
    // State
    syncState,
    syncEvents,
    
    // Computed state
    hasPendingOperations: syncState.pendingOperations > 0,
    isOffline: !syncState.isOnline,
    needsSync: syncState.pendingOperations > 0 && syncState.isOnline,
    
    // Actions
    storeMessage,
    storeActivity,
    storeFile,
    forcSync,
    clearOfflineData,
    updateSyncState,
    
    // Service instance (for advanced usage)
    service: offlineSyncService,
  };
}

// Hook for offline-aware message sending
export function useOfflineMessage() {
  const { isOffline, storeMessage } = useOfflineSync();

  const sendMessageOfflineAware = useCallback(async (
    messageData: Parameters<typeof storeMessage>[0],
    onlineSendFn: () => Promise<any>
  ) => {
    if (isOffline) {
      // Store for offline sending
      return await storeMessage(messageData);
    } else {
      try {
        // Try to send online first
        return await onlineSendFn();
      } catch (error) {
        // If online sending fails, store for offline
        console.warn('Online sending failed, storing for offline sync:', error);
        return await storeMessage(messageData);
      }
    }
  }, [isOffline, storeMessage]);

  return {
    sendMessageOfflineAware,
    isOffline,
  };
}

// Hook for offline-aware activity logging
export function useOfflineActivity() {
  const { isOffline, storeActivity } = useOfflineSync();

  const logActivityOfflineAware = useCallback(async (
    activityData: Parameters<typeof storeActivity>[0],
    onlineLogFn: () => Promise<any>
  ) => {
    if (isOffline) {
      // Store for offline logging
      return await storeActivity(activityData);
    } else {
      try {
        // Try to log online first
        return await onlineLogFn();
      } catch (error) {
        // If online logging fails, store for offline
        console.warn('Online activity logging failed, storing for offline sync:', error);
        return await storeActivity(activityData);
      }
    }
  }, [isOffline, storeActivity]);

  return {
    logActivityOfflineAware,
    isOffline,
  };
}

// Hook for offline-aware file upload
export function useOfflineFileUpload() {
  const { isOffline, storeFile } = useOfflineSync();

  const uploadFileOfflineAware = useCallback(async (
    fileData: Parameters<typeof storeFile>[0],
    onlineUploadFn: () => Promise<any>
  ) => {
    if (isOffline) {
      // Store for offline upload
      return await storeFile(fileData);
    } else {
      try {
        // Try to upload online first
        return await onlineUploadFn();
      } catch (error) {
        // If online upload fails, store for offline
        console.warn('Online file upload failed, storing for offline sync:', error);
        return await storeFile(fileData);
      }
    }
  }, [isOffline, storeFile]);

  return {
    uploadFileOfflineAware,
    isOffline,
  };
}