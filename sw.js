// sw.js - Improved Service Worker with Smart Update Detection
const CACHE_NAME = 'finance-app-v1.0.2'; // Tăng version khi có update
const APP_VERSION = '1.0.2';
const CACHE_VERSION = 'v1.0.2';

// Files cần cache - thêm timestamp để force update
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './manifest.json',
    './LogoFinance.png',
    './quick-add.html',
    './js/utils.js',
    './js/app.js',
    './js/transactions.js',
    './js/categories.js',
    './js/settings.js',
    './js/statistics.js',
    './js/history.js'
];

// Network timeout (3 seconds)
const NETWORK_TIMEOUT = 3000;

// Install event - cache files with versioning
self.addEventListener('install', event => {
    console.log('🔧 SW: Installing version', APP_VERSION);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 SW: Caching files for version', APP_VERSION);
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('✅ SW: Installation complete');
                // Force activate immediately - skip waiting
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ SW: Installation failed:', error);
            })
    );
});

// Activate event - cleanup old caches and take control
self.addEventListener('activate', event => {
    console.log('🚀 SW: Activating version', APP_VERSION);
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('🗑️ SW: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all clients immediately
            self.clients.claim()
        ]).then(() => {
            console.log('✅ SW: Activation complete, version', APP_VERSION);
            // Notify all clients about the update
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_UPDATED',
                        version: APP_VERSION
                    });
                });
            });
        })
    );
});

// Enhanced fetch strategy with timeout and smart caching
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip cache for certain requests
    if (shouldSkipCache(request)) {
        event.respondWith(fetch(request));
        return;
    }
    
    // Different strategies for different file types
    if (isHTMLRequest(request)) {
        event.respondWith(networkFirstWithTimeout(request));
    } else if (isAssetRequest(request)) {
        event.respondWith(cacheFirstWithRefresh(request));
    } else {
        event.respondWith(networkFirstWithTimeout(request));
    }
});

// Network-first strategy with timeout for HTML
async function networkFirstWithTimeout(request) {
    try {
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Network timeout')), NETWORK_TIMEOUT);
        });
        
        // Race between network and timeout
        const response = await Promise.race([
            fetch(request),
            timeoutPromise
        ]);
        
        // If successful, update cache
        if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseClone);
            });
        }
        
        return response;
    } catch (error) {
        console.log('🌐 SW: Network failed, serving from cache:', request.url);
        
        // Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Ultimate fallback for navigation requests
        if (request.mode === 'navigate') {
            const indexResponse = await caches.match('./index.html');
            if (indexResponse) {
                return indexResponse;
            }
        }
        
        // If all fails, return a simple error response
        return new Response('Offline - Content not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// Cache-first with background refresh for assets
async function cacheFirstWithRefresh(request) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            // Serve from cache immediately
            // But also refresh in background
            fetchAndCache(request);
            return cachedResponse;
        }
        
        // If not in cache, fetch from network
        return await fetchAndCache(request);
        
    } catch (error) {
        console.error('🔄 SW: Cache-first strategy failed:', error);
        return new Response('Asset not available', { status: 404 });
    }
}

// Helper function to fetch and cache
async function fetchAndCache(request) {
    const response = await fetch(request);
    
    if (response && response.status === 200) {
        const responseClone = response.clone();
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, responseClone);
    }
    
    return response;
}

// Check if request should skip cache
function shouldSkipCache(request) {
    const url = new URL(request.url);
    
    // Skip external APIs and dynamic content
    if (url.hostname !== self.location.hostname) {
        return true;
    }
    
    // Skip if URL has cache-busting parameters
    if (url.searchParams.has('nocache') || url.searchParams.has('v') || url.searchParams.has('t')) {
        return true;
    }
    
    return false;
}

// Check if it's an HTML request
function isHTMLRequest(request) {
    return request.headers.get('Accept')?.includes('text/html') || 
           request.mode === 'navigate';
}

// Check if it's an asset request (CSS, JS, images)
function isAssetRequest(request) {
    const url = new URL(request.url);
    const extension = url.pathname.split('.').pop();
    
    return ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2'].includes(extension);
}

// Enhanced message handling
self.addEventListener('message', event => {
    console.log('💬 SW: Received message:', event.data);
    
    switch (event.data?.type) {
        case 'SKIP_WAITING':
            console.log('⏭️ SW: Skipping waiting...');
            self.skipWaiting();
            break;
            
        case 'CHECK_VERSION':
            event.ports[0].postMessage({
                type: 'VERSION_INFO',
                version: APP_VERSION,
                cacheName: CACHE_NAME,
                cacheVersion: CACHE_VERSION
            });
            break;
            
        case 'FORCE_UPDATE':
            console.log('🔄 SW: Force update requested');
            forceUpdate();
            break;
            
        case 'CLEAR_CACHE':
            console.log('🗑️ SW: Clear cache requested');
            clearAllCaches();
            break;
            
        case 'GET_CACHE_INFO':
            getCacheInfo().then(info => {
                event.ports[0].postMessage({
                    type: 'CACHE_INFO',
                    ...info
                });
            });
            break;
    }
});

// Force update function
async function forceUpdate() {
    try {
        // Clear all caches
        await clearAllCaches();
        
        // Create new cache with fresh content
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(urlsToCache.map(url => `${url}?v=${Date.now()}`));
        
        // Notify all clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'FORCE_UPDATE_COMPLETE',
                version: APP_VERSION
            });
        });
        
        console.log('✅ SW: Force update complete');
    } catch (error) {
        console.error('❌ SW: Force update failed:', error);
    }
}

// Clear all caches
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('🗑️ SW: All caches cleared');
}

// Get cache information
async function getCacheInfo() {
    try {
        const cacheNames = await caches.keys();
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        
        return {
            version: APP_VERSION,
            cacheName: CACHE_NAME,
            cacheCount: cacheNames.length,
            cachedUrls: keys.length,
            lastUpdate: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ SW: Failed to get cache info:', error);
        return {
            version: APP_VERSION,
            error: error.message
        };
    }
}

// Background sync for offline transactions (if needed)
self.addEventListener('sync', event => {
    console.log('🔄 SW: Background sync:', event.tag);
    
    if (event.tag === 'background-transaction') {
        event.waitUntil(syncPendingTransactions());
    }
});

// Sync pending transactions (example implementation)
async function syncPendingTransactions() {
    try {
        console.log('💾 SW: Syncing pending transactions...');
        
        // This would integrate with your app's storage system
        // For now, just notify clients that sync is available
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_AVAILABLE'
            });
        });
        
    } catch (error) {
        console.error('❌ SW: Sync failed:', error);
    }
}

// Handle updates from server
self.addEventListener('notificationclick', event => {
    console.log('🔔 SW: Notification clicked');
    
    event.notification.close();
    
    // Open app or focus existing window
    event.waitUntil(
        self.clients.matchAll().then(clients => {
            if (clients.length > 0) {
                // Focus existing client
                return clients[0].focus();
            } else {
                // Open new window
                return self.clients.openWindow('./');
            }
        })
    );
});

console.log('🏁 SW: Service Worker script loaded, version', APP_VERSION);
