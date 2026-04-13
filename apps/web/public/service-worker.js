/**
 * Meridian Service Worker - PWA Support
 * 
 * Features:
 * - Offline support with cache-first strategy
 * - Background sync for failed requests
 * - Push notifications support
 * - Automatic cache updates
 * - Network-first for API calls
 * 
 * Version: 1.0.0
 */

const CACHE_VERSION = "meridian-v1.0.0";
const CACHE_ASSETS = "meridian-assets-v1";
const CACHE_API = "meridian-api-v1";
const CACHE_IMAGES = "meridian-images-v1";

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/meridian-logomark.png",
];

// Install event - precache critical assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");
  
  event.waitUntil(
    caches.open(CACHE_ASSETS).then((cache) => {
      console.log("[Service Worker] Precaching assets");
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting(); // Activate immediately
    })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...");
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_ASSETS &&
            cacheName !== CACHE_API &&
            cacheName !== CACHE_IMAGES
          ) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Take control immediately
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // API requests - Network First strategy
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstStrategy(request, CACHE_API));
    return;
  }

  // Images - Cache First strategy
  if (request.destination === "image") {
    event.respondWith(cacheFirstStrategy(request, CACHE_IMAGES));
    return;
  }

  // Static assets - Cache First strategy
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|eot|svg)$/) ||
    url.pathname.startsWith("/assets/")
  ) {
    event.respondWith(cacheFirstStrategy(request, CACHE_ASSETS));
    return;
  }

  // HTML pages - Network First strategy (for fresh content)
  event.respondWith(networkFirstStrategy(request, CACHE_ASSETS));
});

/**
 * Network First Strategy
 * Try network first, fall back to cache if offline
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);
    
    // Only cache successful responses
    if (response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    const cached = await caches.match(request);
    
    if (cached) {
      console.log("[Service Worker] Serving from cache:", request.url);
      return cached;
    }
    
    // If no cache, return offline page or error
    return new Response(
      JSON.stringify({
        error: "Offline",
        message: "You are currently offline. Please check your connection.",
      }),
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Cache First Strategy
 * Serve from cache if available, fetch from network if not
 */
async function cacheFirstStrategy(request, cacheName) {
  const cached = await caches.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error("[Service Worker] Fetch failed:", error);
    
    // Return a fallback response
    return new Response("Resource not available offline", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

// Background Sync - for failed requests
self.addEventListener("sync", (event) => {
  console.log("[Service Worker] Background sync:", event.tag);
  
  if (event.tag === "sync-tasks") {
    event.waitUntil(syncTasks());
  }
});

/**
 * Sync pending tasks when back online
 */
async function syncTasks() {
  try {
    // Get pending tasks from IndexedDB or local storage
    // This is a placeholder - implement based on your needs
    console.log("[Service Worker] Syncing tasks...");
    
    // Notify clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "SYNC_COMPLETE",
        timestamp: Date.now(),
      });
    });
  } catch (error) {
    console.error("[Service Worker] Sync failed:", error);
  }
}

// Push Notification support
self.addEventListener("push", (event) => {
  console.log("[Service Worker] Push received");
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Meridian Notification";
  const options = {
    body: data.body || "You have a new notification",
    icon: "/meridian-logomark.png",
    badge: "/meridian-logomark.png",
    vibrate: [200, 100, 200],
    tag: data.tag || "meridian-notification",
    data: data.data || {},
    actions: data.actions || [
      { action: "open", title: "Open" },
      { action: "close", title: "Close" },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("[Service Worker] Notification clicked");
  
  event.notification.close();
  
  if (event.action === "open" || !event.action) {
    event.waitUntil(
      self.clients.openWindow(event.notification.data.url || "/")
    );
  }
});

// Message handler for client communication
self.addEventListener("message", (event) => {
  console.log("[Service Worker] Message received:", event.data);
  
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  
  if (event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});

console.log("[Service Worker] Loaded successfully");
