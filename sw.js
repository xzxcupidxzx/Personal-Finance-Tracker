// sw.js

let swAppVersion; // Sử dụng let và tên khác để tránh xung đột và hoisting

try {
  // Đường dẫn './js/version.js' là tương đối với vị trí của sw.js (thư mục gốc)
  importScripts('./js/version.js'); // File này sẽ định nghĩa global const APP_VERSION
  if (typeof APP_VERSION !== 'undefined') {
    swAppVersion = APP_VERSION; // Gán giá trị từ version.js vào biến của SW
  } else {
    // Điều này không nên xảy ra nếu version.js tải đúng
    console.warn('[SW] APP_VERSION không được định nghĩa sau khi import version.js');
    swAppVersion = '0.0.0-version-undefined';
  }
} catch (e) {
  console.error('[SW] Lỗi: Không thể import version.js:', e);
  swAppVersion = '0.0.0-sw-import-error'; // Phiên bản dự phòng nếu import lỗi
}

const CACHE_NAME = 'finance-app-cache-' + swAppVersion;

const urlsToCache = [
  '/',
  '/index.html',
  '/quick-add.html', // Nếu bạn có trang này
  '/styles.css',
  // Các file JS modules chính thường được cache thông qua chiến lược network-first.
  // './js/utils.js', 
  // './js/app.js',
  './LogoFinance.png', 
  './manifest.json'
  // Không cache version.js để SW luôn lấy bản mới nhất khi cập nhật
];

// Install: Cache các tệp cần thiết
self.addEventListener('install', (event) => {
  console.log(`[SW] Cố gắng cài đặt phiên bản: ${swAppVersion}`);
  self.skipWaiting(); // Buộc SW mới kích hoạt ngay
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log(`[SW] Đang cache các tệp cho phiên bản ${swAppVersion}:`, urlsToCache);
      return cache.addAll(urlsToCache).catch(err => {
        console.error('[SW] Không thể cache tất cả các tệp:', err, urlsToCache); // Thêm urlsToCache vào log
      });
    })
  );
});

// Activate: Xóa cache cũ
self.addEventListener('activate', (event) => {
  console.log(`[SW] Kích hoạt phiên bản: ${swAppVersion}`);
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
    }).then(() => {
        console.log('[SW] Clients claimed.');
        return self.clients.claim(); // Kiểm soát các client ngay lập tức
    })
  );
});

// Fetch: Chiến lược Network First, fallback về Cache
self.addEventListener('fetch', (event) => {
  // Bỏ qua các request không phải GET hoặc của extension
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://') ||
      event.request.url.startsWith('moz-extension://')) {
    return;
  }

  // Bỏ qua các request cross-origin không cần cache (ví dụ: Google Fonts)
  if (!event.request.url.startsWith(self.location.origin)) {
    // Nếu muốn cache cả Google Fonts hoặc CDN khác, cần xử lý cẩn thận hơn
    // với opaque responses hoặc chiến lược cache-first.
    // Hiện tại, chúng ta sẽ fetch trực tiếp từ network cho cross-origin.
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Chỉ cache nếu response hợp lệ và là same-origin
        if (networkResponse && networkResponse.ok && event.request.url.startsWith(self.location.origin)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback về cache nếu network lỗi
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          console.warn(`[SW] Fetch thất bại cho: ${event.request.url}. Không tìm thấy trong cache.`);
          // Trả về một response lỗi chuẩn
          return new Response("Network error and resource not found in cache", {
            status: 404,
            statusText: "Not Found In Cache or Network"
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
        console.log('[SW] Received SKIP_WAITING message, calling skipWaiting().');
        self.skipWaiting();
        break;
      case 'CHECK_VERSION':
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ version: swAppVersion, cache: CACHE_NAME });
        }
        break;
      case 'FORCE_UPDATE': 
        console.log('[SW] Nhận được yêu cầu FORCE_UPDATE. Đang xóa tất cả cache và chuẩn bị tải lại client.');
        event.waitUntil( // Đảm bảo các hành động async hoàn thành
            caches.keys().then(names => {
              return Promise.all(names.map(name => caches.delete(name)));
            }).then(() => {
              return self.clients.matchAll({ type: 'window', includeUncontrolled: true }); // includeUncontrolled để đảm bảo
            }).then(clients => {
              clients.forEach(client => {
                if (client.postMessage) {
                     client.postMessage({ type: 'FORCE_UPDATE_COMPLETE' });
                }
              });
            }).catch(err => {
                console.error('[SW] Lỗi trong quá trình FORCE_UPDATE:', err);
            })
        );
        break;
    }
  }
});

console.log(`✅ Service Worker phiên bản ${swAppVersion} đã tải và đang chạy! Tên cache: ${CACHE_NAME}`);
