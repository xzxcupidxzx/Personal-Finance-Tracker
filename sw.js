// sw.js - PHIÊN BẢN ĐẦY ĐỦ CHO AUTO-UPDATE
const CACHE_NAME = 'finance-app-v1.0.3'; // Tăng version này
const APP_VERSION = '1.0.3';              // Tăng version này
const urlsToCache = [
  '/',
  '/index.html',
  '/quick-add.html',
  '/styles.css',
  '/js/utils.js',
  '/js/app.js',
  '/js/categories.js',
  '/js/settings.js',
  '/js/transactions.js',
  '/js/history.js',
  '/js/statistics.js',
  '/LogoFinance.png',
  '/manifest.json'
];

// Install SW - Cache tất cả resources
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installing version', APP_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker: Install complete');
        // Tự động skip waiting nếu có phiên bản mới
        return self.skipWaiting();
      })
  );
});

// Activate SW - Cleanup old caches
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activating version', APP_VERSION);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('finance-app-')) {
            console.log('🗑️ Service Worker: Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Activation complete');
      // Take control of all pages immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all clients about the update
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: APP_VERSION
          });
        });
      });
    })
  );
});

// Fetch - Network first for HTML, Cache first for assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  // HTML files - Network first
  if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Other assets - Cache first
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
  );
});

// Message handler - Communicate with UpdateManager
self.addEventListener('message', event => {
  console.log('📨 Service Worker: Received message', event.data);
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CHECK_VERSION':
      event.ports[0].postMessage({
        version: APP_VERSION,
        cacheNames: CACHE_NAME
      });
      break;
      
    case 'FORCE_UPDATE':
      // Clear all caches and skip waiting
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

// Background Sync for offline transactions
self.addEventListener('sync', event => {
  if (event.tag === 'background-transaction') {
    event.waitUntil(processBackgroundTransactions());
  }
});

// Process pending transactions
async function processBackgroundTransactions() {
  try {
    const pendingTransactions = await getPendingTransactions();
    
    for (const transaction of pendingTransactions) {
      await saveTransaction(transaction);
      
      self.registration.showNotification('💰 Giao dịch đã được thêm', {
        body: `${transaction.type}: ${formatCurrency(transaction.amount)}`,
        icon: '/LogoFinance.png',
        badge: '/LogoFinance.png',
        tag: 'transaction-success',
        requireInteraction: false
      });
    }
    
    await clearPendingTransactions();
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper functions
async function getPendingTransactions() {
  // Get from clients
  const allClients = await self.clients.matchAll();
  if (allClients.length > 0) {
    const client = allClients[0];
    return new Promise(resolve => {
      const channel = new MessageChannel();
      channel.port1.onmessage = event => resolve(event.data || []);
      client.postMessage({ type: 'GET_PENDING_TRANSACTIONS' }, [channel.port2]);
      setTimeout(() => resolve([]), 5000); // Timeout fallback
    });
  }
  return [];
}

async function saveTransaction(transaction) {
  // Send to all clients to save
  const allClients = await self.clients.matchAll();
  allClients.forEach(client => {
    client.postMessage({
      type: 'SAVE_TRANSACTION',
      transaction: transaction
    });
  });
}

async function clearPendingTransactions() {
  const allClients = await self.clients.matchAll();
  allClients.forEach(client => {
    client.postMessage({ type: 'CLEAR_PENDING_TRANSACTIONS' });
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}