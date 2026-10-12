/* Настройки проекта: всё, что меняется без правки кода. */
window.NCONFIG = {
  brand: 'Natalogy',              // рабочее название — меняется здесь и в manifest.webmanifest
  brandRu: 'Наталогия',
  version: '0.2.0',
  // Адрес ИИ-помощника (Cloudflare Worker из server/ai-worker). Пусто — отвечает встроенный помощник по правилам, без интернета.
  aiEndpoint: '',
  freeAskPerDay: 5,               // показ в интерфейсе; настоящий лимит держит сервер
  geocoder: 'https://geocoding-api.open-meteo.com/v1/search', // поиск городов; без сети — встроенный список
  worldMap: 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json', // контуры для астрокартографии
  topojson: 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js',
  pro: { paid: false, priceMonth: '$7.99', priceYear: '$49' }, // платная подписка — после выхода Венеры из тени (15.12.2026)
  contact: '',
  searchIndex: false,             // false — сайт закрыт от поисковиков (noindex), открывают только по ссылке. true — когда будет публичный запуск
  siteUrl: 'https://sneznyj.github.io/natalogy/',
};
