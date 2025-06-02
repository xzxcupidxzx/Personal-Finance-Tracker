// sw.js

// Cố gắng import phiên bản từ tệp version.js
try {
  // Đường dẫn './js/version.js' là tương đối với vị trí của sw.js (ở thư mục gốc)
  importScripts('./js/version.js'); 
} catch (e) {
  console.error('Lỗi: Không thể import version.js trong Service Worker:', e);
  // Phiên bản dự phòng nếu import lỗi
  var APP_VERSION = '0.0.0-sw-import-error'; // Sử dụng var để đảm bảo tính global nếu const trong version.js có vấn đề
}

const CACHE_NAME = 'finance-app-cache-' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'fallback-cache');

const urlsToCache = [
  '/',
  '/index.html',
  '/quick-add.html', // Nếu bạn có trang này
  '/styles.css',
  // Các file JS modules chính thường được cache thông qua chiến lược network-first.
  // Tuy nhiên, nếu bạn muốn chúng có sẵn offline ngay từ đầu, bạn có thể thêm chúng ở đây.
  // './js/utils.js', 
  // './js/app.js',
  './LogoFinance.png', 
  './manifest.json'
  // './js/version.js', // Không nên cache version.js để đảm bảo SW luôn lấy bản mới nhất khi cập nhật
];

// Install: Cache các tệp cần thiết
self.addEventListener('install', (event) => {
  console.log(`[SW] Cố gắng cài đặt phiên bản: ${APP_VERSION}`);
  self.skipWaiting(); // Buộc SW mới kích hoạt ngay
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log(`[SW] Đang cache các tệp cho phiên bản ${APP_VERSION}:`, urlsToCache);
      return cache.addAll(urlsToCache).catch(err => {
        console.error('[SW] Không thể cache tất cả các tệp:', err);
      });
    })
  );
});

// Activate: Xóa cache cũ
self.addEventListener('activate', (event) => {
  console.log(`[SW] Kích hoạt phiên bản: ${APP_VERSION}`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`[SW] Đang xóa cache cũ: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Kiểm soát các client ngay lập tức
  );
});

// Fetch: Chiến lược Network First, fallback về Cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok && event.request.url.startsWith(self.location.origin)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          console.warn(`[SW] Fetch thất bại cho: ${event.request.url}. Không tìm thấy trong cache.`);
          return new Response("Network error and not found in cache", {
            status: 404,
            statusText: "Not Found"
          });
        });
      })
  );
});

// Nhận message từ client (ví dụ: từ UpdateManager)
self.addEventListener('message', (event) => {
  if (event.data) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'CHECK_VERSION':
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ version: APP_VERSION, cache: CACHE_NAME });
        }
        break;
      case 'FORCE_UPDATE': 
        console.log('[SW] Nhận được yêu cầu FORCE_UPDATE. Đang xóa tất cả cache và chuẩn bị tải lại client.');
        caches.keys().then(names => {
          return Promise.all(names.map(name => caches.delete(name)));
        }).then(() => {
          // Không cần self.skipWaiting() ở đây vì SW này có thể đã là active
          // hoặc sẽ bị thay thế bởi SW mới sau khi client reload.
          return self.clients.matchAll({ type: 'window' });
        }).then(clients => {
          clients.forEach(client => {
            if (client.postMessage) {
                 client.postMessage({ type: 'FORCE_UPDATE_COMPLETE' });
            }
          });
        }).catch(err => {
            console.error('[SW] Lỗi trong quá trình FORCE_UPDATE:', err);
        });
        break;
    }
  }
});

console.log(`✅ Service Worker phiên bản ${APP_VERSION} đã tải và đang chạy! Tên cache: ${CACHE_NAME}`);
