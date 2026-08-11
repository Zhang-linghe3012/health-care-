const CACHE_NAME = 'mat-thay-tai-nghe-v8-master-system';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  'https://fonts.googleapis.com/css2?family=Lexend:wght@500;700;800;900&display=swap'
];

let reminderInterval = null;

// INSTALL event
self.addEventListener('install', event => {
  console.log('[ServiceWorker V8 MASTER SYSTEM] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE event
self.addEventListener('activate', event => {
  console.log('[ServiceWorker V8 MASTER SYSTEM] Activate event');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH event
self.addEventListener('fetch', event => {
  if (event.request.url.includes('generativelanguage.googleapis.com') ||
      event.request.url.includes('accounts.google.com') ||
      event.request.url.includes('translate.google.com') ||
      event.request.url.includes('api.telegram.org')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      }).catch(() => {
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      })
  );
});

// MESSAGE event for background timers
self.addEventListener('message', event => {
  if (event.data) {
    if (event.data.action === 'setReminderTime') {
      const reminderTime = event.data.time || "08:00";
      const userName = event.data.userName || "Ông/Bà";
      
      console.log(`[ServiceWorker V8] Registered background reminder at ${reminderTime} for ${userName}`);
      
      if (reminderInterval) {
        clearInterval(reminderInterval);
      }
      
      reminderInterval = setInterval(() => {
        const now = new Date();
        const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (curTime === reminderTime) {
          self.registration.showNotification("💊 ĐÃ ĐẾN GIỜ UỐNG THUỐC!", {
            body: `Ông/bà ${userName} ơi, đã đến giờ uống thuốc hằng ngày rồi! Hãy mở ứng dụng để điểm danh và uống một ly nước ấm nhé.`,
            icon: './icons/icon-192.png',
            badge: './icons/icon-192.png',
            vibrate: [300, 100, 300],
            data: { url: './index.html' }
          });
        }
      }, 45000); // Check every 45 seconds
    }
  }
});

// NOTIFICATION CLICK event
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});
