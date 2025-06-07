// sw.js - PHIÊN BẢN TỐI ƯU VÀ SỬA LỖI CHO IOS

// 1. IMPORT VERSION VỚI CACHE-BUSTING
// Thêm một query string ngẫu nhiên để đảm bảo version.js luôn được tải mới khi SW được kiểm tra.
try {
  importScripts(`/js/version.js?v=${new Date().getTime()}`);
} catch (e) {
  console.error('[SW] Không thể import version.js:', e);
}

const APP_VERSION = self.APP_VERSION || 'fallback-version';
const CACHE_NAME = `finance-app-cache-${APP_VERSION}`;

// 2. DANH SÁCH CACHE BAN ĐẦU (chỉ những file tối quan trọng, không thay đổi thường xuyên)
const IMMUTABLE_URLS = [
  '/',
  '/index.html', // Mặc dù sẽ áp dụng NetworkFirst, vẫn cache để có thể offline
  '/manifest.json',
  '/LogoFinance.png'
];

// 3. HÀM HELPER
const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request);
  return cachedResponse || fetch(request);
};

const networkFirst = async (request) => {
  try {
    const networkResponse = await fetch(request);
    // Nếu fetch thành công, cập nhật cache
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Nếu fetch thất bại (offline), trả về từ cache
    console.warn(`[SW] Network fetch failed for ${request.url}, falling back to cache.`);
    return caches.match(request);
  }
};

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
};

// 4. INSTALL EVENT: Kích hoạt ngay và chỉ cache các file cốt lõi
self.addEventListener('install', (event) => {
  console.log(`[SW] Cài đặt phiên bản: ${APP_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Đang cache các tài sản cốt lõi.');
      return cache.addAll(IMMUTABLE_URLS);
    }).then(() => {
      // Kích hoạt SW mới ngay lập tức mà không cần chờ người dùng đóng tất cả các tab
      self.skipWaiting();
    })
  );
});

// 5. ACTIVATE EVENT: Dọn dẹp cache cũ
self.addEventListener('activate', (event) => {
  console.log(`[SW] Kích hoạt phiên bản: ${APP_VERSION}`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME) // Chỉ xóa các cache không phải là cache hiện tại
          .map(name => {
            console.log(`[SW] Đang xóa cache cũ: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Kiểm soát tất cả các client (tab) ngay lập tức
      return self.clients.claim();
    })
  );
});

// 6. FETCH EVENT: Áp dụng chiến lược cache phù hợp
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Bỏ qua các request không phải GET hoặc của extension
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }
  
  // Áp dụng chiến lược NETWORK FIRST cho các file HTML (navigation requests)
  // Điều này đảm bảo người dùng luôn nhận được phiên bản mới nhất của ứng dụng khi có mạng.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Áp dụng chiến lược STALE-WHILE-REVALIDATE cho các tài sản tĩnh (CSS, JS, Fonts)
  // Tốc độ nhanh vì trả về từ cache ngay, sau đó cập nhật dưới nền.
  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'worker' || request.destination === 'font') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Áp dụng chiến lược CACHE-FIRST cho hình ảnh và các tài sản khác không thay đổi thường xuyên
  // Tối ưu tốc độ, chỉ fetch từ mạng nếu chưa có trong cache.
  if (request.destination === 'image' || request.destination === 'manifest') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Fallback (dự phòng) cho các request khác
  event.respondWith(staleWhileRevalidate(request));
});


// 7. MESSAGE EVENT: Giao tiếp với client
self.addEventListener('message', (event) => {
  // Trả về version của SW khi client yêu cầu
  if (event.data && event.data.type === 'CHECK_VERSION') {
    event.ports[0].postMessage({ version: APP_VERSION });
  }

  // Kích hoạt SW mới ngay lập tức khi nhận được lệnh
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Nhận lệnh SKIP_WAITING từ client. Đang kích hoạt...');
    self.skipWaiting();
  }
});