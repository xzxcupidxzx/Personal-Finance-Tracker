// sw.js - PHIÊN BẢN TỐI ƯU VÀ SỬA LỖI

// KHAI BÁO BIẾN TOÀN CỤC
let APP_VERSION = 'initial'; // Giá trị ban đầu
let CACHE_NAME = `finance-app-cache-${APP_VERSION}`;

// 1. INSTALL EVENT: Kích hoạt ngay và chỉ cache các file cốt lõi
self.addEventListener('install', (event) => {
  console.log('[SW] Bắt đầu quá trình cài đặt...');
  
  // Bắt buộc Service Worker mới bỏ qua trạng thái waiting và kích hoạt ngay
  self.skipWaiting();

  event.waitUntil((async () => {
    try {
      // BƯỚC 1: Import version.js một cách an toàn. Thêm cache-busting.
      // Nếu bước này thất bại, toàn bộ quá trình cài đặt sẽ thất bại và được thử lại sau.
      console.log('[SW] Đang import version.js...');
      importScripts(`/js/version.js?v=${new Date().getTime()}`);
      
      // Kiểm tra xem APP_VERSION đã được import thành công chưa
      if (typeof self.APP_VERSION === 'undefined') {
        throw new Error('APP_VERSION không được định nghĩa trong version.js');
      }
      
      APP_VERSION = self.APP_VERSION;
      CACHE_NAME = `finance-app-cache-${APP_VERSION}`;
      console.log(`[SW] Cài đặt phiên bản: ${APP_VERSION}. Tên Cache: ${CACHE_NAME}`);

      // BƯỚC 2: Mở cache với tên đã được cập nhật
      const cache = await caches.open(CACHE_NAME);
      
      // BƯỚC 3: Cache các tài sản cốt lõi
      const IMMUTABLE_URLS = [
        '/',
        '/index.html',
        '/manifest.json',
        '/LogoFinance.png'
      ];
      
      console.log('[SW] Đang cache các tài sản cốt lõi...');
      await cache.addAll(IMMUTABLE_URLS);
      
      console.log('[SW] Cài đặt thành công.');

    } catch (e) {
      console.error('[SW] LỖI CÀI ĐẶT:', e);
      // Nếu có lỗi, quá trình cài đặt sẽ thất bại và trình duyệt sẽ thử lại sau.
      // Điều này an toàn hơn là tiếp tục với một phiên bản lỗi.
      throw e; 
    }
  })());
});

// 2. ACTIVATE EVENT: Dọn dẹp cache cũ
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
      console.log('[SW] Đã kiểm soát các client.');
      return self.clients.claim();
    })
  );
});

// 3. FETCH EVENT: Áp dụng chiến lược cache phù hợp
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET' || !request.url.startsWith('http')) return;
  
  // Chiến lược: Network First cho các file HTML (navigation requests)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }
  
  // Chiến lược: Stale While Revalidate cho CSS, JS, Fonts
  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'font') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);
      
      const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      });
      
      return cachedResponse || fetchPromise;
    })());
    return;
  }

  // Chiến lược: Cache First cho hình ảnh, manifest
  if (request.destination === 'image' || request.destination === 'manifest') {
    event.respondWith(
      caches.match(request).then(response => response || fetch(request))
    );
    return;
  }
});

// 4. MESSAGE EVENT: Giao tiếp với client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_VERSION') {
    event.ports[0].postMessage({ version: APP_VERSION });
  }
});