/* Аккаунт Natalogy (необязательный). Без входа всё хранится в браузере, и сохранить можно одну карточку (NCONFIG.account.guestLimit).
   Вход: Google, Яндекс ID, VK ID (ВКонтакте, Одноклассники, Mail.ru), Telegram или почта + пароль. После входа карточки
   с устройства сливаются с карточками аккаунта и дальше синхронизируются (сервер — server/account-worker, данные там зашифрованы).
   Пароль не уходит на сервер: браузер отправляет только его хэш (PBKDF2, 210 000 повторов), сервер хэширует ещё раз со своей солью. */
(function (root) {
  'use strict';
  const UI = root.NUI, S = root.NStore;
  const { t, esc, icon } = UI;
  const CFG = () => (root.NCONFIG && root.NCONFIG.account) || {};
  const KEY = 'natalogy:acct', AFTER = 'natalogy:afterLogin';
  let A = readA();
  let status = A.token ? (A.dirty ? 'dirty' : 'ok') : 'guest';
  let applying = false, timer = null, pushing = null, provCache = null, pendingCode = null, pendingErr = null, pendingOpen = false, linkedNote = null;

  function readA() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function saveA() { try { localStorage.setItem(KEY, JSON.stringify(A)); } catch (e) { /* без хранилища — до перезагрузки */ } }
  const loggedIn = () => !!(A && A.token);
  const enabled = () => !!CFG().api;
  function setStatus(s) { status = s; paintHeader(); const c = document.querySelector('[data-acct-status]'); if (c) c.innerHTML = statusHTML(); }

  // ---------- запросы ----------
  async function api(path, opts) {
    opts = opts || {};
    const h = {};
    if (opts.body) h['content-type'] = 'application/json';
    if (A.token && !opts.noAuth) h.authorization = 'Bearer ' + A.token;
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), opts.timeout || 20000);
    let r;
    try { r = await fetch(CFG().api + path, { method: opts.method || 'GET', headers: h, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: ctl.signal, cache: 'no-store' }); }
    catch (e) { clearTimeout(tm); throw Object.assign(new Error('offline'), { offline: true }); }
    clearTimeout(tm);
    let j = null; try { j = await r.json(); } catch (e) { j = null; }
    if (r.status === 401 && A.token && !opts.noAuth) sessionExpired();
    if (!r.ok) throw Object.assign(new Error((j && j.error) || 'http_' + r.status), { status: r.status, data: j, code: j && j.error });
    return j;
  }
  async function pwHash(email, pw) {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode('natalogy|' + String(email).trim().toLowerCase()), iterations: 210000 }, k, 256);
    let s = ''; new Uint8Array(bits).forEach((b) => { s += String.fromCharCode(b); }); return btoa(s);
  }

  // ---------- слияние устройств ----------
  const stamp = (x) => x.updated || x.at || x.created || 0;
  function merge(local, remote) {
    if (!remote) return local;
    const del = Object.assign({}, remote.deleted || {});
    for (const [k, v] of Object.entries(local.deleted || {})) if (!del[k] || v > del[k]) del[k] = v;
    const cutoff = Date.now() - 400 * 86400000;
    for (const k of Object.keys(del)) if (del[k] < cutoff) delete del[k];
    const pick = (a, b) => { const m = new Map(); for (const x of (a || []).concat(b || [])) { if (!x || !x.id) continue; const q = m.get(x.id); if (!q || stamp(x) > stamp(q)) m.set(x.id, x); } return Array.from(m.values()).filter((x) => !(del[x.id] && del[x.id] >= stamp(x))); };
    const newer = (local.settingsAt || 0) >= (remote.settingsAt || 0);
    return { app: 'natalogy', v: 1, people: pick(remote.people, local.people), saved: pick(remote.saved, local.saved).sort((a, b) => (b.at || 0) - (a.at || 0)), deleted: del, settings: newer ? local.settings : remote.settings, settingsAt: Math.max(local.settingsAt || 0, remote.settingsAt || 0), activeId: local.activeId || remote.activeId };
  }
  const norm = (d) => JSON.stringify(d ? [(d.people || []).map((p) => [p.id, stamp(p)]).sort(), (d.saved || []).map((c) => [c.id, stamp(c)]).sort(), Object.keys(d.deleted || {}).sort(), d.settingsAt || 0] : null);
  function apply(doc) {
    const before = norm(S.syncDoc());
    applying = true; try { S.applyDoc(doc); } finally { applying = false; }
    return before !== norm(S.syncDoc());
  }

  // ---------- синхронизация ----------
  async function push() {
    if (!loggedIn()) return;
    if (pushing) { A.dirty = true; saveA(); return pushing; }
    pushing = (async () => {
      for (let i = 0; i < 3; i++) {
        setStatus('saving');
        try {
          const r = await api('/data', { method: 'PUT', body: { baseRev: A.rev || 0, doc: S.syncDoc() } });
          A.rev = r.rev; A.dirty = false; A.synced = Date.now(); saveA(); setStatus('ok'); return;
        } catch (e) {
          if (e.status === 409 && e.data) { if (apply(merge(S.syncDoc(), e.data.doc)) && root.NApp) root.NApp.route(true); A.rev = e.data.rev; saveA(); continue; }
          A.dirty = true; saveA(); setStatus(e.offline ? 'offline' : 'error'); return;
        }
      }
    })();
    try { await pushing; } finally { pushing = null; if (A.dirty && loggedIn() && status === 'ok') schedule(); }
  }
  async function syncNow(reRoute) {
    if (!loggedIn()) return;
    setStatus('saving');
    try {
      const r = await api('/data');
      let changed = false;
      if (r.doc && r.rev !== A.rev) { changed = apply(merge(S.syncDoc(), r.doc)); A.rev = r.rev; saveA(); }
      else if (!r.doc) { A.rev = 0; saveA(); }
      if (A.dirty || !r.doc || norm(S.syncDoc()) !== norm(r.doc)) await push(); else { A.synced = Date.now(); saveA(); setStatus('ok'); }
      if ((changed || reRoute) && root.NApp) root.NApp.route(true);
    } catch (e) { setStatus(e.offline ? 'offline' : e.status === 401 ? 'guest' : 'error'); }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(push, 1500); }
  S.on((w) => {
    if (applying || !loggedIn() || w === 'sync') return;
    if (w === 'people' || w === 'saved' || w === 'active' || String(w).startsWith('settings:')) { A.dirty = true; saveA(); setStatus('dirty'); schedule(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && loggedIn() && Date.now() - (A.synced || 0) > 60000) syncNow(false); });
  window.addEventListener('online', () => { if (loggedIn() && A.dirty) push(); });

  // ---------- вход и выход ----------
  async function afterLogin(res, how) {
    A = { token: res.token, user: res.user, rev: 0, dirty: true }; saveA();
    setStatus('saving');
    await syncNow(true);
    UI.closeSheet();
    UI.toast(t('acc.hello', 'Вы вошли{n}. Карточки сохранены в аккаунте', { n: res.user && res.user.name ? ' как ' + res.user.name : '' }));
    void how;
  }
  function sessionExpired() {
    const u = A.user; A = { lastEmail: u && u.email, lastName: u && u.name }; saveA(); setStatus('guest');
    UI.toast(t('acc.expired', 'Вход устарел — войдите снова. Карточки на устройстве никуда не делись'));
  }
  function startProvider(p) {
    try { sessionStorage.setItem(AFTER, location.hash || ''); } catch (e) { /* пусто */ }
    const back = location.origin + location.pathname;
    location.href = `${CFG().api}/auth/start?provider=${encodeURIComponent(p)}&return=${encodeURIComponent(back)}`;
  }
  async function linkProvider(p) {
    try { sessionStorage.setItem(AFTER, '#settings'); } catch (e) { /* пусто */ }
    try { const r = await api('/auth/link', { method: 'POST', body: { provider: p, return: location.origin + location.pathname } }); location.href = r.url; }
    catch (e) { UI.toast(errText(e)); }
  }
  async function logout() {
    const body = UI.sheet(`<div class="stack"><p>${esc(t('acc.outQ', 'Выйти из аккаунта на этом устройстве? Карточки останутся в аккаунте, а отсюда будут убраны — войдёте снова, и они вернутся.'))}</p>${A.dirty ? `<p class="small bad-t">${esc(t('acc.outDirty', 'Есть изменения, которые ещё не сохранились в аккаунте. Сохраню перед выходом.'))}</p>` : ''}<div class="row"><button class="btn" data-no>${esc(t('cancel', 'Отмена'))}</button><button class="btn dark" data-yes>${icon('logout', 'sm')} ${esc(t('acc.out', 'Выйти'))}</button></div></div>`, { title: t('acc.out', 'Выйти') });
    body.querySelector('[data-no]').addEventListener('click', UI.closeSheet);
    body.querySelector('[data-yes]').addEventListener('click', async () => {
      if (A.dirty) { await push(); if (A.dirty) { UI.toast(t('acc.outFail', 'Не получилось сохранить изменения — проверьте интернет и попробуйте ещё раз')); return; } }
      try { await api('/auth/logout', { method: 'POST' }); } catch (e) { /* сессию всё равно забываем */ }
      const u = A.user; A = { lastEmail: u && u.email, lastName: u && u.name }; saveA();
      S.clearPeople(); UI.closeSheet(); setStatus('guest');
      location.hash = '#horoscope'; if (root.NApp) root.NApp.route(true);
      UI.toast(t('acc.outOk', 'Вы вышли из аккаунта'));
    });
  }
  async function deleteAccount() {
    const word = t('acc.delWord', 'удалить');
    const body = UI.sheet(`<div class="stack"><p>${esc(t('acc.delQ', 'Удалить аккаунт навсегда? Все карточки и сохранённые карты будут стёрты с сервера. Это нельзя отменить.'))}</p><div class="field"><label for="delw">${esc(t('acc.delType', 'Чтобы подтвердить, напишите «{w}»', { w: word }))}</label><input class="input" id="delw" autocomplete="off"></div><div class="row"><button class="btn" data-no>${esc(t('cancel', 'Отмена'))}</button><button class="btn dark" data-yes disabled>${icon('trash', 'sm')} ${esc(t('acc.del', 'Удалить аккаунт'))}</button></div></div>`, { title: t('acc.del', 'Удалить аккаунт') });
    const inp = body.querySelector('#delw'), yes = body.querySelector('[data-yes]');
    inp.addEventListener('input', () => { yes.disabled = inp.value.trim().toLowerCase() !== word; });
    body.querySelector('[data-no]').addEventListener('click', UI.closeSheet);
    yes.addEventListener('click', async () => {
      try { await api('/me', { method: 'DELETE' }); } catch (e) { UI.toast(errText(e)); return; }
      A = {}; saveA(); S.clearPeople(); UI.closeSheet(); setStatus('guest');
      location.hash = '#horoscope'; if (root.NApp) root.NApp.route(true);
      UI.toast(t('acc.delOk', 'Аккаунт удалён'));
    });
  }

  // ---------- окно входа ----------
  const PROV = () => [
    ['google', 'Google', `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`],
    ['yandex', t('acc.yandex', 'Яндекс ID'), `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#FC3F1D"/><path fill="#fff" d="M13.3 18.6h2.1V5.4h-3c-3.1 0-4.7 1.6-4.7 3.9 0 1.9.9 3 2.6 4.2l-2.9 5.1h2.3l3.3-5.6-1.1-.8c-1.4-.9-2-1.7-2-3.1 0-1.4 1-2.4 2.8-2.4h.9v11.9z"/></svg>`],
    ['vk', t('acc.vk', 'ВКонтакте'), `<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="7" fill="#0077FF"/><path fill="#fff" d="M12.8 16.9c-4.7 0-7.4-3.2-7.5-8.6h2.4c.1 3.9 1.8 5.6 3.1 5.9V8.3h2.2v3.4c1.4-.1 2.8-1.7 3.3-3.4h2.2c-.4 2.1-1.9 3.6-3 4.3 1.1.5 2.8 1.9 3.5 4.3h-2.4c-.5-1.6-1.8-2.8-3.6-3v3h-.2z"/></svg>`],
    ['ok', t('acc.ok', 'Одноклассники'), `<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="7" fill="#EE8208"/><circle cx="12" cy="8.3" r="2.9" fill="none" stroke="#fff" stroke-width="2"/><path d="M8.4 12.9c2.2 1.5 5 1.5 7.2 0M12 14.6l-3.2 3.6M12 14.6l3.2 3.6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`],
    ['mailru', 'Mail.ru', `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#005FF9"/><text x="12" y="16.4" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="13" fill="#FF9E00">@</text></svg>`],
    ['telegram', 'Telegram', `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#27A7E7"/><path fill="#fff" d="M5.4 11.7l11-4.3c.5-.2 1 .1.8.9l-1.9 8.8c-.1.6-.5.8-1 .5l-2.8-2.1-1.4 1.3c-.2.2-.3.3-.6.3l.2-2.9 5.3-4.8c.2-.2 0-.3-.3-.1l-6.6 4.1-2.8-.9c-.6-.2-.6-.6.1-.8z"/></svg>`],
  ];
  async function providers() {
    if (provCache) return provCache;
    try { const r = await api('/auth/providers', { noAuth: true, timeout: 8000 }); provCache = r.providers || []; } catch (e) { provCache = null; return ['email']; }
    return provCache;
  }
  function errText(e) {
    const c = e && (e.code || e.message);
    return ({
      offline: t('acc.e.offline', 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.'),
      wrong: t('acc.e.wrong', 'Неверная почта или пароль.'),
      email_taken: t('acc.e.taken', 'Эта почта уже зарегистрирована — войдите с паролем или через ту же кнопку, что в прошлый раз.'),
      bad_email: t('acc.e.email', 'Проверьте адрес почты.'),
      bad_password: t('acc.e.pw', 'Пароль — не короче 8 символов.'),
      rate: t('acc.e.rate', 'Слишком много попыток. Подождите 15 минут.'),
      no_password: t('acc.e.nopw', 'У этого аккаунта нет пароля — войдите кнопкой выше (Google, Яндекс…).'),
      state: t('acc.e.state', 'Вход прервался — попробуйте ещё раз.'),
      denied: t('acc.e.denied', 'Вход отменён.'),
      provider: t('acc.e.provider', 'Сервис входа не ответил. Попробуйте ещё раз или другой способ.'),
      unavailable: t('acc.e.unavail', 'Этот способ входа пока недоступен — выберите другой.'),
      already_linked: t('acc.e.linked', 'Этот вход уже привязан к другому аккаунту Salistro.'),
      last_login: t('acc.e.last', 'Нельзя отвязать единственный способ входа.'),
    })[c] || t('acc.e.other', 'Что-то пошло не так. Попробуйте ещё раз.');
  }
  /** Окно входа. opts.reason: 'more' — вторая карточка без входа, 'save' — просто сохранить, 'link' — из настроек. */
  async function open(opts) {
    opts = opts || {};
    if (!enabled()) { UI.toast(t('acc.off', 'Вход пока не подключён')); return; }
    const reason = opts.reason === 'more' ? t('acc.whyMore', 'Без входа можно сохранить одну карточку. Войдите — и добавляйте сколько угодно: всё сохранится в аккаунте и не пропадёт, даже если браузер очистится.')
      : t('acc.why', 'Аккаунт бережёт карточки и настройки: они не пропадут при очистке браузера и будут на телефоне и компьютере.');
    const n = S.people().length;
    const body = UI.sheet(`<div class="login">
      <p class="muted">${esc(reason)}</p>
      <div class="lg-prov" data-prov><p class="tiny muted">${esc(t('acc.loading', 'Загружаю способы входа…'))}</p></div>
      <div class="lg-or"><span>${esc(t('acc.orEmail', 'или по почте'))}</span></div>
      <div class="seg lg-tabs" role="tablist"><button type="button" data-m="login" aria-pressed="true">${esc(t('acc.tLogin', 'Вход'))}</button><button type="button" data-m="register" aria-pressed="false">${esc(t('acc.tReg', 'Регистрация'))}</button></div>
      <form class="stack lg-form" novalidate>
        <div class="field" data-only="register" hidden><label for="lgn">${esc(t('acc.name', 'Как вас зовут'))}</label><input class="input" id="lgn" autocomplete="name" maxlength="80"></div>
        <div class="field"><label for="lge">${esc(t('acc.email', 'Почта'))}</label><input class="input" id="lge" type="email" inputmode="email" autocomplete="email" value="${esc(A.lastEmail || '')}" required></div>
        <div class="field"><label for="lgp">${esc(t('acc.pw', 'Пароль'))}</label><span class="pwf"><input class="input" id="lgp" type="password" autocomplete="current-password" minlength="8" required><button type="button" class="iconbtn" data-eye aria-label="${esc(t('acc.show', 'Показать пароль'))}">${icon('eye', 'sm')}</button></span><span class="hint" data-only="register" hidden>${esc(t('acc.pwHint', 'Не короче 8 символов. Пароль не уходит на сервер — только его зашифрованный отпечаток.'))}</span></div>
        <p class="lg-err small" role="alert" hidden></p>
        <button class="btn primary" type="submit" data-submit>${icon('login', 'sm')} <span>${esc(t('acc.goLogin', 'Войти'))}</span></button>
      </form>
      ${n ? `<p class="lg-note small">${icon('cloud-up', 'sm')} ${esc(t('acc.moveNote', 'Карточки с этого устройства ({n}) перенесутся в аккаунт.', { n }))}</p>` : ''}
      <p class="tiny muted">${esc(t('acc.legal', 'Входя, вы соглашаетесь с условиями и политикой конфиденциальности. Карточки хранятся на сервере в зашифрованном виде.'))} <a href="terms.html">${esc(t('terms', 'Условия'))}</a> · <a href="privacy.html">${esc(t('privacy', 'Конфиденциальность'))}</a></p>
    </div>`, { title: t('acc.title', 'Вход в {b}', { b: root.NCONFIG.brand }), cls: 'login-dlg' });
    const form = body.querySelector('form'), err = body.querySelector('.lg-err'), submit = body.querySelector('[data-submit]');
    const e = body.querySelector('#lge'), p = body.querySelector('#lgp'), nm = body.querySelector('#lgn');
    let mode = 'login';
    const setMode = (m) => {
      mode = m; err.hidden = true;
      body.querySelectorAll('[data-m]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === m)));
      body.querySelectorAll('[data-only]').forEach((x) => { x.hidden = x.dataset.only !== m; });
      p.setAttribute('autocomplete', m === 'register' ? 'new-password' : 'current-password');
      submit.querySelector('span').textContent = m === 'register' ? t('acc.goReg', 'Создать аккаунт') : t('acc.goLogin', 'Войти');
    };
    body.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.m)));
    body.querySelector('[data-eye]').addEventListener('click', () => { p.type = p.type === 'password' ? 'text' : 'password'; });
    const showErr = (x) => { err.textContent = typeof x === 'string' ? x : errText(x); err.hidden = false; };
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const email = e.value.trim(), pw = p.value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { showErr({ code: 'bad_email' }); e.focus(); return; }
      if (pw.length < 8) { showErr({ code: 'bad_password' }); p.focus(); return; }
      submit.disabled = true; submit.classList.add('busy'); err.hidden = true;
      try {
        const pwh = await pwHash(email, pw);
        const res = await api(mode === 'register' ? '/auth/register' : '/auth/login', { method: 'POST', noAuth: true, body: { email, pwh, name: nm.value.trim() } });
        await afterLogin(res, 'email');
      } catch (x) {
        if (x.code === 'no_password' && x.data && x.data.providers && x.data.providers.length) showErr(t('acc.e.nopw2', 'Этот аккаунт входит через: {p}. Нажмите эту кнопку выше.', { p: x.data.providers.map((q) => (PROV().find((z) => z[0] === q) || [0, q])[1]).join(', ') }));
        else showErr(x);
      } finally { submit.disabled = false; submit.classList.remove('busy'); }
    });
    const list = await providers();
    const box = body.querySelector('[data-prov]');
    if (!box) return;
    const btns = PROV().filter(([k]) => list.includes(k));
    box.innerHTML = btns.length ? btns.map(([k, n2, svg]) => `<button type="button" class="lg-btn" data-p="${k}"><span class="lg-ic">${svg}</span><span>${esc(n2)}</span></button>`).join('') : `<p class="tiny muted">${esc(list.includes('email') ? t('acc.onlyEmail', 'Пока вход только по почте — кнопки Google, Яндекс, VK и Telegram скоро появятся.') : t('acc.e.offline', 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.'))}</p>`;
    box.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { b.classList.add('busy'); startProvider(b.dataset.p); }));
  }

  // ---------- шапка и настройки ----------
  function avatarHTML(u, size) {
    const s = size || 34, ini = `<span class="acct-ini">${esc(UI.initials((u && (u.name || u.email)) || '?'))}</span>`;
    return `<span class="acct-av" style="width:${s}px;height:${s}px">${ini}${u && u.avatar ? `<img src="${esc(u.avatar)}" alt="" width="${s}" height="${s}" referrerpolicy="no-referrer" loading="lazy" onerror="this.remove()">` : ''}</span>`;
  }
  function statusHTML() {
    const map = { ok: ['cloud-ok', t('acc.s.ok', 'Сохранено в аккаунте'), 'ok'], saving: ['cloud-up', t('acc.s.saving', 'Сохраняю…'), 'acc'], dirty: ['cloud-up', t('acc.s.dirty', 'Есть несохранённые изменения'), 'acc'], offline: ['cloud-off', t('acc.s.offline', 'Нет связи — сохраню, когда появится интернет'), 'bad'], error: ['alert-circle', t('acc.s.error', 'Не получилось сохранить — попробую ещё раз'), 'bad'], guest: ['device', t('acc.s.guest', 'Только на этом устройстве'), ''] };
    const [ic, txt, cls] = map[status] || map.guest;
    return `<span class="tag ${cls}">${icon(ic, 'xs')} ${esc(txt)}</span>`;
  }
  function paintHeader() {
    const slot = document.querySelector('[data-acct-slot]');
    if (!slot) return;
    if (!enabled()) { slot.innerHTML = ''; return; }
    if (!loggedIn()) slot.innerHTML = `<button class="btn sm acct-login" type="button" data-login>${icon('login', 'sm')}<span>${esc(t('acc.login', 'Войти'))}</span></button>`;
    else slot.innerHTML = `<button class="acct-btn" type="button" data-acct aria-label="${esc(t('acc.menu', 'Аккаунт'))}" title="${esc((A.user && (A.user.name || A.user.email)) || '')}">${avatarHTML(A.user, 32)}<i class="sync-dot s-${status}"></i></button>`;
    const lb = slot.querySelector('[data-login]'); if (lb) lb.addEventListener('click', () => open({}));
    const ab = slot.querySelector('[data-acct]'); if (ab) ab.addEventListener('click', menu);
  }
  function menu() {
    const u = A.user || {};
    const body = UI.sheet(`<div class="stack"><div class="row" style="gap:12px;flex-wrap:nowrap">${avatarHTML(u, 48)}<div class="stack s6" style="min-width:0"><b>${esc(u.name || t('acc.noName', 'Без имени'))}</b><span class="small muted" style="overflow-wrap:anywhere">${esc(u.email || (u.providers || []).map((q) => (PROV().find((z) => z[0] === q) || [0, q])[1]).join(', '))}</span></div></div>
      <div data-acct-status>${statusHTML()}</div>
      <div class="row"><button class="btn sm" data-sync>${icon('refresh', 'sm')} ${esc(t('acc.syncNow', 'Синхронизировать'))}</button><a class="btn sm" href="#settings" data-close-go>${icon('settings', 'sm')} ${esc(t('acc.settings', 'Настройки аккаунта'))}</a><button class="btn sm" data-out>${icon('logout', 'sm')} ${esc(t('acc.out', 'Выйти'))}</button></div></div>`, { title: t('acc.menu', 'Аккаунт') });
    body.querySelector('[data-sync]').addEventListener('click', () => syncNow(true));
    body.querySelector('[data-close-go]').addEventListener('click', UI.closeSheet);
    body.querySelector('[data-out]').addEventListener('click', logout);
  }
  /** Карточка «Аккаунт» в настройках. */
  async function settingsCard(box) {
    if (!box) return;
    if (!enabled()) { box.innerHTML = ''; return; }
    if (!loggedIn()) {
      box.innerHTML = `<div class="card stack acct-card"><h3>${icon('account')} ${esc(t('acc.card', 'Аккаунт'))}</h3><div>${statusHTML()}</div><p class="small muted">${esc(t('acc.guestP', 'Сейчас карточки хранятся только в этом браузере, и без входа можно сохранить одну. Войдите через Google, Яндекс, VK, Telegram или почту — данные сохранятся в аккаунте и будут на всех устройствах.'))}</p><div class="row"><button class="btn primary" data-login>${icon('login', 'sm')} ${esc(t('acc.login', 'Войти'))}</button></div></div>`;
      box.querySelector('[data-login]').addEventListener('click', () => open({}));
      return;
    }
    let u = A.user || {};
    try { const r = await api('/me'); u = r.user; A.user = u; saveA(); paintHeader(); } catch (e) { /* покажем что есть */ }
    const list = await providers();
    const linked = new Set(u.providers || []);
    const canLink = PROV().filter(([k]) => ['google', 'yandex', 'vk', 'telegram'].includes(k) && list.includes(k) && !linked.has(k));
    box.innerHTML = `<div class="card stack acct-card"><h3>${icon('account')} ${esc(t('acc.card', 'Аккаунт'))}</h3>
      <div class="row" style="gap:12px;flex-wrap:nowrap">${avatarHTML(u, 52)}<div class="stack s6" style="min-width:0"><b>${esc(u.name || t('acc.noName', 'Без имени'))}</b><span class="small muted" style="overflow-wrap:anywhere">${esc(u.email || '')}${u.email && !u.emailVerified ? ' · ' + esc(t('acc.unverified', 'почта не подтверждена')) : ''}</span></div></div>
      <div data-acct-status>${statusHTML()}</div>
      <div class="stack s6"><span class="label">${esc(t('acc.ways', 'Способы входа'))}</span><div class="tags">${PROV().filter(([k]) => linked.has(k)).map(([k, n, svg]) => `<span class="tag lg-tag"><span class="lg-ic sm">${svg}</span>${esc(n)}${linked.size > 1 || u.hasPassword ? `<button class="x" type="button" data-unlink="${k}" aria-label="${esc(t('acc.unlink', 'Отвязать'))}">${icon('close', 'xs')}</button>` : ''}</span>`).join('')}${u.hasPassword ? `<span class="tag lg-tag">${icon('mail', 'xs')} ${esc(t('acc.byPw', 'Почта и пароль'))}</span>` : ''}</div>
        ${canLink.length ? `<div class="row">${canLink.map(([k, n, svg]) => `<button class="btn sm" data-link="${k}"><span class="lg-ic sm">${svg}</span> ${esc(t('acc.linkX', 'Привязать {p}', { p: n }))}</button>`).join('')}</div>` : ''}</div>
      <details class="acc-pw"><summary class="small">${icon('key', 'xs')} ${esc(u.hasPassword ? t('acc.pwChange', 'Сменить пароль') : t('acc.pwSet', 'Добавить вход по почте и паролю'))}</summary>
        <form class="stack" style="margin-top:10px" data-pwform novalidate>${u.email ? '' : `<div class="field"><label for="ape">${esc(t('acc.email', 'Почта'))}</label><input class="input" id="ape" type="email" autocomplete="email"></div>`}<div class="field"><label for="app">${esc(t('acc.pwNew', 'Новый пароль'))}</label><input class="input" id="app" type="password" autocomplete="new-password" minlength="8"></div><p class="lg-err small" hidden></p><button class="btn sm primary" type="submit">${esc(t('f.save', 'Сохранить'))}</button></form></details>
      <div class="row"><button class="btn sm" data-sync>${icon('refresh', 'sm')} ${esc(t('acc.syncNow', 'Синхронизировать'))}</button><button class="btn sm" data-out>${icon('logout', 'sm')} ${esc(t('acc.out', 'Выйти'))}</button><button class="btn sm danger" data-del>${icon('trash', 'sm')} ${esc(t('acc.del', 'Удалить аккаунт'))}</button></div></div>`;
    box.querySelector('[data-sync]').addEventListener('click', () => syncNow(true));
    box.querySelector('[data-out]').addEventListener('click', logout);
    box.querySelector('[data-del]').addEventListener('click', deleteAccount);
    box.querySelectorAll('[data-link]').forEach((b) => b.addEventListener('click', () => linkProvider(b.dataset.link)));
    box.querySelectorAll('[data-unlink]').forEach((b) => b.addEventListener('click', async () => { try { const r = await api('/me/identity/' + b.dataset.unlink, { method: 'DELETE' }); A.user = r.user; saveA(); settingsCard(box); } catch (e) { UI.toast(errText(e)); } }));
    const pf = box.querySelector('[data-pwform]');
    pf.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const er = pf.querySelector('.lg-err'), email = u.email || (pf.querySelector('#ape') || {}).value || '', pw = pf.querySelector('#app').value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { er.textContent = errText({ code: 'bad_email' }); er.hidden = false; return; }
      if (pw.length < 8) { er.textContent = errText({ code: 'bad_password' }); er.hidden = false; return; }
      try { const r = await api('/me/password', { method: 'POST', body: { email: email.trim(), pwh: await pwHash(email, pw) } }); A.user = r.user; saveA(); UI.toast(t('acc.pwOk', 'Пароль сохранён')); settingsCard(box); }
      catch (e) { er.textContent = errText(e); er.hidden = false; }
    });
  }

  // ---------- лимит без входа ----------
  const canAdd = () => loggedIn() || !enabled() || S.people().length < (CFG().guestLimit || 1);
  /** Перед добавлением новой карточки: true — можно; иначе открывает вход и возвращает false. */
  function gateAdd() { if (canAdd()) return true; open({ reason: 'more' }); return false; }

  // ---------- возврат с сайта входа (#login=… / #login_error=…) ----------
  (function readHash() {
    const h = location.hash || '';
    const code = /[#&]login=([A-Za-z0-9_-]{20,})/.exec(h), er = /[#&]login_error=([a-z_]+)/.exec(h), lk = /[#&]linked=([a-z]+)/.exec(h);
    if (code || er) {
      if (code) pendingCode = code[1]; if (er) pendingErr = er[1]; if (lk) linkedNote = lk[1];
      let back = ''; try { back = sessionStorage.getItem(AFTER) || ''; sessionStorage.removeItem(AFTER); } catch (e) { back = ''; }
      if (/login/.test(back)) back = '';
      history.replaceState(null, '', location.pathname + location.search + (back || (S.people().length ? '#today' : '#horoscope')));
    } else if (/^#login\b/.test(h)) {
      pendingOpen = true;
      history.replaceState(null, '', location.pathname + location.search + (S.people().length ? '#today' : '#horoscope'));
    }
  })();
  async function boot() {
    paintHeader();
    if (pendingErr) { const e = pendingErr; pendingErr = null; setTimeout(() => UI.toast(errText({ code: e })), 300); }
    if (pendingCode) {
      const code = pendingCode; pendingCode = null;
      try {
        const res = await api('/auth/exchange', { method: 'POST', noAuth: true, body: { code } });
        if (linkedNote && loggedIn() && A.user && res.user && A.user.id === res.user.id) { A.user = res.user; saveA(); await syncNow(true); UI.toast(t('acc.linkedOk', 'Вход привязан к аккаунту')); }
        else await afterLogin(res, 'provider');
      } catch (e) { UI.toast(errText(e)); }
      return;
    }
    if (pendingOpen) { pendingOpen = false; setTimeout(() => open({}), 200); }
    if (loggedIn()) syncNow(false);
  }

  root.NAccount = { open, gateAdd, canAdd, loggedIn, user: () => A.user || null, paintHeader, settingsCard, syncNow, push, logout, status: () => status, boot, _merge: merge, _pwHash: pwHash };
})(window);
