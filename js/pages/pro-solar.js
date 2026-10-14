/* Профи → «Соляр» (14.10, просьба Алины): прогноз на год по соляру и транзитам, с вопросами.
   Считаем: карту соляра (на город, где человек живёт, или на место рождения), главное в ней (Асцендент, Солнце, Луна, управитель года,
   скопления планет), восемь сфер года — из домов соляра (планеты, управители куспидов) и из оценок дней за весь год по транзитам (NScore),
   год по месяцам, долгие транзиты, ретро и затмения. Вопрос разбираем по теме и месяцу и отвечаем из этих же расчётов;
   если подключён ИИ (NCONFIG.aiEndpoint) — он получает те же факты, а ниже всё равно видно расчёт. Тексты — NXT.*.solar (texts-extra.js). */
(function (root) {
  'use strict';
  const UI = root.NUI, AC = root.AstroCore, NS = root.NScore;
  const { t, esc, icon } = UI;
  const DAY = 86400000;
  const XS = () => ((root.NXT && (root.NXT[UI.lang()] || root.NXT.ru)) || {}).solar || {};
  // сферы года: дома соляра, сферы дневных оценок (NScore), планеты-показатели
  const SPH = {
    love: { houses: [5, 7], ns: ['love'], pl: ['venus', 'moon'], icon: 'love' },
    money: { houses: [2, 8], ns: ['money'], pl: ['venus', 'jupiter'], icon: 'money' },
    career: { houses: [10, 6], ns: ['career'], pl: ['sun', 'saturn'], icon: 'career' },
    health: { houses: [1, 6], ns: ['energy'], pl: ['mars', 'sun'], icon: 'energy' },
    home: { houses: [4], ns: ['rest', 'love'], pl: ['moon'], icon: 'moon' },
    study: { houses: [3, 9], ns: ['talk'], pl: ['mercury', 'jupiter'], icon: 'talk' },
    friends: { houses: [11], ns: ['launch'], pl: ['jupiter', 'uranus'], icon: 'users' },
    inner: { houses: [12], ns: ['rest'], pl: ['neptune', 'moon'], icon: 'rest' },
  };
  const SPH_IDS = Object.keys(SPH);
  // вес планеты в доме соляра: благотворные прибавляют, тяжёлые — убавляют (но приносят результат через труд)
  const PW = { sun: 0.7, moon: 0.3, mercury: 0.3, venus: 1.2, jupiter: 1.5, saturn: -1.1, mars: -0.45, uranus: -0.3, neptune: -0.35, pluto: -0.45 };
  const TEN = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const st = { off: 0, place: 'here', overlay: true, open: null, qa: [] };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lvl = (v) => { const r = Math.round(v); return r >= 7 ? 'hi' : r >= 6 ? 'mid' : 'lo'; };

  // ---------- расчёт ----------
  function placeOf(p) {
    if (st.place === 'birth') return { lat: p.place.lat, lon: p.place.lon, zone: p.place.tz, name: UI.lang() === 'en' ? p.place.nameEn || p.place.name : p.place.name };
    const h = UI.homeOf(p);
    return { lat: h.lat, lon: h.lon, zone: h.tz, name: h.guessed ? '' : (UI.lang() === 'en' ? h.nameEn || h.name : h.name) };
  }
  /** Соляр, действующий сегодня, со сдвигом на off лет; конец — следующий соляр. */
  function solarOf(p, natal) {
    const pl = placeOf(p), now = new Date();
    const y0 = UI.partsIn(now, pl.zone || 'UTC').y;
    let base = AC.solarReturn(natal, y0, pl);
    if (base.returnDate > now) base = AC.solarReturn(natal, y0 - 1, pl);
    const y = UI.partsIn(base.returnDate, pl.zone).y + st.off;
    const sol = st.off ? AC.solarReturn(natal, y, pl) : base;
    const next = AC.solarReturn(natal, y + 1, pl);
    return { sol, start: sol.returnDate, end: next.returnDate, place: pl, year: y };
  }
  const rulerOf = (sign) => AC.RULER[sign];
  function indicators(sol, natal) {
    const X = XS(), TX = UI.TX();
    const out = [];
    if (!sol.houses) return out;
    const ascSign = AC.signOf(sol.houses.asc);
    out.push({ k: 'asc', title: t('sol.asc', 'Тон года — Асцендент соляра {s}', { s: TX.S[ascSign].in }), text: X.ascSign[ascSign] });
    const sunH = sol.byId.sun.house; if (sunH) out.push({ k: 'sun', title: t('sol.sun', 'Солнце в {h} доме соляра', { h: sunH }), text: X.sunHouse[sunH] });
    const moonH = sol.byId.moon.house; if (moonH) out.push({ k: 'moon', title: t('sol.moon', 'Луна в {h} доме соляра · {s}', { h: moonH, s: TX.S[sol.byId.moon.sign].name }), text: X.moonHouse[moonH] });
    if (natal.houses) { const nh = AC.houseOf(sol.houses.asc, natal.houses.cusps); out.push({ k: 'ascN', title: t('sol.ascN', 'Асцендент соляра в {h} доме натала', { h: nh }), text: X.ascNatal[nh] }); }
    const lord = rulerOf(ascSign), lh = sol.byId[lord] && sol.byId[lord].house;
    if (lh) out.push({ k: 'lord', title: t('sol.lord', 'Управитель года — {p}', { p: TX.P[lord].name }), text: X.ruler(TX.P[lord].name, lh, TX.H[lh].area) });
    // скопления: 3+ планеты в одном доме соляра
    const by = {}; for (const id of TEN) { const h = sol.byId[id] && sol.byId[id].house; if (h) (by[h] = by[h] || []).push(id); }
    for (const [h, list] of Object.entries(by)) if (list.length >= 3) out.push({ k: 'st' + h, title: t('sol.stell', 'Скопление планет в {h} доме', { h }), text: X.stellium(list.length, h, TX.H[h].area, list.map((x) => TX.P[x].name).join(', ')) });
    const mcSign = AC.signOf(sol.houses.mc);
    out.push({ k: 'mc', title: t('sol.mc', 'MC соляра {s} — цели года', { s: TX.S[mcSign].in }), text: t('sol.mcT', 'Карьерные цели года окрашены знаком {s}: {st}.', { s: TX.S[mcSign].gen || TX.S[mcSign].name, st: TX.S[mcSign].style || '' }) });
    return out;
  }
  /** Сфера по соляру: планеты в её домах, управители куспидов (достоинство, дом), активация Асцендентом соляра. 1–10. */
  function solarScore(k, sol, natal) {
    const d = SPH[k]; if (!sol.houses) return { v: 5.5, lines: [] };
    const TX = UI.TX(), X = XS();
    let v = 5.5; const lines = [];
    d.houses.forEach((h, i) => {
      const w = i === 0 ? 1 : 0.7;
      for (const id of TEN) if (sol.byId[id] && sol.byId[id].house === h) { v += PW[id] * w; lines.push(X.plLine(TX.P[id].name, h, X.pl[id], TX.H[h].area)); }
      const lord = rulerOf(AC.signOf(sol.houses.cusps[h - 1])), b = sol.byId[lord];
      if (b) {
        if (b.dignity === 'domicile' || b.dignity === 'exaltation') v += 0.5 * w; else if (b.dignity === 'detriment' || b.dignity === 'fall') v -= 0.5 * w;
        if ([6, 8, 12].includes(b.house)) v -= 0.3 * w; else if ([1, 5, 10, 11].includes(b.house)) v += 0.3 * w;
        for (const a of sol.aspects.filter((x) => (x.a === lord || x.b === lord) && ['conj', 'sextile', 'square', 'trine', 'opp'].includes(x.type))) {
          const o = a.a === lord ? a.b : a.a;
          if (o === 'jupiter' || o === 'venus') v += (a.nature === 'hard' ? 0.1 : 0.3) * w;
          if (o === 'saturn' || o === 'mars' || o === 'pluto') v -= (a.nature === 'soft' ? 0.05 : 0.3) * w;
        }
        lines.push(t('sol.cuspL', 'Куспид {h} дома {s}: управитель {p} в {hh} доме соляра{dg}.', { h, s: TX.S[AC.signOf(sol.houses.cusps[h - 1])].in, p: TX.P[lord].name, hh: b.house || '—', dg: b.dignity ? ' (' + ((TX.dig || {})[b.dignity] || b.dignity) + ')' : '' }));
      }
    });
    if (natal.houses && d.houses.includes(AC.houseOf(sol.houses.asc, natal.houses.cusps))) { v += 0.5; lines.push(t('sol.ascAct', 'Асцендент соляра попадает в этот дом натала — тема активна весь год.')); }
    return { v: clamp(v, 1, 10), lines };
  }
  /** Оценки дней за весь год соляра (по транзитам) → по месяцам и сферам. Считаем частями, с прогрессом. */
  const yearCache = new Map();
  async function yearDays(p, S, onProgress) {
    const tz = S.place.zone;
    const key = [p.id, p.y, p.mo, p.d, p.h, p.mi, S.start.toISOString(), tz].join('|');
    if (yearCache.has(key)) return yearCache.get(key);
    const a = UI.partsIn(S.start, tz), b = UI.partsIn(S.end, tz);
    const months = []; let y = a.y, mo = a.mo;
    while (y < b.y || (y === b.y && mo <= b.mo)) { months.push({ y, mo }); mo++; if (mo > 12) { mo = 1; y++; } }
    // события неба — один раз на весь год и без Луны без курса (она меняет часы, а не месяцы); для средних по месяцам хватает каждого второго дня
    const natal = UI.chartOf(p), from = new Date(S.start.getTime() - DAY);
    await new Promise((r) => setTimeout(r, 0));
    const ev = NS.skyEvents(S.start, S.end, { noVoc: true });
    const res = [];
    for (let i = 0; i < months.length; i++) {
      const m = months[i], n = UI.daysIn(m.y, m.mo), days = [];
      for (let d = 1; d <= n; d += 2) {
        const one = NS.days(natal, { tz, y: m.y, mo: m.mo, d, days: 1, events: ev })[0];
        if (one.start >= from && one.start < S.end) days.push(one);
      }
      if (days.length) {
        const avg = {}; for (const s of NS.SPHERES) avg[s] = days.reduce((acc, d) => acc + d.spheres[s].ptsF, 0) / days.length;
        avg.overall = days.reduce((acc, d) => acc + d.overall.ptsF, 0) / days.length;
        res.push({ y: m.y, mo: m.mo, n: days.length * 2, avg });
      }
      if (onProgress) onProgress((i + 1) / months.length);
      await new Promise((r) => setTimeout(r, 0)); // интерфейс не замирает
    }
    yearCache.set(key, res);
    if (yearCache.size > 8) yearCache.delete(yearCache.keys().next().value);
    return res;
  }
  const mScore = (m, k) => SPH[k].ns.reduce((a, s) => a + m.avg[s], 0) / SPH[k].ns.length;
  function spheres(S, natal, months) {
    const out = {};
    for (const k of SPH_IDS) {
      const so = solarScore(k, S.sol, natal);
      const ms = months.map((m) => ({ m, v: mScore(m, k) }));
      const avg = ms.length ? ms.reduce((a, x) => a + x.v, 0) / ms.length : 5.5;
      // дневные оценки обычно около середины: растягиваем отклонение, чтобы год по транзитам заметнее влиял на итог
      const tr = clamp(5.5 + (avg - 5.5) * 2, 1, 10);
      const v = clamp(0.6 * so.v + 0.4 * tr, 1, 10);
      const sorted = ms.filter((x) => x.m.n >= 10).slice().sort((a, b) => b.v - a.v);
      out[k] = { v, solar: so.v, tr, lines: so.lines, best: sorted.slice(0, 2).map((x) => x.m), worst: sorted.length > 3 ? [sorted[sorted.length - 1].m] : [], months: ms };
    }
    return out;
  }
  /** Долгие транзиты года, важные для сферы: к её показателям и управителям её домов в натале. */
  function slowFor(k, natal, slow) {
    const d = SPH[k];
    const lords = natal.houses ? d.houses.map((h) => rulerOf(AC.signOf(natal.houses.cusps[h - 1]))) : [];
    const rel = new Set(d.pl.concat(lords, k === 'career' ? ['mc'] : k === 'health' ? ['asc'] : k === 'home' ? [] : []));
    return slow.transits.filter((e) => rel.has(e.natal)).slice(0, 5);
  }

  // ---------- вопрос ----------
  function topicOf(q) {
    const X = XS();
    for (const [k, v] of Object.entries(X.topics || {})) if (v.re.test(q)) return Object.assign({ key: k }, v);
    return null;
  }
  function monthAsked(q) { const X = XS(); return (X.monthIdx || []).findIndex((re) => re.test(q)); }
  function answer(q, ctx) {
    const X = XS(), A = X.ans, TX = UI.TX(), MN = TX.MONTHS_N || TX.MONTHS;
    const tp = topicOf(q), mi = monthAsked(q);
    const mName = (m) => `${MN[m.mo - 1]} ${m.y}`;
    const yq = (String(q).match(/\b(20\d\d)\b/) || [])[1];
    const parts = [];
    if (yq && !ctx.months.some((m) => m.y === +yq)) parts.push(`<p class="muted small">${esc(A.noYear.replace('{d}', UI.fmtDay(ctx.S.start, ctx.S.place.zone, { year: true })))}</p>`);
    if (!tp) {
      if (mi >= 0) {
        const m = ctx.months.find((x) => x.mo === mi + 1); if (m) {
          const sc = SPH_IDS.map((k) => ({ k, v: mScore(m, k) })).sort((a, b) => b.v - a.v);
          const pts = Math.round(clamp(m.avg.overall, 1, 10));
          parts.push(`<p>${esc(A.monthOnly(mName(m), pts, sc.slice(0, 2).map((x) => X.sph[x.k].name.toLowerCase()).join(', '), X.sph[sc[sc.length - 1].k].name.toLowerCase()))}</p>`);
          return parts.join('');
        }
      }
      parts.push(`<p>${esc(A.general)}</p>`);
      return parts.join('');
    }
    const k = tp.sph, sp = ctx.sph[k], v = sp.v, L = lvl(v);
    parts.push(`<p class="sa-verdict ${L}"><b>${esc(L === 'hi' ? A.yes : L === 'mid' ? A.maybe : A.hard)}</b> <span class="tag">${esc(X.sph[k].name)} · ${Math.round(v)}/10</span></p>`);
    const why = sp.lines.slice(0, 4);
    // показатели темы вопроса из других домов (переезд — 4 и 9, брак — 7…)
    for (const h of (tp.extra || [])) if (!SPH[k].houses.includes(h) && ctx.S.sol.houses) for (const id of TEN) if (ctx.S.sol.byId[id] && ctx.S.sol.byId[id].house === h) why.push(X.plLine(TX.P[id].name, h, X.pl[id], TX.H[h].area));
    const sl = slowFor(k, ctx.natal, ctx.slow);
    if (sl.length) why.push(A.slow + ': ' + sl.slice(0, 3).map((e) => `${TX.P[e.transiting].name} ${(TX.ASP[e.type] || {}).name || e.type} ${TX.P[e.natal] ? TX.P[e.natal].name : e.natal} (${UI.fmtDay(e.start, ctx.S.place.zone)} — ${UI.fmtDay(e.end, ctx.S.place.zone, { year: true })})`).join('; '));
    if (why.length) parts.push(`<div class="sa-sec"><span class="label">${esc(A.why)}</span><ul>${why.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`);
    const when = [];
    if (mi >= 0) { const m = ctx.months.find((x) => x.mo === mi + 1); if (m) { const mv = clamp(mScore(m, k), 1, 10); when.push(A.month(mName(m), Math.round(mv), A.words[lvl(mv)])); } }
    if (sp.best.length) when.push(A.best(sp.best.map(mName).join(', ')));
    if (sp.worst.length) when.push(A.worst(sp.worst.map(mName).join(', ')));
    if (when.length) parts.push(`<div class="sa-sec"><span class="label">${esc(A.when)}</span><p>${esc(when.join(' '))}</p></div>`);
    parts.push(`<div class="sa-sec"><span class="label">${esc(A.advice)}</span><p>${esc(X.sph[k][L])}</p></div>`);
    parts.push(bars(sp.months, k));
    return parts.join('');
  }
  /** Мини-график сферы по месяцам. */
  function bars(ms, k) {
    const TX = UI.TX(), MN = TX.MONTHS_N || TX.MONTHS;
    return `<div class="sa-bars" role="img" aria-label="${esc(t('sol.barsA', 'Сфера по месяцам'))}">${ms.map(({ m, v }) => { const s = clamp(v, 1, 10); return `<span class="sb-m ${lvl(s)}" data-tip="${esc(MN[m.mo - 1] + ' ' + m.y + ': ' + Math.round(s) + '/10')}"><i style="height:${Math.round(s * 10)}%"></i><small>${esc(MN[m.mo - 1].slice(0, 3))}</small></span>`; }).join('')}</div>`;
  }

  // ---------- страница ----------
  async function page(body, p) {
    const TX = UI.TX(), X = XS();
    const natal = UI.chartOf(p);
    const S = solarOf(p, natal);
    const tz = S.place.zone;
    const sol = S.sol;
    // колесо: соляр отдельно или соляр внутри + натал снаружи
    const toWheel = (c) => ({ points: c.points, cusps: c.houses ? c.houses.cusps : null, asc: c.houses ? c.houses.asc : 0, mc: c.houses ? c.houses.mc : null });
    const pts = (c) => c.points.filter((x) => TEN.concat(['node', 'asc', 'mc']).includes(x.id));
    const wheel = () => root.NWheel.svg(toWheel(sol), st.overlay
      ? { outer: { points: pts(natal).filter((x) => !['asc', 'mc'].includes(x.id)), cusps: natal.houses ? natal.houses.cusps : null }, aspects: AC.aspectsBetween(pts(sol), pts(natal).filter((x) => !['asc', 'mc'].includes(x.id)), { orbMult: 0.5 }).filter((a) => ['conj', 'sextile', 'square', 'trine', 'opp'].includes(a.type)), labels: { in: t('sol.lIn', 'соляр'), out: t('natal', 'натал') }, lang: UI.lang(), label: t('sol.wheelA', 'Соляр и натал'), scale: 1.1 }
      : { aspects: AC.aspectsWithin(pts(sol)).filter((a) => ['conj', 'sextile', 'square', 'trine', 'opp'].includes(a.type)), lang: UI.lang(), label: t('sol.wheelA1', 'Карта соляра'), scale: 1.1 });
    const ind = indicators(sol, natal);
    body.innerHTML = `<div class="card solar-head">
        <div class="row sb"><div class="row" style="gap:8px;flex-wrap:nowrap"><button class="iconbtn bd" type="button" data-soff="-1" aria-label="${esc(t('sol.prev', 'Предыдущий год'))}">${icon('left', 'sm')}</button><h3 class="sol-y">${esc(t('sol.title', 'Соляр {a}–{b}', { a: S.year, b: S.year + 1 }))}</h3><button class="iconbtn bd" type="button" data-soff="1" aria-label="${esc(t('sol.next', 'Следующий год'))}">${icon('right', 'sm')}</button></div>
          <div class="row" style="gap:8px"><select class="select sm" data-splace aria-label="${esc(t('pro.place', 'Место'))}"><option value="here" ${st.place !== 'birth' ? 'selected' : ''}>${esc(t('placeHome2', 'где живёт сейчас'))}</option><option value="birth" ${st.place === 'birth' ? 'selected' : ''}>${esc(t('placeBirth', 'место рождения'))}</option></select>
          <div class="seg sm" role="group"><button type="button" data-sov="1" aria-pressed="${st.overlay}">${esc(t('sol.ov', 'Соляр + натал'))}</button><button type="button" data-sov="0" aria-pressed="${!st.overlay}">${esc(t('sol.only', 'Только соляр'))}</button></div></div></div>
        <p class="small muted">${esc(t('sol.span', 'Год соляра: {a} — {b}{pl}. Соляр — карта на момент, когда Солнце возвращается в точку рождения; она описывает год до следующего дня рождения.', { a: UI.fmtDay(S.start, tz, { year: true, hour: true }), b: UI.fmtDay(S.end, tz, { year: true }), pl: S.place.name ? ' · ' + S.place.name : '' }))}</p>
      </div>
      <div class="solar-grid">
        <div class="wheel-card"><div class="wheel-box" data-swheel>${wheel()}</div></div>
        <div class="card stack sol-main"><h3>${esc(t('sol.main', 'Главное в соляре'))}</h3>${ind.map((x) => `<div class="sol-ind"><b>${esc(x.title)}</b><p>${esc(x.text || '')}</p></div>`).join('')}</div>
      </div>
      <div class="card stack"><div class="row sb"><h3>${esc(t('sol.sph', 'Прогноз года по сферам'))}</h3><span class="tiny muted">${esc(t('sol.sphHint', 'соляр + транзиты всего года · нажми на сферу — подробно'))}</span></div><div data-ssph><div class="sol-wait"><span class="spin"></span> ${esc(t('sol.calc', 'Считаю транзиты на весь год…'))} <b data-sprog>0%</b></div></div></div>
      <div class="card stack"><div class="row sb"><h3>${esc(t('sol.year', 'Год по месяцам'))}</h3><span class="tiny muted">${esc(t('sol.yearHint', 'баллы 1–10 по транзитам · наведи — подробности'))}</span></div><div data-smon></div><div data-sev></div></div>
      <div class="card stack solar-ask"><h3>${icon('ask')} ${esc(t('sol.ask', 'Спросить про этот год'))}</h3><p class="small muted">${esc(t('sol.askP', 'Ответ строится по соляру, транзитам и твоей карте. Можно спросить про сферу, событие или месяц.'))}</p>
        <div class="sa-chips">${[t('sol.q1', 'Что ждёт в любви в этом году?'), t('sol.q2', 'Будет ли рост дохода?'), t('sol.q3', 'Стоит ли менять работу?'), t('sol.q4', 'Когда лучше поехать в отпуск?'), t('sol.q5', 'Будет ли переезд?'), t('sol.q6', 'Как со здоровьем?')].map((q) => `<button class="chip" type="button" data-sq="${esc(q)}">${esc(q)}</button>`).join('')}</div>
        <form class="sa-form" data-sform><input class="input" data-sin autocomplete="off" maxlength="300" placeholder="${esc(t('sol.askPh', 'Например: когда лучше подписывать договор? как будет в марте?'))}"><button class="btn primary" type="submit">${icon('send', 'sm')} ${esc(t('ask.send', 'Спросить'))}</button></form>
        <div class="sa-list" data-salist></div></div>`;
    root.NWheel.bindTips(body);
    body.querySelectorAll('[data-soff]').forEach((b) => b.addEventListener('click', () => { st.off += +b.dataset.soff; st.qa = []; page(body, p); }));
    body.querySelector('[data-splace]').addEventListener('change', (e) => { st.place = e.target.value; st.qa = []; page(body, p); });
    body.querySelectorAll('[data-sov]').forEach((b) => b.addEventListener('click', () => { st.overlay = b.dataset.sov === '1'; body.querySelectorAll('[data-sov]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); body.querySelector('[data-swheel]').innerHTML = wheel(); }));
    // год по транзитам — частями, с прогрессом
    const prog = body.querySelector('[data-sprog]');
    const months = await yearDays(p, S, (f) => { if (prog) prog.textContent = Math.round(f * 100) + '%'; });
    if (!body.isConnected) return;
    const sph = spheres(S, natal, months);
    const slow = root.NCompute.slow(p, S.start, S.end);
    const ctx = { S, natal, months, sph, slow, p };
    drawSpheres(body, ctx); drawMonths(body, ctx); bindAsk(body, ctx);
  }

  function drawSpheres(body, ctx) {
    const X = XS(), TX = UI.TX(), MN = TX.MONTHS_N || TX.MONTHS;
    const box = body.querySelector('[data-ssph]');
    const mName = (m) => `${MN[m.mo - 1]}`;
    box.innerHTML = `<div class="sol-sph">${SPH_IDS.map((k) => { const s = ctx.sph[k], L = lvl(s.v); return `<button type="button" class="sol-tile ${L}${st.open === k ? ' on' : ''}" data-sk="${k}" aria-expanded="${st.open === k}">
        <span class="st-h">${icon(SPH[k].icon, 'sm')} <b>${esc(X.sph[k].name)}</b><em>${Math.round(s.v)}<small>/10</small></em></span>
        <span class="st-bar"><i style="width:${Math.round(s.v * 10)}%"></i></span>
        <small class="st-v">${esc(X.verdict[L])}</small>
        ${s.best.length ? `<small class="st-m">${icon('star', 'xs')} ${esc(s.best.map(mName).join(', '))}</small>` : ''}</button>`; }).join('')}</div><div data-sdet></div>`;
    const det = box.querySelector('[data-sdet]');
    const show = (k) => {
      if (!k) { det.innerHTML = ''; return; }
      const s = ctx.sph[k], L = lvl(s.v), sl = slowFor(k, ctx.natal, ctx.slow), tz = ctx.S.place.zone;
      det.innerHTML = `<div class="sol-det"><div class="row sb"><h4>${esc(X.sph[k].name)} · ${Math.round(s.v)}/10</h4><span class="tiny muted">${esc(t('sol.parts', 'по соляру {a} · по транзитам {b}', { a: s.solar.toFixed(1), b: s.tr.toFixed(1) }))}</span></div>
        <p class="lead">${esc(X.sph[k][L])}</p>
        ${s.lines.length ? `<ul class="sol-lines">${s.lines.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="small muted">${esc(t('sol.empty', 'В домах этой сферы в соляре нет планет — тема идёт ровно, всё решают управители и транзиты.'))}</p>`}
        ${sl.length ? `<span class="label">${esc(X.ans.slow)}</span><ul class="sol-lines">${sl.map((e) => `<li><span class="g">${root.NWheel.GLYPH[e.transiting]}${root.NWheel.ASP_G[e.type] || ''}${root.NWheel.GLYPH[e.natal] || ''}</span> ${esc(root.NExplain ? root.NExplain.phrase(e.transiting, e.natal, e.type) : '')} · ${esc(UI.fmtDay(e.start, tz))} — ${esc(UI.fmtDay(e.end, tz, { year: true }))}</li>`).join('')}</ul>` : ''}
        <span class="label">${esc(t('sol.byMonth', 'По месяцам'))}</span>${bars(s.months, k)}</div>`;
      root.NWheel.bindTips(det);
    };
    box.querySelectorAll('[data-sk]').forEach((b) => b.addEventListener('click', () => { st.open = st.open === b.dataset.sk ? null : b.dataset.sk; box.querySelectorAll('[data-sk]').forEach((x) => { x.classList.toggle('on', x.dataset.sk === st.open); x.setAttribute('aria-expanded', String(x.dataset.sk === st.open)); }); show(st.open); }));
    show(st.open);
  }

  function drawMonths(body, ctx) {
    const X = XS(), TX = UI.TX(), MN = TX.MONTHS_N || TX.MONTHS, tz = ctx.S.place.zone;
    const sc = (v) => clamp(v, 1, 10);
    body.querySelector('[data-smon]').innerHTML = `<div class="tbl-wrap"><table class="sol-heat"><thead><tr><th></th>${ctx.months.map((m) => `<th>${esc(MN[m.mo - 1].slice(0, 3))}<small>${String(m.y).slice(2)}</small></th>`).join('')}</tr></thead><tbody>
      <tr class="tot"><th>${esc(t('sol.overall', 'Общий фон'))}</th>${ctx.months.map((m) => { const v = sc(m.avg.overall); return `<td class="${lvl(v)}" data-tip="${esc(MN[m.mo - 1] + ' ' + m.y + ': ' + Math.round(v) + '/10')}">${Math.round(v)}</td>`; }).join('')}</tr>
      ${SPH_IDS.map((k) => `<tr><th>${esc(X.sph[k].name)}</th>${ctx.months.map((m) => { const v = sc(mScore(m, k)); return `<td class="${lvl(v)}" data-tip="${esc(X.sph[k].name + ' · ' + MN[m.mo - 1] + ' ' + m.y + ': ' + Math.round(v) + '/10')}">${Math.round(v)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
    // события года: долгие транзиты (точные даты), ретро быстрых планет, затмения
    const ev = [];
    for (const e of ctx.slow.transits) for (const d of e.exact) if (d >= ctx.S.start && d < ctx.S.end) ev.push({ d, g: `${root.NWheel.GLYPH[e.transiting]}${root.NWheel.ASP_G[e.type] || ''}${root.NWheel.GLYPH[e.natal] || ''}`, txt: root.NExplain ? root.NExplain.phrase(e.transiting, e.natal, e.type) : '', tone: root.NExplain ? root.NExplain.tone(e.transiting, e.type) : '' });
    for (const r of AC.retrogradePeriods(['mercury', 'venus', 'mars', 'jupiter', 'saturn'], ctx.S.start, ctx.S.end)) if (r.end >= ctx.S.start && r.start < ctx.S.end) ev.push({ d: r.start, g: root.NWheel.GLYPH[r.id] + 'R', txt: t('sol.retro', '{p} ретро до {d}', { p: TX.P[r.id].name, d: UI.fmtDay(r.end, tz, { year: true }) }), tone: 'retro' });
    for (const e of AC.eclipses(ctx.S.start, ctx.S.end)) { const h = ctx.natal.houses ? AC.houseOf(e.lon, ctx.natal.houses.cusps) : null; ev.push({ d: e.date, g: e.type === 'solar' ? '☉︎' : '☽︎', txt: (e.type === 'solar' ? t('sky.eclS', 'Солнечное затмение') : t('sky.eclL', 'Лунное затмение')) + ' ' + TX.S[AC.signOf(e.lon)].in + (h ? ' · ' + t('sol.eclH', 'в твоём {n} доме — {a}', { n: h, a: TX.H[h].area }) : ''), tone: 'ecl' }); }
    ev.sort((a, b) => a.d - b.d);
    body.querySelector('[data-sev]').innerHTML = ev.length ? `<span class="label">${esc(t('sol.events', 'Ключевые даты года'))}</span><div class="sol-ev">${ev.map((e) => `<div class="se ${e.tone}"><span class="mono">${esc(UI.fmtDay(e.d, tz, { year: true }))}</span><span class="g">${e.g}</span><span>${esc(e.txt)}</span></div>`).join('')}</div>` : '';
    root.NWheel.bindTips(body.querySelector('[data-smon]'));
  }

  function bindAsk(body, ctx) {
    const list = body.querySelector('[data-salist]'), form = body.querySelector('[data-sform]'), inp = body.querySelector('[data-sin]');
    const paint = () => { list.innerHTML = st.qa.map((x) => `<div class="sa-q"><b>${esc(x.q)}</b></div><div class="sa-a">${x.a}</div>`).join(''); root.NWheel.bindTips(list); };
    const go = async (q) => {
      q = String(q || '').trim(); if (!q) return;
      st.qa.push({ q, a: `<p class="muted"><span class="dots"><i></i><i></i><i></i></span> ${esc(t('sol.thinking', 'Смотрю соляр и транзиты…'))}</p>` }); paint();
      list.lastElementChild.scrollIntoView({ block: 'nearest', behavior: UI.reduceMotion() ? 'auto' : 'smooth' });
      let html = answer(q, ctx);
      const cfg = root.NCONFIG || {};
      if (cfg.aiEndpoint && root.NAI) {
        try {
          const solarFacts = { solar: { start: ctx.S.start.toISOString().slice(0, 10), end: ctx.S.end.toISOString().slice(0, 10), asc: AC.signOf(ctx.S.sol.houses ? ctx.S.sol.houses.asc : 0), planets: ctx.S.sol.points.filter((x) => TEN.includes(x.id)).map((x) => ({ p: x.id, sign: x.sign, house: x.house })), spheres: Object.fromEntries(SPH_IDS.map((k) => [k, Math.round(ctx.sph[k].v * 10) / 10])), months: ctx.months.map((m) => ({ m: `${m.y}-${UI.pad(m.mo)}`, overall: Math.round(m.avg.overall * 10) / 10 })) } };
          const r = await root.NAI.ask(q, ctx.p, { extra: solarFacts });
          if (r && r.answer && !r.local) html = `<p class="sa-ai">${esc(r.answer).replace(/\n/g, '<br>')}</p><details class="sa-calc"><summary class="small">${esc(t('sol.calcD', 'Расчёт приложения'))}</summary>${html}</details>`;
        } catch (e) { /* ответ по расчётам остаётся */ }
      } else await new Promise((r) => setTimeout(r, UI.reduceMotion() ? 0 : 900));
      st.qa[st.qa.length - 1].a = html; paint();
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); const q = inp.value; inp.value = ''; go(q); });
    body.querySelectorAll('[data-sq]').forEach((b) => b.addEventListener('click', () => go(b.dataset.sq)));
    paint();
  }

  root.NProMore = root.NProMore || {};
  root.NProMore.solar = page;
  root.NSolar = { solarOf, indicators, spheres, answer, yearDays };
})(window);
