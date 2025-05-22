// Service Worker cho PWA
const CACHE_NAME = 'tai-chinh-v2';
const urlsToCache = [
  './',
  './index.html',
  './script.js',
  './Styles.css',
  './Logo Finance.png',
  './manifest.json'
];

// Install service worker
self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Caching files...');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.error('Cache failed:', error);
      })
  );
});

// Activate service worker
self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch từ cache
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Trả về cache nếu có, không thì fetch từ network
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }
        console.log('Fetching from network:', event.request.url);
        return fetch(event.request);
      }
    )
  );
});