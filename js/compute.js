/* Расчёты с кэшем: месяц оценок дней для человека, подробности дня. Тяжёлое считаем частями, чтобы не замирал интерфейс. */
(function (root) {
  'use strict';
  const AC = root.AstroCore, NS = root.NScore, UI = root.NUI;
  const months = new Map();
  const evCache = new Map();
  const tick = () => new Promise((r) => setTimeout(r, 0));
  function key(p, y, mo, tz) { return [p.id, p.y, p.mo, p.d, p.h, p.mi, p.timeKnown, p.place && p.place.lat, y, mo, tz, root.NStore.settings().houseSystem].join('|'); }
  function events(y, mo, tz) {
    const k = y + '-' + mo + '-' + tz;
    if (evCache.has(k)) return evCache.get(k);
    const starts = NS.dayStarts(y, mo, 1, UI.daysIn(y, mo) + 1, tz);
    const ev = NS.skyEvents(starts[0].start, starts[starts.length - 1].start);
    evCache.set(k, ev);
    if (evCache.size > 24) evCache.delete(evCache.keys().next().value);
    return ev;
  }
  /** Оценки всех дней месяца: Promise<[day]> */
  async function month(p, y, mo, tz) {
    const k = key(p, y, mo, tz);
    if (months.has(k)) return months.get(k);
    const natal = UI.chartOf(p);
    await tick();
    const ev = events(y, mo, tz);
    const n = UI.daysIn(y, mo), out = [];
    for (let d = 1; d <= n; d += 8) {
      out.push(...NS.days(natal, { tz, y, mo, d, days: Math.min(8, n - d + 1), events: ev }));
      await tick();
    }
    months.set(k, out);
    if (months.size > 30) months.delete(months.keys().next().value);
    return out;
  }
  async function day(p, y, mo, d, tz) {
    const list = await month(p, y, mo, tz);
    return list[d - 1];
  }
  /** Ближайшие N дней от даты (могут захватывать следующий месяц). */
  async function range(p, y, mo, d, n, tz) {
    const out = [];
    let cy = y, cm = mo, cd = d;
    while (out.length < n) {
      const list = await month(p, cy, cm, tz);
      out.push(...list.slice(cd - 1));
      cd = 1; cm++; if (cm > 12) { cm = 1; cy++; }
    }
    return out.slice(0, n);
  }
  /** Точные события суток (аспекты транзитов к карте, смена знаков, фазы, Луна без курса, стоянки) — с кэшем. */
  const evDays = new Map();
  function dayEvents(p, d, tz) {
    const k = key(p, d.y, d.mo, tz) + '|' + d.d;
    if (evDays.has(k)) return evDays.get(k);
    const r = NS.dayEvents(UI.chartOf(p), d, events(d.y, d.mo, tz));
    evDays.set(k, r);
    if (evDays.size > 500) evDays.delete(evDays.keys().next().value);
    return r;
  }
  /** Долгие транзиты и ретро на период — фон месяца. */
  const slowCache = new Map();
  function slow(p, from, to) {
    const k = [p.id, p.y, p.mo, p.d, p.h, p.mi, p.timeKnown, root.NStore.settings().houseSystem, from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)].join('|');
    if (slowCache.has(k)) return slowCache.get(k);
    const natal = UI.chartOf(p);
    const tr = AC.transits(natal, from, to, { transiting: ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'], natal: ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'asc', 'mc'] });
    const retro = AC.retrogradePeriods(['mercury', 'venus', 'mars'], AC.addDays(from, -60), AC.addDays(to, 60)).filter((r) => (r.shadowEnd || r.end) >= from && (r.shadowStart || r.start) <= to);
    const r = { transits: tr, retro };
    slowCache.set(k, r);
    if (slowCache.size > 12) slowCache.delete(slowCache.keys().next().value);
    return r;
  }
  function clear() { months.clear(); evDays.clear(); slowCache.clear(); }
  root.NStore.on((w) => { if (w === 'people' || String(w).startsWith('settings:')) clear(); });
  root.NCompute = { month, day, range, events, dayEvents, slow, clear };
})(window);
