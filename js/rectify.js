/* Ректификация по событиям жизни: перебираем время рождения в окне и считаем, насколько каждое время
   «объясняет» события — по углам и куспидам домов, которые зависят от времени.
   Методы: дирекции солнечной дуги (планета → угол/куспид и угол → планета), транзиты медленных планет и Марса,
   прогрессивная Луна, затмения. Вес — по теме события (брак → 7 дом и Венера, переезд → 4 дом и Луна…),
   по точности даты и важности. Проверка на случайность: та же биография, сдвинутая целиком на случайный срок.
   NRect.run(opts) → результат; NRect.control(opts, res, n) → доля случайных сдвигов с пиком не ниже. Без интерфейса. */
(function (root) {
  'use strict';
  const AC = root.AstroCore;
  const DAY = 86400000, YEAR = 365.2422 * DAY;
  const norm = (x) => ((x % 360) + 360) % 360;
  const d180 = (x) => { const v = norm(x); return v > 180 ? v - 360 : v; };
  const PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const TRANSIT = { jupiter: [1.5, 1], saturn: [1.5, 1], uranus: [1.2, 1], neptune: [1, 0.9], pluto: [1, 1], mars: [1, 0.45] }; // [орбис, вес]
  const W = { sa: 3, saAng: 3, tr: 2, pm: 1.6, ecl: 1.1 };
  const ASP_SA = [[0, 1], [180, 0.8], [90, 0.6]];
  const ASP_TR = [[0, 1], [180, 0.7], [90, 0.6]];
  // темы событий: какие дома (куспиды) и планеты ими «ведают»
  const ALLP = (v) => Object.fromEntries(PLANETS.map((p) => [p, v]));
  const TYPES = {
    marriage: { cusps: { 7: 1, 5: 0.5, 1: 0.5, 10: 0.35, 4: 0.3 }, planets: { venus: 1, jupiter: 0.8, sun: 0.7, moon: 0.7, saturn: 0.6, mars: 0.5, uranus: 0.5, pluto: 0.4, neptune: 0.4, mercury: 0.3 } },
    relation: { cusps: { 5: 1, 7: 0.8, 1: 0.5 }, planets: { venus: 1, mars: 0.8, moon: 0.7, jupiter: 0.6, uranus: 0.6, sun: 0.5, pluto: 0.5, neptune: 0.5, mercury: 0.3, saturn: 0.3 } },
    breakup: { cusps: { 7: 1, 1: 0.6, 8: 0.4, 5: 0.4 }, planets: { uranus: 0.9, saturn: 0.9, pluto: 0.8, mars: 0.7, venus: 0.6, neptune: 0.5, moon: 0.4, sun: 0.4, mercury: 0.3, jupiter: 0.3 } },
    child: { cusps: { 5: 1, 4: 0.6, 1: 0.4, 11: 0.3 }, planets: { jupiter: 1, moon: 0.9, venus: 0.7, sun: 0.6, saturn: 0.4, uranus: 0.4, mars: 0.4, mercury: 0.3, pluto: 0.3, neptune: 0.3 } },
    move: { cusps: { 4: 1, 1: 0.6, 3: 0.5, 9: 0.5, 10: 0.3 }, planets: { moon: 1, uranus: 0.9, jupiter: 0.6, saturn: 0.6, mercury: 0.5, pluto: 0.5, mars: 0.4, neptune: 0.4, sun: 0.4, venus: 0.3 } },
    career: { cusps: { 10: 1, 6: 0.5, 1: 0.4, 2: 0.3 }, planets: { sun: 1, saturn: 0.9, jupiter: 0.9, mars: 0.6, pluto: 0.6, uranus: 0.5, mercury: 0.4, venus: 0.3, moon: 0.3, neptune: 0.3 } },
    money: { cusps: { 2: 1, 8: 0.7, 10: 0.4, 11: 0.3 }, planets: { venus: 0.9, jupiter: 0.9, pluto: 0.7, saturn: 0.6, uranus: 0.5, sun: 0.4, mercury: 0.4, moon: 0.3, mars: 0.3, neptune: 0.3 } },
    study: { cusps: { 9: 1, 3: 0.6, 10: 0.4 }, planets: { jupiter: 1, mercury: 1, saturn: 0.5, sun: 0.4, uranus: 0.4, moon: 0.3, venus: 0.3, mars: 0.3, neptune: 0.3, pluto: 0.3 } },
    loss: { cusps: { 8: 1, 4: 0.7, 12: 0.5, 1: 0.4 }, planets: { saturn: 1, pluto: 0.9, neptune: 0.6, mars: 0.6, moon: 0.5, uranus: 0.5, sun: 0.4, venus: 0.3, mercury: 0.3, jupiter: 0.3 } },
    health: { cusps: { 1: 1, 6: 0.8, 12: 0.7, 8: 0.4 }, planets: { mars: 0.9, saturn: 0.9, neptune: 0.7, pluto: 0.7, uranus: 0.6, moon: 0.4, sun: 0.4, mercury: 0.3, venus: 0.3, jupiter: 0.3 } },
    accident: { cusps: { 1: 1, 8: 0.7, 3: 0.4, 10: 0.3 }, planets: { mars: 1, uranus: 1, pluto: 0.7, saturn: 0.6, moon: 0.3, sun: 0.3, mercury: 0.3, neptune: 0.3, venus: 0.2, jupiter: 0.2 } },
    travel: { cusps: { 9: 1, 3: 0.6, 4: 0.4 }, planets: { jupiter: 1, uranus: 0.6, mercury: 0.6, moon: 0.5, sun: 0.4, venus: 0.3, mars: 0.3, saturn: 0.3, neptune: 0.3, pluto: 0.3 } },
    other: { cusps: { 1: 0.7, 10: 0.7, 4: 0.6, 7: 0.6 }, planets: ALLP(0.6) },
  };
  // точность даты: окно вокруг даты (дней), шаг, вес
  const PREC = { day: [0, 1, 1], week: [3, 1, 0.9], month: [15, 3, 0.75], season: [45, 6, 0.55], year: [182, 12, 0.3] };

  const lonAt = (id, date) => AC.body(id, date).lon;
  const close = (diff, orb) => { const x = Math.abs(diff) / orb; return x >= 1 ? 0 : (1 - x) * (1 - x); };

  /** Опорные значения события (не зависят от перебираемого времени): дни окна, дуга, прогр. Луна, транзиты, затмения. */
  function prepEvent(e, base, shiftDays, eclipses) {
    const [half, step, pw] = PREC[e.prec] || PREC.day;
    const mid = new Date(Date.UTC(e.y, e.mo - 1, e.d, 12) + (shiftDays || 0) * DAY);
    const sunN = lonAt('sun', base), moonSpeed = AC.body('moon', base).speed || 13.2;
    const days = [];
    for (let k = -half; k <= half; k += step) {
      const s = new Date(mid.getTime() + k * DAY);
      const age = (s - base) / YEAR;
      if (age <= 0) continue;
      const prog = new Date(base.getTime() + age * DAY);
      const arc = norm(lonAt('sun', prog) - sunN);
      const pm = lonAt('moon', prog);
      const tr = {}; for (const id of Object.keys(TRANSIT)) tr[id] = lonAt(id, s);
      const ecl = eclipses.filter((x) => x.date <= s && s - x.date < 183 * DAY).map((x) => ({ lon: x.lon, kind: x.kind }));
      days.push({ s, arc, pm, tr, ecl });
    }
    return { e, days, w: pw * (e.weight || 1), moonSpeed, topic: TYPES[e.type] || TYPES.other };
  }

  /** Оценка одного кандидата на одном событии; detail — собрать «почему». */
  function scoreEvent(cand, pe, detail) {
    const { cusps, lons, dtDays } = cand, topic = pe.topic;
    let best = 0, bestHits = null;
    const hs = Object.entries(topic.cusps).map(([h, r]) => [+h, r, cusps[+h - 1]]);
    for (const day of pe.days) {
      // противоположные куспиды — одна ось (MC и IC, ASC и DSC…): попадание на ось считаем один раз — по лучшему
      const byKey = new Map();
      const add = (v, h) => { if (v <= 0) return; const k = h.m + h.P + ((h.h - 1) % 6); const o = byKey.get(k); if (!o || o.v < v) byKey.set(k, Object.assign({ v }, h)); };
      // дуги: планета → куспид
      for (const P of PLANETS) {
        const rp = topic.planets[P] || 0.3, pl = norm(lons[P] + day.arc);
        for (const [h, rh, c] of hs) for (const [ang, aw] of ASP_SA) {
          const diff = d180(pl - c - ang); if (ang && ang !== 180) { const d2 = d180(pl - c + ang); if (Math.abs(d2) < Math.abs(diff)) { add(W.sa * rh * rp * aw * close(d2, 1), { m: 'sa', P, h, ang, orb: Math.abs(d2) }); continue; } }
          add(W.sa * rh * rp * aw * close(diff, 1), { m: 'sa', P, h, ang, orb: Math.abs(diff) });
        }
      }
      // дуги: Асцендент и MC → планета
      for (const [h, ra] of [[1, topic.cusps[1] || 0.4], [10, topic.cusps[10] || 0.4]]) {
        const a = norm(cusps[h - 1] + day.arc);
        for (const P of PLANETS) {
          const rp = topic.planets[P] || 0.3;
          for (const [ang, aw] of ASP_SA) {
            let diff = d180(a - lons[P] - ang); if (ang === 90) { const d2 = d180(a - lons[P] + 90); if (Math.abs(d2) < Math.abs(diff)) diff = d2; }
            add(W.saAng * ra * rp * aw * close(diff, 1), { m: 'saAng', P, h, ang, orb: Math.abs(diff) });
          }
        }
      }
      // транзиты к куспидам
      for (const [T, [orb, tw]] of Object.entries(TRANSIT)) {
        const rp = topic.planets[T] || 0.3, l = day.tr[T];
        for (const [h, rh, c] of hs) for (const [ang, aw] of ASP_TR) {
          let diff = d180(l - c - ang); if (ang === 90) { const d2 = d180(l - c + 90); if (Math.abs(d2) < Math.abs(diff)) diff = d2; }
          add(W.tr * tw * rh * (0.5 + 0.5 * rp) * aw * close(diff, orb), { m: 'tr', P: T, h, ang, orb: Math.abs(diff) });
        }
      }
      // прогрессивная Луна (сдвигается вместе со временем рождения)
      const pm = norm(day.pm + pe.moonSpeed * dtDays);
      for (const [h, rh, c] of hs) for (const [ang, aw] of [[0, 1], [180, 0.7], [90, 0.5]]) {
        let diff = d180(pm - c - ang); if (ang === 90) { const d2 = d180(pm - c + 90); if (Math.abs(d2) < Math.abs(diff)) diff = d2; }
        add(W.pm * rh * aw * close(diff, 1), { m: 'pm', P: 'moon', h, ang, orb: Math.abs(diff) });
      }
      // затмения на куспидах (ось затмения — обе стороны)
      for (const x of day.ecl) for (const [h, rh, c] of hs) {
        const diff = Math.min(Math.abs(d180(x.lon - c)), Math.abs(d180(x.lon + 180 - c)));
        add(W.ecl * rh * close(diff, 3), { m: 'ecl', P: x.kind, h, ang: 0, orb: diff });
      }
      let sc = 0; for (const x of byKey.values()) sc += x.v;
      if (sc > best) { best = sc; bestHits = detail ? [...byKey.values()] : null; }
    }
    return { v: best * pe.w, hits: bestHits ? bestHits.sort((a, b) => b.v - a.v).slice(0, 6) : null };
  }

  /** Кандидаты времени: углы и куспиды по времени, планеты — линейно от опорного момента. */
  function candidates(o) {
    const out = [];
    const base = AC.localToUTC(o.y, o.mo, o.d, o.h0, o.m0, o.tz).date;
    const refB = {}; for (const P of PLANETS) { const b = AC.body(P, base); refB[P] = [b.lon, b.speed || 0]; }
    for (let m = o.from; m <= o.to; m += o.step) {
      const h = Math.floor(m / 60), mi = m % 60;
      const date = AC.localToUTC(o.y, o.mo, o.d, h, mi, o.tz).date;
      const dtDays = (date - base) / DAY;
      const hs = AC.houses(date, o.lat, o.lon, o.hs || 'placidus');
      const lons = {}; for (const P of PLANETS) lons[P] = norm(refB[P][0] + refB[P][1] * dtDays);
      out.push({ min: m, h, mi, date, dtDays, cusps: hs.cusps, asc: hs.asc, mc: hs.mc, lons });
    }
    return { list: out, base };
  }

  function eclipsesFor(events, shiftDays) {
    if (!events.length) return [];
    const ds = events.map((e) => Date.UTC(e.y, e.mo - 1, e.d) + (shiftDays || 0) * DAY);
    const from = new Date(Math.min(...ds) - 240 * DAY), to = new Date(Math.max(...ds) + 60 * DAY);
    return AC.eclipses(from, to).map((x) => ({ date: x.date, lon: x.lon, kind: x.type === 'solar' ? 'solarEcl' : 'lunarEcl' }));
  }

  function scoreAll(cands, events, base, shiftDays) {
    const ecl = eclipsesFor(events, shiftDays);
    const pre = events.map((e) => prepEvent(e, base, shiftDays, ecl));
    return cands.map((c) => { let s = 0; const per = pre.map((pe) => { const r = scoreEvent(c, pe, false).v; s += r; return r; }); return { s, per }; });
  }

  /**
   * opts: { y, mo, d, h0, m0 (время из профиля), tz, lat, lon, hs, from, to, step (минуты суток), events:[{y,mo,d,prec,type,weight,label}] }
   * → { cands:[{min,h,mi,score,rel,asc,mc,per:[]}], top:[…с подробностями], max }
   */
  function run(o) {
    const { list, base } = candidates(o);
    const sc = scoreAll(list, o.events, base, 0);
    const max = Math.max(1e-9, ...sc.map((x) => x.s));
    const cands = list.map((c, i) => ({ min: c.min, h: c.h, mi: c.mi, date: c.date, asc: c.asc, mc: c.mc, score: sc[i].s, rel: sc[i].s / max, per: sc[i].per }));
    // вершины: локальные максимумы, не ближе 6 минут друг к другу
    const peaks = [];
    cands.forEach((c, i) => { const l = cands[i - 1], r = cands[i + 1]; if ((!l || c.score >= l.score) && (!r || c.score >= r.score) && c.score > 0) peaks.push(c); });
    peaks.sort((a, b) => b.score - a.score);
    const top = [];
    for (const p of peaks) { if (top.every((x) => Math.abs(x.min - p.min) >= Math.max(6, o.step * 2))) top.push(p); if (top.length >= 5) break; }
    // подробности для вершин
    const ecl = eclipsesFor(o.events, 0);
    const pre = o.events.map((e) => prepEvent(e, base, 0, ecl));
    for (const t of top) { const c = list.find((x) => x.min === t.min); t.why = pre.map((pe, ei) => ({ ei, r: scoreEvent(c, pe, true) })); }
    // ширина пика: минуты, где оценка ≥ 90% вершины
    for (const t of top) { let a = t.min, b = t.min; const by = new Map(cands.map((c) => [c.min, c])); while (by.has(a - o.step) && by.get(a - o.step).score >= 0.9 * t.score) a -= o.step; while (by.has(b + o.step) && by.get(b + o.step).score >= 0.9 * t.score) b += o.step; t.win = [a, b]; }
    return { cands, top, max, base };
  }

  /** Проверка на случайность: вся биография сдвинута на случайный срок (±1…6 лет) n раз; доля сдвигов с пиком не ниже настоящего. */
  async function control(o, res, n, onProgress) {
    const { list, base } = candidates(o);
    let seed = 20261012; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let ge = 0; const maxes = [];
    for (let i = 0; i < n; i++) {
      const sh = Math.round((365 + rnd() * 1825) * (rnd() < 0.5 ? -1 : 1));
      const sc = scoreAll(list, o.events, base, sh);
      const m = Math.max(...sc.map((x) => x.s)); maxes.push(m);
      if (m >= res.max) ge++;
      if (onProgress) onProgress((i + 1) / n);
      await new Promise((r) => setTimeout(r, 0));
    }
    return { n, ge, p: (ge + 1) / (n + 1), maxes };
  }

  /** «Почему» для любого времени окна (минуты суток): оценка и попадания по каждому событию. */
  function explain(o, minute) {
    const one = Object.assign({}, o, { from: minute, to: minute, step: 1 });
    const { list, base } = candidates(one);
    const ecl = eclipsesFor(o.events, 0);
    const pre = o.events.map((e) => prepEvent(e, base, 0, ecl));
    const c = list[0];
    const why = pre.map((pe, ei) => ({ ei, r: scoreEvent(c, pe, true) }));
    return { min: c.min, h: c.h, mi: c.mi, date: c.date, asc: c.asc, mc: c.mc, score: why.reduce((s, w) => s + w.r.v, 0), why };
  }

  root.NRect = { run, control, explain, TYPES, PREC, W };
})(typeof window !== 'undefined' ? window : globalThis);
