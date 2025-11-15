/**
 * Заповнює HTML-контейнери
 * @param {object} scheduleData - Об'єкт з даними розкладу
 */
function populateTimes(scheduleData) {
  if (!scheduleData) return;

  // Проходимо по 'weekdays' та 'weekend'
  for (const dayType in scheduleData) {
    // dayType буде 'weekdays' або 'weekend' (або 'lastUpdated')
    if (dayType === 'weekdays' || dayType === 'weekend') {
      // Проходимо по кожному ID маршруту, напр. 'wd-basivka-1'
      for (const routeId in scheduleData[dayType]) {
        const timesArray = scheduleData[dayType][routeId];
        const container = document.getElementById(routeId);
        if (container) {
          container.innerHTML = timesArray.map(time => {
            return `<span data-time="${time}">${time}</span>`;
          }).join(' ');
        }
      }
    }
  }
}

/**
 * Оновлює дату "актуальності" в підвалі
 * @param {string} dateString - Дата у форматі 'YYYY-MM-DD'
 */
function updateRelevanceDate(dateString) {
  const container = document.getElementById('last-updated');
  if (!container || !dateString) return;

  try {
    // Перетворюємо 'YYYY-MM-DD' на 'DD.MM.YYYY'
    const [year, month, day] = dateString.split('-');
    const formattedDate = `${day}.${month}.${year}`;
    container.textContent = `Розклад актуальний станом на: ${formattedDate}`;
  } catch (e) {
    console.error("Неправильний формат дати:", e);
    container.textContent = `Розклад актуальний`; // Запасний варіант
  }
}

// --- Перемикач теми ---
const body = document.body;
const toggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
body.className = savedTheme;

toggle.onclick = () => {
  body.classList.toggle('dark');
  body.classList.toggle('light');
  localStorage.setItem('theme', body.classList.contains('dark') ? 'dark' : 'light');
};

// --- Вкладки ---
const tabs = document.querySelectorAll('.tab');
const schedules = document.querySelectorAll('.schedule');
tabs.forEach(tab => {
  tab.addEventListener('click', () => openTab(tab.dataset.target));
});

function openTab(id) {
  tabs.forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  schedules.forEach(s => s.classList.remove('active'));

  document.getElementById(id).classList.add('active');
  const activeTab = document.querySelector(`.tab[data-target="${id}"]`);
  activeTab.classList.add('active');
  activeTab.setAttribute('aria-selected', 'true');
  
  localStorage.setItem('lastTab', id);
}

/**
 * Підсвічування рейсів
 */
function highlightTimes() {
  const now = new Date();

  document.querySelectorAll('.times').forEach(container => {
    let nextBusFound = false;
    let allPast = true;
    
    const oldMsg = container.querySelector('.no-buses-msg');
    if (oldMsg) oldMsg.remove();

    const spans = container.querySelectorAll('span');
    
    spans.forEach(span => {
      span.classList.remove('onroute', 'next', 'past');
      const baseTime = span.dataset.time;
      span.textContent = baseTime;
      
      if (!baseTime) return;

      const [h, m] = baseTime.split(':').map(Number);
      const dep = new Date();
      dep.setHours(h, m, 0, 0);
      const diffMin = (dep - now) / 60000;

      if (diffMin <= 0 && diffMin > -40) {
        span.classList.add('onroute');
        allPast = false;
      } else if (diffMin > 0) {
        allPast = false;
        if (!nextBusFound) {
          span.classList.add('next');
          span.textContent = `${baseTime} (≈ ${Math.round(diffMin)} хв)`;
          nextBusFound = true;
        }
      } else if (diffMin <= -40) {
        span.classList.add('past');
      }
    });

    if (allPast && spans.length > 0) {
      container.insertAdjacentHTML('beforeend', '<span class="no-buses-msg">На сьогодні рейсів більше немає</span>');
    }
  });
}

/**
 * "Розумний" таймер
 */
function smartHighlightUpdate() {
  highlightTimes();
  
  const now = new Date();
  const seconds = now.getSeconds();
  const msToNextMinute = (60 - seconds) * 1000 + 1000;
  
  setTimeout(() => {
    highlightTimes();
    setInterval(highlightTimes, 60000);
  }, msToNextMinute);
}

/**
 * Опівнічна зміна вкладки
 */
