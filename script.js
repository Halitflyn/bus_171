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
}

/**
 * ПОКРАЩЕННЯ: Ідеї #5 та #6
 * 1. Знаходить тільки ОДИН наступний рейс.
 * 2. Додає повідомлення "Рейсів більше немає".
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
 * ПОКРАЩЕННЯ: Ідея #7 - "Розумний" таймер
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
 * Функція для автоматичного оновлення вкладки опівночі
 */
function scheduleMidnightTabCheck() {
  const now = new Date();
  const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5) - now; 
  
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

// 3. Запускаємо "розумний" таймер
smartHighlightUpdate();

// 4. Встановлюємо таймер на опівнічну зміну вкладки
scheduleMidnightTabCheck();

// 5. Реєстрація Service Worker (ШЛЯХ ВИПРАВЛЕНО)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    //
    // ОСЬ ТУТ ГОЛОВНЕ ВИПРАВЛЕННЯ: прибрано '/'
    //
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        console.log('ServiceWorker зареєстровано успішно!');
      })
      .catch(err => {
        console.log('Помилка реєстрації ServiceWorker: ', err);
      });
  });
}
