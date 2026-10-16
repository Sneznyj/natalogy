/* Хранилище в браузере: люди (данные рождения), настройки, сохранённые карты.
   Без входа всё лежит только на устройстве; со входом js/account.js копирует это в облако аккаунта (syncDoc/applyDoc).
   У каждой карточки — время правки (updated), у удалённых — отметка в deleted: так при слиянии устройств ничего не воскресает.
   Чтение и запись обёрнуты в try/catch: в приватном режиме хранилище может быть недоступно. */
(function (root) {
  'use strict';
  const KEY = 'saliastro:v1', OLD_KEY = 'natalogy:v1'; // до 16.10.2026 данные лежали под старым рабочим названием — переносим при первом открытии
  let mem = null;
  const empty = () => ({ people: [], activeId: null, settings: { lang: null, theme: 'system', houseSystem: 'placidus', here: null, aiConsent: false, mode: 'simple', orbs: 1 }, saved: [], ask: { day: '', used: 0 }, deviceId: null, deleted: {}, settingsAt: 0 });
  // настройки, которые едут вместе с аккаунтом на другие устройства
  const SYNC_SETTINGS = ['lang', 'theme', 'houseSystem', 'here', 'aiConsent', 'mode', 'orbs', 'horoSign', 'orbTable'];
  function load() {
    if (mem) return mem;
    try { let raw = localStorage.getItem(KEY); if (!raw && (raw = localStorage.getItem(OLD_KEY))) localStorage.setItem(KEY, raw); mem = raw ? Object.assign(empty(), JSON.parse(raw)) : empty(); } catch (e) { mem = empty(); }
    mem.settings = Object.assign(empty().settings, mem.settings || {});
    if (!mem.deleted || typeof mem.deleted !== 'object') mem.deleted = {};
    if (!mem.deviceId) mem.deviceId = rid() + rid();
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* без хранилища работаем в памяти */ } }
  const rid = () => Math.random().toString(36).slice(2, 10);
  const listeners = new Set();
  const emit = (what) => { for (const f of listeners) try { f(what); } catch (e) { console.error(e); } };

  const S = {
    get state() { return load(); },
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    people() { return load().people; },
    person(id) { return load().people.find((p) => p.id === id) || null; },
    active() { const s = load(); return s.people.find((p) => p.id === s.activeId) || s.people[0] || null; },
    setActive(id) { load().activeId = id; save(); emit('active'); },
    upsertPerson(p) {
      const s = load();
      if (!p.id) p.id = 'p' + rid();
      p.updated = Date.now();
      const i = s.people.findIndex((x) => x.id === p.id);
      if (i >= 0) s.people[i] = Object.assign({}, s.people[i], p); else s.people.push(Object.assign({ created: Date.now() }, p));
      if (!s.activeId) s.activeId = p.id;
      save(); emit('people');
      return p.id;
    },
    removePerson(id) {
      const s = load();
      s.people = s.people.filter((p) => p.id !== id);
      if (s.activeId === id) s.activeId = s.people[0] ? s.people[0].id : null;
      for (const c of s.saved) if (c.a === id || c.b === id) s.deleted[c.id] = Date.now();
      s.saved = s.saved.filter((c) => !(c.a === id || c.b === id));
      s.deleted[id] = Date.now();
      save(); emit('people');
    },
    settings() { return load().settings; },
    set(k, v) { const s = load(); s.settings[k] = v; if (SYNC_SETTINGS.includes(k)) s.settingsAt = Date.now(); save(); emit('settings:' + k); },
    saved() { return load().saved; },
    saveChart(c) { const s = load(); c.id = c.id || 'c' + rid(); c.at = Date.now(); s.saved = [c].concat(s.saved.filter((x) => x.id !== c.id)).slice(0, 200); save(); emit('saved'); return c.id; },
    removeChart(id) { const s = load(); s.saved = s.saved.filter((x) => x.id !== id); s.deleted[id] = Date.now(); save(); emit('saved'); },
    askUsed(day) { const a = load().ask; return a.day === day ? a.used : 0; },
    askInc(day) { const s = load(); if (s.ask.day !== day) s.ask = { day, used: 0 }; s.ask.used++; save(); },
    deviceId() { return load().deviceId; },
    exportJSON() { const s = load(); return JSON.stringify({ app: 'saliastro', v: 1, people: s.people, saved: s.saved, settings: s.settings }, null, 1); },
    importJSON(text) {
      const d = JSON.parse(text);
      if (!d || (d.app !== 'saliastro' && d.app !== 'natalogy') || !Array.isArray(d.people)) throw new Error('bad file');
      const s = load();
      for (const p of d.people) { if (!s.people.some((x) => x.id === p.id)) s.people.push(p); }
      for (const c of d.saved || []) { if (!s.saved.some((x) => x.id === c.id)) s.saved.push(c); }
      if (!s.activeId && s.people[0]) s.activeId = s.people[0].id;
      save(); emit('people');
      return d.people.length;
    },
    wipe() { mem = empty(); save(); emit('people'); },
    /** Снимок для облака аккаунта. */
    syncDoc() {
      const s = load(), set = {};
      for (const k of SYNC_SETTINGS) if (s.settings[k] !== undefined) set[k] = s.settings[k];
      return { app: 'saliastro', v: 1, people: s.people, saved: s.saved, deleted: s.deleted, settings: set, settingsAt: s.settingsAt || 0, activeId: s.activeId };
    },
    /** Применить слитый снимок (после входа или с другого устройства). Без записи в историю правок. */
    applyDoc(d) {
      const s = load();
      s.people = Array.isArray(d.people) ? d.people : s.people;
      s.saved = Array.isArray(d.saved) ? d.saved : s.saved;
      s.deleted = d.deleted && typeof d.deleted === 'object' ? d.deleted : s.deleted;
      if (d.settings && (d.settingsAt || 0) > (s.settingsAt || 0)) { Object.assign(s.settings, d.settings); s.settingsAt = d.settingsAt; }
      s.activeId = s.people.some((p) => p.id === s.activeId) ? s.activeId : (s.people.some((p) => p.id === d.activeId) ? d.activeId : (s.people[0] || {}).id || null);
      save(); emit('sync');
    },
    /** Убрать все карточки с устройства (выход из аккаунта): настройки остаются. */
    clearPeople() { const s = load(); s.people = []; s.saved = []; s.deleted = {}; s.activeId = null; save(); emit('people'); },
  };
  root.NStore = S;
})(window);