function scheduleMidnightTabCheck() {
  const now = new Date();
  const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5) - now;
  
  setTimeout(() => {
    console.log("Опівніч! Перевіряємо вкладку.");
    localStorage.removeItem('lastTab');
    
    const today = new Date().getDay();
    if(today === 6 || today === 0) openTab('weekend'); else openTab('weekdays');
    
    scheduleMidnightTabCheck();
  }, msUntilMidnight);
}

/**
 * Логіка для кнопки "Наверх"
 */
const scrollTopBtn = document.getElementById('scrollTopBtn');
window.onscroll = () => {
  if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
    scrollTopBtn.style.display = "block";
  } else {
    scrollTopBtn.style.display = "none";
  }
};
scrollTopBtn.onclick = () => {
  document.body.scrollTop = 0; // Safari
  document.documentElement.scrollTop = 0; // Інші
};

/**
 * Логіка реєстрації Service Worker та оновлень
 */
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        console.log('ServiceWorker зареєстровано успішно!');

        if (registration.waiting) {
          showUpdateToast(registration.waiting);
          return;
        }

        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          newWorker.onstatechange = () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateToast(newWorker);
            }
          };
        };
      })
      .catch(err => {
        console.log('Помилка реєстрації ServiceWorker: ', err);
      });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        window.location.reload();
        refreshing = true;
      }
    });
  }
}

/**
 * Функція для показу повідомлення про оновлення
 * @param {ServiceWorker} worker - Новий service worker, що чекає
 */
function showUpdateToast(worker) {
  const toast = document.createElement('div');
  toast.className = 'update-toast';
  const message = document.createElement('p');
  message.textContent = 'Доступна нова версія розкладу!';
  const updateButton = document.createElement('button');
  updateButton.textContent = 'Оновити';
  
  toast.appendChild(message);
  toast.appendChild(updateButton);
  document.body.appendChild(toast);

  updateButton.onclick = () => {
    console.log('Натиснуто "Оновити"');
    worker.postMessage({ action: 'SKIP_WAITING' });
  };
}

/**
 * Кнопка "Поділитися"
 */
function setupShareButton() {
  const shareButton = document.getElementById('shareButton');
  if (navigator.share) {
    shareButton.addEventListener('click', async () => {
      try {
        await navigator.share({
          title: 'Розклад 171 (Басівка-Львів)',
          text: 'Актуальний офлайн-розклад маршрутки 171',
          url: window.location.href
        });
      } catch (err) {
        console.log('Помилка при спробі поділитися:', err);
      }
    });
  } else {
    shareButton.style.display = 'none';
  }
}

// --- ІНІЦІАЛІЗАЦІЯ САЙТУ ---

/**
 * Головна функція ініціалізації сайту
 */
async function initializeSite() {
  let scheduleData;
  try {
    // 1. Завантажуємо дані розкладу
    // Додаємо ?t=... для "очищення кешу" файлу JSON
    const cacheBuster = new Date().getTime();
    const response = await fetch(`schedule.json?t=${cacheBuster}`);
    
    if (!response.ok) {
      throw new Error('Не вдалося завантажити розклад');
    }
    scheduleData = await response.json();

    // 2. Заповнюємо розклад
    populateTimes(scheduleData);
    
    // 2.1 Встановлюємо дату актуальності
    if (scheduleData.lastUpdated) {
      updateRelevanceDate(scheduleData.lastUpdated);
    }

  } catch (error) {
    console.error(error);
    // Показати помилку користувачу, якщо дані не завантажились
    document.querySelector('main').innerHTML =
      '<p style="text-align:center; color:red; padding: 20px;">Не вдалося завантажити розклад. Спробуйте оновити сторінку.</p>';
    // Не зупиняємо виконання, щоб решта сайту (тема, кнопки) працювала
  }

  // 3. Автовибір вкладки з пам'яттю
  const savedTab = localStorage.getItem('lastTab');
  if (savedTab && document.getElementById(savedTab)) {
    openTab(savedTab);
  } else {
    const today = new Date().getDay();
    if (today === 6 || today === 0) openTab('weekend'); else openTab('weekdays');
  }

  // 4. Запускаємо "розумний" таймер
  smartHighlightUpdate();

  // 5. Встановлюємо таймер на опівнічну зміну вкладки
  scheduleMidnightTabCheck();

  // 6. Кнопка "Поділитися"
  setupShareButton();

  // 7. Запускаємо реєстрацію Service Worker
  registerSW();
}

// Запускаємо всю ініціалізацію
initializeSite();
