// Phase 2: Offline Synchronization Service
// Complete offline messaging and data synchronization system using localStorage

// Storage interfaces for offline data
interface OfflineMessage {
  id: string;
  teamId: string;
  userEmail: string;
  content: string;
  messageType: 'text' | 'file' | 'announcement';
  mentions: string[];
  metadata: Record<string, any>;
  replyTo?: string;
  timestamp: number;
  status: 'pending' | 'sent' | 'failed';
  retryCount: number;
  createdAt: string;
}

interface OfflineActivity {
  id: string;
  teamId: string;
  userEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, any>;
  timestamp: number;
  status: 'pending' | 'sent' | 'failed';
  retryCount: number;
  createdAt: string;
}

interface OfflineFile {
  id: string;
  teamId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileData: string; // Base64 encoded
  messageContent?: string;
  timestamp: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  retryCount: number;
  progress: number;
}

interface SyncState {
  lastSyncTime: number;
  isOnline: boolean;
  pendingOperations: number;
}

class OfflineSyncService {
  private isOnline: boolean = navigator.onLine;
  private syncInterval: number | null = null;
  private retryQueue: Map<string, NodeJS.Timeout> = new Map();
  private maxRetries: number = 5;
  private retryDelays: number[] = [1000, 2000, 5000, 10000, 30000]; // Progressive delays

  private listeners: {
    onOnlineStatusChange: ((isOnline: boolean) => void)[];
    onSyncStatusChange: ((status: { pending: number; syncing: boolean }) => void)[];
    onMessageSynced: ((messageId: string, success: boolean) => void)[];
    onActivitySynced: ((activityId: string, success: boolean) => void)[];
    onFileSynced: ((fileId: string, success: boolean) => void)[];
  } = {
    onOnlineStatusChange: [],
    onSyncStatusChange: [],
    onMessageSynced: [],
    onActivitySynced: [],
    onFileSynced: []
  };

  private storageKeys = {
    messages: 'meridian_offline_messages',
    activities: 'meridian_offline_activities',
    files: 'meridian_offline_files',
    syncState: 'meridian_sync_state'
  };

  constructor() {
    this.init();
    this.setupNetworkListeners();
    this.startPeriodicSync();
  }

  // Initialize the service
  private init() {
    try {
      // Initialize storage if not exists
      if (!localStorage.getItem(this.storageKeys.messages)) {
        localStorage.setItem(this.storageKeys.messages, JSON.stringify([]));
      }
      if (!localStorage.getItem(this.storageKeys.activities)) {
        localStorage.setItem(this.storageKeys.activities, JSON.stringify([]));
      }
      if (!localStorage.getItem(this.storageKeys.files)) {
        localStorage.setItem(this.storageKeys.files, JSON.stringify([]));
      }
      
      // Initialize sync state
      this.updateSyncState();
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
    }
  }

