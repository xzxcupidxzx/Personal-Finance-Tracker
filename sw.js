/**
 * Service Worker (sw.js) - Phiên bản Tối ưu & An toàn
 *
 * Các thay đổi chính:
 * 1. Logic import phiên bản được chuyển vào bên trong `install` event.
 * 2. Thêm cơ chế xử lý lỗi chặt chẽ: Nếu không import được version.js, quá trình cài đặt sẽ thất bại.
 * 3. Tên cache (CACHE_NAME) chỉ được xác định sau khi đã có phiên bản (APP_VERSION) thành công.
 * 4. Gọi `self.skipWaiting()` ngay từ đầu trong `install` event để đẩy nhanh quá trình kích hoạt.
 * 5. Gọi `self.clients.claim()` trong `activate` event để kiểm soát các tab ngay lập tức.
 */

// Biến toàn cục sẽ được cập nhật trong quá trình cài đặt
let APP_VERSION = 'init';
let CACHE_NAME = `finance-app-cache-init`;

const IMMUTABLE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/LogoFinance.png'
];

// --- CÁC HÀM HELPER CHO CHIẾN LƯỢC CACHE ---

const cacheFirst = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  return cachedResponse || fetch(request);
};

const networkFirst = async (request) => {
  try {
    const networkResponse = await fetch(request);
    // Nếu fetch thành công, cập nhật cache
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Nếu fetch thất bại (offline), trả về từ cache
    console.warn(`[SW] Network fetch failed for ${request.url}, falling back to cache.`);
    const cachedResponse = await caches.match(request);
    return cachedResponse;
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


// --- CÁC EVENT CHÍNH CỦA SERVICE WORKER ---

/**
 * INSTALL EVENT
 * - Chịu trách nhiệm cài đặt phiên bản mới.
 * - Được thiết kế để thất bại nếu không thể lấy được phiên bản.
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Bắt đầu quá trình cài đặt...');
  
  // Bắt buộc Service Worker mới bỏ qua trạng thái waiting và sẵn sàng kích hoạt ngay.
  self.skipWaiting();

  event.waitUntil((async () => {
    try {
      // BƯỚC 1: Import version.js một cách an toàn, có cache-busting.
      console.log('[SW] Đang import version.js...');
      importScripts(`/js/version.js?v=${new Date().getTime()}`);
      
      // BƯỚC 2: Kiểm tra và cập nhật phiên bản, tên cache.
      if (typeof self.APP_VERSION === 'undefined' || !self.APP_VERSION) {
        throw new Error('APP_VERSION không được định nghĩa hoặc rỗng trong version.js');
      }
      
      APP_VERSION = self.APP_VERSION;
      CACHE_NAME = `finance-app-cache-${APP_VERSION}`;
      console.log(`[SW] Cài đặt phiên bản: ${APP_VERSION}. Tên Cache: ${CACHE_NAME}`);

      // BƯỚC 3: Mở cache và cache các tài sản cốt lõi.
      const cache = await caches.open(CACHE_NAME);
      console.log('[SW] Đang cache các tài sản cốt lõi...');
      await cache.addAll(IMMUTABLE_URLS);
      
      console.log('[SW] Cài đặt thành công.');

    } catch (e) {
      console.error('[SW] LỖI CÀI ĐẶT NGHIÊM TRỌNG:', e);
      // Khi một lỗi được throw ở đây, quá trình cài đặt sẽ thất bại.
      // Trình duyệt sẽ tự động thử lại vào lần tới.
      // Điều này an toàn hơn là tiếp tục với một phiên bản lỗi.
      throw e;
    }
  })());
});

/**
 * ACTIVATE EVENT
 * - Dọn dẹp các cache cũ không còn được sử dụng.
 * - Nắm quyền kiểm soát các client (tab).
 */
self.addEventListener('activate', (event) => {
  console.log(`[SW] Kích hoạt phiên bản: ${APP_VERSION}`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('finance-app-cache-') && name !== CACHE_NAME)
          .map(name => {
            console.log(`[SW] Đang xóa cache cũ: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Bắt buộc Service Worker đã kích hoạt nắm quyền kiểm soát tất cả các tab ngay lập tức.
      console.log('[SW] Đã kiểm soát các client.');
      return self.clients.claim();
    })
  );
});

/**
 * FETCH EVENT
 * - Can thiệp vào các yêu cầu mạng.
 * - Áp dụng các chiến lược cache phù hợp.
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Bỏ qua các request không phải GET hoặc của extension
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }
  
  const url = new URL(request.url);

  // Chiến lược: Network First cho các file HTML (navigation requests)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Chiến lược: Stale-While-Revalidate cho CSS, JS, Fonts
  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'worker' || request.destination === 'font') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Chiến lược: Cache-First cho hình ảnh và manifest
  if (request.destination === 'image' || request.destination === 'manifest') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Fallback: Stale-While-Revalidate cho các request khác không khớp
  event.respondWith(staleWhileRevalidate(request));
});

/**
 * MESSAGE EVENT
 * - Giao tiếp với client (trang web chính).
 */
self.addEventListener('message', (event) => {
  // Trả về version của SW khi client yêu cầu
  if (event.data && event.data.type === 'CHECK_VERSION') {
    event.ports[0].postMessage({ version: APP_VERSION });
  }

  // Lệnh skip waiting từ client (dù đã có ở install, đây là một cơ chế dự phòng)
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Nhận lệnh SKIP_WAITING từ client. Đang kích hoạt...');
    self.skipWaiting();
  }
});