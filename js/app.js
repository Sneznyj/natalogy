/* Каркас приложения: шапка, навигация, маршруты (#horoscope, #today, #calendar, #chart, #pair, #ask, #numerology, #sky, #pro, #rectify, #people, #settings, #onboard), тема. */
(function (root) {
  'use strict';
  const UI = root.NUI;
  const { t, esc, icon } = UI;
  // меню: гороскоп — первым и выделен (самый частый запрос); m — видно в нижней панели телефона, остальное — в «Ещё»
  const NAV = () => [
    ['horoscope', t('nav.horo', 'Гороскоп'), 'horo', 'hot m'],
    ['today', t('nav.today', 'Сегодня'), 'today', 'm'],
    ['calendar', t('nav.calendar', 'Календарь'), 'calendar', 'm'],
    ['chart', t('nav.chart', 'Карта'), 'chart', 'm'],
    ['pair', t('nav.pair', 'Пара'), 'pair', ''],
    ['ask', t('nav.ask', 'Спросить'), 'ask', ''],
    ['numerology', t('nav.num', 'Нумерология'), 'numbers', ''],
    ['sky', t('nav.sky', 'Небо и Луна'), 'sky', ''],
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
        <span class="acct-slot" data-acct-slot></span>
        <button class="iconbtn theme-tg" type="button" data-theme-tg aria-label="${t('theme.toggle', 'Сменить тему')}" title="${t('theme.toggle', 'Сменить тему')}">${icon(UI.isDark() ? 'sun' : 'moon')}</button>
        <a class="iconbtn set-lnk" href="#settings" aria-label="${t('nav.settings', 'Настройки')}">${icon('settings')}</a>
      </div></header>
      <nav class="nav" aria-label="${t('nav', 'Разделы')}"><div class="nav-in">${NAV().map(([k, n, ic, cls]) => `<a href="#${k}" data-nav="${k}" class="${cls.split(' ').filter(Boolean).map((c) => 'nav-' + c).join(' ')}">${icon(ic)}<span>${esc(n)}</span>${cls.includes('hot') ? `<b class="hot-badge" aria-hidden="true">★</b>` : ''}</a>`).join('')}${EXTRA().map(([k, n, ic, vip]) => `<a href="#${k}" data-nav="${k}" class="nav-extra${vip ? ' nav-vip' : ''}">${icon(ic)}<span>${esc(n)}</span>${vip ? '<b class="vip-badge">VIP</b>' : ''}</a>`).join('')}<button class="nav-more" type="button" data-more>${icon('more')}<span>${t('nav.more', 'Ещё')}</span></button></div></nav>
      <main class="main" id="main" tabindex="-1"></main></div>`;
    const who = app.querySelector('[data-who]');
    if (who) who.addEventListener('click', openWho);
    const more = app.querySelector('[data-more]');
    if (more) more.addEventListener('click', openMore);
    const tg = app.querySelector('[data-theme-tg]');
    if (tg) tg.addEventListener('click', () => { root.NStore.set('theme', UI.isDark() ? 'light' : 'dark'); applyTheme(); tg.innerHTML = icon(UI.isDark() ? 'sun' : 'moon'); });
    if (root.NAccount) root.NAccount.paintHeader();
  }

  /** «Чья карта»: выбрать человека, ✎ — изменить его данные, 📍 — город, где он живёт (по нему считаются сутки, Луна без курса и часы). */
  function openWho() {
    const list = root.NStore.people(), act = root.NStore.active();
    const body = UI.sheet(`<div class="stack"><div class="who-list">${list.map((p) => `<div class="who-row${act && act.id === p.id ? ' on' : ''}">
        <button class="who-pick" type="button" data-p="${p.id}" aria-pressed="${!!(act && act.id === p.id)}"><span class="ic">${esc(UI.initials(p.name))}</span><span class="who-n"><b>${esc(p.name)}</b><small>${esc(UI.fmtDate(p.y, p.mo, p.d))}${p.timeKnown !== false ? ' · ' + UI.pad(p.h) + ':' + UI.pad(p.mi) : ''}${p.place ? ' · ' + esc(p.place.name) : ''}</small></span>${act && act.id === p.id ? `<span class="who-ok">${icon('check')}</span>` : ''}</button>
        <div class="who-side">${UI.homeChipHTML(p.id, { prefix: t('home.lives', 'живёт:') })}<button class="iconbtn bd who-edit" type="button" data-edit="${p.id}" aria-label="${esc(t('who.edit', 'Изменить данные: {n}', { n: p.name }))}" title="${esc(t('who.editT', 'Изменить данные карты'))}">${icon('edit')}</button></div>
      </div>`).join('')}</div>
      <div class="row"><button class="btn primary" data-add>${icon('plus')} ${t('people.add', 'Добавить человека')}</button><a class="btn" href="#people">${icon('users')} ${t('nav.people', 'Люди')}</a><a class="btn" href="#pro">${icon('pro')} ${t('nav.pro', 'Профи')}</a><a class="btn vip-btn" href="#rectify">${icon('crown')} ${t('nav.rect', 'Ректификация')} <span class="vip-badge">VIP</span></a></div></div>`, { title: t('who', 'Чья карта'), cls: 'who-sheet' });
    body.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { root.NStore.setActive(b.dataset.p); UI.closeSheet(); route(true); }));
    body.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => root.NPeople.editPerson(root.NStore.person(b.dataset.edit), () => route(true))));
    // город поменяли: у того, чья карта открыта, страница пересчитывается сразу; окно остаётся открытым с новым городом
    UI.bindHomeChips(body, async (id) => { if (act && id === act.id) await route(true); openWho(); });
    body.querySelector('[data-add]').addEventListener('click', () => root.NPeople.editPerson(null, (id) => { root.NStore.setActive(id); route(true); }));
    body.querySelectorAll('a').forEach((a) => a.addEventListener('click', UI.closeSheet));
  }

  /** «Ещё» на телефоне: все разделы, которых нет в нижней панели. */
  function openMore() {
    const items = NAV().filter(([, , , c]) => !c.includes('m')).map(([k, n, ic]) => [k, n, ic, false]).concat(EXTRA());
    const body = UI.sheet(`<div class="more-grid">${items.map(([k, n, ic, vip]) => `<a class="more-it${vip ? ' vip' : ''}" href="#${k}"><span class="ic">${icon(ic)}</span><b>${esc(n)}</b>${vip ? '<span class="vip-badge">VIP</span>' : ''}</a>`).join('')}</div>`, { title: t('nav.more', 'Ещё') });
    body.querySelectorAll('a').forEach((a) => a.addEventListener('click', UI.closeSheet));
  }

  let lastShellFor = null;
  async function route(force) {
    const { name, params } = parseHash();
    const hasPeople = root.NStore.people().length > 0;
    let page = name || (hasPeople ? 'today' : 'onboard');
    // ссылка с витрины прямо в раздел: без карты — сперва анкета, потом туда, куда шли
    const OPEN = (k) => k === 'onboard' || k === 'settings' || !!(root.NPages[k] && root.NPages[k].open);
    if (!hasPeople && !OPEN(page)) { params.next = location.hash.replace(/^#/, ''); page = 'onboard'; }
    if (hasPeople && page === 'onboard' && params.next) { location.replace('#' + params.next); return; }
    const P = root.NPages[page] || root.NPages.today;
    const sig = (root.NStore.active() || {}).id + '|' + UI.lang();
    if (P.bare) { document.getElementById('app').innerHTML = '<main class="main" id="main" style="padding-bottom:40px"></main>'; lastShellFor = null; }
    else if (force || lastShellFor !== sig || !document.querySelector('.shell')) { shell(); lastShellFor = sig; }
    document.querySelectorAll('[data-nav]').forEach((a) => { if (a.dataset.nav === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const mb = document.querySelector('[data-more]'); if (mb) { if (NAV().concat(EXTRA()).some(([k, , , c]) => k === page && !(typeof c === 'string' && c.includes('m')))) mb.setAttribute('aria-current', 'page'); else mb.removeAttribute('aria-current'); }
    const main = document.getElementById('main');
    main.dataset.page = page;
    const v = document.createElement('div'); v.className = 'view';
    main.innerHTML = ''; main.appendChild(v);
    UI.closeSheet();
    if (root.NExplain) root.NExplain.closeCard();
    window.scrollTo(0, 0);
    try { await P.render(v, params); } catch (e) { console.error(e); v.innerHTML = `<div class="empty"><h3>${t('err.page', 'Что-то пошло не так')}</h3><p class="muted small">${esc(e.message)}</p><a class="btn" href="#today">${t('nav.today', 'Сегодня')}</a></div>`; }
    root.NWheel.bindTips(v);
    document.title = `${root.NCONFIG.brand} · ${(NAV().concat(EXTRA()).find(([k]) => k === page) || [0, t('onb.short', 'Начало')])[1]}`;
  }

  /** Стрелка «наверх» (15.10, Алина): появляется, когда страницу пролистали вниз; нажал — плавно к началу. */
  function toTop() {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'to-top'; b.setAttribute('aria-label', t('toTop', 'Наверх')); b.title = t('toTop', 'Наверх');
    b.innerHTML = UI.icon('arrow-up');
    document.body.appendChild(b);
    let on = false;
    const upd = () => { const v = window.scrollY > Math.max(400, window.innerHeight * 0.6); if (v !== on) { on = v; b.classList.toggle('on', v); } };
    window.addEventListener('scroll', upd, { passive: true });
    b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: UI.reduceMotion() ? 'auto' : 'smooth' }));
    upd();
  }

  function boot() {
    document.documentElement.lang = UI.lang();
    applyTheme();
    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    window.addEventListener('hashchange', () => route());
    root.NStore.on((w) => { if (w === 'active') lastShellFor = null; });
    toTop();
    route(true);
    if (root.NAccount) root.NAccount.boot();
    if ('serviceWorker' in navigator && location.protocol === 'https:' && !root.NCONFIG.noSW) navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  root.NApp = { route, applyTheme, editPerson: (p, after) => root.NPeople.editPerson(p, after) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
