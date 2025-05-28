/**
 * SERVICE WORKER
 * Handles offline functionality, caching, and background sync
 */

const CACHE_NAME = 'financial-app-v2.0.0';
const CACHE_VERSION = 2;

// Files to cache for offline functionality
const STATIC_CACHE_FILES = [
  './',
  './index.html',
  './styles.css',
  './js/utils.js',
  './js/app.js', 
  './js/transactions.js',
  './js/history.js',
  './js/statistics.js',
  './js/categories.js',
  './js/settings.js',
  './manifest.json',
  
  // External dependencies
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Dynamic cache for runtime resources
const RUNTIME_CACHE = 'financial-app-runtime-v1';

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first', 
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

/**
 * Install event - Cache static resources
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_CACHE_FILES.filter(url => !url.startsWith('http')));
      }),
      
      // Cache external resources with error handling
      cacheExternalResources()
    ]).then(() => {
      console.log('[SW] Service worker installed successfully');
      // Force activation
      return self.skipWaiting();
    }).catch((error) => {
      console.error('[SW] Installation failed:', error);
    })
  );
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith('financial-app-') && cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Take control of all clients
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Service worker activated successfully');
    })
  );
});

/**
 * Fetch event - Handle network requests
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests except for allowed domains
  if (url.origin !== location.origin && !isAllowedExternalDomain(url.origin)) {
    return;
  }
  
  // Determine cache strategy based on request type
  let strategy = CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  
  if (isStaticAsset(url)) {
    strategy = CACHE_STRATEGIES.CACHE_FIRST;
  } else if (isAPIRequest(url)) {
    strategy = CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  event.respondWith(handleRequest(request, strategy));
});

/**
 * Handle background sync for offline transactions
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-transaction-sync') {
    event.waitUntil(syncOfflineTransactions());
  }
});

/**
 * Handle push notifications (future feature)
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Bạn có giao dịch mới cần xem',
      icon: './logo-finance-192.png',
      badge: './logo-finance-72.png',
      tag: 'financial-notification',
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'Xem chi tiết'
        },
        {
          action: 'dismiss', 
          title: 'Bỏ qua'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Quản lý tài chính', options)
    );
  }
});

/**
 * Handle notification click
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      self.clients.openWindow('./#transactions')
    );
  }
});

/**
 * Cache external resources with error handling
 */
async function cacheExternalResources() {
  const cache = await caches.open(CACHE_NAME);
  const externalUrls = STATIC_CACHE_FILES.filter(url => url.startsWith('http'));
  
  for (const url of externalUrls) {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (response.ok) {
        await cache.put(url, response);
        console.log('[SW] Cached external resource:', url);
      }
    } catch (error) {
      console.warn('[SW] Failed to cache external resource:', url, error);
    }
  }
}

/**
 * Handle requests with different caching strategies
 */
async function handleRequest(request, strategy) {
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request);
      
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request);
      
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
    default:
      return staleWhileRevalidate(request);
  }
}

/**
 * Cache First strategy - Check cache first, fallback to network
 */
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    
    // Return offline fallback if available
    return getOfflineFallback(request);
  }
}

/**
 * Network First strategy - Try network first, fallback to cache
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return getOfflineFallback(request);
  }
}

/**
 * Stale While Revalidate strategy - Return cached version while updating cache
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Start network request (don't await)
  const networkResponsePromise = fetch(request).then(async (response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch((error) => {
    console.warn('[SW] Background fetch failed:', error);
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network
  try {
    return await networkResponsePromise;
  } catch (error) {
    return getOfflineFallback(request);
  }
}

/**
 * Get offline fallback response
 */
async function getOfflineFallback(request) {
  const url = new URL(request.url);
  
  // Return main page for navigation requests
  if (request.mode === 'navigate') {
    const cachedIndex = await caches.match('./index.html');
    if (cachedIndex) {
      return cachedIndex;
    }
  }
  
  // Return offline page or generic response
  return new Response(
    JSON.stringify({
      error: 'Không có kết nối mạng',
      offline: true,
      timestamp: new Date().toISOString()
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

/**
 * Check if URL is a static asset
 */
function isStaticAsset(url) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

/**
 * Check if URL is an API request
 */
function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') || url.search.includes('api=');
}

/**
 * Check if external domain is allowed
 */
function isAllowedExternalDomain(origin) {
  const allowedDomains = [
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
  ];
  
  return allowedDomains.some(domain => origin.startsWith(domain));
}

/**
 * Sync offline transactions (placeholder for future implementation)
 */
async function syncOfflineTransactions() {
  console.log('[SW] Syncing offline transactions...');
  
  try {
    // Get offline transactions from IndexedDB
    const offlineTransactions = await getOfflineTransactions();
    
    if (offlineTransactions.length === 0) {
      console.log('[SW] No offline transactions to sync');
      return;
    }
    
    // Sync with server (when backend is implemented)
    for (const transaction of offlineTransactions) {
      try {
        // await syncTransactionToServer(transaction);
        console.log('[SW] Transaction synced:', transaction.id);
      } catch (error) {
        console.error('[SW] Failed to sync transaction:', transaction.id, error);
      }
    }
    
    // Clear synced transactions
    await clearSyncedTransactions();
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

/**
 * Get offline transactions from IndexedDB (placeholder)
 */
async function getOfflineTransactions() {
  // TODO: Implement IndexedDB operations for offline transaction storage
  return [];
}

/**
 * Clear synced transactions (placeholder)
 */
async function clearSyncedTransactions() {
  // TODO: Implement clearing of synced transactions from IndexedDB
  console.log('[SW] Cleared synced transactions');
}

/**
 * Handle periodic background sync (placeholder for future features)
 */
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync triggered:', event.tag);
  
  if (event.tag === 'daily-backup') {
    event.waitUntil(performDailyBackup());
  }
});

/**
 * Perform daily backup (placeholder)
 */
async function performDailyBackup() {
  console.log('[SW] Performing daily backup...');
  
  try {
    // Get app data
    const appData = await getAppDataForBackup();
    
    // Store backup locally or sync to cloud
    await storeBackup(appData);
    
    console.log('[SW] Daily backup completed');
  } catch (error) {
    console.error('[SW] Daily backup failed:', error);
  }
}

/**
 * Get app data for backup (placeholder)
 */
async function getAppDataForBackup() {
  // TODO: Get data from localStorage or IndexedDB
  return {
    timestamp: new Date().toISOString(),
    data: {}
  };
}

/**
 * Store backup (placeholder)
 */
async function storeBackup(data) {
  // TODO: Implement backup storage
  console.log('[SW] Backup stored:', data.timestamp);
}

/**
 * Handle app shortcuts
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * Cleanup on error
 */
self.addEventListener('error', (event) => {
  console.error('[SW] Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service worker script loaded');