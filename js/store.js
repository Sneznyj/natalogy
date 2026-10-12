/* Хранилище в браузере: люди (данные рождения), настройки, сохранённые карты.
   Всё лежит только на устройстве. Чтение и запись обёрнуты в try/catch: в приватном режиме хранилище может быть недоступно. */
(function (root) {
  'use strict';
  const KEY = 'natalogy:v1';
  let mem = null;
  const empty = () => ({ people: [], activeId: null, settings: { lang: null, theme: 'system', houseSystem: 'placidus', here: null, aiConsent: false, mode: 'simple', orbs: 1 }, saved: [], ask: { day: '', used: 0 }, deviceId: null });
  function load() {
    if (mem) return mem;
    try { const raw = localStorage.getItem(KEY); mem = raw ? Object.assign(empty(), JSON.parse(raw)) : empty(); } catch (e) { mem = empty(); }
    mem.settings = Object.assign(empty().settings, mem.settings || {});
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
      s.saved = s.saved.filter((c) => !(c.a === id || c.b === id));
      save(); emit('people');
    },
    settings() { return load().settings; },
    set(k, v) { load().settings[k] = v; save(); emit('settings:' + k); },
    saved() { return load().saved; },
    saveChart(c) { const s = load(); c.id = c.id || 'c' + rid(); c.at = Date.now(); s.saved = [c].concat(s.saved.filter((x) => x.id !== c.id)).slice(0, 200); save(); emit('saved'); return c.id; },
    removeChart(id) { const s = load(); s.saved = s.saved.filter((x) => x.id !== id); save(); emit('saved'); },
    askUsed(day) { const a = load().ask; return a.day === day ? a.used : 0; },
    askInc(day) { const s = load(); if (s.ask.day !== day) s.ask = { day, used: 0 }; s.ask.used++; save(); },
    deviceId() { return load().deviceId; },
    exportJSON() { const s = load(); return JSON.stringify({ app: 'natalogy', v: 1, people: s.people, saved: s.saved, settings: s.settings }, null, 1); },
    importJSON(text) {
      const d = JSON.parse(text);
      if (!d || d.app !== 'natalogy' || !Array.isArray(d.people)) throw new Error('bad file');
      const s = load();
      for (const p of d.people) { if (!s.people.some((x) => x.id === p.id)) s.people.push(p); }
      for (const c of d.saved || []) { if (!s.saved.some((x) => x.id === c.id)) s.saved.push(c); }
      if (!s.activeId && s.people[0]) s.activeId = s.people[0].id;
      save(); emit('people');
      return d.people.length;
    },
    wipe() { mem = empty(); save(); emit('people'); },
  };
  root.NStore = S;
})(window);
