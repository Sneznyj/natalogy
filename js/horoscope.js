/* Движок гороскопа по знаку (без интерфейса — проверяется в Node: node _dev/try_horo.js).
   Знак = 1-й солнечный дом. День: Луна (знак, дом, аспекты к середине знака) + Солнце, Меркурий, Венера, Марс, Юпитер, Сатурн
   (гармония знаков, аспекты к 15° знака, ретро), фаза, Луна без курса, затмения. Баллы 1–10 по сферам: настроение, любовь,
   деньги, работа, энергия; общий балл. Положения планет считаются один раз на день и общие для всех знаков. */
(function (root) {
  'use strict';
  const AC = root.AstroCore;
  const DAY = 86400000;
  const SIGNS = AC.SIGNS;
  const SPH = ['mood', 'love', 'money', 'career', 'energy'];
  // гармония знаков по расстоянию 0…6 знаков: тот же, полусекстиль, секстиль, квадрат, трин, квинконс, оппозиция
  const HARM = [1.0, -0.25, 0.75, -0.8, 1.0, -0.45, -0.35];
  const harm = (lon, si) => { const k = (AC.signIndex(lon) - si + 12) % 12; return HARM[Math.min(k, 12 - k)]; };
  const house = (lon, si) => ((AC.signIndex(lon) - si + 12) % 12) + 1;
  // что даёт Луна в солнечном доме каждой сфере (индекс — номер дома)
  const HQ = {
    mood: [0, 0.6, 0.3, 0.3, 0.2, 0.8, -0.3, 0.3, -0.5, 0.6, 0.3, 0.6, -0.6],
    love: [0, 0.5, 0.1, 0.3, 0.3, 1.0, -0.3, 0.8, 0.4, 0.2, -0.1, 0.4, -0.5],
    money: [0, 0.2, 1.0, 0.1, 0.1, 0.2, 0.4, 0.1, 0.5, 0.1, 0.6, 0.4, -0.5],
    career: [0, 0.4, 0.2, 0.3, -0.3, 0.1, 0.6, 0.2, -0.1, 0.2, 1.0, 0.4, -0.6],
    energy: [0, 0.8, 0.3, 0.2, -0.2, 0.6, 0.1, 0.1, -0.4, 0.5, 0.4, 0.4, -0.8],
  };
  const ASP_ANG = [0, 60, 90, 120, 180];
  const ASPV = { 0: 0.6, 60: 0.7, 90: -0.8, 120: 0.9, 180: -0.6 };
  /** Аспект планеты к середине знака: { a: угол, k: 0…1 (1 — точный) } или null */
  function aspTo(lon, si, orb) {
    const d = Math.abs(AC.d180(lon - (si * 30 + 15)));
    let best = null;
    for (const a of ASP_ANG) { const o = Math.abs(d - a); if (o <= orb && (!best || o < best.o)) best = { a, o, k: 1 - o / orb }; }
    return best;
  }
  // калибровка: среднее и разброс «сырых» оценок по всем знакам за 2026–2027 (node _dev/try_horo.js --cal)
  const CAL = { mood: [0.394, 1.123], love: [0.449, 0.905], money: [0.322, 0.655], career: [0.225, 0.773], energy: [0.294, 0.982] };
  const SPREAD = 1.75;

  // ---------- положения на день (общие для знаков) ----------
  const posCache = new Map();
  const BODIES = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  /** dayStart — местная полночь (Date). Возвращает планеты в полдень и Луну в 6, 12 и 18 часов. */
  function positions(dayStart) {
    const k = dayStart.getTime();
    if (posCache.has(k)) return posCache.get(k);
    const noon = new Date(k + 12 * 3600000);
    const out = { noon, moon: [6, 12, 18].map((h) => AC.body('moon', new Date(k + h * 3600000)).lon) };
    for (const id of BODIES) { const b = AC.body(id, noon); out[id] = { lon: b.lon, retro: b.retro }; }
    out.phase8 = AC.moonState(noon).phase8;
    posCache.set(k, out);
    if (posCache.size > 1200) posCache.delete(posCache.keys().next().value);
    return out;
  }

  /**
   * Оценка дня для знака. ctx: { voc: [{start,end}], ecl: [{date}] } — события за период (необязательно).
   * Возвращает { raw, r: {mood,love,money,career,energy,overall: {pts, ptsF, level}}, moonHouse, moonSign, ... }
   */
  function scoreDay(si, dayStart, ctx) {
    ctx = ctx || {};
    const P = positions(dayStart);
    const raw = { mood: 0, love: 0, money: 0, career: 0, energy: 0 };
    const add = (o) => { for (const k in o) raw[k] += o[k]; };
    // Луна: среднее по трём моментам суток
    for (const ml of P.moon) {
      const h = harm(ml, si), hs = house(ml, si), w = 1 / P.moon.length;
      add({ mood: w * (1.0 * h + HQ.mood[hs]), love: w * (0.6 * h + HQ.love[hs]), money: w * (0.3 * h + HQ.money[hs]), career: w * (0.3 * h + HQ.career[hs]), energy: w * (0.5 * h + HQ.energy[hs]) });
      const a = aspTo(ml, si, 8); if (a) { const v = ASPV[a.a] * a.k * w; add({ mood: 0.6 * v, love: 0.3 * v, energy: 0.3 * v }); }
    }
    const sun = P.sun, mer = P.mercury, ven = P.venus, mar = P.mars, jup = P.jupiter, sat = P.saturn;
    let h = harm(sun.lon, si); add({ mood: 0.35 * h, energy: 0.45 * h, career: 0.25 * h });
    let a = aspTo(sun.lon, si, 8); if (a) { const v = ASPV[a.a] * a.k; add({ energy: 0.8 * v, mood: 0.6 * v }); }
    h = harm(ven.lon, si); add({ love: 0.55 * h, money: 0.45 * h, mood: 0.2 * h });
    a = aspTo(ven.lon, si, 6); if (a) { const v = (a.a === 0 ? 0.8 : ASPV[a.a]) * a.k; add({ love: 0.9 * v, money: 0.6 * v }); }
    const vh = house(ven.lon, si); if (vh === 5 || vh === 7) add({ love: 0.35 }); if (vh === 2 || vh === 8) add({ money: 0.3 }); if (vh === 12) add({ love: -0.2 });
    if (ven.retro) add({ love: -0.4, money: -0.4 });
    h = harm(mar.lon, si); add({ energy: 0.55 * h, career: 0.35 * h, love: 0.15 * h });
    a = aspTo(mar.lon, si, 6); if (a) { const v = (a.a === 0 ? 0.3 : ASPV[a.a]) * a.k; add({ energy: 0.9 * v, career: 0.6 * v, mood: 0.3 * v }); }
    if (mar.retro) add({ energy: -0.4, career: -0.3 });
    h = harm(mer.lon, si); add({ career: 0.35 * h, money: 0.2 * h, mood: 0.15 * h });
    a = aspTo(mer.lon, si, 6); if (a) { const v = ASPV[a.a] * a.k; add({ career: 0.5 * v, money: 0.2 * v }); }
    if (mer.retro) add({ career: -0.45, money: -0.3 });
    h = harm(jup.lon, si); add({ money: 0.3 * h, career: 0.25 * h, mood: 0.2 * h, love: 0.15 * h });
    a = aspTo(jup.lon, si, 8); if (a) { const v = (a.a === 0 ? 0.9 : ASPV[a.a] > 0 ? ASPV[a.a] : ASPV[a.a] * 0.4) * a.k; add({ money: 0.4 * v, career: 0.3 * v }); }
    h = harm(sat.lon, si); add({ career: 0.2 * h, energy: 0.15 * h });
    a = aspTo(sat.lon, si, 7); if (a) { const v = (a.a === 0 ? -0.6 : ASPV[a.a]) * a.k; add({ career: 0.4 * v, energy: 0.4 * v }); }
    // фаза Луны
    if (P.phase8 === 0) add({ energy: -0.25, mood: -0.1 }); else if (P.phase8 === 4) add({ mood: -0.2, love: 0.1 }); else if (P.phase8 >= 1 && P.phase8 <= 3) add({ career: 0.1 });
    // Луна без курса днём (08–22): доля времени
    const t0 = dayStart.getTime() + 8 * 3600000, t1 = dayStart.getTime() + 22 * 3600000;
    let vf = 0; for (const v of ctx.voc || []) { const s = Math.max(t0, v.start.getTime()), e = Math.min(t1, v.end.getTime()); if (e > s) vf += (e - s) / (t1 - t0); }
    if (vf) add({ career: -0.5 * vf, money: -0.4 * vf });
    for (const e of ctx.ecl || []) if (Math.abs(e.date - P.noon) < 1.5 * DAY) add({ mood: -0.4, love: -0.4, money: -0.4, career: -0.4, energy: -0.4 });
    const r = {};
    for (const s of SPH) r[s] = rate((raw[s] - CAL[s][0]) / CAL[s][1]);
    const ov = 0.4 * r.mood.ptsF + 0.15 * (r.love.ptsF + r.money.ptsF + r.career.ptsF + r.energy.ptsF);
    r.overall = fromF(ov);
    return { raw, r, moonHouse: house(P.moon[1], si), moonSign: AC.signOf(P.moon[1]), phase8: P.phase8, voc: vf };
  }
  function fromF(f) {
    f = Math.max(1, Math.min(10, f));
    const pts = Math.max(1, Math.min(10, Math.round(f)));
    const level = pts <= 2 ? -2 : pts <= 4 ? -1 : pts <= 6 ? 0 : pts <= 8 ? 1 : 2;
    return { pts, ptsF: Math.round(f * 100) / 100, level };
  }
  const rate = (z) => fromF(6 + z * SPREAD);

  /** Лучшее окно 2–3 часа днём (7–22): Луна в ладу со знаком, без Луны без курса. [{ start, end, v }] или [] */
  function bestHours(si, dayStart, voc) {
    const hrs = [];
    for (let hh = 7; hh <= 22; hh++) {
      const at = new Date(dayStart.getTime() + hh * 3600000);
      const ml = AC.body('moon', at).lon;
      let v = harm(ml, si) + 0.5 * (HQ.mood[house(ml, si)]);
      const a = aspTo(ml, si, 6); if (a) v += ASPV[a.a] * a.k;
      if ((voc || []).some((x) => x.start <= at && x.end > at)) v -= 3;
      hrs.push({ hh, v });
    }
    let best = null;
    for (let i = 0; i + 2 < hrs.length; i++) { const v = hrs[i].v + hrs[i + 1].v + hrs[i + 2].v; if (!best || v > best.v) best = { i, v }; }
    if (!best || best.v < -1) return [];
    return [{ start: new Date(dayStart.getTime() + hrs[best.i].hh * 3600000), end: new Date(dayStart.getTime() + (hrs[best.i].hh + 3) * 3600000), v: best.v }];
  }

  /** Аспекты быстрых планет к середине знака в полдень (для текста дня). */
  function dayAspects(si, dayStart) {
    const P = positions(dayStart), out = [];
    for (const [id, orb] of [['sun', 5], ['mercury', 4], ['venus', 4], ['mars', 4]]) {
      const a = aspTo(P[id].lon, si, orb);
      if (a) out.push({ id, a: a.a, soft: a.a === 0 ? id !== 'mars' : ASPV[a.a] > 0, k: a.k });
    }
    return out.sort((x, y) => y.k - x.k);
  }

  root.NHoro = { SPH, SIGNS, harm, house, aspTo, positions, scoreDay, bestHours, dayAspects, rate, fromF, CAL };
})(typeof window !== 'undefined' ? window : globalThis);
