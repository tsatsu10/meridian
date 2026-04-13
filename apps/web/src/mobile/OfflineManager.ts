import { toast } from '@/lib/toast';
import { logger } from "../lib/logger";

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'task' | 'project' | 'comment' | 'time-entry';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineData {
  tasks: any[];
  projects: any[];
  comments: any[];
  timeEntries: any[];
  userPreferences: any;
  lastSync: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number;
  pendingActions: number;
  syncErrors: string[];
}

export class OfflineManager {
  private static instance: OfflineManager;
  private db: IDBDatabase | null = null;
  private isOnline = navigator.onLine;
  private syncQueue: OfflineAction[] = [];
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private backupInterval: NodeJS.Timeout | null = null; // CRITICAL: Store for cleanup
  private listeners: Map<string, Function[]> = new Map();

  private constructor() {
    this.initializeOfflineManager();
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  private async initializeOfflineManager(): Promise<void> {
    try {
      // Initialize IndexedDB
      await this.initializeDatabase();

      // Set up online/offline listeners
      this.setupNetworkListeners();

      // Load existing sync queue
      await this.loadSyncQueue();

      // Start sync interval
      this.startSyncInterval();

      // Set up periodic data backup
      this.setupDataBackup();

      logger.info("Offline Manager initialized successfully");
    } catch (error) {
      console.error('Failed to initialize Offline Manager:', error);
    }
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MeridianOfflineDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('projectId', 'projectId', { unique: false });
          taskStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('workspaceId', 'workspaceId', { unique: false });
        }

        if (!db.objectStoreNames.contains('comments')) {
          const commentStore = db.createObjectStore('comments', { keyPath: 'id' });
          commentStore.createIndex('taskId', 'taskId', { unique: false });
        }

        if (!db.objectStoreNames.contains('timeEntries')) {
          const timeStore = db.createObjectStore('timeEntries', { keyPath: 'id' });
          timeStore.createIndex('taskId', 'taskId', { unique: false });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('userPreferences')) {
          db.createObjectStore('userPreferences', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('offlineData')) {
          db.createObjectStore('offlineData', { keyPath: 'key' });
        }
      };
    });
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners('networkChange', { isOnline: true });
      this.processSyncQueue();
      toast.success('Connection restored. Syncing your changes...');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners('networkChange', { isOnline: false });
      toast.info('You\'re offline. Changes will be synced when connection is restored.');
    });
  }

  private async loadSyncQueue(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const request = store.getAll();

    request.onsuccess = () => {
      this.syncQueue = request.result || [];
      this.notifyListeners('syncQueueUpdate', { pendingActions: this.syncQueue.length });
    };
  }

  private startSyncInterval(): void {
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    }, 30000);
  }

  private setupDataBackup(): void {
    // CRITICAL: Clear any existing backup interval first
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }

    // Backup data every hour
    this.backupInterval = setInterval(() => {
      this.backupData();
    }, 3600000);
  }

  async saveData(entity: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([entity], 'readwrite');
      const store = transaction.objectStore(entity);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getData(entity: string, id?: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([entity], 'readonly');
      const store = transaction.objectStore(entity);

      if (id) {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  }

  async deleteData(entity: string, id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([entity], 'readwrite');
      const store = transaction.objectStore(entity);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addToSyncQueue(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const syncAction: OfflineAction = {
      ...action,
      id: `${action.type}-${action.entity}-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3
    };

    this.syncQueue.push(syncAction);
    await this.saveSyncQueue();
    this.notifyListeners('syncQueueUpdate', { pendingActions: this.syncQueue.length });

    // Process immediately if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  private async saveSyncQueue(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    // Clear existing queue
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Save new queue
    for (const action of this.syncQueue) {
      await new Promise<void>((resolve, reject) => {
        const request = store.add(action);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) return;

    this.isSyncing = true;
    this.notifyListeners('syncStatusChange', { isSyncing: true });

    const actionsToProcess = [...this.syncQueue];
    const successfulActions: string[] = [];
    const failedActions: OfflineAction[] = [];

    for (const action of actionsToProcess) {
      try {
        await this.processAction(action);
        successfulActions.push(action.id);
      } catch (error) {
        console.error(`Failed to process action ${action.id}:`, error);
        action.retryCount++;
        
        if (action.retryCount >= action.maxRetries) {
          failedActions.push(action);
        }
      }
    }

    // Remove successful actions from queue
    this.syncQueue = this.syncQueue.filter(action => 
      !successfulActions.includes(action.id)
    );

    // Remove failed actions that exceeded max retries
    this.syncQueue = this.syncQueue.filter(action => 
      !failedActions.some(failed => failed.id === action.id)
    );

    await this.saveSyncQueue();

    this.isSyncing = false;
    this.notifyListeners('syncStatusChange', { isSyncing: false });
    this.notifyListeners('syncQueueUpdate', { pendingActions: this.syncQueue.length });

    if (successfulActions.length > 0) {
      toast.success(`Successfully synced ${successfulActions.length} changes.`);
    }

    if (failedActions.length > 0) {
      toast.error(`${failedActions.length} actions failed to sync.`);
    }
  }

  private async processAction(action: OfflineAction): Promise<void> {
    // Simulate API call based on action type
    const apiEndpoint = this.getApiEndpoint(action.entity);
    const method = this.getHttpMethod(action.type);

    const response = await fetch(apiEndpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: method !== 'GET' ? JSON.stringify(action.data) : undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Update local data with server response
    const result = await response.json();
    await this.saveData(action.entity, result);
  }

  private getApiEndpoint(entity: string): string {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
    return `${baseUrl}/api/${entity}`;
  }

  private getHttpMethod(type: string): string {
    switch (type) {
      case 'create': return 'POST';
      case 'update': return 'PUT';
      case 'delete': return 'DELETE';
      default: return 'GET';
    }
  }

  private getAuthToken(): string {
    // Get auth token from localStorage or context
    return localStorage.getItem('authToken') || '';
  }

  async backupData(): Promise<void> {
    try {
      const backup: OfflineData = {
        tasks: await this.getData('tasks'),
        projects: await this.getData('projects'),
        comments: await this.getData('comments'),
        timeEntries: await this.getData('timeEntries'),
        userPreferences: await this.getData('userPreferences'),
        lastSync: Date.now()
      };

      // Save backup to localStorage as fallback
      localStorage.setItem('meridian-offline-backup', JSON.stringify(backup));

      // Also save to IndexedDB
      await this.saveData('offlineData', {
        key: 'backup',
        data: backup,
        timestamp: Date.now()
      });

      logger.info("Data backup completed");
    } catch (error) {
      console.error('Failed to backup data:', error);
    }
  }

  async restoreData(): Promise<OfflineData | null> {
    try {
      // Ensure database is initialized before trying to restore
      if (!this.db) {
        await this.initializeDatabase();
      }

      // Try to restore from IndexedDB first
      if (this.db) {
        const backup = await this.getData('offlineData', 'backup');
        if (backup) {
          return backup.data;
        }
      }

      // Fallback to localStorage
      const localStorageBackup = localStorage.getItem('meridian-offline-backup');
      if (localStorageBackup) {
        return JSON.parse(localStorageBackup);
      }

      return null;
    } catch (error) {
      console.error('Failed to restore data:', error);
      return null;
    }
  }

  async clearOfflineData(): Promise<void> {
    if (!this.db) return;

    const entities = ['tasks', 'projects', 'comments', 'timeEntries', 'syncQueue', 'userPreferences', 'offlineData'];
    
    for (const entity of entities) {
      const transaction = this.db.transaction([entity], 'readwrite');
      const store = transaction.objectStore(entity);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    this.syncQueue = [];
    localStorage.removeItem('meridian-offline-backup');
  }

  getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: Date.now(),
      pendingActions: this.syncQueue.length,
      syncErrors: []
    };
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

  async getStorageUsage(): Promise<{
    used: number;
    available: number;
    percentage: number;
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const available = estimate.quota || 0;
      const percentage = available > 0 ? (used / available) * 100 : 0;

      return { used, available, percentage };
    }

    // Fallback estimation
    const used = localStorage.length * 1024; // Rough estimate
    const available = 50 * 1024 * 1024; // 50MB estimate
    const percentage = (used / available) * 100;

    return { used, available, percentage };
  }

  async requestStoragePermission(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      return await navigator.storage.persist();
    }
    return true; // Assume permission granted for older browsers
  }

  isOfflineCapable(): boolean {
    return 'serviceWorker' in navigator && 'indexedDB' in window;
  }

  getOfflineCapabilities(): {
    storage: boolean;
    sync: boolean;
    notifications: boolean;
    backgroundSync: boolean;
  } {
    return {
      storage: 'indexedDB' in window,
      sync: 'serviceWorker' in navigator,
      notifications: 'Notification' in window,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype
    };
  }

  /**
   * CRITICAL: Dispose method to cleanup all intervals and listeners
   */
  dispose(): void {
    // Clear sync interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // CRITICAL: Clear backup interval
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }

    // Clear all listeners
    this.listeners.clear();

    // Close database
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    logger.info('OfflineManager disposed and cleaned up');
  }
}

export const offlineManager = OfflineManager.getInstance(); 