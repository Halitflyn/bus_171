const CACHE_NAME = 'bus-schedule-v1.04';

// Файли, які потрібно закешувати (список не змінився)
const urlsToCache = [
  '.', // Головна сторінка
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'icon.svg'
];

// 1. Встановлення Service Worker: кешуємо файли
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('ServiceWorker: Кешуємо нову версію файлів (v2)');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Примусово активуємо новий Service Worker одразу,
        // не чекаючи, поки стара вкладка закриється
        return self.skipWaiting();
      })
  );
});

// 2. Перехоплення запитів (Fetch): віддаємо з кешу
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(
          response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
        );
      })
  );
});

// 3. Активація Service Worker: очистка старого кешу
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME]; // Тільки v2 залишаємо
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('ServiceWorker: Видаляємо старий кеш', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      // Повідомляємо всі відкриті вкладки, що вони можуть оновитися
      return self.clients.claim();
    })
  );
});
