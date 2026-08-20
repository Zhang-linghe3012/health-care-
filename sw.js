const CACHE_NAME = 'famcare-v7';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css?v=7',
  './script.js?v=7',
  './app.js?v=7',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  'https://fonts.googleapis.com/css2?family=Lexend:wght@500;700;800;900&display=swap'
];

let reminderList = [];
let reminderInterval = null;
let notifiedToday = new Set();

// INSTALL event
self.addEventListener('install', event => {
  console.log('[ServiceWorker FAMCARE V3] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE event
self.addEventListener('activate', event => {
  console.log('[ServiceWorker FAMCARE V3] Activate event');
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
      event.request.url.includes('text.pollinations.ai') ||
      event.request.url.includes('accounts.google.com') ||
      event.request.url.includes('translate.google.com') ||
      event.request.url.includes('api.telegram.org') ||
      event.request.url.includes('api.open-meteo.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
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
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});

/* =========================================================
   BACKGROUND SCHEDULED NOTIFICATIONS
   - Ưu tiên Notification Triggers (showTrigger) nếu trình duyệt hỗ trợ
   - Fallback: kiểm tra giờ mỗi 30 giây khi Service Worker còn chạy
   ========================================================= */

function buildNotificationBody(reminder, userName) {
  const baseName = reminder.name || 'uống thuốc hằng ngày';
  if (baseName.toLowerCase().includes('tập') || baseName.toLowerCase().includes('thể dục')) {
    return `Ông/bà ${userName} ơi, đã đến giờ ${baseName}! Hãy vận động nhẹ nhàng vài phút để cơ thể khỏe khoắn nhé.`;
  }
  return `Ông/bà ${userName} ơi, đã đến giờ ${baseName}! Hãy mở ứng dụng để điểm danh và uống một ly nước ấm nhé.`;
}

function nextOccurrence(timeStr) {
  const [h, m] = String(timeStr).split(':').map(Number);
  const d = new Date();
  d.setHours(h || 8, m || 0, 0, 0);
  if (d <= new Date()) d.setDate(d.getDate() + 1);
  return d;
}

function scheduleReminderNotifications() {
  // Clear old fallback interval
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }

  const supportsTriggers = typeof TimestampTrigger !== 'undefined' &&
    typeof Notification !== 'undefined' &&
    'showTrigger' in Notification.prototype;

  reminderList.forEach(reminder => {
    if (!reminder || !reminder.time) return;
    const userName = reminder.userName || 'Ông/Bà';
    const baseOptions = {
      body: buildNotificationBody(reminder, userName),
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      vibrate: [300, 100, 300],
      data: { url: './index.html', time: reminder.time, name: reminder.name || '' }
    };

    // Cách 1: Notification Triggers - lập lịch chuẩn xác, chạy kể cả khi app bị đóng
    if (supportsTriggers) {
      try {
        const triggerTime = nextOccurrence(reminder.time).getTime();
        self.registration.showNotification('💊 ĐÃ ĐẾN GIỜ UỐNG THUỐC!', {
          ...baseOptions,
          showTrigger: new TimestampTrigger(triggerTime)
        });
        console.log(`[ServiceWorker FAMCARE V3] Scheduled trigger for ${reminder.time} (${new Date(triggerTime).toLocaleString()})`);
        return;
      } catch (e) {
        console.warn('[ServiceWorker] Notification trigger failed, fallback to interval:', e);
      }
    }

    // Cách 2: Fallback - kiểm tra giờ định kỳ
    if (!reminderInterval) {
      reminderInterval = setInterval(checkReminderTimes, 30000);
    }
  });

  // Nếu có reminder mà không dùng được triggers -> cần interval
  if (!supportsTriggers && reminderList.length > 0 && !reminderInterval) {
    reminderInterval = setInterval(checkReminderTimes, 30000);
  }
}

function checkReminderTimes() {
  const now = new Date();
  const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const todayKey = now.toDateString();

  reminderList.forEach(reminder => {
    if (!reminder || !reminder.time) return;
    if (reminder.time === curTime) {
      const key = todayKey + '|' + reminder.time;
      if (notifiedToday.has(key)) return;
      notifiedToday.add(key);

      const userName = reminder.userName || 'Ông/Bà';
      self.registration.showNotification('💊 ĐÃ ĐẾN GIỜ UỐNG THUỐC!', {
        body: buildNotificationBody(reminder, userName),
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        vibrate: [300, 100, 300],
        data: { url: './index.html' }
      });
      console.log(`[ServiceWorker FAMCARE V3] Fallback notification fired at ${curTime}`);
    }
  });

  // Xóa key của ngày cũ để tránh Set phình to
  if (notifiedToday.size > 20) {
    notifiedToday.clear();
    notifiedToday.add(todayKey);
  }
}

// MESSAGE event for background timers & reminders list
self.addEventListener('message', event => {
  if (event.data) {
    if (event.data.action === 'setReminders') {
      reminderList = (event.data.reminders || [])
        .filter(r => r.notificationEnabled !== false)
        .map(r => ({
        time: r.time,
        name: r.name || 'uống thuốc hằng ngày',
        userName: event.data.userName || 'Ông/Bà'
      }));
      console.log(`[ServiceWorker FAMCARE V3] Registered ${reminderList.length} background reminder(s):`, reminderList);
      scheduleReminderNotifications();
    } else if (event.data.action === 'sos') {
      const sosMsg = event.data.message || 'CẢNH BÁO KHẨN CẤP! Ông/bà cần giúp đỡ ngay.';
      self.registration.showNotification('🚨 KHẨN CẤP SOS - FAMCARE', {
        body: sosMsg,
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        vibrate: [500, 200, 500, 200, 500, 200, 500],
        data: { url: './index.html' }
      });
    } else if (event.data.action === 'setReminderTime') {
      // Backward compatibility: single reminder
      reminderList = [{ time: event.data.time || "08:00", name: 'uống thuốc hằng ngày', userName: event.data.userName || 'Ông/Bà' }];
      scheduleReminderNotifications();
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