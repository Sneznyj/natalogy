/* Настройки проекта: всё, что меняется без правки кода. */
window.NCONFIG = {
  brand: 'Salistro',              // название (16.10.2026: было рабочее Natalogy) — меняется здесь, в manifest.webmanifest, заголовках *.html и в privacy/terms
  brandRu: 'Наталогия',
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
  // Ректификация — VIP-раздел в меню. locked: true — показывать «Доступно в VIP» вместо инструмента; url — куда вести за VIP; note — строка под заголовком
  rectVip: { locked: false, url: '', note: 'Сейчас доступ открыт на время теста.' },
  pro: { paid: false, priceMonth: '$7.99', priceYear: '$49' }, // платная подписка — после выхода Венеры из тени (15.12.2026)
  // Аккаунты (необязательный вход): сервер server/account-worker. guestLimit — сколько карточек можно сохранить без входа.
  // Пусто в api — кнопки «Войти» нет, всё только на устройстве.
  account: { api: 'https://natalogy-account.sneznyjpavel.workers.dev', guestLimit: 1 },
  contact: '',
  searchIndex: false,             // false — сайт закрыт от поисковиков (noindex), открывают только по ссылке. true — когда будет публичный запуск
  siteUrl: 'https://sneznyj.github.io/natalogy/',
};
