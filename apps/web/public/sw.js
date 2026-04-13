/**
 * Service Worker for Meridian PWA
 * Handles offline caching, background sync, and push notifications
 * Phase 2.4 - Mobile Optimization
 */

const CACHE_VERSION = 'meridian-v1.0.0';
const CACHE_NAME = `${CACHE_VERSION}`;

// Cache strategies
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html', // Fallback offline page
];

const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Cache duration in seconds
const API_CACHE_DURATION = 5 * 60; // 5 minutes
const IMAGE_CACHE_DURATION = 7 * 24 * 60 * 60; // 7 days

/**
 * Install Event - Cache precache resources
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching precache resources');
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
        return self.skipWaiting();
      })
  );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE &&
              cacheName !== IMAGE_CACHE &&
              cacheName !== API_CACHE) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
    }).then(() => {
        return self.clients.claim();
      })
  );
});

/**
 * Fetch Event - Network first, then cache
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests - Network first, cache as backup
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE, API_CACHE_DURATION));
    return;
  }

  // Images - Cache first
  if (request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE, IMAGE_CACHE_DURATION));
    return;
  }

  // Other requests - Network first with runtime cache
  event.respondWith(networkFirstStrategy(request, RUNTIME_CACHE));
});

/**
 * Cache First Strategy
 * Good for static assets (images, fonts)
 */
async function cacheFirstStrategy(request, cacheName, maxAge) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Check if cache is expired
      const dateHeader = cachedResponse.headers.get('date');
      const cachedDate = dateHeader ? new Date(dateHeader) : null;
      
      if (cachedDate && maxAge) {
        const age = (Date.now() - cachedDate.getTime()) / 1000;
        if (age > maxAge) {
          // Cache expired, fetch new
          return fetchAndCache(request, cache);
        }
      }

      return cachedResponse;
    }

    return fetchAndCache(request, cache);
  } catch (error) {
    console.error('[ServiceWorker] Cache first strategy failed:', error);
    return new Response('Network error', { status: 408 });
  }
}

/**
 * Network First Strategy
 * Good for dynamic content (API, HTML)
 */
async function networkFirstStrategy(request, cacheName, maxAge) {
  try {
    const cache = await caches.open(cacheName);
    
    try {
      const networkResponse = await fetch(request);
      
      // Clone and cache successful responses
      if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      
      return networkResponse;
    } catch (networkError) {
      console.log('[ServiceWorker] Network failed, trying cache:', request.url);
      
      const cachedResponse = await cache.match(request);
      
        if (cachedResponse) {
          return cachedResponse;
      }

      // Return offline page for navigation requests
      if (request.mode === 'navigate') {
        return cache.match('/offline.html');
      }

      throw networkError;
    }
  } catch (error) {
    console.error('[ServiceWorker] Network first strategy failed:', error);
    return new Response('Network error', { status: 408 });
  }
}

/**
 * Fetch and cache helper
 */
async function fetchAndCache(request, cache) {
  const networkResponse = await fetch(request);
  
  if (networkResponse && networkResponse.status === 200) {
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

/**
 * Background Sync - Retry failed requests
 */
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('[ServiceWorker] Syncing data...');
  // Implement background sync logic here
  // E.g., retry failed API requests from IndexedDB queue
}

/**
 * Push Notifications
 */
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Meridian Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/meridian-logomark.png',
    badge: '/meridian-logomark.png',
    tag: data.tag || 'notification',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [
      {
        action: 'view',
        title: 'View',
        icon: '/meridian-logomark.png',
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: '/meridian-logomark.png',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/**
 * Notification Click
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open or focus app
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
      })
  );
});

/**
 * Message handling
 */
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log('[ServiceWorker] Loaded');
