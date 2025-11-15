const CACHE_NAME = 'bus-schedule-v2.1';

// Файли для кешування
const urlsToCache = [
  '.', 
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'icon.svg'
];

// 1. Встановлення: Кешуємо файли
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('ServiceWorker: Кешуємо нову версію файлів (v3)');
        return cache.addAll(urlsToCache);
      })
    // ПОКРАЩЕННЯ: Ми більше не викликаємо skipWaiting() тут.
    // Ми чекаємо, поки користувач натисне кнопку "Оновити".
  );
});

// 2. Активація: Видаляємо старий кеш
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME]; // Тільки v3 залишаємо
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
      // Керуємо всіма відкритими вкладками
      return self.clients.claim();
    })
  );
});

// 3. Перехоплення запитів (Fetch)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Віддаємо з кешу, якщо є
        if (response) {
          return response;
        }
        // Інакше йдемо в мережу, кешуємо і віддаємо
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

// 4. ПОКРАЩЕННЯ: Слухаємо повідомлення від script.js
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'SKIP_WAITING') {
    console.log('ServiceWorker: Отримано команду skipWaiting()');
    self.skipWaiting();
  }
});

