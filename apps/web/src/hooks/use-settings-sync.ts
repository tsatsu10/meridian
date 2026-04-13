// @epic-3.2-settings: React hook for managing settings synchronization
import { useEffect, useState, useRef, useCallback } from "react";
import { useSettingsStore } from "@/store/settings";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";

interface SyncStatus {
  connected: boolean;
  online: boolean;
  pendingUpdates: number;
  lastSync?: string;
  performance?: {
    averageResponseTime: number;
    successRate: number;
    errorCount: number;
  };
}

export function useSettingsSync(userId?: string, workspaceId?: string) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    connected: true, // Always connected since we use the settings store directly
    online: navigator.onLine,
    pendingUpdates: 0,
    performance: {
      averageResponseTime: 0,
      successRate: 100,
      errorCount: 0,
    },
  });
  
  const { user } = useAuthStore();
  const { initialize, isLoading, forceSyncSettings, getSyncStatus } = useSettingsStore();
  const initializeRef = useRef(false);
  const performanceRef = useRef({
    responseTimes: [] as number[],
    totalRequests: 0,
    successfulRequests: 0,
    errorCount: 0,
  });

  // Get current user from authentication or localStorage
  const getCurrentUser = useCallback(() => {
    if (user?.id) {
      return {
        userId: user.id,
        workspaceId: user.currentWorkspaceId || workspaceId,
      };
    }
    
    // Fallback to localStorage/sessionStorage
    const userEmail = userId || localStorage.getItem('user-email') || sessionStorage.getItem('user-email');
    const currentWorkspaceId = workspaceId || 
      localStorage.getItem('current-workspace-id') || 
      sessionStorage.getItem('current-workspace-id') ||
      localStorage.getItem('workspace-id') || 
      sessionStorage.getItem('workspace-id');
    
    if (userEmail) {
      return {
        userId: userEmail,
        workspaceId: currentWorkspaceId || undefined,
      };
    }
    
    return null;
  }, [user, userId, workspaceId]);

  // Memoized initialization to prevent unnecessary re-runs
  const initializeSettings = useCallback(() => {
    if (initializeRef.current) return;
    
    const currentUser = getCurrentUser();
    if (!currentUser?.userId) {
      console.warn("⚠️ No user found for settings initialization");
      return;
    }
    
    const startTime = performance.now();initialize(currentUser.userId, currentUser.workspaceId).then(() => {
      const responseTime = performance.now() - startTime;
      
      // Update performance metrics
      performanceRef.current.responseTimes.push(responseTime);
      performanceRef.current.totalRequests++;
      performanceRef.current.successfulRequests++;
      
      // Keep only last 10 response times for rolling average
      if (performanceRef.current.responseTimes.length > 10) {
        performanceRef.current.responseTimes.shift();
      }
      
      const averageResponseTime = performanceRef.current.responseTimes.reduce((a, b) => a + b, 0) / performanceRef.current.responseTimes.length;
      const successRate = (performanceRef.current.successfulRequests / performanceRef.current.totalRequests) * 100;
      
      setSyncStatus(prev => ({
        ...prev,
        connected: true,
        performance: {
          averageResponseTime: Math.round(averageResponseTime),
          successRate: Math.round(successRate),
          errorCount: performanceRef.current.errorCount,
        },
      }));}).catch((error) => {
      performanceRef.current.totalRequests++;
      performanceRef.current.errorCount++;
      
      const successRate = (performanceRef.current.successfulRequests / performanceRef.current.totalRequests) * 100;
      
      setSyncStatus(prev => ({
        ...prev,
        connected: false,
        performance: {
          ...prev.performance!,
          successRate: Math.round(successRate),
          errorCount: performanceRef.current.errorCount,
        },
      }));
      
      console.warn("❌ Settings initialization failed:", error);
    });
    
    initializeRef.current = true;
  }, [getCurrentUser, initialize]);

  useEffect(() => {
    initializeSettings();
  }, [initializeSettings]);

  useEffect(() => {
    // Monitor sync status from the settings store
    const interval = setInterval(() => {
      try {
        const storeStatus = getSyncStatus();
        setSyncStatus(prev => ({
          ...prev,
          connected: true, // Settings store is always connected
          pendingUpdates: storeStatus.pendingUpdates || 0,
          lastSync: storeStatus.lastSync,
        }));
      } catch (error) {
        setSyncStatus(prev => ({
          ...prev,
          connected: false,
        }));
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [getSyncStatus]);

  useEffect(() => {
    // Optimized online/offline status monitoring
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, online: true }));
      if (import.meta.env.DEV) {
        toast.success("🌐 Back online - settings will sync automatically");
      }
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, online: false }));
      if (import.meta.env.DEV) {
        toast.warning("📡 Offline mode - changes saved locally");
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const forceSync = useCallback(async () => {
    const startTime = performance.now();
    
    try {
      await forceSyncSettings();
      const responseTime = performance.now() - startTime;toast.success("⚡ Settings synchronized successfully");
      
      // Update performance metrics
      performanceRef.current.responseTimes.push(responseTime);
      performanceRef.current.totalRequests++;
      performanceRef.current.successfulRequests++;
      
      setSyncStatus(prev => ({
        ...prev,
        connected: true,
        lastSync: new Date().toISOString(),
      }));
    } catch (error) {
      performanceRef.current.totalRequests++;
      performanceRef.current.errorCount++;
      
      console.error("❌ Force sync failed:", error);
      toast.error("⚠️ Failed to sync settings");
      
      setSyncStatus(prev => ({
        ...prev,
        connected: false,
      }));
    }
  }, [forceSyncSettings]);

  return {
    syncStatus,
    isLoading,
    forceSync,
    getCurrentUser,
    // Performance debugging info (only in dev mode)
    ...(import.meta.env.DEV && {
      debug: {
        averageResponseTime: syncStatus.performance?.averageResponseTime,
        successRate: syncStatus.performance?.successRate,
        errorCount: syncStatus.performance?.errorCount,
      }
    }),
  };
} 