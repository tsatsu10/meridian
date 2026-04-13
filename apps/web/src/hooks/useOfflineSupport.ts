import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { logger } from "../lib/logger";

interface OfflineMessage {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
  retryCount: number;
}

// Singleton pattern for service worker registration
const serviceWorkerRegistered = false;
const serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
const registrationPromise: Promise<ServiceWorkerRegistration> | null = null;

interface ServiceWorkerMessage {
  type: string;
  messageId?: string;
  timestamp?: number;
  results?: Array<{
    id: string;
    status: 'success' | 'retry' | 'failed' | 'error';
    retryCount?: number;
    error?: string;
  }>;
  remainingCount?: number;
  offlineMessage?: any;
  serverMessage?: any;
  conflictReason?: string;
}

export function useOfflineSupport() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [serviceWorkerRegistered, setServiceWorkerRegistered] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineMessage[]>([]);
  const [syncInProgress, setSyncInProgress] = useState(false);

  // Register service worker (only in production or when explicitly enabled)
  useEffect(() => {
    const shouldRegisterSW = 'serviceWorker' in navigator && 
      (import.meta.env.PROD || import.meta.env.VITE_ENABLE_OFFLINE_SUPPORT === 'true');
    
    if (shouldRegisterSW) {
      // Check if service worker is already registered
      navigator.serviceWorker.getRegistration()
        .then(registration => {
          if (registration) {
            logger.info("✅ Service Worker already registered for offline support");
            setServiceWorkerRegistered(true);
            
            // Listen for service worker messages
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
            
            // Get initial offline queue
            getOfflineQueue();
          } else {
            // Try to register if not already registered
            navigator.serviceWorker
              .register('/service-worker.js')
              .then((registration) => {
                logger.info("✅ Service Worker registered for offline support");
                setServiceWorkerRegistered(true);
                
                // Listen for service worker messages
                navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
                
                // Get initial offline queue
                getOfflineQueue();
              })
              .catch((error) => {
                logger.info("ℹ️ Offline support service worker not available");
              });
          }
        })
        .catch(() => {
          logger.info("ℹ️ Service Worker not supported");
        });
    } else {}

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored! Syncing messages...');
      forceSyncMessages();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info('You are now offline. Messages will be queued for later.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle messages from service worker
  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    const message: ServiceWorkerMessage = event.data;
    
    switch (message.type) {
      case 'MESSAGE_QUEUED':
        toast.info('Message queued for when you\'re back online');
        getOfflineQueue(); // Refresh queue display
        break;
        
      case 'MESSAGES_SYNCED':
        setSyncInProgress(false);
        if (message.results) {
          const successful = message.results.filter(r => r.status === 'success').length;
          const failed = message.results.filter(r => r.status === 'failed').length;
          
          if (successful > 0) {
            toast.success(`${successful} message${successful !== 1 ? 's' : ''} synced successfully`);
          }
          if (failed > 0) {
            toast.error(`${failed} message${failed !== 1 ? 's' : ''} failed to sync`);
          }
          
          getOfflineQueue(); // Refresh queue display
        }
        break;
        
      case 'MESSAGE_CONFLICT':
        toast.warning('Message conflict detected - please review');
        // In a real app, you'd show a conflict resolution UI
        logger.info("Message conflict:");
        break;
        
      default:
        logger.info("Unknown service worker message:");
    }
  }, []);

  // Get current offline queue from service worker
  const getOfflineQueue = useCallback(async () => {
    if (!navigator.serviceWorker.controller) return;

    try {
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'OFFLINE_QUEUE') {
            setOfflineQueue(event.data.queue || []);
            resolve(event.data.queue);
          }
        };

        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_OFFLINE_QUEUE' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('Failed to get offline queue:', error);
    }
  }, []);

  // Force sync offline messages
  const forceSyncMessages = useCallback(async () => {
    if (!navigator.serviceWorker.controller || syncInProgress) return;

    setSyncInProgress(true);
    
    try {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'SYNC_COMPLETE') {
          setSyncInProgress(false);
          getOfflineQueue();
        }
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'FORCE_SYNC' },
        [messageChannel.port2]
      );
    } catch (error) {
      console.error('Failed to force sync:', error);
      setSyncInProgress(false);
    }
  }, [syncInProgress]);

  // Clear offline queue
  const clearOfflineQueue = useCallback(async () => {
    if (!navigator.serviceWorker.controller) return;

    try {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'QUEUE_CLEARED') {
          setOfflineQueue([]);
          toast.success('Offline queue cleared');
        }
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_OFFLINE_QUEUE' },
        [messageChannel.port2]
      );
    } catch (error) {
      console.error('Failed to clear offline queue:', error);
    }
  }, []);

  return {
    isOnline,
    serviceWorkerRegistered,
    offlineQueue,
    syncInProgress,
    forceSyncMessages,
    clearOfflineQueue,
    getOfflineQueue
  };
}