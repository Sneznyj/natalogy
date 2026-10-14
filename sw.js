/* Работа без интернета: кэшируем оболочку приложения и движок. Новая версия — поменять VERSION. */
const VERSION = 'natalogy-0.5.0-20261014-2230';
const SHELL = [
  './', 'index.html', 'app.html', 'privacy.html', 'terms.html', 'manifest.webmanifest', 'css/app.css',
  'js/vendor/astronomy.browser.min.js', 'js/engine/chiron-data.js', 'js/engine/astro.js', 'js/engine/pro.js',
  'js/config.js', 'js/icons.js', 'js/store.js', 'js/texts-ru.js', 'js/texts-ru-natal.js', 'js/texts-ru-pro.js', 'js/texts-en.js', 'js/texts-en-natal.js', 'js/texts-en-pro.js', 'js/texts-extra.js', 'js/i18n-en.js',
  'js/geo.js', 'js/wheel.js', 'js/score.js', 'js/beauty.js', 'js/horoscope.js', 'js/horo-texts.js', 'js/numerology.js', 'js/numerology-texts.js', 'js/matrix.js', 'js/matrix-texts.js', 'js/portrait.js', 'js/acg.js', 'js/rectify.js', 'js/ui.js', 'js/account.js', 'js/compute.js', 'js/explain.js', 'js/ai.js',
  'js/pages/today.js', 'js/pages/calendar.js', 'js/pages/chart.js', 'js/pages/pair.js', 'js/pages/ask.js', 'js/pages/pro.js', 'js/pages/pro-more.js', 'js/pages/pro-disp.js', 'js/pages/pro-solar.js', 'js/pages/rectify-page.js', 'js/pages/people.js', 'js/pages/horoscope.js', 'js/pages/numerology.js', 'js/pages/numerology-matrix.js', 'js/pages/sky.js', 'js/app.js',
  'assets/icons/favicon-32.png', 'assets/icons/mark-128.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // свои файлы: сначала сеть (после обновления сайта сразу свежая версия), без сети — из кэша; шрифты и карта мира — так же
  if (url.origin === location.origin) {
    e.respondWith(caches.open(VERSION).then(async (c) => {
      try { const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; } catch (err) { const hit = await c.match(req, { ignoreSearch: true }); if (hit) return hit; throw err; }
    }));
  } else if (/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net/.test(url.host)) {
    e.respondWith(caches.open(VERSION + '-ext').then(async (c) => { try { const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; } catch (err) { const hit = await c.match(req); if (hit) return hit; throw err; } }));
  }
});