  // Setup network status listeners
  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyOnlineStatusChange(true);
      this.syncPendingOperations();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyOnlineStatusChange(false);
    });
  }

  // Start periodic sync
  private startPeriodicSync() {
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline) {
        this.syncPendingOperations();
      }
    }, 10000); // Sync every 10 seconds when online
  }

  // Event listeners
  public addEventListener<K extends keyof typeof this.listeners>(
    event: K,
    callback: typeof this.listeners[K][0]
  ) {
    this.listeners[event].push(callback as any);
  }

  public removeEventListener<K extends keyof typeof this.listeners>(
    event: K,
    callback: typeof this.listeners[K][0]
  ) {
    const index = this.listeners[event].indexOf(callback as any);
    if (index > -1) {
      this.listeners[event].splice(index, 1);
    }
  }

  // Notification methods
  private notifyOnlineStatusChange(isOnline: boolean) {
    this.listeners.onOnlineStatusChange.forEach(callback => callback(isOnline));
  }

  private notifySyncStatusChange(status: { pending: number; syncing: boolean }) {
    this.listeners.onSyncStatusChange.forEach(callback => callback(status));
  }

  private notifyMessageSynced(messageId: string, success: boolean) {
    this.listeners.onMessageSynced.forEach(callback => callback(messageId, success));
  }

  private notifyActivitySynced(activityId: string, success: boolean) {
    this.listeners.onActivitySynced.forEach(callback => callback(activityId, success));
  }

  private notifyFileSynced(fileId: string, success: boolean) {
    this.listeners.onFileSynced.forEach(callback => callback(fileId, success));
  }

  // Storage helper methods
  private getStoredMessages(): OfflineMessage[] {
    try {
      const stored = localStorage.getItem(this.storageKeys.messages);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored messages:', error);
      return [];
    }
  }

  private saveStoredMessages(messages: OfflineMessage[]) {
    try {
      localStorage.setItem(this.storageKeys.messages, JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to save stored messages:', error);
    }
  }

  private getStoredActivities(): OfflineActivity[] {
    try {
      const stored = localStorage.getItem(this.storageKeys.activities);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored activities:', error);
      return [];
    }
  }

  private saveStoredActivities(activities: OfflineActivity[]) {
    try {
      localStorage.setItem(this.storageKeys.activities, JSON.stringify(activities));
    } catch (error) {
      console.error('Failed to save stored activities:', error);
    }
  }

  private getStoredFiles(): OfflineFile[] {
    try {
      const stored = localStorage.getItem(this.storageKeys.files);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored files:', error);
      return [];
    }
  }

  private saveStoredFiles(files: OfflineFile[]) {
    try {
      localStorage.setItem(this.storageKeys.files, JSON.stringify(files));
    } catch (error) {
      console.error('Failed to save stored files:', error);
    }
  }

  // Store message for offline sending
  public async storeMessage(messageData: {
    id: string;
    teamId: string;
    userEmail: string;
    content: string;
    messageType?: 'text' | 'file' | 'announcement';
    mentions?: string[];
    metadata?: Record<string, any>;
    replyTo?: string;
  }) {
    try {
      const message: OfflineMessage = {
        ...messageData,
        messageType: messageData.messageType || 'text',
        mentions: messageData.mentions || [],
        metadata: messageData.metadata || {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        createdAt: new Date().toISOString()
      };

      const messages = this.getStoredMessages();
      messages.push(message);
      this.saveStoredMessages(messages);
      this.updateSyncState();

      // If online, try to sync immediately
      if (this.isOnline) {
        this.syncMessage(message.id);
      }

      return message.id;
    } catch (error) {
      console.error('Failed to store message offline:', error);
      throw error;
    }
  }

  // Store activity for offline logging
  public async storeActivity(activityData: {
    id: string;
    teamId: string;
    userEmail: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const activity: OfflineActivity = {
        ...activityData,
        metadata: activityData.metadata || {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        createdAt: new Date().toISOString()
      };

      const activities = this.getStoredActivities();
      activities.push(activity);
      this.saveStoredActivities(activities);
      this.updateSyncState();

      // If online, try to sync immediately
      if (this.isOnline) {
        this.syncActivity(activity.id);
      }

      return activity.id;
    } catch (error) {
      console.error('Failed to store activity offline:', error);
      throw error;
    }
  }

  // Store file for offline upload
  public async storeFile(fileData: {
    id: string;
    teamId: string;
    file: File;
    messageContent?: string;
  }) {
    try {
      // Convert file to base64
      const reader = new FileReader();
      const fileDataBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileData.file);
      });

      const fileRecord: OfflineFile = {
        id: fileData.id,
        teamId: fileData.teamId,
        fileName: fileData.file.name,
        fileSize: fileData.file.size,
        mimeType: fileData.file.type,
        fileData: fileDataBase64,
        messageContent: fileData.messageContent,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        progress: 0
      };

      const files = this.getStoredFiles();
      files.push(fileRecord);
      this.saveStoredFiles(files);
      this.updateSyncState();

      // If online, try to upload immediately
      if (this.isOnline) {
        this.syncFile(fileRecord.id);
      }

      return fileRecord.id;
    } catch (error) {
      console.error('Failed to store file offline:', error);
      throw error;
    }
  }

  // Sync all pending operations
  public async syncPendingOperations() {
    if (!this.isOnline) return;

    this.notifySyncStatusChange({ pending: this.getPendingCount(), syncing: true });

    try {
      // Sync messages
      const messages = this.getStoredMessages();
      const pendingMessages = messages.filter(m => m.status === 'pending');
      for (const message of pendingMessages) {
        this.syncMessage(message.id);
      }

      // Sync activities
      const activities = this.getStoredActivities();
      const pendingActivities = activities.filter(a => a.status === 'pending');
      for (const activity of pendingActivities) {
        this.syncActivity(activity.id);
      }

      // Sync files
      const files = this.getStoredFiles();
      const pendingFiles = files.filter(f => f.status === 'pending');
      for (const file of pendingFiles) {
        this.syncFile(file.id);
      }

      // Retry failed operations
      const failedMessages = messages.filter(m => m.status === 'failed' && m.retryCount < this.maxRetries);
      for (const message of failedMessages) {
        this.scheduleRetry('message', message.id, message.retryCount);
      }

      const failedActivities = activities.filter(a => a.status === 'failed' && a.retryCount < this.maxRetries);
      for (const activity of failedActivities) {
        this.scheduleRetry('activity', activity.id, activity.retryCount);
      }

      const failedFiles = files.filter(f => f.status === 'failed' && f.retryCount < this.maxRetries);
      for (const file of failedFiles) {
        this.scheduleRetry('file', file.id, file.retryCount);
      }
    } finally {
      this.notifySyncStatusChange({ pending: this.getPendingCount(), syncing: false });
    }
  }

  // Sync individual message
  private async syncMessage(messageId: string) {
    try {
      const messages = this.getStoredMessages();
      const messageIndex = messages.findIndex(m => m.id === messageId);
      const message = messages[messageIndex];
      
      if (!message || message.status === 'sent') return;

      // Send to API
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/team/${message.teamId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: message.content,
          messageType: message.messageType,
          mentions: message.mentions,
          metadata: message.metadata,
          replyTo: message.replyTo
        })
      });

      if (response.ok) {
        // Remove from offline store
        messages.splice(messageIndex, 1);
        this.saveStoredMessages(messages);
        this.notifyMessageSynced(messageId, true);
      } else {
        // Mark as failed
        message.status = 'failed';
        message.retryCount += 1;
        this.saveStoredMessages(messages);
        this.notifyMessageSynced(messageId, false);
      }
    } catch (error) {
      console.error(`Failed to sync message ${messageId}:`, error);
      const messages = this.getStoredMessages();
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex >= 0) {
        messages[messageIndex].status = 'failed';
        messages[messageIndex].retryCount += 1;
        this.saveStoredMessages(messages);
      }
      this.notifyMessageSynced(messageId, false);
    }

    this.updateSyncState();
  }

  // Sync individual activity
  private async syncActivity(activityId: string) {
    try {
      const activities = this.getStoredActivities();
      const activityIndex = activities.findIndex(a => a.id === activityId);
      const activity = activities[activityIndex];
      
      if (!activity || activity.status === 'sent') return;

      // Send to API
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/team/${activity.teamId}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: activity.action,
          targetType: activity.targetType,
          targetId: activity.targetId,
          metadata: activity.metadata
        })
      });

      if (response.ok) {
        // Remove from offline store
        activities.splice(activityIndex, 1);
        this.saveStoredActivities(activities);
        this.notifyActivitySynced(activityId, true);
      } else {
        // Mark as failed
        activity.status = 'failed';
        activity.retryCount += 1;
        this.saveStoredActivities(activities);
        this.notifyActivitySynced(activityId, false);
      }
    } catch (error) {
      console.error(`Failed to sync activity ${activityId}:`, error);
      const activities = this.getStoredActivities();
      const activityIndex = activities.findIndex(a => a.id === activityId);
      if (activityIndex >= 0) {
        activities[activityIndex].status = 'failed';
        activities[activityIndex].retryCount += 1;
        this.saveStoredActivities(activities);
      }
      this.notifyActivitySynced(activityId, false);
    }

    this.updateSyncState();
  }

  // Sync individual file
  private async syncFile(fileId: string) {
    try {
      const files = this.getStoredFiles();
      const fileIndex = files.findIndex(f => f.id === fileId);
      const fileRecord = files[fileIndex];
      
      if (!fileRecord || fileRecord.status === 'uploaded') return;

      // Update status to uploading
      fileRecord.status = 'uploading';
      this.saveStoredFiles(files);

      // Convert base64 back to file
      const response = await fetch(fileRecord.fileData);
      const blob = await response.blob();
      const file = new File([blob], fileRecord.fileName, { type: fileRecord.mimeType });

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('teamId', fileRecord.teamId);
      if (fileRecord.messageContent) {
        formData.append('messageContent', fileRecord.messageContent);
      }

      // Upload file
      const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/team/${fileRecord.teamId}/files`, {
        method: 'POST',
        body: formData
      });

      if (uploadResponse.ok) {
        // Remove from offline store
        files.splice(fileIndex, 1);
        this.saveStoredFiles(files);
        this.notifyFileSynced(fileId, true);
      } else {
        // Mark as failed
        fileRecord.status = 'failed';
        fileRecord.retryCount += 1;
        this.saveStoredFiles(files);
        this.notifyFileSynced(fileId, false);
      }
    } catch (error) {
      console.error(`Failed to sync file ${fileId}:`, error);
      const files = this.getStoredFiles();
      const fileIndex = files.findIndex(f => f.id === fileId);
      if (fileIndex >= 0) {
        files[fileIndex].status = 'failed';
        files[fileIndex].retryCount += 1;
        this.saveStoredFiles(files);
      }
      this.notifyFileSynced(fileId, false);
    }

    this.updateSyncState();
  }

  // Schedule retry with exponential backoff
  private scheduleRetry(type: 'message' | 'activity' | 'file', id: string, retryCount: number) {
    const delay = this.retryDelays[Math.min(retryCount, this.retryDelays.length - 1)];
    const timeoutId = setTimeout(() => {
      this.retryQueue.delete(id);
      switch (type) {
        case 'message':
          this.syncMessage(id);
          break;
        case 'activity':
          this.syncActivity(id);
          break;
        case 'file':
          this.syncFile(id);
          break;
      }
    }, delay);

    this.retryQueue.set(id, timeoutId);
  }

  // Update sync state
  private updateSyncState() {
    const syncState: SyncState = {
      lastSyncTime: Date.now(),
      isOnline: this.isOnline,
      pendingOperations: this.getPendingCount()
    };
    
    try {
      localStorage.setItem(this.storageKeys.syncState, JSON.stringify(syncState));
    } catch (error) {
      console.error('Failed to update sync state:', error);
    }
  }

  // Get pending operations count
  private getPendingCount(): number {
    const messages = this.getStoredMessages();
    const activities = this.getStoredActivities();
    const files = this.getStoredFiles();

    const pendingMessages = messages.filter(m => m.status === 'pending' || m.status === 'failed').length;
    const pendingActivities = activities.filter(a => a.status === 'pending' || a.status === 'failed').length;
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'failed').length;

    return pendingMessages + pendingActivities + pendingFiles;
  }

  // Public methods
  public isOnlineStatus(): boolean {
    return this.isOnline;
  }

  public async getSyncState(): Promise<SyncState | null> {
    try {
      const stored = localStorage.getItem(this.storageKeys.syncState);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get sync state:', error);
      return null;
    }
  }

  public async clearOfflineData() {
    try {
      localStorage.setItem(this.storageKeys.messages, JSON.stringify([]));
      localStorage.setItem(this.storageKeys.activities, JSON.stringify([]));
      localStorage.setItem(this.storageKeys.files, JSON.stringify([]));
      this.updateSyncState();
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }

  public destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Clear all retry timeouts
    this.retryQueue.forEach(timeout => clearTimeout(timeout));
    this.retryQueue.clear();
  }
}

// Create singleton instance
export const offlineSyncService = new OfflineSyncService();
export default offlineSyncService;