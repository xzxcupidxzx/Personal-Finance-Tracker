/**
 * SERVICE WORKER cho Financial App PWA
 * Hỗ trợ offline, caching và push notifications
 */

importScripts('/js/version.js'); // Dòng bạn vừa thêm

const CACHE_NAME = `financial-app-v${APP_VERSION}`; // Thay đổi dòng này
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/styles.css',
    '/js/app.js',
    '/js/utils.js',
    '/js/version.js',
    '/js/categories.js',
    '/js/settings.js',
    '/js/transactions.js',
    '/js/history.js',
    '/js/statistics.js',
    '/js/virtual-keyboard.js',
    '/LogoFinance.png',
    // External CDN resources
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css'
];

// Install event - Cache essential assets
self.addEventListener('install', (event) => {
    console.log('💾 Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('💾 Service Worker: Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch((error) => {
                console.error('💾 Service Worker: Cache failed during install', error);
            })
    );
    
    // Skip waiting to activate immediately
    self.skipWaiting();
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('🔄 Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // Take control of all pages immediately
    return self.clients.claim();
});

// Fetch event - Serve from cache with network fallback
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other protocols
    if (!event.request.url.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Return cached version if available
                if (cachedResponse) {
                    // For HTML files, check for updates in background
                    if (event.request.destination === 'document') {
                        fetch(event.request)
                            .then((networkResponse) => {
                                if (networkResponse.ok) {
                                    caches.open(CACHE_NAME)
                                        .then((cache) => cache.put(event.request, networkResponse.clone()));
                                }
                            })
                            .catch(() => {}); // Ignore network errors
                    }
                    return cachedResponse;
                }
                
                // Fetch from network and cache for future use
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Only cache successful responses
                        if (!networkResponse.ok) {
                            return networkResponse;
                        }
                        
                        // Clone the response before caching
                        const responseToCache = networkResponse.clone();
                        
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return networkResponse;
                    })
                    .catch(() => {
                        // Return offline page for navigation requests
                        if (event.request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// Background sync for offline transactions
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync-transactions') {
        console.log('🔄 Service Worker: Background sync triggered');
        event.waitUntil(syncOfflineTransactions());
    }
});

// Push notification handling
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body || 'Bạn có thông báo mới từ ứng dụng tài chính',
        icon: '/LogoFinance.png',
        badge: '/LogoFinance.png',
        vibrate: [200, 100, 200],
        tag: 'financial-notification',
        actions: [
            {
                action: 'view',
                title: 'Xem ngay',
                icon: '/LogoFinance.png'
            },
            {
                action: 'dismiss',
                title: 'Bỏ qua',
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Tài Chính App', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Helper function for background sync
async function syncOfflineTransactions() {
    try {
        // Get offline transactions from IndexedDB or localStorage
        const offlineTransactions = await getOfflineTransactions();
        
        if (offlineTransactions.length > 0) {
            // Sync with server when online
            const results = await Promise.allSettled(
                offlineTransactions.map(tx => syncTransaction(tx))
            );
            
            // Remove successfully synced transactions
            const synced = results.filter(r => r.status === 'fulfilled');
            if (synced.length > 0) {
                await removeOfflineTransactions(synced.map(r => r.value.id));
                console.log(`✅ Synced ${synced.length} offline transactions`);
            }
        }
    } catch (error) {
        console.error('❌ Background sync failed:', error);
    }
}

async function getOfflineTransactions() {
    // Implementation would depend on your offline storage strategy
    return [];
}

async function syncTransaction(transaction) {
    // Implementation for syncing individual transaction
    return transaction;
}

async function removeOfflineTransactions(ids) {
    // Implementation for removing synced transactions
}