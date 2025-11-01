// --- Архітектура (Ваші дані) ---
const scheduleData = {
  weekdays: {
    "wd-basivka-1": ["5:45", "7:10", "8:30", "10:00", "12:30", "14:30", "16:00", "17:45", "19:45"],
    "wd-basivka-2": ["6:30", "7:50", "9:15", "11:00", "13:45", "15:15", "16:45", "18:45"],
    "wd-lviv-1": ["6:30", "7:50", "9:15", "10:45", "13:15", "15:15", "16:45", "18:30", "20:30"],
    "wd-lviv-2": ["7:10", "8:30", "10:00", "11:45", "14:30", "16:00", "17:30", "19:30"]
  },
  weekend: {
    "we-basivka": ["6:30", "8:00", "9:30", "11:00", "13:30", "15:45", "17:30", "19:15"],
    "we-lviv": ["7:15", "8:45", "10:15", "11:45", "14:15", "16:30", "18:15", "20:00"]
  }
};

/**
 * Заповнює HTML-контейнери даними з об'єкта scheduleData
 */
function populateTimes() {
  for (const dayType in scheduleData) {
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

// --- Перемикач теми (Ваш код, без змін) ---
const body = document.body;
const toggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
body.className = savedTheme;

toggle.onclick = () => {
  body.classList.toggle('dark');
  body.classList.toggle('light');
  localStorage.setItem('theme', body.classList.contains('dark') ? 'dark' : 'light');
};

// --- Вкладки (Ваш код, без змін) ---
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
}

/**
 * ПОКРАЩЕННЯ: Ідеї #5 та #6
 * 1. Знаходить тільки ОДИН наступний рейс.
 * 2. Додає повідомлення "Рейсів більше немає".
 */
function highlightTimes() {
  const now = new Date();

  // Обробляємо кожну картку (.times) окремо
  document.querySelectorAll('.times').forEach(container => {
    let nextBusFound = false; // Прапор для одного наступного рейсу
    let allPast = true;      // Прапор, що всі рейси в минулому
    
    // Спочатку видаляємо старе повідомлення, якщо воно є
    const oldMsg = container.querySelector('.no-buses-msg');
    if (oldMsg) oldMsg.remove();

    const spans = container.querySelectorAll('span');
    
    spans.forEach(span => {
      // Скидаємо класи та текст
      span.classList.remove('onroute', 'next', 'past');
      const baseTime = span.dataset.time; 
      span.textContent = baseTime;
      
      if (!baseTime) return;

      const [h, m] = baseTime.split(':').map(Number);
      const dep = new Date();
      dep.setHours(h, m, 0, 0);
      const diffMin = (dep - now) / 60000; // Різниця в хвилинах

      if (diffMin <= 0 && diffMin > -40) {
        // В дорозі (відправився до 40 хв тому)
        span.classList.add('onroute');
        allPast = false; // Ще не всі минули
      } else if (diffMin > 0) {
        // Майбутній рейс
        allPast = false;
        if (!nextBusFound) {
          // Це ПЕРШИЙ майбутній рейс, який ми зустріли
          span.classList.add('next');
          span.textContent = `${baseTime} (≈ ${Math.round(diffMin)} хв)`;
          nextBusFound = true;
        }
        // Всі інші майбутні рейси просто залишаються без стилю
      } else if (diffMin <= -40) {
        // Минулий (відправився більше 40 хв тому)
        span.classList.add('past');
      }
    });

    // Якщо ми пройшли всі рейси і прапор allPast=true (і є хоч якісь рейси)
    if (allPast && spans.length > 0) {
      container.insertAdjacentHTML('beforeend', '<span class="no-buses-msg">На сьогодні рейсів більше немає</span>');
    }
  });
}

/**
 * ПОКРАЩЕННЯ: Ідея #7 - "Розумний" таймер
 * Запускає highlightTimes() рівно на початку кожної хвилини.
 */
function smartHighlightUpdate() {
  // 1. Запускаємо 1 раз одразу при завантаженні
  highlightTimes(); 
  
  const now = new Date();
  const seconds = now.getSeconds();
  // Мілісекунди до початку наступної хвилини (+1 сек для надійності)
  const msToNextMinute = (60 - seconds) * 1000 + 1000; 
  
  setTimeout(() => {
    // 2. Цей код виконається рівно о :01
    highlightTimes(); // Оновлюємо
    // 3. І тепер ставимо ідеально синхронізований інтервал
    setInterval(highlightTimes, 60000); 
  }, msToNextMinute);
}

/**
 * ПОКРАЩЕННЯ: Функція для автоматичного оновлення вкладки опівночі (Ваш код)
 */
function scheduleMidnightTabCheck() {
  const now = new Date();
  const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5) - now; // 5 сек після опівночі
  
  setTimeout(() => {
    console.log("Опівніч! Перевіряємо вкладку.");
    const today = new Date().getDay();
    if(today === 6 || today === 0) openTab('weekend'); else openTab('weekdays');
    
    scheduleMidnightTabCheck(); 
  }, msUntilMidnight);
}

// --- ІНІЦІАЛІЗАЦІЯ САЙТУ ---

// 1. Заповнюємо розклад
populateTimes();

// 2. Автовибір вкладки
const today = new Date().getDay();
if(today === 6 || today === 0) openTab('weekend'); else openTab('weekdays');

// 3. ПОКРАЩЕННЯ: Запускаємо "розумний" таймер
smartHighlightUpdate();

// 4. Встановлюємо таймер на опівнічну зміну вкладки
scheduleMidnightTabCheck();

// 5. ПОКРАЩЕННЯ: Реєстрація Service Worker (Ваш код, без змін)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker зареєстровано успішно!');
      })
      .catch(err => {
        console.log('Помилка реєстрації ServiceWorker: ', err);
      });
  });
}