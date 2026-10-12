/* «Моя карта»: колесо как в Sotis/Chronos (белый круг, градусы, значки аспектов) с перемоткой дней и часов,
   три режима — натал, натал + транзиты, небо на момент; справа — положения планет; ниже — главное о себе
   и подробные разборы, свёрнутые в аккордеоны. */
(function (root) {
  'use strict';
  const UI = root.NUI, AC = root.AstroCore, W = root.NWheel;
  const { t, esc, icon } = UI;
  const MAJOR = ['conj', 'sextile', 'square', 'trine', 'opp'];
  const IDS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'node', 'chiron', 'lilith', 'fortune'];
  const SKY_IDS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'node', 'chiron'];
  const st = { mode: 'transit', at: null, over: {} }; // по умолчанию — два круга (натал + транзиты); over[id] — пробное время рождения (Date, с секундами)
  const VS = '︎';

  function wheelOf(chart, opts) {
    opts = opts || {};
    const pts = chart.points.filter((p) => (opts.show || IDS).includes(p.id));
    const aspects = (opts.aspects || chart.aspects.filter((a) => MAJOR.includes(a.type) && !['fortune', 'lilith'].includes(a.a) && !['fortune', 'lilith'].includes(a.b)))
      .map((a) => ({ a: a.a, b: a.b, type: a.type, nature: a.nature, orb: a.orb, strength: a.strength, fromA: a.fromA, fromB: a.fromB }));
    const c = { points: pts, cusps: chart.houses ? chart.houses.cusps : null, asc: chart.houses ? chart.houses.asc : 0, mc: chart.houses ? chart.houses.mc : null };
    return W.svg(c, { aspects, lang: UI.lang(), label: opts.label, outer: opts.outer, labels: opts.labels, showOuter: opts.showOuter });
  }

  const hs = () => root.NStore.settings().houseSystem || 'placidus';
  const birthDate = (p) => AC.localToUTC(p.y, p.mo, p.d, p.timeKnown !== false ? p.h : 12, p.timeKnown !== false ? p.mi : 0, p.place.tz).date;
  function natalFor(p) {
    const o = st.over[p.id];
    if (!o) return UI.chartOf(p);
    return AC.chart({ date: o, timeKnown: true, zone: p.place.tz, lat: p.place.lat, lon: p.place.lon, name: p.name }, { houseSystem: hs() });
  }
  const fmtLon = (l) => { const s = Math.floor(AC.norm(l) / 30), d = AC.norm(l) % 30; return `${Math.floor(d)}°${UI.pad(Math.floor((d % 1) * 60))}′`; };
  const sg = (lon) => W.SIGN_G[Math.floor(AC.norm(lon) / 30)] + VS;
  const pg = (id) => root.NDay.pg(id);

  function posRows(points, cls) {
    const TX = UI.TX();
    return points.map((p) => `<div class="pos ${cls || ''}" role="button" tabindex="0" data-pid="${p.id}" data-side="${cls || 'in'}"><span class="g">${pg(p.id)}</span><span class="small">${esc(TX.P[p.id] ? TX.P[p.id].name : p.id)}${p.retro ? '<span class="r">R</span>' : ''}</span><span class="dg">${fmtLon(p.lon)} <span class="g" style="color:var(--lav-strong)">${sg(p.lon)}</span></span><span class="hs">${p.house ? p.house : ''}</span></div>`).join('');
  }

  async function page(el, params) {
    const p = params.id ? root.NStore.person(params.id) : root.NStore.active();
    if (!p) { location.hash = '#onboard'; return; }
    if (params.mode && ['natal', 'transit', 'sky'].includes(params.mode)) st.mode = params.mode;
    const TX = UI.TX(), here = UI.here();
    const place = p.place ? (UI.lang() === 'en' ? p.place.nameEn || p.place.name : p.place.name) : '';
    el.innerHTML = `
      <div class="sec-head"><span class="eyebrow">${t('chart.eyebrow', 'Натальная карта')}</span><h1>${esc(p.name)}</h1>
        <p>${esc(UI.fmtDate(p.y, p.mo, p.d))}${p.timeKnown !== false ? ', ' + UI.pad(p.h) + ':' + UI.pad(p.mi) : ''} · ${esc(place)}${p.timeKnown === false ? ' · ' + t('noTimeNote', 'без времени: дома и Асцендент не считаются') : ''}</p></div>
      <div class="row sb"><div class="seg" role="group" aria-label="${t('chart.mode', 'Что показать')}">${[['transit', t('chart.m.transit2', 'Два круга: натал + транзиты')], ['natal', t('chart.m.natal', 'Натал')], ['sky', t('chart.m.sky', 'Небо на момент')]].map(([k, n]) => `<button type="button" data-mode="${k}" aria-pressed="${st.mode === k}">${esc(n)}</button>`).join('')}</div>
        <div class="row"><a class="btn sm vip-btn" href="#rectify?id=${p.id}">${icon('crown', 'sm')} ${t('chart.rect', 'Ректификация')} <span class="vip-badge">VIP</span></a><a class="btn sm" href="#pro?id=${p.id}">${icon('pro', 'sm')} ${t('chart.pro', 'Профи-режим')}</a><a class="btn sm" href="#ask?topic=natal">${icon('ask', 'sm')} ${t('chart.ask', 'Спросить о карте')}</a></div></div>
      <p class="small muted" id="modeHint"></p>
      <div class="chart-layout">
        <div class="wheel-card">
          <div id="wInfo" class="row sb small" style="gap:8px"></div>
          <div class="wheel-box" id="wBox"></div>
          <div id="tbSlot"></div>
          <div id="rectSlot"></div>
          <div class="wheel-legend"><span><i style="background:var(--w-soft)"></i>${t('wl.soft', 'гармония (трин, секстиль)')}</span><span><i style="background:var(--w-hard)"></i>${t('wl.hard', 'напряжение (квадрат, оппозиция)')}</span><span><i style="background:var(--w-conj)"></i>${t('wl.conj', 'соединение')}</span><span class="hint-click">${icon('info', 'xs')} ${window.matchMedia && window.matchMedia('(hover: hover)').matches ? t('wl.tap', 'наведи или нажми на планету') : t('wl.tapTouch', 'нажми на планету — подробности')}</span></div>
        </div>
        <aside class="card stack" id="posBox"></aside>
      </div>
      <div id="portrait" class="stack s18"></div>
      <p class="tiny muted">${t('chart.note', 'Карта — не приговор, а инструкция к себе. Тексты — ориентир для самопознания, а не предсказание судьбы.')}</p>`;
    const hint = el.querySelector('#modeHint');
    let tb = null, portraitT = null;
    const at = () => st.at || new Date();
    const setHint = () => { hint.textContent = { natal: t('chart.h.natal', 'Твоя карта рождения. Стрелками можно сдвигать время рождения — так проверяют точность (ректификация). В профиле ничего не меняется, пока не нажмёшь «Сохранить».'), transit: t('chart.h.transit2', 'Внутренний круг — карта рождения, внешний круг — планеты на выбранный момент. Двигай дату, часы, минуты и секунды — справа видно динамику и все транзиты; нажми на транзит — расшифровка.'), sky: t('chart.h.sky', 'Небо на выбранный момент для места, где ты сейчас ({c}) — как карта транзита в Sotis.', { c: here.name || here.tz }) }[st.mode]; };
    const drawWheel = () => {
      const natal = natalFor(p);
      const wBox = el.querySelector('#wBox'), info = el.querySelector('#wInfo'), pos = el.querySelector('#posBox');
      if (!wBox) return;
      const mom = at();
      let svg, rows, aspList, trList = null;
      if (st.mode === 'natal') {
        svg = wheelOf(natal, { label: t('chart.of', 'Карта: {n}', { n: p.name }) });
        rows = `<span class="label">${t('pos.natal', 'Положения в карте')}</span><div class="poslist">${posRows(natal.points.filter((x) => IDS.includes(x.id) || x.id === 'asc' || x.id === 'mc'))}</div>`;
        aspList = natal.aspects.filter((a) => MAJOR.includes(a.type) && !['fortune', 'lilith'].includes(a.a) && !['fortune', 'lilith'].includes(a.b)).sort((a, b) => a.orb - b.orb);
        const q = st.over[p.id] ? UI.partsIn(st.over[p.id], p.place.tz) : null;
        info.innerHTML = `<span class="tag acc">${icon('user', 'xs')} ${esc(p.name)}</span><span class="tag plain">${q ? `${UI.fmtDMY(q)} ${UI.fmtHMS(q, q.s ? true : false)}` : `${UI.pad(p.d)}.${UI.pad(p.mo)}.${p.y}${p.timeKnown !== false ? ' ' + UI.pad(p.h) + ':' + UI.pad(p.mi) : ''}`} · ${esc(place)}</span><span class="tag plain">${esc((TX.houseSystems || {})[hs()] || hs())}</span>`;
      } else if (st.mode === 'transit') {
        // транзиты на место «где я сейчас» — с домами, чтобы во внешнем круге были свои куспиды
        const sky = AC.chart({ date: mom, lat: here.lat, lon: here.lon, zone: here.tz, timeKnown: true }, { houseSystem: hs() });
        const outer = { points: sky.points.filter((x) => SKY_IDS.includes(x.id)), cusps: sky.houses ? sky.houses.cusps : null };
        const inPts = natal.points.filter((x) => IDS.filter((i) => !['fortune', 'lilith'].includes(i)).includes(x.id)).concat(natal.houses ? [{ id: 'asc', lon: natal.houses.asc }, { id: 'mc', lon: natal.houses.mc }] : []);
        aspList = AC.aspectsBetween(inPts, outer.points, { orbMult: 0.4 }).filter((a) => MAJOR.includes(a.type)).sort((a, b) => a.orb - b.orb);
        svg = wheelOf(natal, { outer, aspects: aspList.slice(0, 18).map((a) => Object.assign({}, a, { fromA: 'in', fromB: 'out' })), labels: { in: t('natal', 'натал'), out: t('transit', 'транзит') }, label: t('chart.trOf', 'Транзиты к карте: {n}', { n: p.name }) });
        trList = aspList;
        rows = dynPanel(p, natal, mom, aspList, outer);
        info.innerHTML = `<span class="tag acc">${icon('clock', 'xs')} ${esc(UI.fmtDay(mom, here.tz, { year: 'numeric', hour: '2-digit', second: true }))}</span><span class="tag plain">${esc(here.name || here.tz)}</span>${vocTag(mom, here.tz)}<span class="ring-key"><i class="rk-in"></i>${t('ring.in', 'внутри — натал')}<i class="rk-out"></i>${t('ring.out', 'снаружи — транзиты')}</span>`;
      } else {
        const sky = AC.chart({ date: mom, lat: here.lat, lon: here.lon, zone: here.tz, timeKnown: true }, { houseSystem: hs() });
        svg = wheelOf(sky, { show: SKY_IDS, label: t('chart.skyOf', 'Небо на момент') });
        rows = `<span class="label">${t('pos.sky', 'Положения на момент')}</span><div class="poslist">${posRows(sky.points.filter((x) => SKY_IDS.includes(x.id) || x.id === 'asc' || x.id === 'mc'), 'tr')}</div>`;
        aspList = sky.aspects.filter((a) => MAJOR.includes(a.type) && SKY_IDS.includes(a.a) && SKY_IDS.includes(a.b)).sort((a, b) => a.orb - b.orb);
        info.innerHTML = `<span class="tag acc">${icon('clock', 'xs')} ${esc(UI.fmtDay(mom, here.tz, { year: 'numeric', hour: '2-digit', second: true }))}</span><span class="tag plain">${esc(here.name || here.tz)}</span>${vocTag(mom, here.tz)}`;
      }
      wBox.innerHTML = svg;
      if (trList) {
        pos.innerHTML = rows;
        bindDyn(el, p, natal, trList, mom);
        bindPlanets(el, p, natal);
        root.NWheel.bindTips(wBox); root.NWheel.bindTips(pos);
        drawRect();
        return;
      }
      const asp = aspList.slice(0, 14).map((a) => `<div class="pos" style="grid-template-columns:62px minmax(0,1fr) auto;cursor:default"><span class="g" style="color:${a.nature === 'soft' ? 'var(--w-soft)' : a.nature === 'hard' ? 'var(--w-hard)' : 'var(--w-conj)'}">${pg(a.a)}${W.ASP_G[a.type]}${VS}${pg(a.b)}</span><span class="small">${esc((TX.P[a.a] || {}).name || a.a)} — ${esc((TX.P[a.b] || {}).name || a.b)} · ${esc(TX.ASP[a.type] ? TX.ASP[a.type].name : a.type)}</span><span class="dg">${a.orb.toFixed(1)}°${a.applying != null ? (a.applying ? ' ↗' : ' ↘') : ''}</span></div>`).join('');
      pos.innerHTML = rows + `<details${st.mode === 'transit' ? ' open' : ''}><summary class="more" style="cursor:pointer">${st.mode === 'transit' ? t('pos.aspTr', 'Аспекты транзитов к карте ({n})', { n: aspList.length }) : t('pos.asp', 'Аспекты ({n})', { n: aspList.length })}</summary><div class="poslist" style="margin-top:6px">${asp || `<p class="muted small">${t('pos.noAsp', 'Точных аспектов нет')}</p>`}</div></details>
        ${st.mode === 'natal' ? elemBars(natal) : ''}`;
      bindPlanets(el, p, natal);
      root.NWheel.bindTips(wBox); root.NWheel.bindTips(pos);
      if (st.mode === 'natal') { clearTimeout(portraitT); portraitT = setTimeout(() => drawPortrait(el, p, natal), st.over[p.id] ? 350 : 0); }
      drawRect();
    };
    const drawRect = () => {
      const slot = el.querySelector('#rectSlot'); if (!slot) return;
      const o = st.over[p.id];
      if (st.mode !== 'natal' || !o) { slot.innerHTML = ''; return; }
      const q = UI.partsIn(o, p.place.tz);
      slot.innerHTML = `<div class="rect-banner">${icon('alert', 'sm')}<span>${t('rect.changed', 'Пробное время рождения: {d} {t} (в профиле — {p}).', { d: UI.fmtDMY(q), t: UI.fmtHMS(q, q.s ? true : false), p: p.timeKnown !== false ? `${UI.pad(p.h)}:${UI.pad(p.mi)}` : t('rect.unknown', 'время не указано') })}</span><span class="spacer"></span><button class="btn sm" type="button" data-rreset>${t('rect.reset', 'Вернуть')}</button><button class="btn sm primary" type="button" data-rsave>${t('rect.save', 'Сохранить в профиль')}</button></div>`;
      slot.querySelector('[data-rreset]').addEventListener('click', () => { delete st.over[p.id]; mountBar(); drawWheel(); });
      slot.querySelector('[data-rsave]').addEventListener('click', () => {
        const nq = UI.partsIn(st.over[p.id], p.place.tz);
        root.NStore.upsertPerson(Object.assign({}, p, { y: nq.y, mo: nq.mo, d: nq.d, h: nq.h, mi: nq.mi, timeKnown: true }));
        delete st.over[p.id]; UI.toast(t('rect.saved', 'Время рождения сохранено')); root.NApp.route(true);
      });
    };
    const mountBar = () => {
      const slot = el.querySelector('#tbSlot'); if (tb && tb.stop) tb.stop();
      if (st.mode === 'natal') {
        const bar = UI.timebar({ date: st.over[p.id] || birthDate(p), tz: p.place.tz, nowLabel: t('tb.reset', 'Как в профиле'), reset: () => birthDate(p), play: false, dayRange: 30 });
        slot.innerHTML = bar.html;
        tb = bar.bind(slot, (d) => { if (Math.abs(d - birthDate(p)) < 30000) delete st.over[p.id]; else st.over[p.id] = d; drawWheel(); });
      } else {
        const bar = UI.timebar({ date: at(), tz: here.tz, nowLabel: t('tb.now', 'Сейчас'), reset: () => { st.at = null; return new Date(); } });
        slot.innerHTML = bar.html;
        tb = bar.bind(slot, (d) => { st.at = Math.abs(d - Date.now()) < 60000 ? null : d; drawWheel(); });
      }
    };
    const jumpTo = (d) => { st.at = Math.abs(d - Date.now()) < 60000 ? null : d; if (tb && tb.set) tb.set(d); drawWheel(); };
    el.addEventListener('natalogy:jump', (e) => jumpTo(e.detail));
    el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { st.mode = b.dataset.mode; el.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); setHint(); mountBar(); drawWheel(); if (st.mode === 'natal') drawPortrait(el, p, natalFor(p)); }));
    setHint(); mountBar(); drawWheel();
    if (st.mode !== 'natal') drawPortrait(el, p, natalFor(p));
  }

  // ---------- динамика рядом с колесом: поддержка/напряжение ±30 дней и транзиты на момент ----------
  const DW = { moon: 0.25, sun: 0.6, mercury: 0.5, venus: 0.6, mars: 0.9, jupiter: 1.2, saturn: 1.5, uranus: 1.5, neptune: 1.4, pluto: 1.6 };
  const NAT_IDS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const sparkCache = new Map();
  function daySum(natal, key, dayNo) {
    const k = key + '|' + dayNo;
    if (sparkCache.has(k)) return sparkCache.get(k);
    const sky = AC.chart({ date: new Date((dayNo + 0.5) * 86400000), timeKnown: false });
    const tr = sky.points.filter((x) => DW[x.id]);
    const inPts = natal.points.filter((x) => NAT_IDS.includes(x.id)).concat(natal.houses ? [{ id: 'asc', lon: natal.houses.asc }, { id: 'mc', lon: natal.houses.mc }] : []);
    let soft = 0, hard = 0;
    for (const a of AC.aspectsBetween(inPts, tr, { orbMult: 0.5 })) {
      if (!MAJOR.includes(a.type)) continue;
      const v = DW[a.b] * (a.strength != null ? a.strength : 0.5);
      const tn = root.NExplain.tone(a.b, a.type);
      if (tn === 'soft') soft += v; else if (tn === 'hard') hard += v; else { soft += v * 0.35; hard += v * 0.35; }
    }
    const r = { soft, hard };
    sparkCache.set(k, r); if (sparkCache.size > 4000) sparkCache.delete(sparkCache.keys().next().value);
    return r;
  }
  function sparkSVG(natal, key, mom) {
    const c = Math.floor(mom.getTime() / 86400000), N = 30;
    const list = [];
    for (let i = -N; i <= N; i++) list.push(daySum(natal, key, c + i));
    // баланс дня: поддержка минус напряжение — так видно, какие дни легче, а какие тяжелее
    const net = list.map((x) => x.soft - x.hard);
    const max = Math.max(0.5, ...net.map((v) => Math.abs(v)));
    const Wd = 366, H = 96, bw = Wd / list.length, mid = H / 2;
    const tz = UI.here().tz;
    let s = `<svg viewBox="0 0 ${Wd} ${H + 16}" class="spark" role="img" aria-label="${esc(t('dyn.near', 'Динамика ±30 дней'))}"><line x1="0" y1="${mid}" x2="${Wd}" y2="${mid}" stroke="var(--line-strong)"/>`;
    list.forEach((v, i) => {
      const x = i * bw, n = net[i], h = Math.max(1, (Math.abs(n) / max) * (mid - 4));
      const d = new Date((c - N + i + 0.5) * 86400000);
      s += `<g class="sp-d" data-sd="${i - N}" data-tip="${esc(UI.fmtDay(d, tz, { year: 'numeric' }) + ' · ' + (n >= 0 ? t('dyn.softer', 'легче') : t('dyn.harder', 'напряжённее')) + '\n' + t('dyn.soft', 'поддержка') + ' ' + v.soft.toFixed(1) + ' · ' + t('dyn.hard', 'напряжение') + ' ' + v.hard.toFixed(1))}"><rect x="${(x).toFixed(1)}" y="0" width="${bw.toFixed(2)}" height="${H}" fill="transparent"/><rect x="${(x + 0.6).toFixed(1)}" y="${(n >= 0 ? mid - h : mid).toFixed(1)}" width="${Math.max(1, bw - 1.2).toFixed(2)}" height="${h.toFixed(1)}" rx="1.5" fill="${n >= 0 ? 'var(--dyn-up)' : 'var(--dyn-down)'}"/></g>`;
    });
    const fx = (N + (mom.getTime() / 86400000 - c)) * bw;
    s += `<line x1="${fx.toFixed(1)}" y1="0" x2="${fx.toFixed(1)}" y2="${H}" stroke="var(--lav-strong)" stroke-width="2"/><circle cx="${fx.toFixed(1)}" cy="${mid}" r="3.5" fill="var(--lav-strong)"/>`;
    s += `<text x="0" y="${H + 13}" font-family="var(--f-mono)" font-size="10" fill="var(--muted)">${UI.fmtDay(new Date((c - N) * 86400000), tz)}</text><text x="${Wd}" y="${H + 13}" text-anchor="end" font-family="var(--f-mono)" font-size="10" fill="var(--muted)">${UI.fmtDay(new Date((c + N) * 86400000), tz)}</text></svg>`;
    return s;
  }
  function dynPanel(p, natal, mom, aspList, outer) {
    const TX = UI.TX();
    const key = [p.id, p.y, p.mo, p.d, p.h, p.mi, natal.houses ? natal.houses.asc.toFixed(2) : ''].join('|');
    const rows = aspList.slice(0, 16).map((a, i) => {
      const tn = root.NExplain.tone(a.b, a.type);
      const np = TX.P[a.a] || { name: a.a };
      return `<button class="trrow ${tn}" type="button" data-tr="${i}"><span class="g">${pg(a.b)}${W.ASP_G[a.type]}${VS}${pg(a.a)}</span><span class="small"><b>${esc(root.NExplain.phrase(a.b, a.a, a.type))}</b><br><span class="muted">${esc(root.NExplain.short({ T: a.b, type: a.type }))}</span></span><span class="dg">${a.orb.toFixed(1)}°${a.applying != null ? (a.applying ? ' ↗' : ' ↘') : ''}</span></button>`;
    }).join('');
    return `<div class="stack s6"><div class="row sb"><span class="label">${t('dyn.nearT', 'Динамика вокруг даты')}</span><span class="tiny muted">${t('dyn.nearHint', 'нажми на день — перейти')}</span></div>
        <div data-spark>${sparkSVG(natal, key, mom)}</div>
        <div class="legend tiny"><span><i style="background:var(--dyn-up)"></i>${t('dyn.softer2', 'день легче (больше поддержки)')}</span><span><i style="background:var(--dyn-down)"></i>${t('dyn.harder2', 'день напряжённее')}</span><span><i style="background:var(--lav-strong)"></i>${t('dyn.moment', 'выбранный момент')}</span></div></div>
      <div class="stack s6"><div class="row sb"><span class="label">${t('pos.aspTr2', 'Транзиты к карте ({n})', { n: aspList.length })}</span><span class="hint-click">${icon('info', 'xs')} ${t('trx.tap', 'нажми — что это значит')}</span></div>
        <div class="trlist">${rows || `<p class="muted small">${t('pos.noAsp', 'Точных аспектов нет')}</p>`}</div></div>
      <details><summary class="more" style="cursor:pointer">${t('pos.transit', 'Транзиты на момент')}</summary><div class="poslist" style="margin-top:6px">${posRows(outer.points.map((x) => Object.assign({}, x, { house: natal.houses ? AC.houseOf(x.lon, natal.houses.cusps) : null })), 'tr')}</div></details>
      <details><summary class="more" style="cursor:pointer">${t('pos.natalToo', 'Положения в карте рождения')}</summary><div class="poslist" style="margin-top:6px">${posRows(natal.points.filter((x) => IDS.includes(x.id) || x.id === 'asc' || x.id === 'mc'))}</div></details>`;
  }
  function bindDyn(el, p, natal, list, mom) {
    el.querySelectorAll('#posBox [data-tr]').forEach((b) => b.addEventListener('click', () => {
      const a = list[+b.dataset.tr];
      root.NExplain.transit({ T: a.b, N: a.a, type: a.type, orb: a.orb, applying: a.applying }, { natal, person: p });
    }));
    el.querySelectorAll('#posBox [data-sd]').forEach((g) => g.addEventListener('click', () => {
      const d = new Date(mom.getTime() + (+g.dataset.sd) * 86400000);
      el.dispatchEvent(new CustomEvent('natalogy:jump', { detail: d }));
    }));
  }

  function vocTag(mom, tz) {
    try {
      const v = AC.voidOfCourse(AC.addDays(mom, -3), AC.addDays(mom, 3)).find((x) => x.start <= mom && x.end > mom);
      return v ? `<span class="tag bad">${t('voc', 'Луна без курса')} ${t('until', 'до')} ${esc(UI.fmtDay(v.end, tz, { hour: '2-digit', minute: '2-digit' }))}</span>` : `<span class="tag ok">${t('voc.on', 'Луна в курсе')}</span>`;
    } catch (e) { return ''; }
  }
  function elemBars(c) {
    const TX = UI.TX(), e = c.summary.elements;
    const col = { fire: 'var(--w-fire)', earth: 'var(--w-earth)', air: 'var(--w-air)', water: 'var(--w-water)' };
    return `<span class="label" style="margin-top:6px">${t('chart.elements', 'Стихии')}</span><div class="elem-bars">${['fire', 'earth', 'air', 'water'].map((k) => `<div class="eb"><span>${esc(TX.elements ? TX.elements[k] : k)}</span><span class="pbar" style="height:10px"><i style="width:${e[k]}%;background:${col[k]}"></i></span><b class="num small">${e[k]}%</b></div>`).join('')}</div>`;
  }

  // планета: подробности по нажатию
  function bindPlanets(el, p, natal) {
    const open = (id, side) => openPlanet(p, natal, id, side);
    el.querySelectorAll('#posBox [data-pid]').forEach((r) => { r.addEventListener('click', () => open(r.dataset.pid, r.dataset.side)); r.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(r.dataset.pid, r.dataset.side); }); });
    el.querySelectorAll('#wBox .nw-pl').forEach((g) => { g.addEventListener('click', () => open(g.dataset.id, g.classList.contains('out') || st.mode === 'sky' ? 'tr' : 'in')); g.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(g.dataset.id, g.classList.contains('out') || st.mode === 'sky' ? 'tr' : 'in'); }); });
  }
  function openPlanet(p, natal, id, side) {
    const TX = UI.TX(), T = TX;
    if (side === 'tr') {
      const mom = st.at || new Date();
      const sky = AC.chart({ date: mom, timeKnown: false });
      const b = sky.byId[id]; if (!b) return;
      const inPts = natal.points.filter((x) => !['fortune', 'lilith'].includes(x.id)).concat(natal.houses ? [{ id: 'asc', lon: natal.houses.asc }, { id: 'mc', lon: natal.houses.mc }] : []);
      const asp = AC.aspectsBetween(inPts, [b], { orbMult: 0.6 }).filter((a) => MAJOR.includes(a.type)).sort((a, c) => a.orb - c.orb);
      const h = natal.houses ? AC.houseOf(b.lon, natal.houses.cusps) : null;
      UI.sheet(`<div class="stack s18"><div class="row"><span class="g" style="font-size:34px;color:var(--w-planet2)">${pg(id)}</span><div><b>${esc(T.P[id].name)} ${esc(T.S[b.sign].in)}</b><p class="small muted">${fmtLon(b.lon)} ${sg(b.lon)}${b.retro ? ' · ' + t('retro', 'ретроградный') : ''}${h ? ' · ' + t('pl.inYourHouse', 'в твоём {n} доме', { n: h }) : ''}</p></div></div>
        ${h ? `<div class="card soft small">${esc(t('pl.trHouse', 'Пока {p} идёт по твоему {n} дому, его темы — {a}.', { p: T.P[id].name, n: h, a: T.H[h].area }))}</div>` : ''}
        <div class="stack s6"><span class="label">${t('pl.trAsp', 'Аспекты к твоей карте')}</span>${asp.length ? asp.map((a) => { const e = { kind: 'transit', T: id, N: a.a, type: a.type, v: root.NScore.nature(id, a.type) }; const x = T.evText(e, UI.here().tz); return `<div class="ev" style="grid-template-columns:62px minmax(0,1fr)"><span class="gly ${e.v > 0 ? 'ok' : 'bad'}">${pg(id)}${W.ASP_G[a.type]}${VS}${pg(a.a)}</span><div><b>${esc(x.title)}</b><p>${esc(x.text)} ${t('orb', 'орбис')} ${a.orb.toFixed(1)}°</p></div></div>`; }).join('') : `<p class="muted small">${t('pos.noAsp', 'Точных аспектов нет')}</p>`}</div></div>`, { title: T.P[id].name, eyebrow: t('transit', 'транзит') });
      return;
    }
    const b = natal.byId[id]; if (!b) return;
    const sign = b.sign;
    let text = '';
    const src = T[id] && T[id][sign];
    if (src) text = typeof src === 'string' ? src : `${src.t}. ${src.p}`;
    else text = `${T.P[id].area[0].toUpperCase() + T.P[id].area.slice(1)} — ${T.S[sign].style}.`;
    const asp = natal.aspects.filter((a) => (a.a === id || a.b === id) && MAJOR.includes(a.type)).sort((a, c) => a.orb - c.orb);
    const pairText = (a, c, soft) => { const x = T.pairs && T.pairs[[a, c].sort().join('|')]; return x ? (soft ? x.s : x.h) : (T.pairGeneric ? T.pairGeneric(a, c, soft) : ''); };
    UI.sheet(`<div class="stack s18"><div class="row"><span class="g" style="font-size:34px;color:var(--lav-strong)">${pg(id)}</span><div><b>${esc(T.P[id].name)} ${esc(T.S[sign].in)}${b.house ? ' · ' + t('pl.house', '{n} дом', { n: b.house }) : ''}</b><p class="small muted">${fmtLon(b.lon)} ${sg(b.lon)}${b.retro ? ' · ' + t('retro', 'ретроградный') : ''}${b.dignity && T.dignity ? ' · ' + esc(T.dignity[b.dignity].split(' — ')[0]) : ''}</p></div></div>
      <div class="card soft stack s6"><span class="label">${esc(T.P[id].short || '')}</span><p>${esc(T.gend(text, p.gender))}</p>${b.house ? `<p class="small muted">${esc(t('pl.houseTxt', 'В {n} доме: {w}.', { n: b.house, w: T.H[b.house].where }))}</p>` : ''}</div>
      ${asp.length ? `<div class="stack s6"><span class="label">${t('pl.asp', 'Связи с другими планетами')}</span>${asp.map((a) => { const o = a.a === id ? a.b : a.a; const soft = a.nature === 'soft' || (a.type === 'conj' && ['venus', 'jupiter', 'sun', 'moon', 'mercury'].includes(o)); return `<div class="ev" style="grid-template-columns:62px minmax(0,1fr)"><span class="gly ${a.type === 'conj' ? 'acc' : soft ? 'ok' : 'bad'}">${pg(id)}${W.ASP_G[a.type]}${VS}${pg(o)}</span><div><b>${esc(T.P[id].name)} ${W.ASP_G[a.type]}${VS} ${esc((T.P[o] || {}).name || o)}</b><p>${esc(T.gend(pairText(id, o, soft) || '', p.gender))}</p><div class="ctx">${esc(T.ASP[a.type] ? T.ASP[a.type].name : a.type)}, ${t('orb', 'орбис')} ${a.orb.toFixed(1)}°</div></div></div>`; }).join('')}</div>` : ''}
      <a class="btn" href="#ask?topic=natal">${icon('ask')} ${t('chart.ask', 'Спросить о карте')}</a></div>`, { title: T.P[id].name, eyebrow: p.name });
  }

  // главное о себе + свёрнутые разборы
  function drawPortrait(el, p, chart) {
    const box = el.querySelector('#portrait'); if (!box) return;
    const portrait = root.NPortrait.build(chart, UI.lang(), p.gender);
    const big = portrait.sections.find((s) => s.id === 'big3');
    const rest = portrait.sections.filter((s) => s.id !== 'big3');
    const ICON = { life: '☿', image: 'AC', plus: '✦', minus: '△' };
    const itemsHTML = (items) => `<div class="items">${items.map((i) => `<div class="item ${i.tone || ''}"><span class="gl">${esc(i.glyph || '•')}</span><div><h4>${esc(i.title)}</h4><p>${esc(i.text)}</p>${i.why ? `<div class="why">${esc(i.why)}</div>` : ''}</div></div>`).join('')}</div>`;
    box.innerHTML = `
      <section class="card pad-lg stack s18"><div class="row sb"><h2>${t('chart.main', 'Главное о тебе')}</h2><span class="tag gold">${t('chart.big3', 'Солнце · Луна · Асцендент')}</span></div>
        <div class="grid3">${big.items.map((i) => `<div class="b3" style="grid-template-columns:52px minmax(0,1fr)"><span class="gl">${i.glyph === 'AC' ? '<span style="font:800 14px var(--f-ui)">AC</span>' : esc(i.glyph)}<small>${esc(i.sign)}</small></span><div class="stack s6"><span class="label">${esc(i.label)}</span><b>${esc(i.title)}</b><p>${esc(i.text)}</p><div class="todo">${esc(i.todo)}</div></div></div>`).join('')}</div></section>
      <div class="stack" style="gap:10px">
        <div class="row sb"><h2>${t('chart.more', 'Подробные разборы')}</h2><span class="hint-click">${icon('info', 'xs')} ${t('chart.moreHint', 'нажми на раздел, чтобы раскрыть')}</span></div>
        ${big.items.length ? UI.acc({ title: t('chart.growth', 'Над чем работать'), sub: big.items.map((i) => i.label).join(' · '), icon: '☉︎', body: `<div class="items">${big.items.map((i) => `<div class="item minus"><span class="gl">${i.glyph === 'AC' ? 'AC' : esc(i.glyph)}</span><div><h4>${esc(i.label)}</h4><p>${esc(i.minus)}</p><div class="why">${esc(i.why)}</div></div></div>`).join('')}</div>` }) : ''}
        ${rest.map((s) => UI.acc({ title: s.title, sub: s.items.slice(0, 3).map((i) => i.title).join(' · ') + (s.items.length > 3 ? ` · +${s.items.length - 3}` : ''), icon: `<span style="font:${ICON[s.id] === 'AC' ? '800 13px var(--f-ui)' : '400 18px var(--f-glyph)'}">${ICON[s.id] || '✦'}</span>`, body: itemsHTML(s.items) })).join('')}
      </div>`;
  }

  root.NChart = { wheelOf };
  (root.NPages = root.NPages || {}).chart = { render: page };
})(window);
