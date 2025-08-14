// Service Worker for eBay AI Listing Assistant PWA
// Provides offline support, caching, and background sync

const CACHE_NAME = 'ebay-ai-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/app',
  '/capture',
  '/manifest.json',
  '/src/styles/mobile.css',
  // Core JS and CSS will be added by build process
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/.netlify/functions/openai-vision-analysis',
  '/.netlify/functions/barcode-detection'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('📱 [SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📱 [SW] Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ [SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ [SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('📱 [SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('🗑️ [SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ [SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - intercept network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle different types of requests
  if (request.method === 'GET') {
    if (isStaticAsset(url)) {
      event.respondWith(cacheFirst(request));
    } else if (isAPIRequest(url)) {
      event.respondWith(networkFirst(request));
    } else if (isImageRequest(request)) {
      event.respondWith(cacheFirst(request));
    } else {
      event.respondWith(staleWhileRevalidate(request));
    }
  }
});

// Cache strategies
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('❌ [SW] Cache first strategy failed:', error);
    return caches.match('/offline.html') || new Response('Offline');
  }
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('⚠️ [SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API calls
    if (isAPIRequest(new URL(request.url))) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Network unavailable',
        offline: true
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 503
      });
    }
    
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
}

// Helper functions
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/);
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/.netlify/functions/') ||
         CACHEABLE_APIS.some(api => url.pathname.startsWith(api));
}

function isImageRequest(request) {
  return request.destination === 'image' ||
         request.headers.get('Accept')?.includes('image/');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 [SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'upload-photos') {
    event.waitUntil(syncUploadPhotos());
  } else if (event.tag === 'save-listing') {
    event.waitUntil(syncSaveListing());
  }
});

async function syncUploadPhotos() {
  try {
    console.log('📤 [SW] Syncing photo uploads...');
    
    // Get pending uploads from IndexedDB
    const pendingUploads = await getPendingUploads();
    
    for (const upload of pendingUploads) {
      try {
        const response = await fetch('/api/upload-photos', {
          method: 'POST',
          body: upload.formData
        });
        
        if (response.ok) {
          await removePendingUpload(upload.id);
          console.log('✅ [SW] Photo upload synced:', upload.id);
        }
      } catch (error) {
        console.error('❌ [SW] Failed to sync upload:', upload.id, error);
      }
    }
  } catch (error) {
    console.error('❌ [SW] Background sync failed:', error);
  }
}

async function syncSaveListing() {
  try {
    console.log('💾 [SW] Syncing listing saves...');
    
    // Get pending listings from IndexedDB
    const pendingListings = await getPendingListings();
    
    for (const listing of pendingListings) {
      try {
        const response = await fetch('/api/save-listing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(listing.data)
        });
        
        if (response.ok) {
          await removePendingListing(listing.id);
          console.log('✅ [SW] Listing synced:', listing.id);
        }
      } catch (error) {
        console.error('❌ [SW] Failed to sync listing:', listing.id, error);
      }
    }
  } catch (error) {
    console.error('❌ [SW] Listing sync failed:', error);
  }
}

// IndexedDB helpers for offline storage
async function getPendingUploads() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('eBayAI', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingUploads'], 'readonly');
      const store = transaction.objectStore('pendingUploads');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingUploads')) {
        db.createObjectStore('pendingUploads', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pendingListings')) {
        db.createObjectStore('pendingListings', { keyPath: 'id' });
      }
    };
  });
}

async function getPendingListings() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('eBayAI', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingListings'], 'readonly');
      const store = transaction.objectStore('pendingListings');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

async function removePendingUpload(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('eBayAI', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingUploads'], 'readwrite');
      const store = transaction.objectStore('pendingUploads');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

async function removePendingListing(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('eBayAI', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingListings'], 'readwrite');
      const store = transaction.objectStore('pendingListings');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  console.log('📱 [SW] Push notification received:', data);
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    image: data.image,
    data: data.url,
    actions: [
      {
        action: 'view',
        title: 'View Listing',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ],
    requireInteraction: true,
    renotify: true,
    tag: data.tag || 'default'
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('📱 [SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view' && event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('❌ [SW] Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ [SW] Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

console.log('✅ [SW] Service worker loaded successfully');