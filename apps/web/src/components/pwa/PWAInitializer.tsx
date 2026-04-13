import React, { useEffect, useState } from 'react';
import { pwaManager } from '@/mobile/PWAManager';
import { offlineManager } from '@/mobile/OfflineManager';
import { syncManager } from '@/mobile/SyncManager';
import { logger } from "../../lib/logger";

interface PWAInitializerProps {
  children: React.ReactNode;
}

export const PWAInitializer: React.FC<PWAInitializerProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initializePWA = async () => {
      try {
        // Use setTimeout to defer initialization and prevent blocking
        setTimeout(async () => {
          try {
            // Initialize PWA Manager with timeout
            const pwaPromise = Promise.race([
              pwaManager.checkForUpdates(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('PWA init timeout')), 5000)
              )
            ]);
            await pwaPromise;
            
            // Initialize Offline Manager with timeout
            const offlinePromise = Promise.race([
              Promise.resolve(offlineManager.getOfflineCapabilities()),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Offline init timeout')), 3000)
              )
            ]);
            await offlinePromise;
            
            // Initialize Sync Manager with timeout
            const syncPromise = Promise.race([
              Promise.resolve(syncManager.getSyncStatus()),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Sync init timeout')), 3000)
              )
            ]);
            await syncPromise;
            
            // Request notification permission with timeout
            if ('Notification' in window && Notification.permission === 'default') {
              const notificationPromise = Promise.race([
                pwaManager.requestNotificationPermission(),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Notification timeout')), 2000)
                )
              ]);
              await notificationPromise;
            }
            
            logger.info("PWA initialized successfully");
            setIsInitialized(true);
          } catch (error) {
            // Only log non-timeout errors to reduce noise
            if (error instanceof Error && !error.message.includes('timeout')) {
              console.warn('PWA initialization had issues, but continuing:', error);
            }
            setIsInitialized(true); // Continue anyway
          }
        }, 100); // Small delay to prevent blocking

      } catch (error) {
        console.error('Failed to initialize PWA:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown error');
        setIsInitialized(true); // Continue anyway to prevent blocking
      }
    };

    initializePWA();
  }, []);

  // Show children immediately, don't block rendering
  return <>{children}</>;
};

export default PWAInitializer; 