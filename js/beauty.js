/* Красота и спорт по дням (14.10, просьба Алины): какие процедуры и тренировки в этот день удачны, а какие лучше отложить.
   Правила классического лунного календаря красоты: знак Луны (подходящие и неудачные знаки, «зона тела» знака Луны не трогать
   для инвазивных процедур), фаза (растущая — питание и рост, убывающая — очищение и удаление), ново- и полнолуние, затмения,
   Луна без курса днём, ретро Венеры и Марса, напряжённый транзитный Марс к Солнцу, Марсу, Луне или Асценденту карты,
   личная энергия дня (сфера «энергия» из NScore). Ничего не знает об интерфейсе; тексты — NXT.*.beauty (texts-extra.js). */
(function (root) {
  'use strict';
  // good/bad — знаки Луны; phase: 'wax' — лучше растущая, 'wane' — убывающая; zone — инвазивно для зоны тела знака Луны;
  // nf — штраф в ново- и полнолуние, ecl — у затмений, voc — за Луну без курса днём, vr/mr — ретро Венеры/Марса, mh — напряжённый Марс
  const BEAUTY = {
    haircut: { good: ['taurus', 'leo', 'virgo', 'libra', 'capricorn'], bad: ['cancer', 'pisces', 'scorpio'], phase: 'wax', nf: 2.5, voc: 1, vr: 1.5 },
    color: { good: ['taurus', 'leo', 'libra', 'gemini', 'aquarius', 'sagittarius'], bad: ['cancer', 'pisces', 'scorpio', 'virgo'], phase: 'wax', nf: 1.5, voc: 1, vr: 4 },
    mani: { good: ['taurus', 'leo', 'virgo', 'libra', 'capricorn'], bad: ['gemini', 'cancer', 'pisces'], phase: null, nf: 1, voc: 0.5 },
    pedi: { good: ['taurus', 'leo', 'virgo', 'libra', 'capricorn'], bad: ['pisces', 'cancer', 'gemini'], phase: null, nf: 1, voc: 0.5 },
    clean: { good: ['capricorn', 'virgo', 'scorpio', 'aquarius'], bad: ['aries', 'cancer', 'pisces'], phase: 'wane', nf: 2, voc: 1, zone: true },
    care: { good: ['cancer', 'pisces', 'taurus', 'libra', 'scorpio'], bad: ['aries', 'leo', 'sagittarius'], phase: 'wax', nf: 0.5, voc: 0 },
    inject: { good: ['capricorn', 'virgo', 'libra', 'scorpio', 'aquarius'], bad: ['aries', 'taurus', 'cancer', 'pisces'], phase: 'wane', nf: 3.5, ecl: 3, voc: 2, vr: 3.5, mh: 2, zone: true },
    epil: { good: ['capricorn', 'scorpio', 'virgo', 'aquarius', 'sagittarius'], bad: ['cancer', 'pisces', 'leo'], phase: 'wane', nf: 1.5, voc: 0.5 },
    massage: { good: ['taurus', 'cancer', 'pisces', 'libra', 'virgo'], bad: ['aries', 'scorpio'], phase: null, nf: 0.5, voc: 0 },
    brows: { good: ['taurus', 'leo', 'libra', 'virgo'], bad: ['aries', 'pisces', 'cancer', 'scorpio'], phase: 'wax', nf: 2, voc: 1.5, vr: 3.5, zone: true },
    surgery: { good: ['capricorn', 'virgo', 'libra', 'aquarius'], bad: ['aries', 'pisces', 'cancer', 'leo'], phase: 'wane', nf: 4, ecl: 4, voc: 2.5, vr: 4, mr: 2, mh: 3, merc: 1 },
  };
  const SPORT = {
    strength: { good: ['aries', 'leo', 'sagittarius', 'capricorn', 'scorpio'], bad: ['pisces', 'cancer'], phase: 'wax', mr: 1.5, mh: 2, en: 1.2 },
    cardio: { good: ['aries', 'sagittarius', 'gemini', 'aquarius', 'leo', 'libra'], bad: ['pisces', 'taurus'], phase: 'wax', mh: 1, en: 1.2 },
    yoga: { good: ['pisces', 'cancer', 'libra', 'taurus', 'virgo', 'aquarius'], bad: ['aries'], phase: 'wane', en: -0.4 },
    swim: { good: ['cancer', 'scorpio', 'pisces', 'libra'], bad: ['capricorn', 'virgo'], phase: null, en: 0.6 },
    team: { good: ['leo', 'libra', 'gemini', 'aquarius', 'sagittarius'], bad: ['scorpio', 'capricorn'], phase: null, mh: 1, en: 0.8 },
    rest: { good: ['cancer', 'pisces', 'taurus'], bad: [], phase: 'wane', en: -1.5, restDay: true },
  };
  const B_IDS = Object.keys(BEAUTY), S_IDS = Object.keys(SPORT);
  const X = () => { const L = root.NUI ? root.NUI.lang() : 'ru'; return ((root.NXT && (root.NXT[L] || root.NXT.ru)) || {}).beauty || {}; };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const levelOf = (p) => (p >= 7 ? 1 : p <= 4 ? -1 : 0);

  /** Состояние дня, общее для всех процедур. */
  function ctxOf(day) {
    const f = day.flags || {};
    const ph = f.phase8, illum = f.illum;
    const waxing = ph != null ? ph >= 0 && ph <= 3 && !(ph === 0 && illum < 0.02) : null;
    const nearNew = illum != null && illum < 0.05, nearFull = illum != null && illum > 0.96;
    const exact = f.phaseEvent && (f.phaseEvent.phase === 0 || f.phaseEvent.phase === 2);
    const ecl = !!(f.eclipse && Math.abs(f.eclipse.date - (day.start.getTime() + 43200000)) < 3.5 * 86400000);
    const retro = new Set(f.retro || []);
    const marsHard = (day.reasons || []).some((r) => r.kind === 'transit' && r.T === 'mars' && ['square', 'opp', 'conj'].includes(r.type) && ['sun', 'mars', 'moon', 'asc'].includes(r.N));
    const energy = day.spheres && day.spheres.energy ? day.spheres.energy.ptsF : 5.5;
    return { sign: f.moonSign, waxing, nf: exact || nearNew || nearFull, nfKind: nearFull || (exact && f.phaseEvent.phase === 2) ? 'full' : 'new', ecl, vocH: (f.vocMinutes || 0) / 60, vr: retro.has('venus'), mr: retro.has('mars'), merc: retro.has('mercury'), marsHard, energy };
  }

  /** Оценка одной процедуры или тренировки: { id, pts 1–10, level −1/0/1, why: [строки] }. */
  function rateOne(kind, id, c) {
    const R = kind === 'b' ? BEAUTY[id] : SPORT[id], T = X(), W = T.why || {};
    const S = root.NUI ? root.NUI.TX().S : null, sIn = c.sign && S ? S[c.sign].in : '';
    let v = 6.2; const why = [];
    if (c.sign && R.good.includes(c.sign)) { v += 2; why.push(['+', (W.moonGood || '{s}').replace('{s}', sIn)]); }
    else if (c.sign && R.bad.includes(c.sign)) { v -= 2; why.push(['−', (W.moonBad || '{s}').replace('{s}', sIn)]); }
    if (R.zone && c.sign && T.zone) { const zbad = { clean: ['aries'], inject: ['aries', 'taurus'], brows: ['aries'] }[id] || []; if (zbad.includes(c.sign)) { v -= 1; why.push(['−', (W.zone || '{z}').replace('{z}', T.zone[c.sign])]); } }
    if (R.phase && c.waxing != null) {
      const okp = R.phase === 'wax' ? c.waxing : !c.waxing;
      v += okp ? 1.2 : -1; why.push([okp ? '+' : '−', c.waxing ? W.wax : W.wane]);
    }
    if (c.nf && R.nf) { v -= R.nf; why.push(['−', c.nfKind === 'full' ? W.full : W.new]); }
    if (c.ecl && (R.ecl || R.nf >= 2)) { v -= R.ecl || 1.5; why.push(['−', W.ecl]); }
    if (R.voc && c.vocH >= 3) { const k = Math.min(1, c.vocH / 10); v -= R.voc * k; why.push(['−', (W.voc || '').replace('{h}', Math.round(c.vocH))]); }
    if (R.vr && c.vr) { v -= R.vr; why.push(['−', W.vr]); }
    if (R.mr && c.mr) { v -= R.mr; why.push(['−', W.mr]); }
    if (R.merc && c.merc) { v -= R.merc; why.push(['−', W.merc]); }
    if (R.mh && c.marsHard) { v -= R.mh; why.push(['−', W.mh]); }
    if (R.en) {
      const d = (c.energy - 5.5) / 2.5; // −1…+1
      v += R.en * d;
      if (Math.abs(d) > 0.45) why.push([R.en * d > 0 ? '+' : '−', d > 0 ? W.enHigh : W.enLow]);
    }
    if (R.restDay && c.nf) { v += 2; why.push(['+', W.restNF]); }
    const pts = Math.round(clamp(v, 1, 10));
    return { id, kind, pts, level: levelOf(pts), why: why.filter((x) => x[1]) };
  }

  /** Все процедуры и тренировки дня. */
  function day(d) {
    const c = ctxOf(d);
    const beauty = B_IDS.map((id) => rateOne('b', id, c)).sort((a, b) => b.pts - a.pts);
    const sport = S_IDS.map((id) => rateOne('s', id, c)).sort((a, b) => b.pts - a.pts);
    const top = (l) => l.slice(0, 3).reduce((a, x) => a + x.pts, 0) / 3;
    return { beauty, sport, b: top(beauty), s: top(sport), ctx: c };
  }
  // кэш по дню (объект дня из NCompute живёт в кэше месяца)
  const cache = new WeakMap();
  const of = (d) => { let r = cache.get(d); if (!r) { r = day(d); cache.set(d, r); } return r; };
  const isKey = (k) => k === 'beauty' || k === 'sport' || /^(bty|spt):/.test(k || '');
  /** Баллы дня под ключ календаря: 'beauty', 'sport', 'bty:<процедура>', 'spt:<тренировка>' — в формате NScore.rate. */
  function rate(d, key) {
    const r = of(d);
    let f;
    if (key === 'beauty') f = r.b; else if (key === 'sport') f = r.s;
    else { const [k, id] = key.split(':'); const x = (k === 'bty' ? r.beauty : r.sport).find((z) => z.id === id); f = x ? x.pts : 5; }
    const pts = Math.round(clamp(f, 1, 10));
    const level = pts <= 2 ? -2 : pts <= 4 ? -1 : pts <= 6 ? 0 : pts <= 8 ? 1 : 2;
    return { pts, ptsF: f, level, score: f };
  }
  function best(list, key, n) { return list.map((day) => ({ day, r: rate(day, key) })).sort((a, b) => b.r.ptsF - a.r.ptsF || a.day.d - b.day.d).slice(0, n); }

  root.NBeauty = { BEAUTY, SPORT, B_IDS, S_IDS, day: of, rate, best, isKey, ctxOf };
})(typeof window !== 'undefined' ? window : globalThis);
