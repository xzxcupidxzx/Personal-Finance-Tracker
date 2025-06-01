const CACHE_NAME = 'finance-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/quick-add.html',
  '/styles.css',
  '/js/utils.js',
  '/js/app.js',
  '/js/transactions.js',
  '/LogoFinance.png'
];

// Install SW
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      }
    )
  );
});

// Background Sync for adding transactions
self.addEventListener('sync', event => {
  if (event.tag === 'background-transaction') {
    event.waitUntil(
      processBackgroundTransactions()
    );
  }
});

// Notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll().then(clientList => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/quick-add.html');
      }
    })
  );
});

// Process background transactions
async function processBackgroundTransactions() {
  try {
    // Get pending transactions from IndexedDB or localStorage
    const pendingTransactions = await getPendingTransactions();
    
    for (const transaction of pendingTransactions) {
      // Process each transaction
      await saveTransaction(transaction);
      
      // Show success notification
      self.registration.showNotification('💰 Giao dịch đã được thêm', {
        body: `${transaction.type}: ${formatCurrency(transaction.amount)}`,
        icon: '/LogoFinance.png',
        badge: '/LogoFinance.png',
        tag: 'transaction-success'
      });
    }
    
    // Clear pending transactions
    await clearPendingTransactions();
    
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function getPendingTransactions() {
  // Implementation depends on your storage choice
  return [];
}

async function saveTransaction(transaction) {
  // Save to localStorage or send to server
  const transactions = JSON.parse(localStorage.getItem('financial_transactions_v2') || '[]');
  transactions.push(transaction);
  localStorage.setItem('financial_transactions_v2', JSON.stringify(transactions));
}

async function clearPendingTransactions() {
  // Clear pending transactions
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}