/* Аккаунт Saliastro (необязательный). Без входа всё хранится в браузере, и сохранить можно одну карточку (NCONFIG.account.guestLimit).
   Вход и регистрация: ключ доступа (Face ID, отпечаток, Windows Hello), Google (+ окно One Tap), Яндекс ID, VK ID (ВКонтакте, Одноклассники,
   Mail.ru), Telegram, Apple, код на почту, почта + пароль. После входа карточки с устройства сливаются с карточками аккаунта и дальше
   синхронизируются (сервер — server/account-worker, данные там зашифрованы). Пароль не уходит на сервер: браузер отправляет только его хэш
   (PBKDF2, 210 000 повторов), сервер хэширует ещё раз со своей солью. Тариф приходит вместе с пользователем (user.plan) — см. js/plans.js. */
(function (root) {
  'use strict';
  const UI = root.NUI, S = root.NStore;
  const { t, esc, icon } = UI;
  const CFG = () => (root.NCONFIG && root.NCONFIG.account) || {};
  const KEY = 'saliastro:acct', AFTER = 'saliastro:afterLogin', LAST = 'saliastro:lastLogin';
  let A = readA();
  let status = A.token ? (A.dirty ? 'dirty' : 'ok') : 'guest';
  let applying = false, timer = null, pushing = null, infoCache = null, infoP = null, pendingCode = null, pendingErr = null, pendingOpen = false, linkedNote = null, condAbort = null;

  function readA() { try { return JSON.parse(localStorage.getItem(KEY) || localStorage.getItem('natalogy:acct') || 'null') || {}; } catch (e) { return {}; } } // natalogy:acct — вход до переименования 16.10.2026
  function saveA() { try { localStorage.setItem(KEY, JSON.stringify(A)); } catch (e) { /* без хранилища — до перезагрузки */ } }
  const loggedIn = () => !!(A && A.token);
  const enabled = () => !!CFG().api;
  function setStatus(s) { status = s; paintHeader(); const c = document.querySelector('[data-acct-status]'); if (c) c.innerHTML = statusHTML(); }
  const lastWay = () => { try { return localStorage.getItem(LAST) || ''; } catch (e) { return ''; } };
  const setLastWay = (w) => { try { localStorage.setItem(LAST, w); } catch (e) { /* пусто */ } };

  // ---------- запросы ----------
  async function api(path, opts) {
    opts = opts || {};
    const h = {};
    if (opts.body) h['content-type'] = 'application/json';
    if (A.token && !opts.noAuth) h.authorization = 'Bearer ' + A.token;
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), opts.timeout || 20000);
    let r;
    try { r = await fetch(CFG().api + path, { method: opts.method || 'GET', headers: h, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: ctl.signal, cache: 'no-store' }); }
    catch (e) { clearTimeout(tm); throw Object.assign(new Error('offline'), { offline: true, code: 'offline' }); }
    clearTimeout(tm);
    let j = null; try { j = await r.json(); } catch (e) { j = null; }
    if (r.status === 401 && A.token && !opts.noAuth) sessionExpired();
    if (!r.ok) throw Object.assign(new Error((j && j.error) || 'http_' + r.status), { status: r.status, data: j, code: j && j.error });
    return j;
  }
  async function pwHash(email, pw) {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode('natalogy|' /* соль не менять: от неё зависят уже заданные пароли */ + String(email).trim().toLowerCase()), iterations: 210000 }, k, 256);
    let s = ''; new Uint8Array(bits).forEach((b) => { s += String.fromCharCode(b); }); return btoa(s);
  }
  /** Что включено на сервере: способы входа, кассы, id для Google One Tap */
  async function info() {
    if (infoCache) return infoCache;
    if (!enabled()) return { providers: [], billing: {} };
    if (!infoP) infoP = api('/auth/providers', { noAuth: true, timeout: 8000 }).then((r) => { infoCache = r || {}; return infoCache; }).catch(() => { infoP = null; return { providers: ['email', 'passkey'], billing: {}, offline: true }; });
    return infoP;
  }
  const providers = async () => (await info()).providers || [];
  /** Свежие данные пользователя (тариф после оплаты, ключи) */
  async function refresh() {
    if (!loggedIn()) return null;
    const r = await api('/me');
    A.user = r.user; saveA(); paintHeader();
    return A.user;
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
    return { app: 'saliastro', v: 1, people: pick(remote.people, local.people), saved: pick(remote.saved, local.saved).sort((a, b) => (b.at || 0) - (a.at || 0)), deleted: del, settings: newer ? local.settings : remote.settings, settingsAt: Math.max(local.settingsAt || 0, remote.settingsAt || 0), activeId: local.activeId || remote.activeId };
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
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && loggedIn() && Date.now() - (A.synced || 0) > 60000) { syncNow(false); refresh().catch(() => {}); } });
  window.addEventListener('online', () => { if (loggedIn() && A.dirty) push(); });

  // ---------- вход и выход ----------
  async function afterLogin(res, how) {
    if (condAbort) { condAbort.abort(); condAbort = null; }
    A = { token: res.token, user: res.user, rev: 0, dirty: true }; saveA();
    if (how) setLastWay(how);
    setStatus('saving');
    await syncNow(true);
    UI.closeSheet();
    UI.toast(res.created ? t('acc.helloNew', 'Аккаунт создан{n}. Карточки сохранены', { n: res.user && res.user.name ? ', ' + res.user.name : '' }) : t('acc.hello', 'Вы вошли{n}. Карточки сохранены в аккаунте', { n: res.user && res.user.name ? ' как ' + res.user.name : '' }));
    const buying = root.NPlans && (() => { try { return /"step":"login"/.test(sessionStorage.getItem('saliastro:buy') || ''); } catch (e) { return false; } })();
    if (buying) root.NPlans.resume();
    else if (res.created && how !== 'passkey' && pkSupported() && !(res.user && res.user.passkeys)) setTimeout(offerPasskey, 900); // новичку — входить без пароля
  }
  function sessionExpired() {
    const u = A.user; A = { lastEmail: u && u.email, lastName: u && u.name }; saveA(); setStatus('guest');
    UI.toast(t('acc.expired', 'Вход устарел — войдите снова. Карточки на устройстве никуда не делись'));
  }
  function startProvider(p) {
    try { sessionStorage.setItem(AFTER, location.hash || ''); } catch (e) { /* пусто */ }
    setLastWay(p);
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
    const pl = A.user && A.user.plan;
    const subNote = pl && pl.renews ? `<p class="small bad-t">${esc(pl.provider === 'gumroad' ? t('acc.delSubG', 'У вас подписка в Gumroad — отмените её по ссылке «Управлять» в письме Gumroad, иначе списания продолжатся.') : t('acc.delSubL', 'Автопродление подписки будет отменено.'))}</p>` : '';
    const body = UI.sheet(`<div class="stack"><p>${esc(t('acc.delQ', 'Удалить аккаунт навсегда? Все карточки и сохранённые карты будут стёрты с сервера. Это нельзя отменить.'))}</p>${subNote}<div class="field"><label for="delw">${esc(t('acc.delType', 'Чтобы подтвердить, напишите «{w}»', { w: word }))}</label><input class="input" id="delw" autocomplete="off"></div><div class="row"><button class="btn" data-no>${esc(t('cancel', 'Отмена'))}</button><button class="btn dark" data-yes disabled>${icon('trash', 'sm')} ${esc(t('acc.del', 'Удалить аккаунт'))}</button></div></div>`, { title: t('acc.del', 'Удалить аккаунт') });
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

  // ---------- ключ доступа (passkey): Face ID, отпечаток, Windows Hello ----------
  const pkSupported = () => !!(window.PublicKeyCredential && navigator.credentials && window.isSecureContext);
  const bEnc = (buf) => { let s = ''; new Uint8Array(buf).forEach((b) => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const bDec = (s) => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)), (c) => c.charCodeAt(0));
  const toCreate = (pk) => Object.assign({}, pk, { challenge: bDec(pk.challenge), user: Object.assign({}, pk.user, { id: bDec(pk.user.id) }), excludeCredentials: (pk.excludeCredentials || []).map((c) => ({ type: 'public-key', id: bDec(c.id) })) });
  const toGet = (pk) => Object.assign({}, pk, { challenge: bDec(pk.challenge), allowCredentials: [] });
  function credJSON(c) {
    const r = c.response, o = { id: c.id, rawId: bEnc(c.rawId), type: c.type, response: { clientDataJSON: bEnc(r.clientDataJSON) } };
    ['attestationObject', 'authenticatorData', 'signature', 'userHandle'].forEach((k) => { if (r[k]) o.response[k] = bEnc(r[k]); });
    return o;
  }
  function deviceLabel() {
    const ua = navigator.userAgent || '';
    const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
    const br = /YaBrowser/.test(ua) ? 'Яндекс Браузер' : /Edg\//.test(ua) ? 'Edge' : /Firefox/.test(ua) ? 'Firefox' : /Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : '';
    return [os, br].filter(Boolean).join(' · ') || t('acc.pkDevice', 'Это устройство');
  }
  const pkCancelled = (e) => e && (e.name === 'NotAllowedError' || e.name === 'AbortError');
  async function passkeyLogin(conditional) {
    const st = await api('/auth/passkey/start', { method: 'POST', noAuth: true, body: {} });
    if (conditional) { if (condAbort) condAbort.abort(); condAbort = new AbortController(); }
    const c = await navigator.credentials.get(conditional ? { publicKey: toGet(st.publicKey), mediation: 'conditional', signal: condAbort.signal } : { publicKey: toGet(st.publicKey) });
    const res = await api('/auth/passkey/finish', { method: 'POST', noAuth: true, body: { id: st.id, cred: credJSON(c) } });
    await afterLogin(res, 'passkey');
  }
  async function passkeySignup(name) {
    const st = await api('/auth/passkey/signup/start', { method: 'POST', noAuth: true, body: { name } });
    const c = await navigator.credentials.create({ publicKey: toCreate(st.publicKey) });
    const res = await api('/auth/passkey/signup/finish', { method: 'POST', noAuth: true, body: { id: st.id, cred: credJSON(c), name: deviceLabel() } });
    await afterLogin(res, 'passkey');
  }
  async function passkeyAdd() {
    const st = await api('/me/passkey/start', { method: 'POST', body: {} });
    const c = await navigator.credentials.create({ publicKey: toCreate(st.publicKey) });
    const r = await api('/me/passkey/finish', { method: 'POST', body: { id: st.id, cred: credJSON(c), name: deviceLabel() } });
    A.user = r.user; saveA();
    return r.passkeys;
  }
  function offerPasskey() {
    if (!loggedIn() || document.querySelector('.sheet')) return;
    const body = UI.sheet(`<div class="stack"><div class="pk-hero">${icon('fingerprint')}</div><p>${esc(t('acc.pkOffer', 'Входить по отпечатку, Face ID или Windows Hello — без пароля? Ключ хранится на этом устройстве, на сервер уходит только его открытая часть.'))}</p><div class="row"><button class="btn" data-no>${esc(t('later', 'Позже'))}</button><button class="btn primary" data-yes>${icon('fingerprint', 'sm')} ${esc(t('acc.pkAdd', 'Добавить ключ доступа'))}</button></div></div>`, { title: t('acc.pkTitle', 'Вход без пароля') });
    body.querySelector('[data-no]').addEventListener('click', UI.closeSheet);
    body.querySelector('[data-yes]').addEventListener('click', async () => { try { await passkeyAdd(); UI.closeSheet(); UI.toast(t('acc.pkOk', 'Ключ доступа сохранён — в следующий раз войдёте в одно касание')); } catch (e) { if (!pkCancelled(e)) UI.toast(errText(e)); } });
  }

  // ---------- Google One Tap: «Продолжить как …» прямо поверх сайта ----------
  let gsiP = null;
  function loadGsi() {
    if (window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve();
    if (!gsiP) gsiP = new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = ok; s.onerror = () => { gsiP = null; no(new Error('gsi')); }; document.head.appendChild(s); });
    return gsiP;
  }
  async function oneTap() {
    try {
      const i = await info();
      if (loggedIn() || !i.googleClientId || !(i.providers || []).includes('onetap')) return;
      await loadGsi();
      window.google.accounts.id.initialize({
        client_id: i.googleClientId, auto_select: false, cancel_on_tap_outside: true, context: 'signin', itp_support: true, use_fedcm_for_prompt: true,
        callback: async (r) => { try { const res = await api('/auth/google/token', { method: 'POST', noAuth: true, body: { credential: r.credential } }); await afterLogin(res, 'google'); } catch (e) { UI.toast(errText(e)); } },
      });
      window.google.accounts.id.prompt();
    } catch (e) { /* One Tap необязателен — есть обычная кнопка Google */ }
  }

  // ---------- окно входа ----------
  const APPLE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="7" fill="#111"/><path fill="#fff" d="M15.6 12.7c0-1.6 1.3-2.4 1.4-2.5-.8-1.1-2-1.3-2.4-1.3-1-.1-2 .6-2.5.6s-1.3-.6-2.2-.6c-1.1 0-2.2.7-2.8 1.7-1.2 2.1-.3 5.2.9 6.9.6.8 1.2 1.7 2.1 1.7.8 0 1.2-.5 2.2-.5s1.3.5 2.2.5c.9 0 1.5-.9 2-1.7.6-.9.9-1.8.9-1.9 0 0-1.8-.7-1.8-2.9zM14 7.9c.5-.6.8-1.4.7-2.2-.7 0-1.5.5-2 1.1-.4.5-.8 1.3-.7 2.1.8.1 1.5-.4 2-1z"/></svg>`;
  const PROV = () => [
    ['google', 'Google', `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`],
    ['yandex', t('acc.yandex', 'Яндекс ID'), `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#FC3F1D"/><path fill="#fff" d="M13.3 18.6h2.1V5.4h-3c-3.1 0-4.7 1.6-4.7 3.9 0 1.9.9 3 2.6 4.2l-2.9 5.1h2.3l3.3-5.6-1.1-.8c-1.4-.9-2-1.7-2-3.1 0-1.4 1-2.4 2.8-2.4h.9v11.9z"/></svg>`],
    ['vk', t('acc.vk', 'ВКонтакте'), `<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="7" fill="#0077FF"/><path fill="#fff" d="M12.8 16.9c-4.7 0-7.4-3.2-7.5-8.6h2.4c.1 3.9 1.8 5.6 3.1 5.9V8.3h2.2v3.4c1.4-.1 2.8-1.7 3.3-3.4h2.2c-.4 2.1-1.9 3.6-3 4.3 1.1.5 2.8 1.9 3.5 4.3h-2.4c-.5-1.6-1.8-2.8-3.6-3v3h-.2z"/></svg>`],
    ['telegram', 'Telegram', `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#27A7E7"/><path fill="#fff" d="M5.4 11.7l11-4.3c.5-.2 1 .1.8.9l-1.9 8.8c-.1.6-.5.8-1 .5l-2.8-2.1-1.4 1.3c-.2.2-.3.3-.6.3l.2-2.9 5.3-4.8c.2-.2 0-.3-.3-.1l-6.6 4.1-2.8-.9c-.6-.2-.6-.6.1-.8z"/></svg>`],
    ['apple', 'Apple', APPLE_SVG],
    ['ok', t('acc.ok', 'Одноклассники'), `<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="7" fill="#EE8208"/><circle cx="12" cy="8.3" r="2.9" fill="none" stroke="#fff" stroke-width="2"/><path d="M8.4 12.9c2.2 1.5 5 1.5 7.2 0M12 14.6l-3.2 3.6M12 14.6l3.2 3.6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`],
    ['mailru', 'Mail.ru', `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#005FF9"/><text x="12" y="16.4" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="13" fill="#FF9E00">@</text></svg>`],
  ];
  // порядок кнопок: по-русски сначала Яндекс и VK, по-английски — Google и Apple; способ «в прошлый раз» — первым
  function orderedProv(list) {
    const order = UI.lang() === 'en' ? ['google', 'apple', 'telegram', 'yandex', 'vk', 'ok', 'mailru'] : ['yandex', 'vk', 'telegram', 'google', 'apple', 'ok', 'mailru'];
    const last = lastWay();
    return PROV().filter(([k]) => list.includes(k)).sort((a, b) => (a[0] === last ? -1 : b[0] === last ? 1 : order.indexOf(a[0]) - order.indexOf(b[0])));
  }
  const provName = (k) => (k === 'passkey' ? t('acc.pkShort', 'ключ доступа') : k === 'email' || k === 'emailcode' ? t('acc.byMail', 'почта') : (PROV().find((z) => z[0] === k) || [0, k])[1]);
  function errText(e) {
    const c = e && (e.code || e.message);
    if (e && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return t('acc.e.denied', 'Вход отменён.');
    if (e && e.name === 'InvalidStateError') return t('acc.e.pkHave', 'На этом устройстве уже есть ключ для этого аккаунта.');
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
      already_linked: t('acc.e.linked', 'Этот вход уже привязан к другому аккаунту Saliastro.'),
      last_login: t('acc.e.last', 'Нельзя убрать единственный способ входа.'),
      code_wrong: t('acc.e.codeWrong', 'Код не подходит. Проверьте цифры из письма.'),
      code_expired: t('acc.e.codeOld', 'Код устарел — пришлю новый.'),
      mail: t('acc.e.mail', 'Не получилось отправить письмо. Попробуйте через минуту.'),
      passkey_unknown: t('acc.e.pkUnknown', 'Этот ключ доступа не найден — возможно, его удалили. Войдите другим способом.'),
      passkey_bad: t('acc.e.pkBad', 'Ключ доступа не подошёл. Попробуйте ещё раз.'),
      passkey_exists: t('acc.e.pkHave', 'На этом устройстве уже есть ключ для этого аккаунта.'),
      challenge: t('acc.e.state', 'Вход прервался — попробуйте ещё раз.'),
      origin: t('acc.e.unavail', 'Этот способ входа пока недоступен — выберите другой.'),
    })[c] || t('acc.e.other', 'Что-то пошло не так. Попробуйте ещё раз.');
  }
  function pwScore(pw) {
    if (!pw) return 0;
    let s = pw.length >= 8 ? 1 : 0;
    if (pw.length >= 12) s++;
    if (/[a-zа-яё]/.test(pw) && /[A-ZА-ЯЁ]/.test(pw)) s++;
    if (/\d/.test(pw) && /[^\wа-яё]/i.test(pw)) s++;
    return Math.min(3, s);
  }

  /** Окно входа и регистрации. opts.reason: 'more' — вторая карточка без входа, 'buy' — перед оплатой тарифа, 'code' — ввести код, 'register' — сразу регистрация. */
  async function open(opts) {
    opts = opts || {};
    if (!enabled()) { UI.toast(t('acc.off', 'Вход пока не подключён')); return; }
    const reason = opts.reason === 'more' ? t('acc.whyMore', 'Без входа можно сохранить одну карточку. Войдите — и добавляйте сколько угодно: всё сохранится в аккаунте и не пропадёт, даже если браузер очистится.')
      : opts.reason === 'buy' ? t('acc.whyBuy', 'Тариф «{p}» привяжется к аккаунту — так он будет на телефоне и компьютере. Войдите или создайте аккаунт за пару секунд.', { p: opts.plan || '' })
        : opts.reason === 'code' ? t('acc.whyCode', 'Код активирует тариф в аккаунте — войдите или создайте его.')
          : t('acc.why', 'Аккаунт бережёт карточки и настройки: они не пропадут при очистке браузера и будут на телефоне и компьютере.');
    const n = S.people().length, last = lastWay();
    const body = UI.sheet(`<div class="login">
      <p class="muted lg-why">${esc(reason)}</p>
      ${pkSupported() ? `<button type="button" class="lg-pk" data-pk><span class="lg-pk-ic">${icon('fingerprint')}</span><span class="lg-pk-t"><b>${esc(t('acc.pkLogin', 'Войти по ключу доступа'))}</b><small>${esc(t('acc.pkLoginS', 'Face ID, отпечаток или Windows Hello — без пароля'))}</small></span>${last === 'passkey' ? `<span class="lg-last">${esc(t('acc.last', 'в прошлый раз'))}</span>` : ''}</button>` : ''}
      <div class="lg-prov" data-prov><p class="tiny muted">${esc(t('acc.loading', 'Загружаю способы входа…'))}</p></div>
      <div class="lg-or"><span>${esc(t('acc.orEmail', 'или по почте'))}</span></div>
      <div class="seg lg-tabs" role="tablist"><button type="button" data-m="login" aria-pressed="true">${esc(t('acc.tLogin', 'Вход'))}</button><button type="button" data-m="register" aria-pressed="false">${esc(t('acc.tReg', 'Регистрация'))}</button><button type="button" data-m="code" aria-pressed="false" hidden>${esc(t('acc.tCode', 'Код на почту'))}</button></div>
      <form class="stack lg-form" novalidate>
        <div class="field" data-only="register" hidden><label for="lgn">${esc(t('acc.name', 'Как вас зовут'))}</label><input class="input" id="lgn" autocomplete="name" maxlength="80" placeholder="${esc(t('acc.namePh', 'Имя'))}"></div>
        <div class="field" data-only="login register code"><label for="lge">${esc(t('acc.email', 'Почта'))}</label><input class="input" id="lge" type="email" inputmode="email" autocomplete="username webauthn" value="${esc(A.lastEmail || '')}" placeholder="name@mail.ru" required></div>
        <div class="field" data-only="login register"><label for="lgp">${esc(t('acc.pw', 'Пароль'))}</label><span class="pwf"><input class="input" id="lgp" type="password" autocomplete="current-password" minlength="8" required><button type="button" class="iconbtn" data-eye aria-label="${esc(t('acc.show', 'Показать пароль'))}">${icon('eye', 'sm')}</button></span>
          <span class="pw-meter" data-only="register" hidden aria-hidden="true"><i></i><i></i><i></i></span><span class="hint" data-only="register" hidden data-pwhint>${esc(t('acc.pwHint', 'Не короче 8 символов. Пароль не уходит на сервер — только его зашифрованный отпечаток.'))}</span></div>
        <div class="field lg-codef" data-only="code-sent" hidden><label for="lgc">${esc(t('acc.codeL', 'Код из письма'))}</label><input class="input lg-code" id="lgc" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="••••••"><span class="hint" data-codehint></span></div>
        <div class="field" data-only="reset" hidden><label for="lgnp">${esc(t('acc.pwNew', 'Новый пароль'))}</label><input class="input" id="lgnp" type="password" autocomplete="new-password" minlength="8"></div>
        <label class="check" data-only="register" hidden><input type="checkbox" id="lgok"><span>${t('acc.agree', 'Принимаю <a href="terms.html" target="_blank" rel="noopener">условия</a> и <a href="privacy.html" target="_blank" rel="noopener">политику конфиденциальности</a>')}</span></label>
        <p class="lg-err small" role="alert" hidden></p>
        <button class="btn primary" type="submit" data-submit>${icon('login', 'sm')} <span>${esc(t('acc.goLogin', 'Войти'))}</span></button>
        <div class="lg-links"><button type="button" class="lg-link" data-only="login" data-forgot>${esc(t('acc.forgot', 'Забыли пароль?'))}</button>${pkSupported() ? `<button type="button" class="lg-link" data-only="register" hidden data-pksign>${icon('fingerprint', 'xs')} ${esc(t('acc.pkSign', 'Без пароля — создать аккаунт с ключом доступа'))}</button>` : ''}</div>
      </form>
      ${n ? `<p class="lg-note small">${icon('cloud-up', 'sm')} ${esc(t('acc.moveNote', 'Карточки с этого устройства ({n}) перенесутся в аккаунт.', { n }))}</p>` : ''}
      <p class="tiny muted">${esc(t('acc.legal', 'Входя, вы соглашаетесь с условиями и политикой конфиденциальности. Карточки хранятся на сервере в зашифрованном виде.'))} <a href="terms.html">${esc(t('terms', 'Условия'))}</a> · <a href="privacy.html">${esc(t('privacy', 'Конфиденциальность'))}</a></p>
    </div>`, { title: opts.reason === 'register' ? t('acc.titleReg', 'Регистрация в {b}', { b: root.NCONFIG.brand }) : t('acc.title', 'Вход в {b}', { b: root.NCONFIG.brand }), cls: 'login-dlg' });
    const form = body.querySelector('form'), err = body.querySelector('.lg-err'), submit = body.querySelector('[data-submit]');
    const e = body.querySelector('#lge'), p = body.querySelector('#lgp'), nm = body.querySelector('#lgn'), cd = body.querySelector('#lgc'), np = body.querySelector('#lgnp'), ok = body.querySelector('#lgok');
    let mode = 'login', sent = false, reset = false, codeOn = false;
    const showErr = (x) => { err.textContent = typeof x === 'string' ? x : errText(x); err.hidden = false; };
    const setMode = (m) => {
      mode = m; err.hidden = true; if (m !== 'code') { sent = false; reset = false; }
      body.querySelectorAll('[data-m]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === m)));
      body.querySelectorAll('form [data-only]').forEach((x) => { const on = x.dataset.only.split(' '); x.hidden = !(on.includes(m) || (sent && on.includes('code-sent')) || (reset && sent && on.includes('reset'))); });
      p.setAttribute('autocomplete', m === 'register' ? 'new-password' : 'current-password');
      submit.querySelector('span').textContent = m === 'register' ? t('acc.goReg', 'Создать аккаунт') : m === 'code' ? (sent ? (reset ? t('acc.goReset', 'Сохранить пароль и войти') : t('acc.goCode', 'Войти')) : t('acc.sendCode', 'Прислать код')) : t('acc.goLogin', 'Войти');
    };
    body.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.m)));
    body.querySelector('[data-eye]').addEventListener('click', () => { p.type = p.type === 'password' ? 'text' : 'password'; });
    const meter = body.querySelector('.pw-meter'), pwHint = body.querySelector('[data-pwhint]');
    p.addEventListener('input', () => {
      if (mode !== 'register') return;
      const sc = pwScore(p.value);
      meter.dataset.s = String(p.value ? sc : '');
      pwHint.textContent = !p.value ? t('acc.pwHint', 'Не короче 8 символов. Пароль не уходит на сервер — только его зашифрованный отпечаток.') : [t('acc.pw0', 'Ещё короткий: нужно хотя бы 8 символов'), t('acc.pw1', 'Сойдёт. Длиннее — надёжнее'), t('acc.pw2', 'Хороший пароль'), t('acc.pw3', 'Отличный пароль')][sc];
    });
    body.querySelector('[data-forgot]').addEventListener('click', () => {
      if (codeOn) { reset = true; sent = false; setMode('code'); reset = true; showErrInfo(t('acc.resetInfo', 'Пришлю код на почту — после него зададите новый пароль.')); return; }
      showErr(t('acc.forgotNo', 'Войдите кнопкой Google, Яндекс или ключом доступа с той же почтой — потом в «Настройки → Аккаунт» задайте новый пароль.'));
    });
    function showErrInfo(x) { err.textContent = x; err.hidden = false; err.classList.add('info'); setTimeout(() => err.classList.remove('info'), 4000); }
    const pkSign = body.querySelector('[data-pksign]');
    if (pkSign) pkSign.addEventListener('click', async () => {
      if (!ok.checked) { showErr(t('acc.needAgree', 'Отметьте согласие с условиями — и продолжим.')); return; }
      pkSign.disabled = true;
      try { await passkeySignup(nm.value.trim()); } catch (x) { if (!pkCancelled(x)) showErr(x); } finally { pkSign.disabled = false; }
    });
    const pkBtn = body.querySelector('[data-pk]');
    if (pkBtn) pkBtn.addEventListener('click', async () => {
      if (condAbort) { condAbort.abort(); condAbort = null; }
      pkBtn.classList.add('busy');
      try { await passkeyLogin(false); } catch (x) { if (!pkCancelled(x)) showErr(x); } finally { pkBtn.classList.remove('busy'); }
    });
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const email = e.value.trim(), pw = p.value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { showErr({ code: 'bad_email' }); e.focus(); return; }
      if (mode !== 'code' && pw.length < 8) { showErr({ code: 'bad_password' }); p.focus(); return; }
      if (mode === 'register' && !ok.checked) { showErr(t('acc.needAgree', 'Отметьте согласие с условиями — и продолжим.')); return; }
      if (mode === 'code' && sent && reset && np.value.length < 8) { showErr({ code: 'bad_password' }); np.focus(); return; }
      submit.disabled = true; submit.classList.add('busy'); err.hidden = true;
      try {
        if (mode === 'code' && !sent) {
          await api('/auth/email/send', { method: 'POST', noAuth: true, body: { email, lang: UI.lang() } });
          sent = true; setMode('code');
          body.querySelector('[data-codehint]').textContent = t('acc.codeSent', 'Отправил на {e}. Письмо может идти минуту; проверьте «Спам».', { e: email });
          setTimeout(() => cd.focus(), 50);
        } else if (mode === 'code') {
          const res = await api('/auth/email/verify', { method: 'POST', noAuth: true, body: { email, code: cd.value, name: nm.value.trim(), pwh: reset && np.value ? await pwHash(email, np.value) : undefined } });
          await afterLogin(res, 'emailcode');
        } else {
          const pwh = await pwHash(email, pw);
          const res = await api(mode === 'register' ? '/auth/register' : '/auth/login', { method: 'POST', noAuth: true, body: { email, pwh, name: nm.value.trim() } });
          if (mode === 'register') res.created = true;
          await afterLogin(res, 'email');
        }
      } catch (x) {
        if (x.code === 'no_password' && x.data && x.data.providers && x.data.providers.length) showErr(t('acc.e.nopw2', 'Этот аккаунт входит через: {p}. Нажмите эту кнопку выше.', { p: x.data.providers.map(provName).join(', ') }));
        else if (x.code === 'code_expired') { sent = false; setMode('code'); showErr(x); }
        else showErr(x);
      } finally { submit.disabled = false; submit.classList.remove('busy'); }
    });
    cd.addEventListener('input', () => { cd.value = cd.value.replace(/\D/g, '').slice(0, 6); if (cd.value.length === 6 && !reset) form.requestSubmit(); });
    if (opts.reason === 'register') setMode('register');
    const i = await info(), list = i.providers || [];
    const box = body.querySelector('[data-prov]');
    if (!box || !document.body.contains(box)) return;
    codeOn = list.includes('emailcode');
    body.querySelector('[data-m="code"]').hidden = !codeOn;
    const btns = orderedProv(list);
    box.innerHTML = btns.length ? btns.map(([k, n2, svg]) => `<button type="button" class="lg-btn" data-p="${k}"><span class="lg-ic">${svg}</span><span>${esc(n2)}</span>${k === last ? `<span class="lg-last">${esc(t('acc.last', 'в прошлый раз'))}</span>` : ''}</button>`).join('') : `<p class="tiny muted">${esc(i.offline ? t('acc.e.offline', 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.') : t('acc.onlyEmail', 'Пока вход по почте и ключу доступа — кнопки Google, Яндекс, VK и Telegram скоро появятся.'))}</p>`;
    box.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { b.classList.add('busy'); startProvider(b.dataset.p); }));
    if (last === 'emailcode' && codeOn) setMode('code');
    // ключи доступа подсказываются прямо в поле почты (автозаполнение браузера)
    if (pkSupported() && window.PublicKeyCredential.isConditionalMediationAvailable) {
      window.PublicKeyCredential.isConditionalMediationAvailable().then((yes) => { if (yes && document.body.contains(e)) passkeyLogin(true).catch(() => {}); }).catch(() => {});
    }
    oneTap();
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
  const planId = () => (A.user && A.user.plan && A.user.plan.id) || 'free';
  function paintHeader() {
    const slot = document.querySelector('[data-acct-slot]');
    if (!slot) return;
    if (!enabled()) { slot.innerHTML = ''; return; }
    const pid = planId();
    if (!loggedIn()) slot.innerHTML = `<button class="btn sm acct-login" type="button" data-login>${icon('login', 'sm')}<span>${esc(t('acc.login', 'Войти'))}</span></button>`;
    else slot.innerHTML = `<button class="acct-btn" type="button" data-acct aria-label="${esc(t('acc.menu', 'Аккаунт'))}" title="${esc((A.user && (A.user.name || A.user.email)) || '')}">${avatarHTML(A.user, 32)}<i class="sync-dot s-${status}"></i>${pid !== 'free' ? `<b class="acct-plan pl-b-${pid}">${esc(pid === 'vip' ? 'VIP' : root.NPlans ? root.NPlans.NAME(pid) : pid)}</b>` : ''}</button>`;
    const lb = slot.querySelector('[data-login]'); if (lb) lb.addEventListener('click', () => open({}));
    const ab = slot.querySelector('[data-acct]'); if (ab) ab.addEventListener('click', menu);
  }
  function menu() {
    const u = A.user || {};
    const body = UI.sheet(`<div class="stack"><div class="row" style="gap:12px;flex-wrap:nowrap">${avatarHTML(u, 48)}<div class="stack s6" style="min-width:0"><b>${esc(u.name || t('acc.noName', 'Без имени'))}</b><span class="small muted" style="overflow-wrap:anywhere">${esc(u.email || (u.providers || []).map(provName).join(', '))}</span></div></div>
      <div data-acct-status>${statusHTML()}</div>
      ${root.NPlans ? `<div data-menu-plan>${root.NPlans.nowHTML() || `<a class="pl-now pl-b-free" href="#plans" data-close-go><span class="pl-now-ic">${icon('diamond')}</span><span class="stack s6"><b>${esc(t('sub.free', 'Тариф: Бесплатно'))}</b><span class="small muted">${esc(t('sub.upgrade', 'Год вперёд, профи-режим и ректификация — в платных тарифах'))}</span></span></a>`}</div>` : ''}
      <div class="row"><button class="btn sm" data-sync>${icon('refresh', 'sm')} ${esc(t('acc.syncNow', 'Синхронизировать'))}</button><a class="btn sm" href="#settings" data-close-go>${icon('settings', 'sm')} ${esc(t('acc.settings', 'Настройки аккаунта'))}</a><a class="btn sm" href="#plans" data-close-go>${icon('diamond', 'sm')} ${esc(t('nav.plans', 'Тарифы'))}</a><button class="btn sm" data-out>${icon('logout', 'sm')} ${esc(t('acc.out', 'Выйти'))}</button></div></div>`, { title: t('acc.menu', 'Аккаунт') });
    body.querySelector('[data-sync]').addEventListener('click', () => syncNow(true));
    body.querySelectorAll('[data-close-go]').forEach((a) => a.addEventListener('click', UI.closeSheet));
    body.querySelector('[data-out]').addEventListener('click', logout);
    if (root.NPlans) root.NPlans.bind(body);
  }
  /** Карточка «Аккаунт» в настройках: тариф, способы входа, ключи доступа, пароль. */
  async function settingsCard(box) {
    if (!box) return;
    if (!enabled()) { box.innerHTML = ''; return; }
    if (!loggedIn()) {
      box.innerHTML = `<div class="card stack acct-card"><h3>${icon('account')} ${esc(t('acc.card', 'Аккаунт'))}</h3><div>${statusHTML()}</div><p class="small muted">${esc(t('acc.guestP2', 'Сейчас карточки хранятся только в этом браузере, и без входа можно сохранить одну. Войдите по ключу доступа, через Google, Яндекс, VK, Telegram, Apple или почту — данные сохранятся в аккаунте и будут на всех устройствах.'))}</p><div class="row"><button class="btn primary" data-login>${icon('login', 'sm')} ${esc(t('acc.login', 'Войти'))}</button><button class="btn" data-reg>${icon('user-plus', 'sm')} ${esc(t('acc.tReg', 'Регистрация'))}</button></div></div><div data-plan-card></div>`;
      box.querySelector('[data-login]').addEventListener('click', () => open({}));
      box.querySelector('[data-reg]').addEventListener('click', () => open({ reason: 'register' }));
      if (root.NPlans) root.NPlans.settingsCard(box.querySelector('[data-plan-card]'));
      return;
    }
    let u = A.user || {};
    try { const r = await api('/me'); u = r.user; A.user = u; saveA(); paintHeader(); } catch (e) { /* покажем что есть */ }
    const list = await providers();
    const linked = new Set(u.providers || []);
    const canLink = PROV().filter(([k]) => ['google', 'yandex', 'vk', 'telegram', 'apple'].includes(k) && list.includes(k) && !linked.has(k));
    let pks = [];
    if (u.passkeys) { try { pks = (await api('/me/passkeys')).passkeys || []; } catch (e) { pks = []; } }
    const ways = linked.size + (u.hasPassword ? 1 : 0) + pks.length;
    box.innerHTML = `<div data-plan-card></div><div class="card stack acct-card"><h3>${icon('account')} ${esc(t('acc.card', 'Аккаунт'))}</h3>
      <div class="row" style="gap:12px;flex-wrap:nowrap">${avatarHTML(u, 52)}<div class="stack s6" style="min-width:0"><b>${esc(u.name || t('acc.noName', 'Без имени'))}</b><span class="small muted" style="overflow-wrap:anywhere">${esc(u.email || '')}${u.email && !u.emailVerified ? ' · ' + esc(t('acc.unverified', 'почта не подтверждена')) : ''}</span></div></div>
      <div data-acct-status>${statusHTML()}</div>
      <div class="stack s6"><span class="label">${esc(t('acc.ways', 'Способы входа'))}</span><div class="tags">${PROV().filter(([k]) => linked.has(k)).map(([k, n, svg]) => `<span class="tag lg-tag"><span class="lg-ic sm">${svg}</span>${esc(n)}${ways > 1 ? `<button class="x" type="button" data-unlink="${k}" aria-label="${esc(t('acc.unlink', 'Отвязать'))}">${icon('close', 'xs')}</button>` : ''}</span>`).join('')}${u.hasPassword ? `<span class="tag lg-tag">${icon('mail', 'xs')} ${esc(t('acc.byPw', 'Почта и пароль'))}</span>` : ''}</div>
        ${canLink.length ? `<div class="row">${canLink.map(([k, n, svg]) => `<button class="btn sm" data-link="${k}"><span class="lg-ic sm">${svg}</span> ${esc(t('acc.linkX', 'Привязать {p}', { p: n }))}</button>`).join('')}</div>` : ''}</div>
      <div class="stack s6 pk-box"><span class="label">${icon('fingerprint', 'xs')} ${esc(t('acc.pkList', 'Ключи доступа'))}</span>
        ${pks.length ? `<div class="pk-list">${pks.map((k) => `<div class="pk-row"><span class="pk-ic">${icon('fingerprint', 'sm')}</span><span class="stack s6" style="min-width:0"><b>${esc(k.name || t('acc.pkDevice', 'Это устройство'))}</b><span class="tiny muted">${esc(t('acc.pkMade', 'создан {d}', { d: fmtMs(k.created) }))}${k.lastUsed ? ' · ' + esc(t('acc.pkUsed', 'вход {d}', { d: fmtMs(k.lastUsed) })) : ''}</span></span>${ways > 1 ? `<button class="iconbtn" type="button" data-pkdel="${esc(k.id)}" aria-label="${esc(t('acc.pkDel', 'Удалить ключ'))}">${icon('trash', 'sm')}</button>` : ''}</div>`).join('')}</div>` : `<p class="small muted">${esc(t('acc.pkNone', 'Входите по отпечатку, Face ID или Windows Hello — без пароля и писем.'))}</p>`}
        ${pkSupported() ? `<div class="row"><button class="btn sm" data-pkadd>${icon('fingerprint', 'sm')} ${esc(t('acc.pkAdd', 'Добавить ключ доступа'))}</button></div>` : ''}</div>
      <details class="acc-pw"><summary class="small">${icon('key', 'xs')} ${esc(u.hasPassword ? t('acc.pwChange', 'Сменить пароль') : t('acc.pwSet', 'Добавить вход по почте и паролю'))}</summary>
        <form class="stack" style="margin-top:10px" data-pwform novalidate>${u.email ? '' : `<div class="field"><label for="ape">${esc(t('acc.email', 'Почта'))}</label><input class="input" id="ape" type="email" autocomplete="email"></div>`}<div class="field"><label for="app">${esc(t('acc.pwNew', 'Новый пароль'))}</label><input class="input" id="app" type="password" autocomplete="new-password" minlength="8"></div><p class="lg-err small" hidden></p><button class="btn sm primary" type="submit">${esc(t('f.save', 'Сохранить'))}</button></form></details>
      <div class="row"><button class="btn sm" data-sync>${icon('refresh', 'sm')} ${esc(t('acc.syncNow', 'Синхронизировать'))}</button><button class="btn sm" data-out>${icon('logout', 'sm')} ${esc(t('acc.out', 'Выйти'))}</button><button class="btn sm danger" data-del>${icon('trash', 'sm')} ${esc(t('acc.del', 'Удалить аккаунт'))}</button></div></div>`;
    if (root.NPlans) root.NPlans.settingsCard(box.querySelector('[data-plan-card]'));
    box.querySelector('[data-sync]').addEventListener('click', () => syncNow(true));
    box.querySelector('[data-out]').addEventListener('click', logout);
    box.querySelector('[data-del]').addEventListener('click', deleteAccount);
    box.querySelectorAll('[data-link]').forEach((b) => b.addEventListener('click', () => linkProvider(b.dataset.link)));
    box.querySelectorAll('[data-unlink]').forEach((b) => b.addEventListener('click', async () => { try { const r = await api('/me/identity/' + b.dataset.unlink, { method: 'DELETE' }); A.user = r.user; saveA(); settingsCard(box); } catch (e) { UI.toast(errText(e)); } }));
    box.querySelectorAll('[data-pkdel]').forEach((b) => b.addEventListener('click', async () => { try { const r = await api('/me/passkey/' + b.dataset.pkdel, { method: 'DELETE' }); A.user = r.user; saveA(); UI.toast(t('acc.pkDelOk', 'Ключ удалён. Не забудьте убрать его и в настройках устройства')); settingsCard(box); } catch (e) { UI.toast(errText(e)); } }));
    const add = box.querySelector('[data-pkadd]');
    if (add) add.addEventListener('click', async () => { add.disabled = true; try { await passkeyAdd(); UI.toast(t('acc.pkOk', 'Ключ доступа сохранён — в следующий раз войдёте в одно касание')); settingsCard(box); } catch (e) { if (!pkCancelled(e)) UI.toast(errText(e)); add.disabled = false; } });
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
  const fmtMs = (ms) => { const d = new Date(ms); return UI.fmtDate(d.getFullYear(), d.getMonth() + 1, d.getDate()); };

  // ---------- лимит карточек: без входа — guestLimit, в аккаунте — по тарифу ----------
  function canAdd() {
    if (!enabled()) return true;
    const n = S.people().length;
    if (!loggedIn()) return n < (CFG().guestLimit || 1);
    return !root.NPlans || n < root.NPlans.peopleLimit();
  }
  /** Перед добавлением новой карточки: true — можно; иначе открывает вход или тарифы и возвращает false. */
  function gateAdd() { if (canAdd()) return true; if (!loggedIn()) open({ reason: 'more' }); else if (root.NPlans) root.NPlans.gate('people'); return false; }

  // ---------- возврат с сайта входа (#login=… / #login_error=…) ----------
  (function readHash() {
    const h = location.hash || '';
    const code = /[#&]login=([A-Za-z0-9_-]{20,})/.exec(h), er = /[#&]login_error=([a-z_]+)/.exec(h), lk = /[#&]linked=([a-z]+)/.exec(h);
    if (code || er) {
      if (code) pendingCode = code[1]; if (er) pendingErr = er[1]; if (lk) linkedNote = lk[1];
      let back = ''; try { back = sessionStorage.getItem(AFTER) || ''; sessionStorage.removeItem(AFTER); } catch (e) { back = ''; }
      if (/login/.test(back)) back = '';
      history.replaceState(null, '', location.pathname + location.search + (back || (S.people().length ? '#today' : '#horoscope')));
    } else if (/^#(login|register)\b/.test(h)) {
      pendingOpen = /^#register/.test(h) ? 'register' : 'login';
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
        else await afterLogin(res, null);
      } catch (e) { UI.toast(errText(e)); }
      return;
    }
    if (pendingOpen) { const r = pendingOpen; pendingOpen = false; setTimeout(() => open({ reason: r === 'register' ? 'register' : '' }), 200); }
    if (loggedIn()) { syncNow(false); refresh().catch(() => {}); }
  }

  root.NAccount = { open, gateAdd, canAdd, loggedIn, enabled, user: () => A.user || null, paintHeader, settingsCard, syncNow, push, logout, status: () => status, boot, api, info, refresh, oneTap, _merge: merge, _pwHash: pwHash };
})(window);
