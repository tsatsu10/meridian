import { toast } from '@/lib/toast';
import { authSignOutService } from '@/services/auth-signout';

interface QueuedSignOut {
  id: string;
  timestamp: number;
  reason?: string;
  skipConfirmation?: boolean;
}

class OfflineSignOutHandler {
  private static instance: OfflineSignOutHandler;
  private isOnline = navigator.onLine;
  private queuedSignOuts: QueuedSignOut[] = [];
  private readonly STORAGE_KEY = 'queued_signouts';
  private readonly MAX_QUEUE_AGE = 24 * 60 * 60 * 1000; // 24 hours

  static getInstance(): OfflineSignOutHandler {
    if (!OfflineSignOutHandler.instance) {
      OfflineSignOutHandler.instance = new OfflineSignOutHandler();
    }
    return OfflineSignOutHandler.instance;
  }

  constructor() {
    this.setupEventListeners();
    this.loadQueuedSignOuts();
    this.cleanOldQueuedSignOuts();
  }

  private setupEventListeners(): void {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Listen for beforeunload (page refresh/close)
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }

  private handleOnline(): void {
    this.isOnline = true;
    toast.success('Connection restored');
    
    // Process any queued sign outs
    this.processQueuedSignOuts();
  }

  private handleOffline(): void {
    this.isOnline = false;
    toast.warning('Connection lost. Sign out requests will be queued.');
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible' && this.isOnline) {
      // Check if we need to process queued sign outs when tab becomes visible
      this.processQueuedSignOuts();
    }
  }

  private handleBeforeUnload(): void {
    // Save any pending sign out requests
    this.saveQueuedSignOuts();
  }

  /**
   * Queue a sign out request when offline
   */
  queueSignOut(options: { reason?: string; skipConfirmation?: boolean } = {}): void {
    const queuedSignOut: QueuedSignOut = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      reason: options.reason,
      skipConfirmation: options.skipConfirmation
    };

    this.queuedSignOuts.push(queuedSignOut);
    this.saveQueuedSignOuts();

    toast.info('Sign out queued. Will process when connection is restored.');
  }

  /**
   * Process all queued sign out requests
   */
  private async processQueuedSignOuts(): Promise<void> {
    if (this.queuedSignOuts.length === 0) {
      return;
    }

    toast.loading('Processing queued sign out...', { id: 'queued-signout' });

    try {
      // Process the most recent sign out request
      const latestSignOut = this.queuedSignOuts[this.queuedSignOuts.length - 1];
      
      await authSignOutService.signOut({
        reason: latestSignOut.reason as any,
        skipConfirmation: latestSignOut.skipConfirmation
      });

      // Clear all queued sign outs after successful processing
      this.queuedSignOuts = [];
      this.saveQueuedSignOuts();

      toast.success('Queued sign out processed', { id: 'queued-signout' });

    } catch (error) {
      console.error('Failed to process queued sign out:', error);
      toast.error('Failed to process queued sign out', { id: 'queued-signout' });
    }
  }

  /**
   * Check if sign out should be queued or processed immediately
   */
  async handleSignOut(options: { reason?: string; skipConfirmation?: boolean } = {}): Promise<void> {
    if (!this.isOnline) {
      this.queueSignOut(options);
      return;
    }

    try {
      await authSignOutService.signOut({
        reason: options.reason as any,
        skipConfirmation: options.skipConfirmation
      });
    } catch (error) {
      // If sign out fails due to network, queue it
      if (this.isNetworkError(error)) {
        toast.warning('Network error. Queuing sign out for retry.');
        this.queueSignOut(options);
      } else {
        throw error;
      }
    }
  }

  /**
   * Check if error is network related
   */
  private isNetworkError(error: any): boolean {
    return (
      error instanceof TypeError ||
      error.message?.includes('fetch') ||
      error.message?.includes('network') ||
      error.code === 'NETWORK_ERROR'
    );
  }

  /**
   * Save queued sign outs to localStorage
   */
  private saveQueuedSignOuts(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queuedSignOuts));
    } catch (error) {
      console.warn('Failed to save queued sign outs:', error);
    }
  }

  /**
   * Load queued sign outs from localStorage
   */
  private loadQueuedSignOuts(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queuedSignOuts = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load queued sign outs:', error);
      this.queuedSignOuts = [];
    }
  }

  /**
   * Remove old queued sign outs
   */
  private cleanOldQueuedSignOuts(): void {
    const now = Date.now();
    this.queuedSignOuts = this.queuedSignOuts.filter(
      signOut => now - signOut.timestamp < this.MAX_QUEUE_AGE
    );
    this.saveQueuedSignOuts();
  }

  /**
   * Get current online status
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Get queued sign out count
   */
  getQueuedSignOutCount(): number {
    return this.queuedSignOuts.length;
  }

  /**
   * Clear all queued sign outs
   */
  clearQueue(): void {
    this.queuedSignOuts = [];
    this.saveQueuedSignOuts();
  }
}

