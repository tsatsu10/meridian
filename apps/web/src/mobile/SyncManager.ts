import { offlineManager, OfflineAction, SyncStatus } from './OfflineManager';
import { toast } from '@/lib/toast';
import { errorHandler } from './ErrorHandler';
import { logger } from "../lib/logger";
import { API_BASE_URL } from "@/constants/urls";

export interface SyncConfig {
  autoSync: boolean;
  syncInterval: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
  conflictResolution: 'server-wins' | 'client-wins' | 'manual' | 'merge';
  syncOnNetworkChange: boolean;
  syncOnAppFocus: boolean;
}

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  conflicts: number;
  errors: string[];
  timestamp: number;
}

export interface ConflictData {
  id: string;
  entity: string;
  serverVersion: any;
  clientVersion: any;
  lastModified: {
    server: number;
    client: number;
  };
  resolution?: 'server' | 'client' | 'merge';
}

export class SyncManager {
  private static instance: SyncManager;
  private config: SyncConfig;
  private syncInProgress = false;
  private lastSyncTime = 0;
  private conflicts: ConflictData[] = [];
  private listeners: Map<string, Function[]> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = {
      autoSync: true,
      syncInterval: 30000, // 30 seconds
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      conflictResolution: 'server-wins',
      syncOnNetworkChange: true,
      syncOnAppFocus: true
    };

