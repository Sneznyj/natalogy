/* Каркас приложения: шапка, навигация, маршруты (#today, #calendar, #chart, #pair, #ask, #pro, #people, #settings, #onboard), тема. */
(function (root) {
  'use strict';
  const UI = root.NUI;
  const { t, esc, icon } = UI;
  const NAV = () => [
    ['today', t('nav.today', 'Сегодня'), 'today'],
    ['calendar', t('nav.calendar', 'Календарь'), 'calendar'],
    ['chart', t('nav.chart', 'Карта'), 'chart'],
    ['pair', t('nav.pair', 'Пара'), 'pair'],
    ['ask', t('nav.ask', 'Спросить'), 'ask'],
  ];
  const EXTRA = () => [['rectify', t('nav.rect', 'Ректификация'), 'crown', true], ['pro', t('nav.pro', 'Профи'), 'pro'], ['people', t('nav.people', 'Люди'), 'users'], ['settings', t('nav.settings', 'Настройки'), 'settings']];

  function applyTheme() {
    const th = root.NStore.settings().theme;
    if (th === 'light' || th === 'dark') document.documentElement.setAttribute('data-theme', th); else document.documentElement.removeAttribute('data-theme');
    const dark = th === 'dark' || (th !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', dark ? '#120D20' : '#FDFAF5');
    const tg = document.querySelector('[data-theme-tg]'); if (tg) tg.innerHTML = icon(dark ? 'sun' : 'moon');
  }

  function parseHash() {
    const h = location.hash.replace(/^#/, '') || '';
    const [name, q] = h.split('?');
    const params = {};
    if (q) for (const kv of q.split('&')) { const [k, v] = kv.split('='); params[decodeURIComponent(k)] = decodeURIComponent(v || ''); }
    return { name: name || '', params };
  }

  function shell() {
    const app = document.getElementById('app');
    const p = root.NStore.active();
    app.innerHTML = `<div class="shell">
      <header class="top"><div class="top-in">
        <a class="brand" href="#today"><span class="brand-mark" aria-hidden="true"></span>${esc(root.NCONFIG.brand)}</a>
        ${p ? `<button class="who" type="button" data-who aria-label="${t('who', 'Чья карта')}"><span class="av">${esc(UI.initials(p.name))}</span><b>${esc(p.name)}</b>${icon('down', 'sm')}</button>` : ''}
        <button class="iconbtn theme-tg" type="button" data-theme-tg aria-label="${t('theme.toggle', 'Сменить тему')}" title="${t('theme.toggle', 'Сменить тему')}">${icon(UI.isDark() ? 'sun' : 'moon')}</button>
        <a class="iconbtn" href="#settings" aria-label="${t('nav.settings', 'Настройки')}">${icon('settings')}</a>
      </div></header>
      <nav class="nav" aria-label="${t('nav', 'Разделы')}"><div class="nav-in">${NAV().map(([k, n, ic]) => `<a href="#${k}" data-nav="${k}">${icon(ic)}<span>${esc(n)}</span></a>`).join('')}${EXTRA().map(([k, n, ic, vip]) => `<a href="#${k}" data-nav="${k}" class="nav-extra${vip ? ' nav-vip' : ''}">${icon(ic)}<span>${esc(n)}</span>${vip ? '<b class="vip-badge">VIP</b>' : ''}</a>`).join('')}</div></nav>
      <main class="main" id="main" tabindex="-1"></main></div>`;
    const who = app.querySelector('[data-who]');
    if (who) who.addEventListener('click', openWho);
    const tg = app.querySelector('[data-theme-tg]');
    if (tg) tg.addEventListener('click', () => { root.NStore.set('theme', UI.isDark() ? 'light' : 'dark'); applyTheme(); tg.innerHTML = icon(UI.isDark() ? 'sun' : 'moon'); });
  }

  function openWho() {
    const list = root.NStore.people(), act = root.NStore.active();
    const body = UI.sheet(`<div class="stack">${list.map((p) => `<button class="sph" type="button" data-p="${p.id}" style="grid-template-columns:auto 1fr auto;min-height:60px"><span class="ic" style="background:var(--night);color:#FFD8A6;font-weight:600">${esc(UI.initials(p.name))}</span><b>${esc(p.name)}</b>${act && act.id === p.id ? icon('check') : ''}<p>${esc(UI.fmtDate(p.y, p.mo, p.d))}</p></button>`).join('')}
      <div class="row"><button class="btn primary" data-add>${icon('plus')} ${t('people.add', 'Добавить человека')}</button><a class="btn" href="#people">${icon('users')} ${t('nav.people', 'Люди')}</a><a class="btn" href="#pro">${icon('pro')} ${t('nav.pro', 'Профи')}</a><a class="btn vip-btn" href="#rectify">${icon('crown')} ${t('nav.rect', 'Ректификация')} <span class="vip-badge">VIP</span></a></div></div>`, { title: t('who', 'Чья карта') });
    body.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { root.NStore.setActive(b.dataset.p); UI.closeSheet(); route(true); }));
    body.querySelector('[data-add]').addEventListener('click', () => root.NPeople.editPerson(null, (id) => { root.NStore.setActive(id); route(true); }));
    body.querySelectorAll('a').forEach((a) => a.addEventListener('click', UI.closeSheet));
  }

  let lastShellFor = null;
  async function route(force) {
    const { name, params } = parseHash();
    const hasPeople = root.NStore.people().length > 0;
    let page = name || (hasPeople ? 'today' : 'onboard');
    // ссылка с витрины прямо в раздел: без карты — сперва анкета, потом туда, куда шли
    if (!hasPeople && page !== 'onboard' && page !== 'settings') { params.next = location.hash.replace(/^#/, ''); page = 'onboard'; }
    if (hasPeople && page === 'onboard' && params.next) { location.replace('#' + params.next); return; }
    const P = root.NPages[page] || root.NPages.today;
    const sig = (root.NStore.active() || {}).id + '|' + UI.lang();
    if (P.bare) { document.getElementById('app').innerHTML = '<main class="main" id="main" style="padding-bottom:40px"></main>'; lastShellFor = null; }
    else if (force || lastShellFor !== sig || !document.querySelector('.shell')) { shell(); lastShellFor = sig; }
    document.querySelectorAll('[data-nav]').forEach((a) => { if (a.dataset.nav === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const main = document.getElementById('main');
    const v = document.createElement('div'); v.className = 'view';
    main.innerHTML = ''; main.appendChild(v);
    UI.closeSheet();
    window.scrollTo(0, 0);
    try { await P.render(v, params); } catch (e) { console.error(e); v.innerHTML = `<div class="empty"><h3>${t('err.page', 'Что-то пошло не так')}</h3><p class="muted small">${esc(e.message)}</p><a class="btn" href="#today">${t('nav.today', 'Сегодня')}</a></div>`; }
    root.NWheel.bindTips(v);
    document.title = `${root.NCONFIG.brand} · ${(NAV().concat(EXTRA()).find(([k]) => k === page) || [0, t('onb.short', 'Начало')])[1]}`;
  }

  function boot() {
    document.documentElement.lang = UI.lang();
    applyTheme();
    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    window.addEventListener('hashchange', () => route());
    root.NStore.on((w) => { if (w === 'active') lastShellFor = null; });
    route(true);
    if ('serviceWorker' in navigator && location.protocol === 'https:' && !root.NCONFIG.noSW) navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  root.NApp = { route, applyTheme, editPerson: (p, after) => root.NPeople.editPerson(p, after) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