// Cross-tab communication for sign out coordination
class CrossTabSignOutManager {
  private static instance: CrossTabSignOutManager;
  private readonly BROADCAST_KEY = 'signout_broadcast';
  private readonly TAB_ID = Date.now().toString() + Math.random().toString(36).substring(7);

  static getInstance(): CrossTabSignOutManager {
    if (!CrossTabSignOutManager.instance) {
      CrossTabSignOutManager.instance = new CrossTabSignOutManager();
    }
    return CrossTabSignOutManager.instance;
  }

  constructor() {
    this.setupStorageListener();
    this.registerTab();
  }

  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === this.BROADCAST_KEY && event.newValue) {
        const data = JSON.parse(event.newValue);
        
        if (data.action === 'signout' && data.tabId !== this.TAB_ID) {
          // Another tab initiated sign out
          toast.info('Signing out (initiated from another tab)...');
          
          setTimeout(() => {
            authSignOutService.signOut({ 
              skipConfirmation: true, 
              reason: 'security' 
            });
          }, 1000);
        }
      }
    });
  }

  private registerTab(): void {
    // Register this tab
    const tabData = {
      tabId: this.TAB_ID,
      timestamp: Date.now(),
      url: window.location.href
    };

    try {
      const existingTabs = JSON.parse(localStorage.getItem('active_tabs') || '[]');
      existingTabs.push(tabData);
      localStorage.setItem('active_tabs', JSON.stringify(existingTabs));
    } catch (error) {
      console.warn('Failed to register tab:', error);
    }

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      this.unregisterTab();
    });
  }

  private unregisterTab(): void {
    try {
      const existingTabs = JSON.parse(localStorage.getItem('active_tabs') || '[]');
      const filteredTabs = existingTabs.filter((tab: any) => tab.tabId !== this.TAB_ID);
      localStorage.setItem('active_tabs', JSON.stringify(filteredTabs));
    } catch (error) {
      console.warn('Failed to unregister tab:', error);
    }
  }

  /**
   * Broadcast sign out to all tabs
   */
  broadcastSignOut(reason?: string): void {
    const broadcastData = {
      action: 'signout',
      tabId: this.TAB_ID,
      timestamp: Date.now(),
      reason
    };

    try {
      localStorage.setItem(this.BROADCAST_KEY, JSON.stringify(broadcastData));
      
      // Clear the broadcast after a short delay
      setTimeout(() => {
        localStorage.removeItem(this.BROADCAST_KEY);
      }, 2000);
    } catch (error) {
      console.warn('Failed to broadcast sign out:', error);
    }
  }

  /**
   * Get count of active tabs
   */
  getActiveTabCount(): number {
    try {
      const tabs = JSON.parse(localStorage.getItem('active_tabs') || '[]');
      const now = Date.now();
      const activeTabs = tabs.filter((tab: any) => now - tab.timestamp < 30000); // 30 seconds
      
      // Clean up old tabs
      localStorage.setItem('active_tabs', JSON.stringify(activeTabs));
      
      return activeTabs.length;
    } catch (error) {
      console.warn('Failed to get active tab count:', error);
      return 1;
    }
  }
}

// Export singleton instances
export const offlineSignOutHandler = OfflineSignOutHandler.getInstance();
export const crossTabSignOutManager = CrossTabSignOutManager.getInstance();

// Utility functions
export const handleOfflineSignOut = (options?: { reason?: string; skipConfirmation?: boolean }) => {
  return offlineSignOutHandler.handleSignOut(options);
};

export const broadcastSignOutToTabs = (reason?: string) => {
  crossTabSignOutManager.broadcastSignOut(reason);
};

export const isOnline = () => {
  return offlineSignOutHandler.getOnlineStatus();
};

export const getQueuedSignOutCount = () => {
  return offlineSignOutHandler.getQueuedSignOutCount();
};