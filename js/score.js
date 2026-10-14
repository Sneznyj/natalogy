/* Персональная оценка дней по сферам жизни: транзиты к натальной карте + Луна по домам + общее небо
   (фаза Луны, Луна без курса, ретроградные планеты, затмения, стоянки).
   Ничего не знает об интерфейсе: возвращает числа и «причины» — тексты к ним даёт texts-*.js.
   Зависимости: AstroCore (engine/astro.js), ProAstro (engine/pro.js). */
(function (root) {
  'use strict';
  // какими домами карты управляет планета: знак на куспиде — её знак (современные и классические управители, как принято у нас)
  const CO_RULE = { sun: ['leo'], moon: ['cancer'], mercury: ['gemini', 'virgo'], venus: ['taurus', 'libra'], mars: ['aries', 'scorpio'], jupiter: ['sagittarius', 'pisces'], saturn: ['capricorn', 'aquarius'], uranus: ['aquarius'], neptune: ['pisces'], pluto: ['scorpio'] };
  const rulesOf = (id, cusps) => (cusps && CO_RULE[id] ? cusps.map((c, k) => [root.AstroCore.signOf(c), k + 1]).filter(([sg]) => CO_RULE[id].includes(sg)).map(([, h]) => h) : []);
  const AC = root.AstroCore, PRO = root.ProAstro;
  const { norm, d180, addDays } = AC;
  const DAY = 86400000, HOUR = 3600000;

  const SPHERES = ['love', 'money', 'career', 'launch', 'talk', 'energy', 'rest'];
  const T_IDS = ['moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const N_IDS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'asc', 'mc'];
  const ASPECTS = [[0, 'conj'], [60, 'sextile'], [90, 'square'], [120, 'trine'], [180, 'opp']];

  // сила транзитной планеты и важность натальной точки
  const W_T = { moon: 0.55, sun: 0.9, mercury: 0.8, venus: 0.95, mars: 1.0, jupiter: 1.25, saturn: 1.3, uranus: 1.05, neptune: 0.85, pluto: 1.05 };
  const I_N = { sun: 1.2, moon: 1.1, asc: 1.1, mc: 1.0, venus: 1.0, mars: 0.9, mercury: 0.9, jupiter: 0.7, saturn: 0.75 };
  const ORB = { moon: 3, sun: 2, mercury: 2, venus: 2, mars: 2.5, jupiter: 2.5, saturn: 2.5, uranus: 2, neptune: 2, pluto: 2 };
  // насколько планета/точка «отвечает» за сферу
  const REL = {
    love: { venus: 1, moon: 0.6, mars: 0.6, sun: 0.3, jupiter: 0.45, neptune: 0.4, pluto: 0.35, saturn: 0.3, mercury: 0.2, uranus: 0.3, asc: 0.35, mc: 0.1 },
    money: { venus: 0.9, jupiter: 1, saturn: 0.6, sun: 0.3, mercury: 0.5, moon: 0.3, mars: 0.3, pluto: 0.5, uranus: 0.35, neptune: 0.25, mc: 0.5, asc: 0.2 },
    career: { sun: 0.8, saturn: 1, jupiter: 0.7, mars: 0.6, mercury: 0.5, mc: 1, pluto: 0.4, uranus: 0.4, venus: 0.3, moon: 0.3, asc: 0.5, neptune: 0.2 },
    launch: { sun: 0.7, mars: 0.8, jupiter: 0.85, uranus: 0.7, mercury: 0.65, moon: 0.5, mc: 0.7, asc: 0.85, saturn: 0.45, venus: 0.45, pluto: 0.3, neptune: 0.15 },
    talk: { mercury: 1, moon: 0.45, jupiter: 0.5, venus: 0.4, uranus: 0.35, saturn: 0.3, sun: 0.3, mars: 0.35, asc: 0.3, neptune: 0.25, pluto: 0.25, mc: 0.2 },
    energy: { mars: 1, sun: 0.9, moon: 0.7, saturn: 0.5, asc: 0.9, jupiter: 0.35, pluto: 0.45, uranus: 0.35, neptune: 0.45, venus: 0.2, mercury: 0.2, mc: 0.1 },
    rest: { venus: 0.75, neptune: 0.85, moon: 0.75, sun: 0.55, jupiter: 0.55, mercury: 0.2, mars: 0.25, saturn: 0.3, uranus: 0.35, pluto: 0.2, asc: 0.3, mc: 0.1 },
  };
  // дома, которые ведают сферой: управители этих домов в карте человека — его личные показатели
  const SPHERE_HOUSES = { love: [5, 7], money: [2, 8], career: [10, 6], launch: [1, 10], talk: [3, 9], energy: [1, 6], rest: [5, 12] };
  // Луна, проходящая дом карты, подсвечивает сферы
  const MOON_HOUSE = {
    1: { energy: 0.4, launch: 0.3 }, 2: { money: 0.5 }, 3: { talk: 0.5 }, 4: { rest: 0.4, launch: -0.15 },
    5: { love: 0.45, rest: 0.45 }, 6: { career: 0.2, energy: 0.15 }, 7: { love: 0.5, talk: 0.2 }, 8: { money: 0.2, launch: -0.25, rest: -0.1 },
    9: { talk: 0.35, launch: 0.2 }, 10: { career: 0.6, launch: 0.15 }, 11: { talk: 0.3, launch: 0.2, love: 0.1 }, 12: { rest: 0.35, launch: -0.5, energy: -0.3, career: -0.15 },
  };

  function valence(T, aspect, sphere) {
    if (aspect === 'trine') return ({ saturn: 0.8, pluto: 0.8, neptune: 0.7, uranus: 0.9 })[T] || 1;
    if (aspect === 'sextile') return ({ saturn: 0.65, pluto: 0.6, neptune: 0.55, uranus: 0.7 })[T] || 0.8;
    if (aspect === 'square' || aspect === 'opp') {
      const base = aspect === 'opp' ? -0.9 : -1;
      if (T === 'venus' || T === 'jupiter') return -0.45; // перебор, лень, лишние траты
      if (T === 'moon') return base * 0.8;
      return base;
    }
    // соединение
    const c = { venus: 0.9, jupiter: 0.9, sun: 0.5, moon: 0.3, mercury: 0.35, mars: -0.3, saturn: -0.75, uranus: -0.3, neptune: -0.4, pluto: -0.6 }[T];
    if (sphere === 'energy' && T === 'mars') return 0.45;
    if (sphere === 'launch' && T === 'uranus') return 0.25;
    if (sphere === 'launch' && T === 'mars') return 0.3;
    if (sphere === 'rest' && T === 'neptune') return 0.45;
    if (sphere === 'love' && (T === 'mars' || T === 'pluto')) return 0.3;
    if (sphere === 'career' && T === 'saturn') return -0.35; // нагрузка, но и рост ответственности
    return c;
  }

  // ---------- кэш событий неба на период ----------
  function skyEvents(start, end) {
    const s = addDays(start, -3), e = addDays(end, 3);
    let voc = []; try { voc = AC.voidOfCourse(s, e); } catch (err) { voc = []; }
    const retro = AC.retrogradePeriods(['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'], addDays(s, -120), addDays(e, 120));
    const ecl = AC.eclipses(addDays(s, -10), addDays(e, 10));
    const phases = AC.moonPhases(addDays(s, -30), addDays(e, 30));
    const stationsAll = AC.stations(['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'], addDays(s, -10), addDays(e, 10));
    const stations = stationsAll.filter((x) => ['mercury', 'venus', 'mars'].includes(x.id));
    return { voc, retro, ecl, phases, stations, stationsAll };
  }

  // местная полночь i-го дня в поясе tz
  function localMidnight(y, mo, d, tz) { return AC.localToUTC(y, mo, d, 0, 0, tz).date; }
  function ymdIn(date, tz) {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    const [y, m, d] = f.split('-').map(Number);
    return { y, mo: m, d };
  }
  function dayStarts(y, mo, d, n, tz) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const dt = new Date(Date.UTC(y, mo - 1, d + i));
      out.push({ start: localMidnight(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), tz), y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate() });
    }
    return out;
  }

  // личные показатели сфер: управители домов сферы
  function significators(natal) {
    const out = {};
    for (const s of SPHERES) out[s] = new Set();
    if (!natal.houses) return out;
    for (const s of SPHERES) for (const h of SPHERE_HOUSES[s]) {
      const sign = AC.signOf(natal.houses.cusps[h - 1]);
      out[s].add(AC.RULER[sign]);
      if (AC.TRAD_RULER[sign] !== AC.RULER[sign]) out[s].add(AC.TRAD_RULER[sign]);
    }
    return out;
  }

  /**
   * Оценки дней. natal — AstroCore.chart. opts: { tz (пояс пользователя), y, mo, d (первый день), days, events? }
   * Возвращает [{ y, mo, d, start, spheres:{id:{score, level}}, overall, reasons:[...], flags:{...} }]
   */
  function days(natal, opts) {
    const tz = opts.tz || 'UTC';
    const starts = dayStarts(opts.y, opts.mo, opts.d, opts.days || 30, tz);
    const first = starts[0].start, last = addDays(starts[starts.length - 1].start, 1);
    const ev = opts.events || skyEvents(first, last);
    const sig = significators(natal);
    const timeKnown = !!natal.houses;
    const nIds = N_IDS.filter((id) => natal.byId[id] && (timeKnown || (id !== 'asc' && id !== 'mc')));
    const out = [];
    for (const st of starts) out.push(scoreDay(natal, st, ev, sig, nIds, timeKnown, opts));
    return out;
  }

  function lonAt(id, date) { return AC.body(id, date).lon; }

  function scoreDay(natal, st, ev, sig, nIds, timeKnown, opts) {
    const d0 = st.start, w0 = new Date(d0.getTime() + 7 * HOUR), w1 = new Date(d0.getTime() + 23 * HOUR), noon = new Date(d0.getTime() + 13 * HOUR);
    const acc = {}; for (const s of SPHERES) acc[s] = 0;
    const reasons = [];
    const add = (sphere, v, reason) => { acc[sphere] += v; if (reason) reasons.push(Object.assign({ sphere, v }, reason)); };

    // 1. транзиты к натальным точкам
    const tPos = {};
    for (const T of T_IDS) {
      if (T === 'moon') continue;
      const b = AC.body(T, noon), bPrev = lonAt(T, new Date(noon.getTime() - 12 * HOUR));
      tPos[T] = { lon: b.lon, speed: b.speed, prev: bPrev };
    }
    const m0 = lonAt('moon', w0), m1 = lonAt('moon', w1), mNoon = lonAt('moon', noon);
    const hits = [];
    for (const T of T_IDS) {
      for (const N of nIds) {
        if (T === N && ['jupiter', 'saturn'].includes(T)) continue; // возвраты считаем отдельно ниже — слишком длинные
        const nl = natal.byId[N].lon;
        for (const [ang, type] of ASPECTS) {
          for (const sg of (ang === 0 || ang === 180 ? [1] : [1, -1])) {
            const target = norm(nl + sg * ang);
            let k = 0, exactAt = null, applying = true;
            if (T === 'moon') {
              const a = d180(m0 - target), b = d180(m1 - target);
              if ((a < 0) !== (b < 0) && Math.abs(a - b) < 30) { k = 1; exactAt = new Date(w0.getTime() + (w1 - w0) * (Math.abs(a) / (Math.abs(a) + Math.abs(b)))); }
              else { const o = Math.min(Math.abs(a), Math.abs(b)); if (o <= ORB.moon) k = 0.5 * (1 - o / ORB.moon); applying = Math.abs(b) < Math.abs(a); }
            } else {
              const p = tPos[T], o = Math.abs(d180(p.lon - target));
              if (o > ORB[T]) continue;
              k = Math.sqrt(1 - o / ORB[T]);
              applying = Math.abs(d180(p.lon - target)) < Math.abs(d180(p.prev - target));
              k *= applying ? 1.08 : 0.85;
            }
            if (k <= 0) continue;
            hits.push({ T, N, type, k, exactAt, applying });
          }
        }
      }
    }
    for (const h of hits) {
      const base = W_T[h.T] * (I_N[h.N] || 0.6) * h.k;
      for (const s of SPHERES) {
        let rel = 0.55 * (REL[s][h.T] || 0) + 0.45 * (REL[s][h.N] || 0);
        if (sig[s].has(h.N)) rel += 0.3;
        if (rel < 0.18) continue;
        const v = base * rel * valence(h.T, h.type, s);
        if (Math.abs(v) < 0.04) continue;
        add(s, v, { kind: 'transit', T: h.T, N: h.N, type: h.type, exactAt: h.exactAt, applying: h.applying });
      }
    }

    // 2. Луна по домам карты
    let moonHouse = null;
    if (timeKnown) {
      moonHouse = AC.houseOf(mNoon, natal.houses.cusps);
      const mh = MOON_HOUSE[moonHouse] || {};
      for (const [s, v] of Object.entries(mh)) add(s, v, { kind: 'moonHouse', house: moonHouse });
    }

    // 3. общее небо
    const ms = AC.moonState(noon);
    const flags = { moonSign: ms.sign, phase8: ms.phase8, illum: ms.illum, moonHouse, retro: [], shadow: [], voc: [], eclipse: null, station: null, phaseEvent: null };
    const angle = ms.angle; // 0 новолуние … 180 полнолуние
    // фазовые события этого дня
    for (const ph of ev.phases) if (ph.date >= d0 && ph.date < addDays(d0, 1)) flags.phaseEvent = ph;
    if (angle < 15 || angle > 345) { add('launch', -0.55, { kind: 'phase', key: 'newMoon' }); add('rest', 0.25, { kind: 'phase', key: 'newMoon' }); }
    else if (angle < 120) { add('launch', 0.55, { kind: 'phase', key: 'waxing' }); add('career', 0.15, null); add('money', 0.12, null); }
    else if (angle < 168) { add('launch', 0.3, { kind: 'phase', key: 'waxingLate' }); }
    else if (angle < 192) { add('launch', -0.3, { kind: 'phase', key: 'fullMoon' }); add('love', -0.15, null); add('talk', -0.12, null); add('energy', 0.1, null); }
    else { add('launch', -0.35, { kind: 'phase', key: 'waning' }); add('rest', 0.15, null); }
    // стихия Луны
    const el = AC.elementOf(ms.sign === undefined ? 0 : AC.SIGNS.indexOf(ms.sign));
    const EL = { fire: { energy: 0.2, launch: 0.15 }, earth: { money: 0.2, career: 0.15 }, air: { talk: 0.25, launch: 0.05 }, water: { love: 0.2, rest: 0.2 } }[el];
    for (const [s, v] of Object.entries(EL)) add(s, v, null);
    if (ms.sign === 'scorpio' || ms.sign === 'capricorn') { add('love', -0.12, null); add('rest', -0.1, null); }
    // Луна без курса в рабочие часы 9–21
    const ww0 = new Date(d0.getTime() + 9 * HOUR), ww1 = new Date(d0.getTime() + 21 * HOUR);
    let vocMin = 0;
    for (const v of ev.voc) {
      if (v.end > d0 && v.start < addDays(d0, 1)) flags.voc.push({ start: v.start, end: v.end, sign: v.sign, nextSign: v.nextSign, last: v.lastAspect });
      const a = Math.max(v.start, ww0), b = Math.min(v.end, ww1); if (b > a) vocMin += (b - a) / 60000;
    }
    const f = Math.min(1, vocMin / 720);
    if (f > 0.05) { add('launch', -1.3 * f, { kind: 'voc', minutes: Math.round(vocMin) }); add('money', -0.6 * f, f > 0.3 ? { kind: 'voc', minutes: Math.round(vocMin) } : null); add('talk', -0.45 * f, null); }
    flags.vocMinutes = Math.round(vocMin);
    // ретроградные планеты и тени
    for (const r of ev.retro) {
      if (noon >= r.start && noon <= r.end) flags.retro.push(r.id);
      else if (r.shadowStart && noon >= r.shadowStart && noon <= r.shadowEnd) flags.shadow.push(r.id);
    }
    const R = new Set(flags.retro), SH = new Set(flags.shadow);
    if (R.has('mercury')) { add('talk', -0.8, { kind: 'retro', id: 'mercury' }); add('launch', -1.0, { kind: 'retro', id: 'mercury' }); add('money', -0.3, null); }
    else if (SH.has('mercury')) { add('launch', -0.25, { kind: 'shadow', id: 'mercury' }); add('talk', -0.15, null); }
    if (R.has('venus')) { add('love', -0.6, { kind: 'retro', id: 'venus' }); add('money', -0.8, { kind: 'retro', id: 'venus' }); add('launch', -0.4, null); add('rest', -0.15, null); }
    else if (SH.has('venus')) { add('money', -0.25, { kind: 'shadow', id: 'venus' }); add('love', -0.1, null); }
    if (R.has('mars')) { add('energy', -0.6, { kind: 'retro', id: 'mars' }); add('launch', -0.8, { kind: 'retro', id: 'mars' }); add('career', -0.3, null); }
    // стоянки (±1,5 дня) — планета «зависает», её темы на пике
    for (const s of ev.stations) {
      if (Math.abs(s.date - noon) < 1.5 * DAY) {
        flags.station = s;
        const map = { mercury: ['talk', 'launch'], venus: ['love', 'money'], mars: ['energy', 'launch'] }[s.id] || [];
        for (const sp of map) add(sp, -0.5, { kind: 'station', id: s.id, dir: s.kind });
      }
    }
    // затмения ±3 дня
    for (const e of ev.ecl) {
      const dd = Math.abs(e.date - noon) / DAY;
      if (dd < 3.5) {
        flags.eclipse = e;
        const k = dd < 1 ? 1.5 : 1;
        add('launch', -1.0 * k, { kind: 'eclipse', kindOf: e.kind, date: e.date });
        add('love', -0.3 * k, null); add('career', -0.3 * k, null); add('money', -0.25 * k, null);
      }
    }
    // аспекты Луны к планетам неба в течение дня (общий фон)
    for (const id of ['venus', 'jupiter', 'saturn', 'mars', 'sun', 'mercury']) {
      const pl = tPos[id].lon;
      for (const [ang, type] of ASPECTS) for (const sg of (ang === 0 || ang === 180 ? [1] : [1, -1])) {
        const target = norm(pl + sg * ang);
        const a = d180(m0 - target), b = d180(m1 - target);
        if (!((a < 0) !== (b < 0) && Math.abs(a - b) < 30)) continue;
        const soft = type === 'trine' || type === 'sextile' || (type === 'conj' && ['venus', 'jupiter'].includes(id));
        const hard = type === 'square' || type === 'opp' || (type === 'conj' && ['saturn', 'mars'].includes(id));
        if (id === 'venus' && soft) { add('love', 0.2, null); add('money', 0.15, null); add('rest', 0.15, null); }
        if (id === 'jupiter' && soft) { for (const s of SPHERES) add(s, 0.1, null); add('launch', 0.1, null); }
        if (id === 'saturn' && hard) { add('career', -0.15, null); add('energy', -0.15, null); add('love', -0.1, null); }
        if (id === 'mars' && hard) { add('talk', -0.15, null); add('love', -0.12, null); add('energy', 0.05, null); }
        if (id === 'mercury' && soft) add('talk', 0.12, null);
        if (id === 'sun' && soft) { add('career', 0.08, null); add('energy', 0.08, null); }
      }
    }

    const spheres = {};
    for (const s of SPHERES) spheres[s] = rate(s, acc[s]);
    const vals = SPHERES.map((s) => acc[s]);
    const overallScore = vals.reduce((x, y) => x + y, 0) / vals.length;
    reasons.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
    return { y: st.y, mo: st.mo, d: st.d, start: d0, spheres, overall: rate('overall', overallScore), reasons, flags };
  }

  // ---------- баллы 1–10 ----------
  // Те же пороги, что у уровней: −2 → 1–2, −1 → 3–4, 0 → 5–6, +1 → 7–8, +2 → 9–10; внутри уровня — плавно.
  function pointsF(sphere, v) {
    const t = THRESH[sphere] || THRESH.overall;
    const a = [t[0] - (t[1] - t[0]), t[0], t[1], t[2], t[3], t[3] + (t[3] - t[2])];
    const p = [1, 2.5, 4.5, 6.5, 8.5, 10];
    if (v <= a[0]) return 1;
    for (let i = 0; i < 5; i++) if (v < a[i + 1]) return p[i] + (p[i + 1] - p[i]) * (v - a[i]) / (a[i + 1] - a[i]);
    return 10;
  }
  const LV_RANGE = { '-2': [1, 2], '-1': [3, 4], 0: [5, 6], 1: [7, 8], 2: [9, 10] };
  /** Целые баллы, всегда согласованные с уровнем (на границе округление не «перепрыгнет» уровень). */
  function ptsOf(level, f) { const r = LV_RANGE[level]; return Math.max(r[0], Math.min(r[1], Math.round(f))); }
  function levelOfPts(p) { return p <= 2 ? -2 : p <= 4 ? -1 : p <= 6 ? 0 : p <= 8 ? 1 : 2; }
  function rate(sphere, v) {
    const level = levelOf(sphere, v), f = pointsF(sphere, v);
    return { score: Math.round(v * 100) / 100, level, ptsF: Math.round(f * 100) / 100, pts: ptsOf(level, f) };
  }

  // ---------- дела: что когда делать ----------
  // Каждое дело — смесь сфер с весами; баллы дела = взвешенные баллы сфер.
  const ACTIVITIES = {
    date: { love: 0.65, rest: 0.2, talk: 0.15 },
    contract: { talk: 0.45, launch: 0.3, money: 0.25 },
    purchase: { money: 0.7, launch: 0.15, rest: 0.15 },
    interview: { career: 0.6, talk: 0.4 },
    launch: { launch: 0.75, career: 0.25 },
    moneytalk: { money: 0.55, talk: 0.25, career: 0.2 },
    study: { talk: 0.65, career: 0.2, energy: 0.15 },
    sport: { energy: 0.8, rest: 0.2 },
    trip: { rest: 0.4, talk: 0.3, energy: 0.3 },
    rest: { rest: 0.75, love: 0.25 },
  };
  function activity(day, act) {
    const w = ACTIVITIES[act];
    let f = 0, sum = 0;
    for (const [s, k] of Object.entries(w)) { f += day.spheres[s].ptsF * k; sum += k; }
    f /= sum;
    const level = levelOfPts(Math.round(f));
    return { ptsF: Math.round(f * 100) / 100, pts: ptsOf(level, f), level };
  }
  /** Оценка дня по ключу: 'overall', сфера или 'act:дело'. */
  function rateBy(day, key) {
    if (!key || key === 'overall') return day.overall;
    if (key.startsWith('act:')) return activity(day, key.slice(4));
    return day.spheres[key];
  }

  // ---------- события дня с точным временем ----------
  const EV_T = ['moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const EV_N = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'asc', 'mc'];
  const MOON_N = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'asc', 'mc'];
  function bisectT(fn, t0, t1, n) {
    let a = t0.getTime(), b = t1.getTime(), fa = fn(new Date(a));
    for (let i = 0; i < (n || 22); i++) { const m = (a + b) / 2, fm = fn(new Date(m)); if ((fa < 0) === (fm < 0)) { a = m; fa = fm; } else b = m; }
    return new Date((a + b) / 2);
  }
  /** Нрав аспекта транзита: >0 помогает, <0 мешает (без привязки к сфере). */
  function nature(T, type) { return valence(T, type, 'overall'); }
  /**
   * Все точные моменты суток: аспекты транзитов к карте, смена знака Луны и планет, фазы, Луна без курса, стоянки.
   * day — элемент из days(); natal — карта. Возвращает [{at, kind, ...}] по времени.
   */
  function dayEvents(natal, day, ev) {
    const d0 = day.start, d1 = new Date(d0.getTime() + DAY);
    const timeKnown = !!natal.houses;
    const nIds = EV_N.filter((id) => natal.byId[id] && (timeKnown || (id !== 'asc' && id !== 'mc')));
    const out = [];
    for (const T of EV_T) {
      const steps = T === 'moon' ? 8 : 2;
      const times = []; for (let i = 0; i <= steps; i++) times.push(new Date(d0.getTime() + DAY * i / steps));
      const lons = times.map((t) => lonAt(T, t));
      // смена знака
      for (let i = 0; i < steps; i++) {
        const s0 = Math.floor(lons[i] / 30), s1 = Math.floor(lons[i + 1] / 30);
        if (s0 !== s1 && Math.abs(d180(lons[i + 1] - lons[i])) < 20) {
          const edge = (d180(lons[i + 1] - lons[i]) >= 0 ? s1 : s0) * 30;
          const at = bisectT((x) => d180(lonAt(T, x) - edge), times[i], times[i + 1]);
          out.push({ at, kind: 'ingress', T, sign: AC.SIGNS[((s1 % 12) + 12) % 12], retro: d180(lons[i + 1] - lons[i]) < 0 });
        }
      }
      for (const N of nIds) {
        if (T === 'moon' && !MOON_N.includes(N)) continue;
        const nl = natal.byId[N].lon;
        for (const [ang, type] of ASPECTS) for (const sg of (ang === 0 || ang === 180 ? [1] : [1, -1])) {
          const target = norm(nl + sg * ang);
          for (let i = 0; i < steps; i++) {
            const a = d180(lons[i] - target), b = d180(lons[i + 1] - target);
            if ((a < 0) === (b < 0) || Math.abs(a - b) > 30) continue;
            const at = bisectT((x) => d180(lonAt(T, x) - target), times[i], times[i + 1]);
            const v = nature(T, type);
            out.push({ at, kind: 'transit', T, N, type, v, retro: d180(lons[i + 1] - lons[i]) < 0, w: W_T[T] * (I_N[N] || 0.55) * (T === 'moon' ? 0.7 : 1), tHouse: timeKnown ? AC.houseOf(lonAt(T, at), natal.houses.cusps) : null, nHouse: natal.byId[N].house || null, tRules: timeKnown ? rulesOf(T, natal.houses.cusps) : null, nRules: timeKnown ? rulesOf(N, natal.houses.cusps) : null });
          }
        }
      }
    }
    if (ev) {
      for (const ph of ev.phases) if (ph.date >= d0 && ph.date < d1) out.push({ at: ph.date, kind: 'phase', phase: ph.phase });
      for (const v of ev.voc) {
        if (v.start >= d0 && v.start < d1) out.push({ at: v.start, kind: 'vocStart', end: v.end, sign: v.sign, nextSign: v.nextSign });
        if (v.end >= d0 && v.end < d1) out.push({ at: v.end, kind: 'vocEnd', start: v.start });
      }
      for (const s of (ev.stationsAll || ev.stations)) if (s.date >= d0 && s.date < d1) out.push({ at: s.date, kind: 'station', T: s.id, dir: s.kind });
      for (const e of ev.ecl) if (e.date >= d0 && e.date < d1) out.push({ at: e.date, kind: 'eclipse', type: e.type, kindOf: e.kind });
    }
    // Луна без курса начинается с последнего аспекта — смену знака Луны внутри периода оставляем: это его конец
    return out.sort((a, b) => a.at - b.at);
  }

  /** Тон суток по часам: сумма мягких и напряжённых аспектов транзитов к карте (условная шкала для графика). */
  function toneCurve(natal, start, hours, stepMin) {
    const step = (stepMin || 60) * 60000, n = Math.round(hours * 60 / (stepMin || 60));
    const timeKnown = !!natal.houses;
    const nIds = N_IDS.filter((id) => natal.byId[id] && (timeKnown || (id !== 'asc' && id !== 'mc')));
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = new Date(start.getTime() + i * step);
      let v = 0;
      for (const T of T_IDS) {
        const l = lonAt(T, t);
        for (const N of nIds) {
          const sep = Math.abs(d180(l - natal.byId[N].lon));
          for (const [ang, type] of ASPECTS) {
            const o = Math.abs(sep - ang), orb = ORB[T] * (T === 'moon' ? 1.6 : 1);
            if (o > orb) continue;
            v += W_T[T] * (I_N[N] || 0.6) * (1 - o / orb) * Math.sign(nature(T, type));
          }
        }
      }
      out.push({ t, v: Math.round(v * 100) / 100 });
    }
    return out;
  }

  // пороги уровней −2…+2 по квантилям (8% / 28% / 72% / 92%), посчитаны на 80 случайных картах × 365 дней (10.2026–09.2027): _dev/calibrate.js
  let THRESH = {
    love: [-0.88, -0.11, 0.98, 1.78],
    money: [-1.16, -0.3, 0.88, 1.74],
    career: [-1.07, -0.16, 1.11, 2.02],
    launch: [-2.45, -1.14, 0.62, 1.8],
    talk: [-1.07, -0.3, 0.76, 1.5],
    energy: [-1.17, -0.24, 1.04, 1.93],
    rest: [-0.63, 0.11, 1.18, 1.96],
    overall: [-1.04, -0.24, 0.87, 1.66],
  };
  function levelOf(s, v) {
    const t = THRESH[s];
    return v < t[0] ? -2 : v < t[1] ? -1 : v < t[2] ? 0 : v < t[3] ? 1 : 2;
  }
  function setThresholds(t) { THRESH = Object.assign({}, THRESH, t); }

  // ---------- подробности дня: лучшие часы ----------
  const HOUR_PREF = {
    love: ['venus', 'moon', 'jupiter'], money: ['jupiter', 'venus', 'sun'], career: ['sun', 'jupiter', 'saturn'], launch: ['jupiter', 'sun', 'venus', 'mercury'],
    talk: ['mercury', 'jupiter', 'moon'], energy: ['mars', 'sun'], rest: ['venus', 'moon', 'jupiter'],
  };
  /** Окна планетных часов дня для сферы, без Луны без курса, 7:00–23:00 местного времени. place: {lat, lon, tz} */
  function bestHours(day, sphere, place) {
    const out = [];
    const mid = new Date(day.start.getTime() + 12 * HOUR);
    const ph = PRO.planetaryHours(mid, place.lat, place.lon, place.tz);
    if (!ph) return out;
    // часы светового дня и вечера этой даты: берём из суток, начавшихся восходом этого дня
    const hours = ph.hours;
    const prefs = HOUR_PREF[sphere] || HOUR_PREF.launch;
    const lo = new Date(day.start.getTime() + 7 * HOUR), hi = new Date(day.start.getTime() + 23 * HOUR);
    for (const h of hours) {
      if (!prefs.includes(h.ruler)) continue;
      let s = new Date(Math.max(h.start, lo)), e = new Date(Math.min(h.end, hi));
      if (e - s < 20 * 60000) continue;
      // вырезать Луну без курса
      for (const v of day.flags.voc) {
        if (v.end <= s || v.start >= e) continue;
        if (v.start <= s && v.end >= e) { s = e; break; }
        if (v.start > s) e = new Date(Math.min(e, v.start)); else s = new Date(Math.max(s, v.end));
      }
      if (e - s < 20 * 60000) continue;
      out.push({ ruler: h.ruler, start: s, end: e, rank: prefs.indexOf(h.ruler) });
    }
    return out.sort((a, b) => a.rank - b.rank || a.start - b.start).slice(0, 3).sort((a, b) => a.start - b.start);
  }

  /** Лучшие дни для сферы в периоде: [{day, score}] по убыванию. */
  function bestDays(list, sphere, n) {
    return list.map((d) => ({ day: d, score: sphere === 'overall' ? d.overall.score : d.spheres[sphere].score }))
      .sort((a, b) => b.score - a.score).slice(0, n || 5);
  }

  /** Лучшие дни по любому ключу (сфера, 'overall', 'act:дело'). */
  function bestBy(list, key, n) {
    return list.map((d) => ({ day: d, r: rateBy(d, key) })).sort((a, b) => b.r.ptsF - a.r.ptsF).slice(0, n || 5);
  }

  root.NScore = { SPHERES, REL, ACTIVITIES, days, scoreDay, skyEvents, bestHours, bestDays, bestBy, levelOf, levelOfPts, pointsF, rate, rateBy, activity, dayEvents, toneCurve, nature, setThresholds, ymdIn, dayStarts, significators, get THRESH() { return THRESH; } };
})(typeof window !== 'undefined' ? window : globalThis);
