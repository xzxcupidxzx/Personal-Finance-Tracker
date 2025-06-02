const CACHE_NAME = 'your-app-cache-v1'; // Tăng version mỗi khi bạn update code
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
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force SW to activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Activate SW - Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const respClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, respClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
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