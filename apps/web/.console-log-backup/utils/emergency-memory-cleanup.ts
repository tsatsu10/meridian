// 🚨 DEPRECATED: EMERGENCY MEMORY CLEANUP UTILITY
// @epic-3.2-time: Critical memory management for performance crises
// @persona-mike: Developer needs immediate memory relief tools
//
// ⚠️ DEPRECATION NOTICE: This utility is deprecated as of 2025-01-29
// Root causes of memory leaks have been fixed:
// - WebSocket event listeners now properly cleaned up
// - React Query cache optimized (2min stale, 5min GC)
// - Database connection pool fixed (idle_timeout: 20s)
// - useEffect cleanup functions added
//
// This utility should only be used for emergency debugging purposes.
// If you need to use this, there's likely a new memory leak that needs fixing.

/**
 * @deprecated Use proper memory management instead. This is for emergency debugging only.
 * Emergency memory cleanup function for critical situations
 * Can be called from browser console or programmatically
 */
export function emergencyMemoryCleanup(): void {
  console.warn('⚠️ DEPRECATED: emergencyMemoryCleanup() should not be needed. Check for new memory leaks.');
  const startUsage = getCurrentMemoryUsage();try {
    // 1. Clear React Query cache aggressively
    if ((window as any).__REACT_QUERY_CLIENT__) {
      const cache = (window as any).__REACT_QUERY_CLIENT__.getQueryCache();
      const allQueries = cache.getAll();
      
      allQueries.forEach((query: any) => {
        if (!(query as any).isFetching) {
          cache.remove(query);
        }
      });}
    
    // 2. Clear all localStorage except essential items
    const essentialKeys = [
      'meridian-workspace-id',
      'meridian-user-preferences', 
      'meridian-auth-token',
      'meridian-theme'
    ];
    
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !essentialKeys.includes(key)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));// 3. Clear sessionStorage completely
    const sessionCount = sessionStorage.length;
    sessionStorage.clear();// 4. Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();}
    
    // 5. Clear any large global variables if they exist
    if ((window as any).__LARGE_DATA_CACHE__) {
      delete (window as any).__LARGE_DATA_CACHE__;}
    
    // 6. Trigger browser memory optimization
    if ('memory' in performance) {
      // Force a layout recalculation to trigger cleanup
      document.body.style.display = 'none';
      document.body.offsetHeight; // Force reflow
      document.body.style.display = '';}
    
    // 7. Clear any image caches
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
    });const endUsage = getCurrentMemoryUsage();
    const improvement = startUsage - endUsage;// Show success notification
    showMemoryCleanupNotification(startUsage, endUsage);
    
  } catch (error) {
    console.error('❌ Emergency cleanup failed:', error);
    showErrorNotification('Emergency memory cleanup failed');
  }
}

/**
 * Get current memory usage percentage
 */
function getCurrentMemoryUsage(): number {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return memory.usedJSHeapSize / memory.totalJSHeapSize;
  }
  return 0;
}

/**
 * Show memory cleanup notification
 */
function showMemoryCleanupNotification(startUsage: number, endUsage: number): void {
  const improvement = Math.round((startUsage - endUsage) * 100);
  const finalUsage = Math.round(endUsage * 100);
  
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="
      position: fixed; 
      top: 20px; 
      right: 20px; 
      z-index: 9999;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      max-width: 320px;
      animation: slideIn 0.3s ease-out;
    ">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="font-size: 20px;">🧠</span>
        <strong>Memory Cleanup Complete!</strong>
      </div>
      <div>
        Memory usage: ${Math.round(startUsage * 100)}% → ${finalUsage}%<br>
        <strong>Freed ${improvement}% memory</strong>
      </div>
    </div>
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    </style>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

/**
 * Show error notification
 */
function showErrorNotification(message: string): void {
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="
      position: fixed; 
      top: 20px; 
      right: 20px; 
      z-index: 9999;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 320px;
    ">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">❌</span>
        <strong>${message}</strong>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 4000);
}

/**
 * @deprecated Use browser DevTools Performance monitor instead.
 * Memory monitoring function for console
 */
export function monitorMemory(): void {
  console.warn('⚠️ DEPRECATED: Use browser DevTools Performance monitor instead.');
  const monitor = () => {
    const usage = getCurrentMemoryUsage();
    const usagePercent = Math.round(usage * 100);

    if (usage > 0.9) {
      console.error(`🚨 CRITICAL MEMORY: ${usagePercent}% - Check for memory leaks!`);
    } else if (usage > 0.8) {
      console.warn(`⚠️ HIGH MEMORY: ${usagePercent}%`);
    } else {
      console.log(`✅ Memory usage: ${usagePercent}%`);
    }

    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log(`   Heap: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB / ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    }
  };

  monitor();
  const interval = setInterval(monitor, 5000);
  (window as any).stopMemoryMonitor = () => {
    clearInterval(interval);
    console.log('Memory monitoring stopped.');
  };
}

// Expose functions globally for emergency use
if (typeof window !== 'undefined') {
  (window as any).emergencyMemoryCleanup = emergencyMemoryCleanup;
  (window as any).monitorMemory = monitorMemory;
  (window as any).__REACT_QUERY_CLIENT__ = null; // Will be set by the app
} 