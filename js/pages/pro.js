/* Профи-режим: карты любых типов, двойные колёса, таблица аспектов (с куспидами), положения, сохранённые карты.
   Каждая карта — самостоятельная: свой человек или данные вручную (имя, дата, время, город), свой тип,
   своё время с ползунками дней и часов, свои точки/аспекты/орбисы/дома. «Две карты» — две такие панели рядом.
   Остальные методы — pro-more.js, ректификация — rectify-page.js. */
(function (root) {
  'use strict';
  const UI = root.NUI, AC = root.AstroCore, PRO = root.ProAstro;
  const { t, esc, icon } = UI;
  const G = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇', node: '☊', chiron: '⚷', lilith: '⚸', fortune: '⊗', asc: 'AC', mc: 'MC' };
  const AG = { conj: '☌', sextile: '⚹', square: '□', trine: '△', opp: '☍', quincunx: '⚻', semisextile: '⚺', semisquare: '∠', sesquisquare: '⚼', quintile: 'Q' };
  const ALL_PTS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'node', 'chiron', 'lilith', 'fortune', 'asc', 'mc'];
  const MAJOR = ['conj', 'sextile', 'square', 'trine', 'opp'], MINOR = ['quincunx', 'semisextile', 'semisquare', 'sesquisquare', 'quintile'];
  const TYPES = ['natal', 'transit', 'solar', 'lunar', 'directions', 'progressions', 'horary', 'synastry', 'composite'];
  const MOMENT = ['transit', 'directions', 'progressions', 'horary', 'lunar']; // у этих типов ползунок двигает момент; у остальных — время рождения
  let tab = 'chart';
  const specs = { main: null, left: null, right: null };

  const nowLocal = (tz) => { const q = UI.partsIn(new Date(), tz); return `${q.y}-${UI.pad(q.mo)}-${UI.pad(q.d)}T${UI.pad(q.h)}:${UI.pad(q.mi)}`; };
  const parseLocal = (s, tz) => { if (/Z$/.test(String(s))) { const d = new Date(s); if (!isNaN(d)) return d; } const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/); if (!m) return new Date(); return AC.localToUTC(+m[1], +m[2], +m[3], +m[4], +m[5], tz).date; };
  const fmtLon = (l) => { const TX = UI.TX(); const s = AC.signOf(l); return `${Math.floor(l % 30)}°${UI.pad(Math.floor((l % 1) * 60))}′ ${TX.S[s].name}`; };
  const pName = (id) => (UI.TX().P[id] ? UI.TX().P[id].name : /^c\d+$/.test(id) ? t('cusp', 'Куспид') + ' ' + id.slice(1) : id);
  const mkView = () => ({ pts: ALL_PTS.filter((x) => x !== 'fortune'), asp: MAJOR.slice(), cusps: false, orb: 1, hs: root.NStore.settings().houseSystem || 'placidus' });

  function defaultSpec(type, p) {
    const here = UI.here();
    const td = UI.todayIn(here.tz), solarYear = p && (td.mo < p.mo || (td.mo === p.mo && td.d < p.d)) ? td.y - 1 : td.y; // соляр, который действует сейчас
    return { type: type || 'natal', a: p.id, custom: null, shiftA: null, b: (root.NStore.people().find((x) => x.id !== p.id) || {}).id || null, date: nowLocal(here.tz), year: solarYear, place: 'here', overlay: true, ring: true, dir: 'arc', view: mkView() };
  }
  /** Старые сохранённые карты — без своих настроек показа и данных вручную. */
  function normSpec(s, p) { const d = defaultSpec(s && s.type, p); const out = Object.assign(d, s || {}); out.view = Object.assign(mkView(), (s && s.view) || {}); return out; }

  // ---------- кто на карте: человек из «Людей» или данные, введённые прямо в панель ----------
  function subjectOf(spec) {
    if (spec.a === 'custom' && spec.custom && spec.custom.place) return Object.assign({ id: 'custom' }, spec.custom);
    return root.NStore.person(spec.a) || root.NStore.active();
  }
  const birthDate = (p) => AC.localToUTC(p.y, p.mo, p.d, p.timeKnown !== false ? p.h : 12, p.timeKnown !== false ? p.mi : 0, p.place.tz).date;
  const cache = new Map();
  function chartFor(p, hs, at) {
    const k = [p.y, p.mo, p.d, p.h, p.mi, p.timeKnown, p.place.lat, p.place.lon, p.place.tz, hs, at ? at.getTime() : ''].join('|');
    if (cache.has(k)) return cache.get(k);
    let c;
    if (at) c = AC.chart({ date: at, timeKnown: true, zone: p.place.tz, lat: p.place.lat, lon: p.place.lon, name: p.name }, { houseSystem: hs });
    else c = AC.chart({ y: p.y, mo: p.mo, d: p.d, h: p.h, mi: p.mi, timeKnown: p.timeKnown !== false, zone: p.place.tz, lat: p.place.lat, lon: p.place.lon, name: p.name }, { houseSystem: hs });
    cache.set(k, c); if (cache.size > 80) cache.delete(cache.keys().next().value);
    return c;
  }
  const natalOf = (spec) => chartFor(subjectOf(spec), spec.view.hs, spec.shiftA ? new Date(spec.shiftA) : null);

  function placeOf(spec, p) { const h = UI.here(); return spec.place === 'birth' ? { lat: p.place.lat, lon: p.place.lon, zone: p.place.tz } : { lat: h.lat, lon: h.lon, zone: h.tz }; }
  const cuspPts = (c) => (c && c.houses ? c.houses.cusps.map((lon, i) => ({ id: 'c' + (i + 1), lon })).filter((x) => x.id !== 'c1' && x.id !== 'c10') : []);
  const toWheel = (c) => ({ points: c.points, cusps: c.houses ? c.houses.cusps : null, asc: c.houses ? c.houses.asc : 0, mc: c.houses ? c.houses.mc : null });

  /** Собрать карту по описанию панели. */
  function build(spec) {
    const TX = UI.TX(), v = spec.view;
    const pts = new Set(v.pts), asp = new Set(v.asp);
    const sel = (list) => list.filter((x) => pts.has(x.id));
    const keepAsp = (list) => list.filter((x) => asp.has(x.type));
    const optsAsp = () => ({ minor: v.asp.some((x) => MINOR.includes(x)), orbMult: v.orb });
    const p = subjectOf(spec);
    const natal = natalOf(spec);
    const tz = UI.here().tz;
    const date = parseLocal(spec.date, tz);
    const out = { title: '', sub: '', info: [], inner: null, outer: null, aspects: [], innerChart: natal, labels: null, p, moments: [] };
    const inPts = (c) => sel(c.points).concat(v.cusps ? cuspPts(c) : []);
    const opt = Object.assign({}, natal.opts, { houseSystem: v.hs });
    switch (spec.type) {
      case 'natal': {
        out.inner = toWheel(natal); out.title = TX.chartTypes.natal + ' · ' + p.name;
        out.moments.push({ label: t('mom.birth', 'Момент рождения'), date: natal.date, tz: p.place.tz, place: p.place.name, main: spec.ring === false });
        if (spec.ring !== false) {
          // в любой наталке — второй круг с транзитами и ползунок даты
          const h = UI.here(), sky = AC.chart({ date, lat: h.lat, lon: h.lon, zone: tz, timeKnown: true }, opt); // дома транзита — на место «где я сейчас»
          out.outer = { points: sel(sky.points.filter((x) => !['asc', 'mc', 'fortune', 'lilith'].includes(x.id))), cusps: sky.houses ? sky.houses.cusps : null };
          out.aspects = keepAsp(AC.aspectsBetween(inPts(natal), out.outer.points, Object.assign(optsAsp(), { orbMult: 0.35 * v.orb })));
          out.labels = { in: t('natal', 'натал'), out: t('transit', 'транзит') };
          out.title = TX.chartTypes.natal + ' + ' + TX.chartTypes.transit.toLowerCase() + ' · ' + p.name;
          out.moments.push({ label: t('mom.transits', 'Транзиты на момент'), date, tz, place: UI.here().name || '', main: true });
        } else out.aspects = keepAsp(AC.aspectsWithin(inPts(natal), optsAsp()));
        break;
      }
      case 'transit': {
        const pl = placeOf(spec, p);
        const sky = AC.chart({ date, lat: pl.lat, lon: pl.lon, zone: tz, timeKnown: true }, opt);
        out.inner = toWheel(natal); out.outer = { points: sel(sky.points.filter((x) => !['asc', 'mc', 'fortune', 'lilith'].includes(x.id))), cusps: sky.houses ? sky.houses.cusps : null };
        out.aspects = keepAsp(AC.aspectsBetween(inPts(natal), out.outer.points, Object.assign(optsAsp(), { orbMult: 0.35 * v.orb })));
        out.title = TX.chartTypes.transit + ' · ' + p.name;
        out.moments.push({ label: t('mom.transits', 'Транзиты на момент'), date, tz, place: spec.place === 'birth' ? p.place.name : (UI.here().name || ''), main: true });
        out.labels = { in: t('natal', 'натал'), out: t('transit', 'транзит') };
        break;
      }
      case 'solar': case 'lunar': {
        const pl = placeOf(spec, p);
        // лунар — тот, что действует на выбранный момент (начался до него), а не следующий
        const rc = spec.type === 'solar' ? AC.solarReturn(natal, +spec.year, pl, opt) : PRO.lunarReturnAt(natal, date, pl, opt);
        out.innerChart = rc;
        out.title = TX.chartTypes[spec.type] + ' · ' + p.name;
        out.sub = spec.place === 'birth' ? t('placeBirth', 'место рождения') : t('placeHere', 'где я сейчас');
        const placeName = spec.place === 'birth' ? p.place.name : (UI.here().name || '');
        const nextD = spec.type === 'solar' ? AC.solarReturn(natal, +spec.year + 1, pl, opt).returnDate : PRO.lunarReturnDate(natal, AC.addDays(rc.returnDate, 1));
        out.moments.push({ label: spec.type === 'solar' ? t('mom.solar', 'Начало соляра') : t('mom.lunar', 'Начало лунара'), date: rc.returnDate, tz: pl.zone || tz, place: placeName, main: true });
        out.moments.push({ label: spec.type === 'solar' ? t('mom.solarEnd', 'Следующий соляр') : t('mom.lunarEnd', 'Следующий лунар'), date: nextD, tz: pl.zone || tz });
        out.inner = toWheel(rc);
        if (spec.overlay) { out.outer = { points: sel(natal.points.filter((x) => !['fortune'].includes(x.id))), cusps: natal.houses ? natal.houses.cusps : null }; out.aspects = keepAsp(AC.aspectsBetween(inPts(rc), out.outer.points, Object.assign(optsAsp(), { orbMult: 0.5 * v.orb }))); out.labels = { in: TX.chartTypes[spec.type].toLowerCase(), out: t('natal', 'натал') }; }
        else out.aspects = keepAsp(AC.aspectsWithin(inPts(rc), optsAsp()));
        if (rc.houses) out.info.push([t('ascOf', 'Асцендент'), fmtLon(rc.houses.asc)], [t('mcOf', 'MC'), fmtLon(rc.houses.mc)]);
        const sunH = rc.byId.sun.house; if (sunH) out.info.push([t('sunHouse', 'Солнце в доме'), String(sunH)]);
        break;
      }
      case 'directions': {
        const years = (date - natal.date) / (365.2422 * 86400000);
        const arc = spec.dir === 'deg' ? years : PRO.arcAt(natal, years);
        const dir = natal.points.filter((x) => x.id !== 'fortune').map((x) => ({ id: x.id, lon: AC.norm(x.lon + arc), speed: null }));
        out.inner = toWheel(natal); out.outer = { points: sel(dir), cusps: natal.houses ? natal.houses.cusps.map((c) => AC.norm(c + arc)) : null };
        out.aspects = keepAsp(AC.aspectsBetween(inPts(natal), out.outer.points, Object.assign(optsAsp(), { orbMult: 0.15 * v.orb })));
        out.title = (spec.dir === 'deg' ? t('dir.deg', 'Дирекции 1° = 1 год') : t('dir.arc', 'Дирекции солнечной дуги')) + ' · ' + p.name;
        out.sub = t('arc', 'дуга') + ' ' + arc.toFixed(2) + '°';
        out.moments.push({ label: t('mom.dir', 'Дирекции на дату'), date, tz, main: true });
        out.labels = { in: t('natal', 'натал'), out: t('directed', 'дирекция') };
        break;
      }
      case 'progressions': {
        const pr = AC.progressed(natal, date, opt);
        out.inner = toWheel(natal); out.outer = { points: sel(pr.points), asc: pr.byId.asc ? pr.byId.asc.lon : null, mc: pr.byId.mc ? pr.byId.mc.lon : null };
        out.aspects = keepAsp(AC.aspectsBetween(inPts(natal), out.outer.points, Object.assign(optsAsp(), { orbMult: 0.15 * v.orb })));
        out.title = TX.chartTypes.progressions + ' · ' + p.name;
        out.moments.push({ label: t('mom.prog', 'Прогрессии на дату'), date, tz, main: true }, { label: t('progDate2', 'Прогрессивная дата'), date: pr.date, tz: p.place.tz });
        out.info.push([t('progMoon', 'Прогрессивная Луна'), fmtLon(pr.byId.moon.lon)], [t('progPhase', 'Фаза прогрессий'), TX.PHASE8[pr.moonPhase]]);
        out.labels = { in: t('natal', 'натал'), out: t('progressed', 'прогрессии') };
        break;
      }
      case 'horary': {
        const pl = placeOf(spec, p);
        const c = AC.chart({ date, lat: pl.lat, lon: pl.lon, zone: pl.zone, timeKnown: true }, opt);
        out.innerChart = c; out.inner = toWheel(c);
        out.aspects = keepAsp(AC.aspectsWithin(inPts(c), optsAsp()));
        out.title = TX.chartTypes.horary;
        out.moments.push({ label: t('mom.horary', 'Момент вопроса'), date, tz: pl.zone, main: true });
        const ph = PRO.planetaryHours(date, pl.lat, pl.lon, pl.zone);
        const h = PRO.horary(c, ph);
        out.info.push([t('hor.moon', 'Луна'), `${TX.S[h.moonSign].name}${h.voc ? ' · ' + t('voc.short', 'без курса') : ''}`]);
        if (h.last) out.info.push([t('hor.last', 'Последний аспект'), `☽ ${AG[h.last.type]} ${G[h.last.id]} ${pName(h.last.id)}`]);
        if (h.next) out.info.push([t('hor.next', 'Следующий аспект'), `☽ ${AG[h.next.type]} ${G[h.next.id]} ${pName(h.next.id)} · ${UI.fmtTime(h.next.date, tz)}`]);
        if (ph && ph.current) out.info.push([t('hor.hour', 'Час планеты'), pName(ph.current.ruler)]);
        if (h.radical) out.info.push([t('hor.radical', 'Радикальность'), h.radical.ok ? t('yes', 'да') : t('no', 'нет')]);
        for (const s of h.strictures) out.info.push([t('hor.str', 'Ограничение'), TX.horaryStr[s] || s]);
        break;
      }
      case 'synastry': case 'composite': {
        const q = root.NStore.person(spec.b);
        if (!q) { out.error = t('needB', 'Добавьте второго человека в «Люди»'); out.inner = toWheel(natal); break; }
        const cb = chartFor(q, v.hs, null);
        if (spec.type === 'synastry') {
          out.inner = toWheel(natal); out.outer = { points: sel(cb.points.filter((x) => x.id !== 'fortune')), cusps: cb.houses ? cb.houses.cusps : null };
          out.aspects = keepAsp(AC.aspectsBetween(inPts(natal), out.outer.points, Object.assign(optsAsp(), { orbMult: 0.75 * v.orb })));
          out.title = TX.chartTypes.synastry + ' · ' + p.name + ' + ' + q.name; out.labels = { in: p.name, out: q.name };
        } else {
          const comp = AC.composite(natal, cb);
          const cpts = comp.points.filter((x) => !['asc', 'mc'].includes(x.id));
          const asc = comp.byId.asc ? comp.byId.asc.lon : 0, mc = comp.byId.mc ? comp.byId.mc.lon : null;
          const cusps = comp.byId.asc ? Array.from({ length: 12 }, (_, i) => AC.norm(Math.floor(asc / 30) * 30 + 30 * i)) : null;
          out.inner = { points: cpts, cusps, asc, mc };
          out.aspects = keepAsp(AC.aspectsWithin(sel(cpts), optsAsp()));
          out.innerChart = { points: comp.points.map((x) => Object.assign({ house: cusps ? Math.floor(AC.norm(x.lon - cusps[0]) / 30) + 1 : null }, x)), houses: null, byId: comp.byId };
          out.title = TX.chartTypes.composite + ' · ' + p.name + ' + ' + q.name; out.sub = t('compNote', 'дома — по знакам от композитного ASC');
        }
        break;
      }
    }
    if (spec.shiftA && !MOMENT.includes(spec.type)) out.sub = (out.sub ? out.sub + ' · ' : '') + t('pro.trialTime', 'пробное время рождения');
    return out;
  }

  // ---------- таблица аспектов (сетка) ----------
  function grid(rows, cols, aspects, tri) {
    const key = (a, b) => a + '|' + b;
    const map = new Map();
    for (const x of aspects) { map.set(key(x.a, x.b), x); if (tri) map.set(key(x.b, x.a), x); }
    const gl = (id) => G[id] || (/^c(\d+)$/.test(id) ? id.slice(1) : id);
    let s = '<div class="tbl-wrap" style="border:0;background:transparent"><table class="asp-grid"><tr><th></th>' + cols.map((c) => `<th title="${esc(pName(c))}">${esc(gl(c))}</th>`).join('') + '</tr>';
    rows.forEach((r, i) => {
      s += `<tr><th title="${esc(pName(r))}">${esc(gl(r))}</th>`;
      cols.forEach((c, j) => {
        if (tri && j >= i) { s += j === i ? `<td class="d">${esc(gl(r))}</td>` : '<td></td>'; return; }
        const x = map.get(key(r, c)) || map.get(key(c, r));
        if (!x || (tri ? false : !map.get(key(r, c)))) { s += '<td></td>'; return; }
        const cls = x.type === 'conj' ? 'conj' : MINOR.includes(x.type) ? 'minor' : x.nature === 'soft' ? 'soft' : 'hard';
        const tip = pName(x.a) + ' ' + AG[x.type] + ' ' + pName(x.b) + ' · ' + t('orb', 'орбис') + ' ' + x.orb.toFixed(2) + '°' + (x.applying != null ? ' · ' + (x.applying ? t('applying', 'сходящийся') : t('separating', 'расходящийся')) : '');
        s += `<td class="${cls}" data-tip="${esc(tip)}"><span class="a">${AG[x.type]}</span><span class="o">${x.orb.toFixed(0)}°</span></td>`;
      });
      s += '</tr>';
    });
    return s + '</table></div>';
  }

  function positions(c, v) {
    const TX = UI.TX(), pts = new Set((v || mkView()).pts);
    const rows = c.points.filter((p) => pts.has(p.id) || ['asc', 'mc'].includes(p.id)).map((p) => `<tr><td><span class="g">${G[p.id] || ''}</span> ${esc(pName(p.id))}</td><td class="mono">${fmtLon(p.lon)}${p.retro ? ' R' : ''}</td><td>${p.house || '—'}</td><td class="mono">${p.speed != null ? p.speed.toFixed(3) + '°' : '—'}</td><td>${p.dignity ? esc((TX.dig || {})[p.dignity] || p.dignity) : ''}</td></tr>`).join('');
    const cusps = c.houses ? c.houses.cusps.map((x, i) => `<tr><td>${t('cusp', 'Куспид')} ${i + 1}</td><td class="mono">${fmtLon(x)}</td><td colspan="3"></td></tr>`).join('') : '';
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('pt', 'Точка')}</th><th>${t('pos', 'Положение')}</th><th>${t('house', 'Дом')}</th><th>${t('speed', 'Скорость')}</th><th>${t('dign', 'Достоинство')}</th></tr></thead><tbody>${rows}${cusps}</tbody></table></div>`;
  }

  // ---------- панель: постоянная часть (настройки) + живая часть (колесо, таблицы) ----------
  function controls(spec, slot) {
    const TX = UI.TX();
    const people = root.NStore.people();
    const opt = (cur) => people.map((x) => `<option value="${x.id}" ${x.id === cur ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
    return `<div class="ctrl">
      <div class="field"><label>${t('pro.type', 'Тип карты')}</label><select class="select" data-k="type">${TYPES.map((x) => `<option value="${x}" ${x === spec.type ? 'selected' : ''}>${esc(TX.chartTypes[x])}</option>`).join('')}</select></div>
      <div class="field"><label>${t('pro.who', 'Чья карта')}</label><select class="select" data-k="a">${opt(spec.a)}<option value="custom" ${spec.a === 'custom' ? 'selected' : ''}>${t('pro.custom', '✎ Ввести данные вручную')}</option></select></div>
      ${['synastry', 'composite'].includes(spec.type) ? `<div class="field"><label>${t('pro.with', 'С кем')}</label><select class="select" data-k="b">${opt(spec.b)}</select></div>` : ''}
      ${spec.type === 'solar' ? `<div class="field"><label>${t('pro.year', 'Год')}</label><input class="input" type="number" min="1900" max="2100" data-k="year" value="${esc(spec.year)}"></div>` : ''}
      ${['solar', 'lunar', 'horary', 'transit'].includes(spec.type) ? `<div class="field"><label>${t('pro.place', 'Место')}</label><select class="select" data-k="place"><option value="here" ${spec.place === 'here' ? 'selected' : ''}>${t('placeHere', 'где я сейчас')}</option><option value="birth" ${spec.place === 'birth' ? 'selected' : ''}>${t('placeBirth', 'место рождения')}</option></select></div>` : ''}
      ${['solar', 'lunar'].includes(spec.type) ? `<label class="check"><input type="checkbox" data-k="overlay" ${spec.overlay ? 'checked' : ''}> ${t('pro.overlay', 'Наложить на натал')}</label>` : ''}
      ${spec.type === 'natal' ? `<label class="check"><input type="checkbox" data-k="ring" ${spec.ring !== false ? 'checked' : ''}> ${t('pro.ring', 'Второй круг: транзиты')}</label>` : ''}
      ${spec.type === 'directions' ? `<div class="field"><label>${t('pro.dir', 'Метод')}</label><select class="select" data-k="dir"><option value="arc" ${spec.dir === 'arc' ? 'selected' : ''}>${t('dir.arcS', 'Солнечная дуга')}</option><option value="deg" ${spec.dir === 'deg' ? 'selected' : ''}>${t('dir.degS', '1° = 1 год')}</option></select></div>` : ''}
    </div>`;
  }

  /** Данные карты вручную: имя, дата, время, город — прямо в панели. */
  function customForm(spec, slot) {
    const c = spec.custom || {};
    const dateStr = c.y ? `${UI.pad(c.d)}.${UI.pad(c.mo)}.${c.y}` : '';
    const timeStr = c.timeKnown !== false && c.h != null ? `${UI.pad(c.h)}:${UI.pad(c.mi)}` : '';
    return `<form class="card soft stack s6" data-cform="${slot}" novalidate>
      <span class="label">${t('pro.customT', 'Данные этой карты')}</span>
      <div class="ctrl" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
        <div class="field"><label>${t('f.name', 'Имя')}</label><input class="input" data-c="name" value="${esc(c.name || '')}" placeholder="${t('pro.customName', 'Например: Клиент')}"></div>
        <div class="field"><label>${t('f.date', 'Дата рождения')}</label>${UI.dateFieldHTML('data-c="date"', dateStr)}<span class="hint"></span></div>
        <div class="field"><label>${t('f.time', 'Время рождения')}</label><input class="input" data-c="time" inputmode="numeric" placeholder="${esc(t('ph.time', 'ЧЧ:ММ'))}" value="${esc(timeStr)}"></div>
        <div class="field ac"><label>${t('f.city', 'Город рождения')}</label><input class="input" data-c="city" autocomplete="off" placeholder="${t('f.cityPh', 'Начните вводить: Минск, Псков…')}"></div>
      </div>
      <p class="err" data-cerr hidden></p>
      <div class="row"><button class="btn sm primary" type="submit">${icon('check', 'sm')} ${t('pro.customGo', 'Построить карту')}</button>${spec.custom && spec.custom.place ? `<button class="btn sm" type="button" data-csave>${icon('plus', 'sm')} ${t('pro.customSave', 'Сохранить в «Люди»')}</button>` : ''}</div>
    </form>`;
  }

  function displayBox(spec, slot) {
    const TX = UI.TX(), v = spec.view, pts = new Set(v.pts), asp = new Set(v.asp);
    return `<details class="card soft" data-disp="${slot}"><summary>${icon('filter')} ${t('pro.display', 'Что показывать')} <span class="tiny muted" style="font-weight:500">${t('pro.displayHint', 'точки, аспекты, орбисы, дома')}</span></summary><div class="stack" style="margin-top:12px">
      <div class="toggles" role="group" aria-label="${t('pro.points', 'Точки')}">${ALL_PTS.map((id) => `<button class="tg ${['asc', 'mc'].includes(id) ? 't' : ''}" type="button" data-pt="${id}" aria-pressed="${pts.has(id)}" title="${esc(pName(id))}">${G[id]}</button>`).join('')}</div>
      <div class="toggles" role="group" aria-label="${t('pro.aspects', 'Аспекты')}">${MAJOR.concat(MINOR).map((a) => `<button class="tg" type="button" data-as="${a}" aria-pressed="${asp.has(a)}" title="${esc(TX.ASP[a] ? TX.ASP[a].name : a)}">${AG[a]}</button>`).join('')}<button class="tg t" type="button" data-cu aria-pressed="${v.cusps}">${t('pro.cusps', 'Куспиды')}</button></div>
      <div class="row"><div class="field" style="min-width:160px"><label>${t('pro.orb', 'Орбисы')}: <b data-orbv>${Math.round(v.orb * 100)}%</b></label><input data-orb type="range" min="0.5" max="1.5" step="0.1" value="${v.orb}"></div>
        <div class="field"><label>${t('pro.hs', 'Дома')}</label><select class="select" data-hs>${Object.entries(TX.houseSystems).map(([k, n]) => `<option value="${k}" ${v.hs === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div></div>
    </div></details>`;
  }

  function panelShell(spec, slot, compact, label) {
    return `<section class="stack pro-panel" data-panel="${slot}">
      <div class="card stack">
        <div class="row sb"><h3>${label ? esc(label) : t('pro.settings', 'Настройки карты')}</h3><div class="row"><button class="btn sm" type="button" data-save>${icon('save', 'sm')} ${t('save', 'Сохранить')}</button></div></div>
        ${controls(spec, slot)}
        ${spec.a === 'custom' ? customForm(spec, slot) : ''}
        ${displayBox(spec, slot)}
      </div>
      <div class="wheel-card wc-top">
        <div class="row sb ph-head" data-dyn="head"></div>
        <div data-dyn="moments"></div>
      </div>
      <div class="wheel-card wc-body">
        <div class="wheel-box" data-dyn="wheel"></div>
        <div class="row" style="justify-content:center" data-dyn="ringkey"></div>
        <div data-tb></div>
        <div data-tb2></div>
        <div data-dyn="banner"></div>
        <div data-dyn="info"></div>
      </div>
      <div class="card stack" data-dyn="grid"></div>
      <div data-dyn="pos"></div>
    </section>`;
  }

  /** Перерисовать живую часть панели (колесо, таблица, положения) — ползунок не трогаем. */
  function updatePanel(box, spec, slot, compact) {
    const q = (k) => box.querySelector(`[data-dyn="${k}"]`);
    let r;
    try { r = build(spec); } catch (e) { console.error(e); q('wheel').innerHTML = `<p class="err">${esc(t('pro.err', 'Не получилось посчитать'))}: ${esc(e.message)}</p>`; return; }
    const v = spec.view, pts = new Set(v.pts);
    const rowsIds = (r.innerChart.points || []).filter((p) => pts.has(p.id)).map((p) => p.id).concat(v.cusps && r.innerChart.houses ? cuspPts(r.innerChart).map((x) => x.id) : []);
    const colIds = r.outer ? r.outer.points.map((p) => p.id) : rowsIds;
    q('head').innerHTML = `<div class="ph-title"><h3 title="${esc(r.title)}">${esc(r.title)}</h3>${r.sub ? `<span class="tiny muted">${esc(r.sub)}</span>` : ''}</div>`;
    q('moments').innerHTML = r.moments.length ? `<div class="moments">${r.moments.map((m) => { const qd = UI.partsIn(m.date, m.tz); return `<div class="moment${m.main ? ' mo-key' : ''}"><span class="mo-l">${esc(m.label)}</span><b class="mo-d">${UI.fmtDMY(qd)} <span>${UI.fmtHMS(qd)}</span></b>${m.place ? `<span class="mo-p">${esc(m.place)}</span>` : ''}</div>`; }).join('')}</div>` : '';
    q('ringkey').innerHTML = r.outer && r.labels ? `<span class="ring-key"><i class="rk-in"></i>${esc(t('ring.inX', 'внутри — {a}', { a: r.labels.in }))}<i class="rk-out"></i>${esc(t('ring.outX', 'снаружи — {a}', { a: r.labels.out }))}</span>` : '';
    q('wheel').innerHTML = (r.error ? `<p class="err">${esc(r.error)}</p>` : '') + root.NWheel.svg(r.inner, { outer: r.outer, aspects: r.aspects.map((x) => Object.assign({}, x)), lang: UI.lang(), labels: r.labels, label: r.title });
    q('info').innerHTML = r.info.length ? `<div class="facts" style="display:flex;flex-wrap:wrap;gap:6px">${r.info.map(([k, val]) => `<span class="chip static">${esc(k)}: <b>${esc(val)}</b></span>`).join('')}</div>` : '';
    q('grid').innerHTML = `<div class="row sb"><h3>${t('pro.grid', 'Таблица аспектов')}</h3><span class="tiny muted">${r.aspects.length} · ${t('pro.gridHint', 'наведи на клетку — орбис')}</span></div>${grid(rowsIds, colIds, r.aspects, !r.outer)}`;
    q('pos').innerHTML = compact ? `<details class="card"><summary>${icon('table')} ${t('pro.positions', 'Положения')}</summary><div style="margin-top:10px">${positions(r.innerChart, v)}</div></details>` : `<div class="stack"><h3>${t('pro.positions', 'Положения')}</h3>${positions(r.innerChart, v)}</div>`;
    // пробное время рождения
    const bn = q('banner');
    if (spec.shiftA && !MOMENT.includes(spec.type)) {
      const p = subjectOf(spec), qq = UI.partsIn(new Date(spec.shiftA), p.place.tz);
      bn.innerHTML = `<div class="rect-banner">${icon('alert', 'sm')}<span>${t('rect.changed', 'Пробное время рождения: {d} {t} (в профиле — {p}).', { d: UI.fmtDMY(qq), t: UI.fmtHMS(qq, qq.s ? true : false), p: p.timeKnown !== false ? `${UI.pad(p.h)}:${UI.pad(p.mi)}` : t('rect.unknown', 'время не указано') })}</span><span class="spacer"></span><button class="btn sm" type="button" data-rreset>${t('rect.reset', 'Вернуть')}</button><button class="btn sm primary" type="button" data-rsave>${spec.a === 'custom' ? t('rect.apply', 'Записать в данные') : t('rect.save', 'Сохранить в профиль')}</button></div>`;
    } else bn.innerHTML = '';
    root.NWheel.bindTips(q('wheel')); root.NWheel.bindTips(q('grid'));
  }

  function mountPanel(el, slot, compact, label) {
    const host = el.querySelector(`[data-slot-host="${slot}"]`); if (!host) return;
    const spec = specs[slot];
    host.innerHTML = panelShell(spec, slot, compact, label);
    const box = host.querySelector(`[data-panel="${slot}"]`);
    const remount = () => { const y = window.scrollY; mountPanel(el, slot, compact, label); window.scrollTo(0, y); };
    const live = () => updatePanel(box, spec, slot, compact);
    // ползунок: момент карты (транзиты, дирекции…) или время рождения (натал, соляр, синастрия…)
    const p = subjectOf(spec);
    const tbs = box.querySelector('[data-tb]'), tbs2 = box.querySelector('[data-tb2]');
    const ringNatal = spec.type === 'natal' && spec.ring !== false;
    const birthBar = (slot, label) => {
      const base = birthDate(p);
      const bar = UI.timebar({ date: spec.shiftA ? new Date(spec.shiftA) : base, tz: p.place.tz, play: false, dayRange: 30, nowLabel: spec.a === 'custom' ? t('tb.reset2', 'Как введено') : t('tb.reset', 'Как в профиле'), reset: () => base });
      slot.innerHTML = label + bar.html;
      bar.bind(slot, (d) => { spec.shiftA = Math.abs(d - base) < 500 ? null : d.getTime(); live(); });
    };
    if (MOMENT.includes(spec.type) || ringNatal) {
      const tz = UI.here().tz;
      const bar = UI.timebar({ date: parseLocal(spec.date, tz), tz, play: true });
      tbs.innerHTML = `<span class="label" style="display:block;margin-bottom:6px">${ringNatal ? t('pro.momentTr', 'Транзиты: дата и время (внешний круг)') : t('pro.moment', 'Момент карты')}</span>` + bar.html;
      bar.bind(tbs, (d) => { spec.date = d.toISOString(); live(); });
      if (ringNatal && p && p.place) {
        tbs2.innerHTML = `<details class="tb-more"${spec.shiftA ? ' open' : ''}><summary>${icon('clock', 'sm')} ${t('pro.birthTime2', 'Уточнить время рождения (внутренний круг)')}</summary><div data-tb2in style="margin-top:8px"></div></details>`;
        birthBar(tbs2.querySelector('[data-tb2in]'), '');
      }
    } else if (p && p.place) birthBar(tbs, `<span class="label" style="display:block;margin-bottom:6px">${t('pro.birthTime', 'Время рождения — ползунком можно уточнять')}</span>`);
    // настройки
    box.querySelectorAll('[data-k]').forEach((inp) => inp.addEventListener('change', () => {
      const k = inp.dataset.k; spec[k] = inp.type === 'checkbox' ? inp.checked : inp.value;
      if (k === 'a') { spec.shiftA = null; if (spec.a === 'custom' && !spec.custom) spec.custom = null; }
      remount();
    }));
    // данные вручную
    const cf = box.querySelector('[data-cform]');
    if (cf) {
      const c = spec.custom || {};
      const di = UI.bindDateInput(cf.querySelector('[data-c="date"]'), () => {});
      if (c.y) di.check();
      UI.bindTimeInput(cf.querySelector('[data-c="time"]'), null, false);
      const city = UI.bindCity(cf.querySelector('.ac'), null, c.place || null);
      cf.addEventListener('submit', (e) => {
        e.preventDefault();
        const err = cf.querySelector('[data-cerr]');
        const fail = (m) => { err.textContent = m; err.hidden = false; };
        const r = UI.parseDate(cf.querySelector('[data-c="date"]').value);
        if (r.error) return fail(r.error);
        const tm0 = UI.parseTime(cf.querySelector('[data-c="time"]').value), tm = tm0 ? [0, tm0.h, tm0.mi] : null;
        const pl = city.value; if (!pl) return fail(t('err.city', 'Выберите город из списка'));
        spec.custom = { name: cf.querySelector('[data-c="name"]').value.trim() || t('pro.customDefault', 'Карта'), gender: 'f', y: r.y, mo: r.mo, d: r.d, h: tm ? +tm[1] : 12, mi: tm ? +tm[2] : 0, timeKnown: !!tm, place: { name: pl.name, nameEn: pl.nameEn, country: pl.country, countryEn: pl.countryEn, lat: pl.lat, lon: pl.lon, tz: pl.tz } };
        spec.shiftA = null; remount();
      });
      const cs = cf.querySelector('[data-csave]');
      if (cs) cs.addEventListener('click', () => { const id = root.NStore.upsertPerson(Object.assign({}, spec.custom)); spec.a = id; spec.custom = null; UI.toast(t('pro.customSaved', 'Сохранено в «Люди»')); remount(); });
    }
    // что показывать — своё у каждой панели
    const v = spec.view;
    const toggle = (arr, id) => { const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); else arr.push(id); };
    box.querySelectorAll('[data-pt]').forEach((b) => b.addEventListener('click', () => { toggle(v.pts, b.dataset.pt); b.setAttribute('aria-pressed', String(v.pts.includes(b.dataset.pt))); live(); }));
    box.querySelectorAll('[data-as]').forEach((b) => b.addEventListener('click', () => { toggle(v.asp, b.dataset.as); b.setAttribute('aria-pressed', String(v.asp.includes(b.dataset.as))); live(); }));
    const cu = box.querySelector('[data-cu]'); if (cu) cu.addEventListener('click', () => { v.cusps = !v.cusps; cu.setAttribute('aria-pressed', String(v.cusps)); live(); });
    const orb = box.querySelector('[data-orb]'); if (orb) { orb.addEventListener('input', () => { box.querySelector('[data-orbv]').textContent = Math.round(orb.value * 100) + '%'; v.orb = +orb.value; live(); }); }
    const hsS = box.querySelector('[data-hs]'); if (hsS) hsS.addEventListener('change', () => { v.hs = hsS.value; live(); });
    // пробное время: вернуть / сохранить
    box.addEventListener('click', (e) => {
      if (e.target.closest('[data-rreset]')) { spec.shiftA = null; remount(); }
      if (e.target.closest('[data-rsave]')) {
        const pp = subjectOf(spec), qq = UI.partsIn(new Date(spec.shiftA), pp.place.tz);
        const upd = { y: qq.y, mo: qq.mo, d: qq.d, h: qq.h, mi: qq.mi, timeKnown: true };
        if (spec.a === 'custom') spec.custom = Object.assign({}, spec.custom, upd);
        else root.NStore.upsertPerson(Object.assign({}, pp, upd));
        spec.shiftA = null; UI.toast(t('rect.saved', 'Время рождения сохранено')); remount();
      }
    });
    const sv = box.querySelector('[data-save]');
    if (sv) sv.addEventListener('click', () => {
      const r = build(spec);
      root.NStore.saveChart({ title: r.title + (r.sub ? ' · ' + r.sub : ''), spec: JSON.parse(JSON.stringify(spec)) });
      UI.toast(t('saved', 'Карта сохранена — она в «Сохранённых»'));
    });
    live();
  }

  // «Дирекции» убраны из вкладок (тип карты «Дирекции» остался), «Ректификация» — отдельный VIP-раздел в меню слева
  const TABS = () => [['chart', t('pro.t.chart', 'Карта'), 'chart'], ['split', t('pro.t.split', 'Две карты'), 'split'], ['tables', t('pro.t.tables', 'Таблицы'), 'table'], ['firdaria', t('pro.t.fird', 'Фирдарии'), 'timeline'], ['acg', t('pro.t.acg', 'Астрокарта'), 'map'], ['dynamics', t('pro.t.transits', 'Транзиты'), 'chart-line'], ['moon', t('pro.t.moon', 'Луна'), 'moon'], ['retro', t('pro.t.retro', 'Ретро'), 'retro'], ['saved', t('pro.t.saved', 'Сохранённые'), 'save']];

  async function page(el, params) {
    const p = params.id ? root.NStore.person(params.id) : root.NStore.active();
    if (!p) { location.hash = '#onboard'; return; }
    if (params.tab === 'rect') { location.replace('#rectify' + (params.id ? '?id=' + params.id : '')); return; }
    if (params.tab === 'directions') { params.tab = 'chart'; params.type = 'directions'; }
    if (params.tab) tab = params.tab;
    if (!TABS().some(([k]) => k === tab)) tab = 'chart';
    const okA = (s) => s && (s.a === 'custom' ? true : !!root.NStore.person(s.a));
    if (!okA(specs.main)) specs.main = defaultSpec('natal', p);
    if (params.id && tab !== 'split') { specs.main.a = p.id; specs.main.shiftA = null; }
    if (!okA(specs.left)) specs.left = defaultSpec('natal', p);
    if (!okA(specs.right)) { const other = root.NStore.people().find((x) => x.id !== p.id); specs.right = defaultSpec('transit', other || p); }
    if (params.type && TYPES.includes(params.type)) { specs.main.type = params.type; tab = 'chart'; }
    if (params.load) { const sv = root.NStore.saved().find((x) => x.id === params.load); if (sv) { specs.main = normSpec(sv.spec, p); tab = 'chart'; } }
    const redraw = () => {
      const y = window.scrollY;
      el.innerHTML = `<div class="sec-head"><span class="eyebrow">${t('pro.eyebrow', 'Профи-режим')}</span><h1>${t('pro.title', 'Астропроцессор')}</h1></div>
        <div class="pro-tabs hs"><button class="hs-btn" type="button" data-hsl aria-label="${t('scrollL', 'Прокрутить влево')}">${icon('left', 'sm')}</button><div class="hs-track"><div class="chips" role="tablist">${TABS().map(([k, n, ic]) => `<button class="chip" type="button" role="tab" data-tab="${k}" aria-pressed="${tab === k}">${icon(ic)} ${esc(n)}</button>`).join('')}</div></div><button class="hs-btn" type="button" data-hsr aria-label="${t('scrollR', 'Прокрутить вправо')}">${icon('right', 'sm')}</button></div>
        <div id="proBody"></div>`;
      el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; redraw(); }));
      UI.hscroll(el.querySelector('.pro-tabs'));
      const body = el.querySelector('#proBody');
      try {
        if (tab === 'chart') { body.innerHTML = '<div data-slot-host="main"></div>'; mountPanel(body, 'main', false); }
        else if (tab === 'split') {
          body.innerHTML = `<p class="small muted" style="margin-bottom:12px">${t('pro.splitHint2', 'Две полностью независимые карты: у каждой свой человек или данные вручную, свой тип, своё время (дата, часы, минуты, секунды) и свои настройки показа. Колёса стоят на одном уровне.')}</p><div class="split"><div data-slot-host="left"></div><div data-slot-host="right"></div></div>`;
          mountPanel(body, 'left', true, t('pro.card1', 'Карта 1')); mountPanel(body, 'right', true, t('pro.card2', 'Карта 2'));
        } else if (tab === 'saved') savedView(body, redraw);
        else if (root.NProMore && root.NProMore[tab]) root.NProMore[tab](body, specs.main.a && specs.main.a !== 'custom' ? root.NStore.person(specs.main.a) || p : p, { redraw, G, AG, pName, fmtLon });
      } catch (e) { console.error(e); body.innerHTML = `<p class="err">${esc(t('pro.err', 'Не получилось посчитать'))}: ${esc(e.message)}</p>`; }
      root.NWheel.bindTips(body);
      window.scrollTo(0, y);
    };
    redraw();
  }

  function savedView(body, redraw) {
    const list = root.NStore.saved();
    body.innerHTML = list.length ? `<div class="card"><div class="items">${list.map((c) => `<div class="item"><span class="gl">${icon('save')}</span><div class="row sb"><div><h4>${esc(c.title)}</h4><p class="tiny">${esc(UI.fmtDay(new Date(c.at), UI.here().tz, { year: 'numeric', hour: '2-digit' }))}</p></div><div class="row"><a class="btn sm" href="#pro?load=${c.id}">${t('open', 'Открыть')}</a><button class="iconbtn" data-del="${c.id}" aria-label="${t('delete', 'Удалить')}">${icon('trash')}</button></div></div></div>`).join('')}</div></div>`
      : `<div class="empty"><h3>${t('saved.empty', 'Пока пусто')}</h3><p class="muted">${t('saved.emptyP', 'Нажми «Сохранить» над любой картой — она появится здесь, и к ней можно вернуться позже.')}</p></div>`;
    body.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { root.NStore.removeChart(b.dataset.del); redraw(); }));
  }

  root.NPro = { build, grid, positions, chartFor };
  (root.NPages = root.NPages || {}).pro = { render: page };
})(window);