    this.initializeSyncManager();
  }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  private async initializeSyncManager(): Promise<void> {
    try {
      // Set up event listeners
      this.setupEventListeners();

      // Start auto-sync if enabled
      if (this.config.autoSync) {
        this.startAutoSync();
      }

      // Perform initial sync
      await this.performInitialSync();

      logger.info("Sync Manager initialized successfully");
    } catch (error) {
      console.error('Failed to initialize Sync Manager:', error);
    }
  }

  private setupEventListeners(): void {
    // Network change events
    if (this.config.syncOnNetworkChange) {
      window.addEventListener('online', () => {
        this.handleNetworkChange(true);
      });

      window.addEventListener('offline', () => {
        this.handleNetworkChange(false);
      });
    }

    // App focus events
    if (this.config.syncOnAppFocus) {
      window.addEventListener('focus', () => {
        this.handleAppFocus();
      });

      window.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.handleAppFocus();
        }
      });
    }

    // Listen to offline manager events
    offlineManager.addEventListener('networkChange', (data: { isOnline: boolean }) => {
      this.handleNetworkChange(data.isOnline);
    });

    offlineManager.addEventListener('syncQueueUpdate', (data: { pendingActions: number }) => {
      this.notifyListeners('syncQueueUpdate', data);
    });
  }

  private async handleNetworkChange(isOnline: boolean): Promise<void> {
    if (isOnline) {
      // Network restored - perform sync
      await this.sync();
    } else {
      // Network lost - stop sync
      this.stopAutoSync();
    }
  }

  private async handleAppFocus(): Promise<void> {
    // App focused - check for updates and sync if needed
    const timeSinceLastSync = Date.now() - this.lastSyncTime;
    if (timeSinceLastSync > this.config.syncInterval) {
      await this.sync();
    }
  }

  private async performInitialSync(): Promise<void> {
    try {
      // Check if we have offline data to restore
      const offlineData = await offlineManager.restoreData();
      if (offlineData) {
        await this.restoreFromOfflineData(offlineData);
      }

      // Perform initial sync with server if online
      if (navigator.onLine) {
        await this.sync();
      }
    } catch (error) {
      console.error('Initial sync failed:', error);
      // Don't rethrow - allow sync manager to initialize even if initial sync fails
      await errorHandler.handleSyncError(
        error instanceof Error ? error : new Error(String(error)),
        { component: 'sync-manager', action: 'initial-sync' }
      );
    }
  }

  private async restoreFromOfflineData(data: any): Promise<void> {
    try {
      // Restore tasks
      if (data.tasks) {
        for (const task of data.tasks) {
          await offlineManager.saveData('tasks', task);
        }
      }

      // Restore projects
      if (data.projects) {
        for (const project of data.projects) {
          await offlineManager.saveData('projects', project);
        }
      }

      // Restore comments
      if (data.comments) {
        for (const comment of data.comments) {
          await offlineManager.saveData('comments', comment);
        }
      }

      // Restore time entries
      if (data.timeEntries) {
        for (const timeEntry of data.timeEntries) {
          await offlineManager.saveData('timeEntries', timeEntry);
        }
      }

      logger.info("Offline data restored successfully");
    } catch (error) {
      console.error('Failed to restore offline data:', error);
    }
  }

  private startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (navigator.onLine && !this.syncInProgress) {
        await this.sync();
      }
    }, this.config.syncInterval);
  }

  private stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async sync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        syncedItems: 0,
        conflicts: 0,
        errors: ['Sync already in progress'],
        timestamp: Date.now()
      };
    }

    if (!navigator.onLine) {
      return {
        success: false,
        syncedItems: 0,
        conflicts: 0,
        errors: ['No internet connection'],
        timestamp: Date.now()
      };
    }

    this.syncInProgress = true;
    this.notifyListeners('syncStart', { timestamp: Date.now() });

    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      conflicts: 0,
      errors: [],
      timestamp: Date.now()
    };

    try {
      // Perform sync operations
      const syncOperation = async () => {
        // Sync local changes to server
        const uploadResult = await this.syncLocalToServer();
        result.syncedItems += uploadResult.syncedItems;
        result.conflicts += uploadResult.conflicts;
        result.errors.push(...uploadResult.errors);

        // Sync server changes to local
        const downloadResult = await this.syncServerToLocal();
        result.syncedItems += downloadResult.syncedItems;
        result.conflicts += downloadResult.conflicts;
        result.errors.push(...downloadResult.errors);

        // Update last sync time
        this.lastSyncTime = Date.now();

        // Handle conflicts
        if (result.conflicts > 0) {
          await this.handleConflicts();
        }

        result.success = result.errors.length === 0;
        return result;
      };

      const syncResult = await syncOperation();

      this.notifyListeners('syncComplete', syncResult);

      // Only show toast for actual sync operations (not when sync is disabled)
      if (syncResult.success && syncResult.syncedItems > 0) {
        toast.success(`Successfully synced ${syncResult.syncedItems} items.`);
      } else if (!syncResult.success && syncResult.errors.length > 0) {
        // Don't show toast for expected "temporarily disabled" error
        const hasRealErrors = syncResult.errors.some(err => !err.includes('temporarily disabled'));
        if (hasRealErrors) {
          toast.error(`${syncResult.errors.length} errors occurred during sync.`);
        }
      }

      return syncResult;
    } catch (error) {
      // Handle sync errors with error handler
      await errorHandler.handleSyncError(
        error instanceof Error ? error : new Error(String(error)),
        { component: 'sync-manager', action: 'sync' }
      );

      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
      
      this.notifyListeners('syncError', result);
      
      toast.error('Failed to sync with server. Please try again.');

      return result;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncLocalToServer(): Promise<{ syncedItems: number; conflicts: number; errors: string[] }> {
    const result = { syncedItems: 0, conflicts: 0, errors: [] };

    try {
      // Get pending actions from offline manager
      const syncStatus = offlineManager.getSyncStatus();
      
      if (syncStatus.pendingActions > 0) {
        // Process sync queue
        await this.processSyncQueue();
        result.syncedItems = syncStatus.pendingActions;
      }
    } catch (error) {
      result.errors.push(`Local to server sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  private async syncServerToLocal(): Promise<{ syncedItems: number; conflicts: number; errors: string[] }> {
    const result: { syncedItems: number; conflicts: number; errors: string[] } = { 
      syncedItems: 0, 
      conflicts: 0, 
      errors: [] 
    };

    try {
      // Note: SyncManager endpoints need proper context (workspaceId, projectId, taskId)
      // Temporarily disable to prevent 404 errors until proper API integration
      result.errors.push('Server sync temporarily disabled - requires proper workspace/project context for API calls');
    } catch (error) {
      result.errors.push(`Server to local sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // DISABLED: fetchFromServer method - needs proper API endpoint structure
  // private async fetchFromServer(entity: string): Promise<any[]> {
  //   const response = await fetch(`${this.getApiBaseUrl()}/${entity}`, {
  //     headers: {
  //       'Authorization': `Bearer ${this.getAuthToken()}`,
  //       'Content-Type': 'application/json'
  //     }
  //   });

  //   if (!response.ok) {
  //     throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  //   }

  //   return await response.json();
  // }

  // DISABLED: mergeData method - needs proper API endpoint structure
  // private async mergeData(entity: string, serverData: any[], localData: any[]): Promise<{ syncedItems: number; conflicts: number }> {
  //   let syncedItems = 0;
  //   let conflicts = 0;

  //   // Create maps for efficient lookup
  //   const serverMap = new Map(serverData.map(item => [item.id, item]));
  //   const localMap = new Map(localData.map(item => [item.id, item]));

  //   // Process server data
  //   for (const serverItem of serverData) {
  //     const localItem = localMap.get(serverItem.id);
      
  //     if (!localItem) {
  //       // New item from server
  //       await offlineManager.saveData(entity, serverItem);
  //       syncedItems++;
  //     } else {
  //       // Check for conflicts
  //       if (this.hasConflict(serverItem, localItem)) {
  //         conflicts++;
  //         await this.handleConflict(entity, serverItem, localItem);
  //       } else {
  //         // Update local with server version
  //         await offlineManager.saveData(entity, serverItem);
  //         syncedItems++;
  //       }
  //     }
  //   }

  //   // Process local-only items
  //   for (const localItem of localData) {
  //     if (!serverMap.has(localItem.id)) {
  //       // Local-only item - keep it for sync queue
  //       syncedItems++;
  //     }
  //   }

  //   return { syncedItems, conflicts };
  // }

  private hasConflict(serverItem: any, localItem: any): boolean {
    // Simple conflict detection based on last modified timestamps
    const serverModified = new Date(serverItem.updatedAt || serverItem.createdAt).getTime();
    const localModified = new Date(localItem.updatedAt || localItem.createdAt).getTime();
    
    // Consider it a conflict if both items were modified within a short time window
    const timeWindow = 5000; // 5 seconds
    return Math.abs(serverModified - localModified) < timeWindow && 
           JSON.stringify(serverItem) !== JSON.stringify(localItem);
  }

  private async handleConflict(entity: string, serverItem: any, localItem: any): Promise<void> {
    const conflict: ConflictData = {
      id: serverItem.id,
      entity,
      serverVersion: serverItem,
      clientVersion: localItem,
      lastModified: {
        server: new Date(serverItem.updatedAt || serverItem.createdAt).getTime(),
        client: new Date(localItem.updatedAt || localItem.createdAt).getTime()
      }
    };

    this.conflicts.push(conflict);

    // Apply conflict resolution strategy
    switch (this.config.conflictResolution) {
      case 'server-wins':
        await offlineManager.saveData(entity, serverItem);
        break;
      case 'client-wins':
        await offlineManager.saveData(entity, localItem);
        break;
      case 'merge':
        const mergedItem = this.mergeItems(serverItem, localItem);
        await offlineManager.saveData(entity, mergedItem);
        break;
      case 'manual':
        // Keep both versions and let user decide
        await this.queueConflictForManualResolution(conflict);
        break;
    }
  }

  private mergeItems(serverItem: any, localItem: any): any {
    // Simple merge strategy - combine properties, server wins on conflicts
    return {
      ...localItem,
      ...serverItem,
      // Merge arrays if they exist
      ...(serverItem.tags && localItem.tags && {
        tags: [...new Set([...localItem.tags, ...serverItem.tags])]
      }),
      ...(serverItem.comments && localItem.comments && {
        comments: [...new Set([...localItem.comments, ...serverItem.comments])]
      })
    };
  }

  private async queueConflictForManualResolution(conflict: ConflictData): Promise<void> {
    // Store conflict for manual resolution
    await offlineManager.saveData('conflicts', conflict);
    
    // Notify user about conflict
    toast.error(`Conflict detected in ${conflict.entity}. Please resolve manually.`);
  }

  private async processSyncQueue(): Promise<void> {
    // This is handled by the offline manager
    // We just need to trigger the process
    const syncStatus = offlineManager.getSyncStatus();
    if (syncStatus.pendingActions > 0) {
      // The offline manager will handle the actual sync
      // We just need to wait for it to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private async handleConflicts(): Promise<void> {
    if (this.conflicts.length === 0) return;

    // Notify user about conflicts
    toast.success(`${this.conflicts.length} conflicts were resolved automatically.`);

    // Clear resolved conflicts
    this.conflicts = [];
  }

  private getApiBaseUrl(): string {
    return API_BASE_URL;
  }

  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }

  getConfig(): SyncConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart auto-sync if needed
    if (this.config.autoSync) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  getSyncStatus(): SyncStatus & { lastSyncTime: number; conflicts: number } {
    const baseStatus = offlineManager.getSyncStatus();
    return {
      ...baseStatus,
      lastSyncTime: this.lastSyncTime,
      conflicts: this.conflicts.length
    };
  }

  getConflicts(): ConflictData[] {
    return [...this.conflicts];
  }

  async resolveConflict(conflictId: string, resolution: 'server' | 'client' | 'merge'): Promise<void> {
    const conflict = this.conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    let resolvedItem: any;
    switch (resolution) {
      case 'server':
        resolvedItem = conflict.serverVersion;
        break;
      case 'client':
        resolvedItem = conflict.clientVersion;
        break;
      case 'merge':
        resolvedItem = this.mergeItems(conflict.serverVersion, conflict.clientVersion);
        break;
    }

    await offlineManager.saveData(conflict.entity, resolvedItem);
    
    // Remove from conflicts list
    this.conflicts = this.conflicts.filter(c => c.id !== conflictId);
  }

  addEventListener(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private notifyListeners(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  async forceSync(): Promise<SyncResult> {
    // Force a sync regardless of timing
    return await this.sync();
  }

  async clearSyncData(): Promise<void> {
    // Clear all sync-related data
    await offlineManager.clearOfflineData();
    this.conflicts = [];
    this.lastSyncTime = 0;
  }

  /**
   * CRITICAL: Dispose method to cleanup all intervals and listeners
   */
  dispose(): void {
    // Stop auto sync (clears interval)
    this.stopAutoSync();

    // Clear all event listeners
    this.listeners.clear();

    // Clear conflicts
    this.conflicts = [];

    logger.info('SyncManager disposed and cleaned up');
  }
}

export const syncManager = SyncManager.getInstance(); 