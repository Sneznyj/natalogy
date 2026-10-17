/* Настройки проекта: всё, что меняется без правки кода. */
window.NCONFIG = {
  brand: 'Saliastro',              // название (16.10.2026) — меняется здесь, в manifest.webmanifest, заголовках *.html и в privacy/terms
  brandRu: 'Салиастро',
  version: '0.5.0',
  // Адрес ИИ-помощника (Cloudflare Worker из server/ai-worker). Пусто — отвечает встроенный помощник по правилам, без интернета.
  aiEndpoint: '',
  freeAskPerDay: 5,               // показ в интерфейсе; настоящий лимит держит сервер
  geocoder: 'https://geocoding-api.open-meteo.com/v1/search', // поиск городов; без сети — встроенный список
  worldMap: 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json', // контуры для астрокартографии
  topojson: 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js',
  // астрокарта на обычной карте мира: Leaflet + тайлы OpenStreetMap — названия всех мест, зум; тёмная карта — те же тайлы с инверсией цветов; без сети — запасная схема
  leaflet: { js: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js', css: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css' },
  tiles: {
    light: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  },
  // Тарифы (js/plans.js, 17.10.2026): Бесплатно → Плюс → Профи → VIP (VIP — с ректификацией). Цены: [в месяц, в год].
  // enforce: false — бета, всё открыто (купить уже можно); true — платные разделы закрываются по тарифу (план — с 15.12.2026, выход Венеры из тени).
  // Цены должны совпадать с ценами в кассах: lava.top (рубли) и Gumroad (доллары).
  plans: {
    enforce: false,
    betaUntil: '2026-12-15',
    prices: {
      RUB: { plus: [390, 2990], pro: [990, 7490], vip: [2990, 22900] },
      USD: { plus: [5.99, 39], pro: [14.99, 99], vip: [39, 290] },
    },
    freeAccountPeople: 3,          // карточек в бесплатном аккаунте (без входа — account.guestLimit)
  },
  // Аккаунты (необязательный вход): сервер server/account-worker. guestLimit — сколько карточек можно сохранить без входа.
  // Пусто в api — кнопки «Войти» нет, всё только на устройстве.
  account: { api: 'https://natalogy-account.sneznyjpavel.workers.dev', guestLimit: 1 }, // адрес сервера прежний: на него настроены входы Google, Яндекс, VK, Telegram
  contact: '',
  searchIndex: false,             // false — сайт закрыт от поисковиков (noindex), открывают только по ссылке. true — когда будет публичный запуск
  siteUrl: 'https://sneznyj.github.io/saliastro/',
};
