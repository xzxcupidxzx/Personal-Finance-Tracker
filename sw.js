// sw.js - PHIÊN BẢN TỐI ƯU

// 1. IMPORT VERSION VỚI CACHE-BUSTING
try {
  // Thêm một query string ngẫu nhiên để đảm bảo version.js luôn được tải mới khi SW được kiểm tra.
  importScripts(`/js/version.js?v=${new Date().getTime()}`);
} catch (e) {
  console.error('[SW] Không thể import version.js:', e);
}

const APP_VERSION = self.APP_VERSION || 'fallback-version';
const CACHE_NAME = `finance-app-cache-${APP_VERSION}`;

// 2. DANH SÁCH CACHE BAN ĐẦU (chỉ những file tối quan trọng)
// Các file JS, CSS sẽ được cache tự động ở lần truy cập đầu tiên.
const IMMUTABLE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/LogoFinance.png'
];

// File có thể thay đổi thường xuyên (JS, CSS)
const MUTABLE_URLS = [
    '/styles.css',
    '/app.js',
    '/utils.js',
    '/transactions.js',
    '/history.js',
    '/statistics.js',
    '/categories.js',
    '/settings.js',
    '/js/virtual-keyboard.js'
];


// INSTALL: Kích hoạt ngay và chỉ cache các file cốt lõi
self.addEventListener('install', (event) => {
  console.log(`[SW] Cài đặt phiên bản: ${APP_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Đang cache các tài sản cốt lõi.');
      return cache.addAll(IMMUTABLE_URLS);
    }).then(() => {
      self.skipWaiting(); // Kích hoạt ngay, không cần chờ
    })
  );
});

// ACTIVATE: Dọn dẹp cache cũ
self.addEventListener('activate', (event) => {
  console.log(`[SW] Kích hoạt phiên bản: ${APP_VERSION}`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH: Áp dụng chiến lược kết hợp
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Bỏ qua các request không phải GET hoặc từ extension
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  const url = new URL(request.url);

  // Chiến lược: Cache First cho các file cốt lõi, không thay đổi
  if (IMMUTABLE_URLS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then(response => response || fetch(request)));
    return;
  }

  // Chiến lược: Stale-While-Revalidate cho các file JS, CSS
  if (MUTABLE_URLS.some(path => url.pathname.endsWith(path))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          const fetchPromise = fetch(request).then(networkResponse => {
            // Cập nhật cache với phiên bản mới
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
          // Trả về từ cache ngay lập tức (nếu có), nếu không thì chờ mạng
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Mặc định, các request khác sẽ đi thẳng ra mạng
  event.respondWith(fetch(request));
});

// Lắng nghe các message từ client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: APP_VERSION });
    }
});