const APP_VERSION = '1.0.3'; // Đổi version này mỗi khi build code mới!
const CACHE_NAME = 'finance-app-cache-' + APP_VERSION;

const urlsToCache = [
  '/',
  '/index.html',
  '/quick-add.html',
  '/styles.css',
  '/utils.js',
  '/app.js',
  '/categories.js',
  '/settings.js',
  '/transactions.js',
  '/history.js',
  '/statistics.js',
  '/LogoFinance.png',
  '/manifest.json'
];

// Install: Cache tất cả các file cần thiết
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Activate: Xoá cache cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network First, fallback cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        // Clone và lưu lại vào cache (nếu là file tĩnh)
        if (event.request.url.startsWith(self.location.origin)) {
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, respClone);
          });
        }
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});

// Nhận message từ UpdateManager
self.addEventListener('message', (event) => {
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CHECK_VERSION':
      event.ports[0].postMessage({ version: APP_VERSION, cache: CACHE_NAME });
      break;
    case 'FORCE_UPDATE':
      caches.keys().then(names => {
        Promise.all(names.map(name => caches.delete(name))).then(() => {
          self.skipWaiting();
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({ type: 'FORCE_UPDATE_COMPLETE' });
            });
          });
        });
      });
      break;
  }
});

// (Optional) Notification & Background Sync có thể bổ sung sau nếu thực sự cần thiết cho mobile/PWA

console.log('✅ Service Worker loaded! Version:', APP_VERSION);
