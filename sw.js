// Service Worker cho PWA
const CACHE_NAME = 'tai-chinh-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/script.js',
  '/Styles.css',
  '/Logo Finance.png',
  '/manifest.json'
];

// Install service worker
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
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
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});