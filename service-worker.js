// Назва кешу.
const CACHE_NAME = 'bus-schedule-v1';

// Файли, які потрібно закешувати (ШЛЯХИ ВИПРАВЛЕНО)
const urlsToCache = [
  '.', // Головна сторінка
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'icon.svg' // <-- ШЛЯХ ВИПРАВЛЕНО
];

// 1. Встановлення Service Worker: кешуємо файли
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('ServiceWorker: Кешуємо файли');
        return cache.addAll(urlsToCache);
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
  const cacheWhitelist = [CACHE_NAME];
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
  );
});
