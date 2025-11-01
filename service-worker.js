// Назва кешу. Змініть її на 'v2', 'v3' і т.д., коли будете оновлювати розклад
const CACHE_NAME = 'bus-schedule-v1.1';

// Файли, які потрібно закешувати одразу
const urlsToCache = [
  '/', // Головна сторінка
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'images/icon-192.png',
  'images/icon-512.png'
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
        // Якщо запит є в кеші - віддаємо його (це і є офлайн-режим)
        if (response) {
          return response;
        }
        
        // Якщо в кеші немає, йдемо в мережу
        return fetch(event.request).then(
          response => {
            // Перевіряємо, чи ми отримали коректну відповідь
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Клонуємо відповідь, бо її можна "прочитати" лише раз
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Кладемо нову відповідь в кеш на майбутнє
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
          // Якщо стара назва кешу (напр. 'v1') не в списку, видаляємо її
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('ServiceWorker: Видаляємо старий кеш', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});