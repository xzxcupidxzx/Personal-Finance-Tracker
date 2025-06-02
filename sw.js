// sw.js - Service Worker file
const CACHE_NAME = 'finance-app-v1.0.1'; // Thay đổi version này khi update
const APP_VERSION = '1.0.1';

// Files cần cache
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './style.css',
    './script.js',
    './manifest.json',
    './logo-finance.png',
    './LogoFinance.png'
];

// Install event - cache files
self.addEventListener('install', event => {
    console.log('SW: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW: Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                // Force activate new service worker
                return self.skipWaiting();
            })
    );
});

// Activate event - delete old caches
self.addEventListener('activate', event => {
    console.log('SW: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Take control of all clients
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', event => {
    event.respondWith(
        // Try network first for HTML files
        fetch(event.request)
            .then(response => {
                // If successful, update cache and return response
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseClone);
                        });
                }
                return response;
            })
            .catch(() => {
                // If network fails, serve from cache
                return caches.match(event.request)
                    .then(response => {
                        if (response) {
                            return response;
                        }
                        // Fallback for navigation requests
                        if (event.request.destination === 'document') {
                            return caches.match('./index.html');
                        }
                    });
            })
    );
});

// Listen for messages from main thread
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CHECK_VERSION') {
        event.ports[0].postMessage({
            version: APP_VERSION,
            cacheName: CACHE_NAME
        });
    }
});
