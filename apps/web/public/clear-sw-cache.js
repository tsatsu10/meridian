// Immediate Service Worker Cache Clear Script
// Run this in browser console (F12) to clear all caches

(async function clearServiceWorkerCache() {
  console.log('🧹 Starting service worker cache cleanup...');
  
  try {
    // 1. Unregister all service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log(`Found ${registrations.length} service workers`);
    
    for (const registration of registrations) {
      await registration.unregister();
      console.log('✅ Unregistered service worker:', registration.scope);
    }
    
    // 2. Clear all caches
    const cacheNames = await caches.keys();
    console.log(`Found ${cacheNames.length} caches:`, cacheNames);
    
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
      console.log('✅ Deleted cache:', cacheName);
    }
    
    // 3. Clear storage
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ Cleared localStorage and sessionStorage');
    
    // 4. Clear IndexedDB
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        const deleteReq = indexedDB.deleteDatabase(db.name);
        await new Promise((resolve, reject) => {
          deleteReq.onsuccess = () => resolve();
          deleteReq.onerror = () => reject(deleteReq.error);
        });
        console.log('✅ Deleted IndexedDB:', db.name);
      }
    }
    
    console.log('🎉 Cache cleanup complete!');
    console.log('🔄 Please close all browser tabs and restart your browser');
    console.log('🚀 Then go to http://localhost:5174');
    
    // Auto-reload after cleanup
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
})();