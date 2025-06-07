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
  // Bỏ qua các request không phải GET hoặc của extension
  if (event.request.method !== 'GET' || 
      !event.request.url.startsWith('http')) { // Kiểm tra http/https
    return;
  }

  // Chiến lược Stale-While-Revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // Gửi yêu cầu mạng trong mọi trường hợp
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Nếu fetch thành công, cập nhật cache
          if (networkResponse && networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });

        // Trả về response từ cache ngay lập tức nếu có, nếu không thì đợi fetch hoàn thành
        return cachedResponse || fetchPromise;
      });
    })
  );
});

// Lắng nghe các message từ client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: APP_VERSION });
    }
});