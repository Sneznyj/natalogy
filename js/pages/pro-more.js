/* Профи-методы: таблицы (диспозиторы, достоинства, фигуры), фирдарии, дирекции, астрокартография, динамика, Луна, ретро. */
(function (root) {
  'use strict';
  const UI = root.NUI, AC = root.AstroCore, PRO = root.ProAstro;
  const { t, esc, icon } = UI;
  const DAY = 86400000;
  const iso = (d) => d.toISOString().slice(0, 10);
  const dmy = (d, tz) => UI.fmtDay(d, tz || UI.here().tz, { year: 'numeric' });

  // ---------- Таблицы ----------
  function tables(body, p, ctx) {
    const c = UI.chartOf(p), TX = UI.TX(), G = ctx.G, AG = ctx.AG;
    const disp = PRO.dispositors(c), dt = PRO.dispositors(c, true);
    const chain = (ch) => ch.map((id) => `<span class="g" title="${esc(ctx.pName(id))}">${G[id]}</span>`).join(' → ');
    const dig = PRO.dignities(c);
    const pats = PRO.patterns(c), hs = PRO.houseStrength(c), stars = PRO.fixedStars(c), shape = PRO.jonesShape(c), rec = PRO.receptions(c);
    const asp = c.aspects.slice().sort((a, b) => a.orb - b.orb);
    body.innerHTML = `
      <div class="grid2">
        <div class="card stack"><h3>${t('t.disp', 'Цепочки диспозиторов')}</h3><p class="tiny muted">${t('t.dispHint', 'Кто кем управляет: планета → управитель её знака. Современные управители.')}</p>
          <div class="stack" style="gap:6px">${disp.chains.map((ch) => `<div style="font:400 calc(16px*var(--fz)) var(--f-glyph)">${chain(ch)}</div>`).join('')}</div>
          <p class="small">${disp.final ? t('t.final', 'Конечный диспозитор: {p} — главная планета карты', { p: ctx.pName(disp.final) }) : t('t.noFinal', 'Единого конечного диспозитора нет')}${disp.loops.length ? ' · ' + t('t.loops', 'петли: {l}', { l: disp.loops.map((l) => l.map((x) => G[x]).join('↔')).join(', ') }) : ''}${disp.self.length ? ' · ' + t('t.self', 'в своём знаке: {l}', { l: disp.self.map((x) => G[x]).join(' ') }) : ''}</p>
          <details><summary class="small">${t('t.trad', 'По традиционным управителям')}</summary><div class="stack" style="gap:6px;margin-top:8px">${dt.chains.map((ch) => `<div style="font:400 calc(16px*var(--fz)) var(--f-glyph)">${chain(ch)}</div>`).join('')}</div></details></div>
        <div class="card stack"><h3>${t('t.shape', 'Фигуры и форма карты')}</h3>
          <p class="small">${t('t.jones', 'Форма по Джонсу')}: <b>${esc((TX.shapes || {})[shape.shape] || shape.shape)}</b></p>
          ${pats.length ? `<div class="items">${pats.map((x) => `<div class="item"><span class="gl">✶</span><div><h4>${esc(TX.patterns[x.type] || x.type)}</h4><p>${x.planets.map((id) => G[id] + ' ' + ctx.pName(id)).join(', ')}${x.apex ? ' · ' + t('apex', 'вершина') + ': ' + ctx.pName(x.apex) : ''}</p></div></div>`).join('')}</div>` : `<p class="muted small">${t('t.noPat', 'Больших фигур нет')}</p>`}
          ${rec.length ? `<p class="small">${t('t.rec', 'Рецепции')}: ${rec.map((r) => `${G[r.a]}↔${G[r.b]} (${r.kind === 'domicile' ? t('byDom', 'по обители') : t('byEx', 'по экзальтации')})`).join(', ')}</p>` : ''}</div>
      </div>
      <div class="card stack"><h3>${t('t.dig', 'Эссенциальные достоинства (Птолемей)')}</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('pt.planet', 'Планета')}</th><th>${t('sign', 'Знак')}</th><th>${t('ruler', 'Управитель')}</th><th>${t('exalt', 'Экзальт.')}</th><th>${t('trip', 'Трипл.')}</th><th>${t('term', 'Термы')}</th><th>${t('face', 'Фас')}</th><th>${t('score', 'Баллы')}</th></tr></thead><tbody>
        ${dig.map((d) => `<tr><td><span class="g">${G[d.id]}</span> ${esc(ctx.pName(d.id))}${d.retro ? ' R' : ''}</td><td>${esc(TX.S[d.sign].name)}</td><td class="g">${G[d.ruler]}</td><td class="g">${d.exaltation ? G[d.exaltation] : '—'}</td><td class="g">${G[d.triplicity]}</td><td class="g">${G[d.term]}</td><td class="g">${G[d.face]}</td><td class="num"><b style="color:${d.score > 0 ? 'var(--ok)' : d.score < 0 ? 'var(--bad)' : 'inherit'}">${d.score > 0 ? '+' : ''}${d.score}</b>${d.peregrine ? ' ' + t('peregrine', 'пер.') : ''}</td></tr>`).join('')}</tbody></table></div></div>
      ${hs ? `<div class="card stack"><h3>${t('t.houses', 'Сила домов')}</h3><div class="sbars">${hs.list.map((h) => `<div class="sbar"><span>${h.house} ${t('house.l', 'дом')} · ${esc(TX.S[h.sign].name)}</span><div class="bar"><i style="width:${Math.max(4, Math.min(100, h.score * 8))}%"></i></div><b class="num">${h.score}</b></div>`).join('')}</div></div>` : ''}
      <div class="grid2">
        <div class="card stack"><h3>${t('t.asp', 'Все аспекты')}</h3><div class="tbl-wrap"><table class="tbl" style="min-width:0"><tbody>${asp.map((x) => `<tr><td><span class="g">${G[x.a]} ${AG[x.type]} ${G[x.b]}</span> ${esc(ctx.pName(x.a))} — ${esc(ctx.pName(x.b))}</td><td class="mono">${x.orb.toFixed(2)}°</td><td class="tiny">${x.applying == null ? '' : x.applying ? t('applyingS', 'сход.') : t('separatingS', 'расх.')}</td></tr>`).join('')}</tbody></table></div></div>
        <div class="card stack"><h3>${t('t.stars', 'Неподвижные звёзды')}</h3>${stars.length ? `<div class="tbl-wrap"><table class="tbl" style="min-width:0"><tbody>${stars.map((s) => `<tr><td>${esc(s.name)}</td><td><span class="g">${G[s.planet]}</span> ${esc(ctx.pName(s.planet))}</td><td class="mono">${s.orb.toFixed(2)}°</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted small">${t('t.noStars', 'Тесных соединений со звёздами нет')}</p>`}</div>
      </div>`;
  }

  // ---------- Фирдарии: каждый большой период раскрывается, внутри — подпериоды с расшифровкой ----------
  const FIRD_COL = { sun: '#E08A1E', moon: '#7C7AB0', mercury: '#2E9C86', venus: '#C9567F', mars: '#D23B33', jupiter: '#2F6FD6', saturn: '#7E6431', node: '#6B52C8', southNode: '#545266' };
  const FG = { southNode: '☋', node: '☊' };
  const fdOpen = { major: null };
  function firdaria(body, p, ctx) {
    const c = UI.chartOf(p), TX = UI.TX(), G = Object.assign({}, ctx.G, FG);
    const now = new Date(), tz = p.place.tz;
    const f = PRO.firdaria(c, now);
    const YEAR = 365.2422 * DAY;
    const t0 = c.date.getTime(), span = 75 * YEAR;
    const big = f.periods.filter((x) => x.start.getTime() - t0 < span);
    const cur = big.find((x) => x.current);
    const dm = (d) => UI.fmtDay(d, tz, { year: 'numeric' });
    const age = (d) => Math.max(0, Math.round((d - c.date) / YEAR));
    const pnm = (id) => (id === 'southNode' ? t('fd.sn', 'Южный узел') : ctx.pName(id));
    // годовые фирдарии: солнечный год делится между управителями пропорционально большим периодам, начиная с текущего управителя
    const yearStart = (() => { const sr = AC.solarReturn(c, now.getUTCFullYear(), { lat: c.params.lat, lon: c.params.lon, zone: c.params.zone }); return sr.returnDate > now ? AC.solarReturn(c, now.getUTCFullYear() - 1, { lat: c.params.lat, lon: c.params.lon, zone: c.params.zone }).returnDate : sr.returnDate; })();
    const seq = (f.day === false ? [['moon', 9], ['saturn', 11], ['jupiter', 12], ['mars', 7], ['sun', 10], ['venus', 8], ['mercury', 13], ['node', 3], ['southNode', 2]] : [['sun', 10], ['venus', 8], ['mercury', 13], ['moon', 9], ['saturn', 11], ['jupiter', 12], ['mars', 7], ['node', 3], ['southNode', 2]]);
    const i0 = Math.max(0, seq.findIndex(([id]) => cur && id === cur.id));
    let ys = yearStart.getTime();
    const annual = [];
    for (let k = 0; k < seq.length; k++) { const [id, yrs] = seq[(i0 + k) % seq.length]; const e = ys + YEAR * yrs / 75; annual.push({ id, start: new Date(ys), end: new Date(e), current: now >= ys && now < e }); ys = e; }
    /** Где планета в карте: знак, дом, сила — личная часть расшифровки. */
    const natalNote = (id) => {
      const b = c.byId[id]; if (!b || id === 'node' || id === 'southNode') return '';
      let s = `${TX.P[id].name} ${TX.S[b.sign].in}${b.house ? ' · ' + t('fd.house', '{n} дом', { n: b.house }) + ' — ' + TX.H[b.house].area : ''}.`;
      if (b.dignity === 'domicile' || b.dignity === 'exaltation') s += ' ' + TX.firdarDig.strong;
      else if (b.dignity === 'detriment' || b.dignity === 'fall') s += ' ' + TX.firdarDig.weak;
      return s;
    };
    const subRow = (maj, s) => `<details class="fd-sub${s.current ? ' cur' : ''}"${s.current ? ' open' : ''}><summary><span class="g fd-gl">${G[maj.id]}/${G[s.id]}</span><span class="fd-sn">${esc(pnm(s.id))}<small>${esc(TX.firdarSub[s.id] || '')}</small></span><span class="mono fd-dt">${dm(s.start)} — ${dm(s.end)}</span>${s.current ? `<span class="tag acc">${t('f.nowS', 'сейчас')}</span>` : ''}</summary>
        <div class="fd-sbody"><p>${esc(TX.firdarMix(maj.id, s.id, pnm(maj.id), pnm(s.id)))}</p>${natalNote(s.id) ? `<p class="small muted">${esc(t('fd.inChart', 'В твоей карте: {x}', { x: natalNote(s.id) }))}</p>` : ''}</div></details>`;
    const majorBody = (x) => `<div class="fd-body"><p>${esc(TX.firdarLong[x.id] || '')}</p>${natalNote(x.id) ? `<p class="small muted">${esc(t('fd.ruler', 'Управитель периода в твоей карте: {x}', { x: natalNote(x.id) }))}</p>` : ''}
      ${x.subs.length ? `<span class="label">${t('fd.subs', 'Подпериоды — нажми, чтобы раскрыть')}</span><div class="fd-subs">${x.subs.map((s) => subRow(x, s)).join('')}</div>` : `<p class="tiny muted">${t('fd.noSubs', 'У периодов узлов подпериодов нет.')}</p>`}</div>`;
    const bar = (list, from, len, click) => `<div class="fd-bar">${list.map((x, i) => { const l = (x.start - from) / len * 100, w = (x.end - x.start) / len * 100; return `<i class="${x.current ? 'cur' : ''}" ${click ? `data-fdgo="${i}" role="button" tabindex="0"` : ''} style="left:${l}%;width:${w}%;background:${FIRD_COL[x.id]}" data-tip="${esc((TX.firdar[x.id] || '') + '\n' + dm(x.start) + ' — ' + dm(x.end))}">${w > 3 ? G[x.id] : ''}</i>`; }).join('')}</div>`;
    const majors = big.map((x, i) => `<details class="fd-per${x.current ? ' cur' : ''}" data-fdi="${i}"${(fdOpen.major == null ? x.current : fdOpen.major === i) ? ' open' : ''}><summary><span class="fd-sw" style="background:${FIRD_COL[x.id]}">${G[x.id]}</span><span class="fd-n"><b>${esc(TX.firdar[x.id] || pnm(x.id))}</b><small>${t('fd.ages2', 'возраст {a}–{b}', { a: age(x.start), b: age(x.end) })}</small></span><span class="mono fd-dt">${dm(x.start)} — ${dm(x.end)}</span>${x.current ? `<span class="tag acc">${t('f.nowS', 'сейчас')}</span>` : ''}<span class="fd-chev">${icon('down', 'sm')}</span></summary>${majorBody(x)}</details>`).join('');
    body.innerHTML = `<div class="card stack"><h3>${t('f.big', 'Большие фирдарии — 75 лет')}</h3><p class="tiny muted">${f.unknownTime ? t('f.unknown', 'Время рождения неизвестно: порядок взят как для дневной карты.') : f.day ? t('f.day', 'Дневная карта: цикл начинается с Солнца.') : t('f.night', 'Ночная карта: цикл начинается с Луны.')} ${t('fd.barHint', 'Нажми на отрезок — откроется этот период.')}</p>
        ${bar(big, t0, span, true)}<div class="row tiny muted"><span>0</span><span style="flex:1"></span><span>75 ${t('years', 'лет')}</span></div>
        ${cur ? `<div class="night stack fd-now"><span class="eyebrow">${t('f.now', 'Сейчас')}</span><h3>${G[cur.id]} ${esc(TX.firdar[cur.id])}</h3><p class="small" style="color:var(--night-muted)">${dm(cur.start)} — ${dm(cur.end)} · ${t('fd.ages2', 'возраст {a}–{b}', { a: age(cur.start), b: age(cur.end) })}</p>${majorBody(cur)}</div>` : ''}
      </div>
      <div class="card stack"><div class="row sb"><h3>${t('fd.all', 'Все периоды жизни')}</h3><span class="hint-click">${icon('info', 'xs')} ${t('fd.allHint', 'каждый период раскрывается — внутри подпериоды и расшифровка')}</span></div><div class="fd-list">${majors}</div></div>
      <div class="card stack"><h3>${t('f.year', 'Годовые фирдарии')}</h3><p class="tiny muted">${esc(TX.firdarYearNote)}</p>${bar(annual, yearStart.getTime(), YEAR)}
        <div class="tbl-wrap"><table class="tbl" style="min-width:0"><tbody>${annual.map((x) => `<tr class="${x.current ? 'cur' : ''}"><td><span class="g">${G[x.id]}</span> ${esc(pnm(x.id))}</td><td class="mono">${dm(x.start)} — ${dm(x.end)}</td><td class="small">${esc(TX.firdar[x.id] || '')}</td></tr>`).join('')}</tbody></table></div></div>`;
    body.querySelectorAll('.fd-list > .fd-per').forEach((d) => d.addEventListener('toggle', () => { if (d.open) fdOpen.major = +d.dataset.fdi; }));
    const go = (i) => { const d = body.querySelector(`.fd-list > .fd-per[data-fdi="${i}"]`); if (!d) return; d.open = true; fdOpen.major = i; d.scrollIntoView({ behavior: UI.reduceMotion() ? 'auto' : 'smooth', block: 'start' }); };
    body.querySelectorAll('[data-fdgo]').forEach((x) => { x.addEventListener('click', () => go(+x.dataset.fdgo)); x.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(+x.dataset.fdgo); }); });
  }

  // ---------- Дирекции ----------
  function directions(body, p, ctx) {
    const c = UI.chartOf(p), G = ctx.G, AG = ctx.AG;
    const now = new Date();
    const from = AC.addDays(now, -365 * 2), to = AC.addDays(now, 365 * 4);
    const arc = PRO.solarArc(c, from, to, now);
    // символические 1° = 1 год
    const ids = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'asc', 'mc'].filter((id) => c.byId[id]);
    const yearsAt = (d) => (d - c.date) / (365.2422 * DAY);
    const y0 = yearsAt(from), y1 = yearsAt(to);
    const sym = [];
    for (const dId of ids) for (const nId of ids) { if (dId === nId) continue; for (const ang of [0, 60, 90, 120, 180]) for (const sg of (ang === 0 || ang === 180 ? [1] : [1, -1])) {
      const need = AC.norm(c.byId[nId].lon + sg * ang - c.byId[dId].lon);
      for (const yy of [need, need + 360]) if (yy >= y0 && yy <= y1) sym.push({ directed: dId, natal: nId, type: ({ 0: 'conj', 60: 'sextile', 90: 'square', 120: 'trine', 180: 'opp' })[ang], date: new Date(c.date.getTime() + yy * 365.2422 * DAY) });
    } }
    sym.sort((a, b) => a.date - b.date);
    const rows = (list) => list.map((e) => `<tr class="${Math.abs(e.date - now) < 183 * DAY ? 'cur' : ''}"><td class="mono">${dmy(e.date)}</td><td><span class="g">${G[e.directed]} ${AG[e.type]} ${G[e.natal]}</span> ${esc(ctx.pName(e.directed))} (${t('dirS', 'дир.')}) — ${esc(ctx.pName(e.natal))}</td></tr>`).join('');
    body.innerHTML = `<div class="grid2"><div class="card stack"><h3>${t('d.arc', 'Солнечная дуга')}</h3><p class="tiny muted">${t('d.arcNow', 'Дуга сейчас: {a}°. Подсвечены дирекции ±полгода от сегодня.', { a: arc.arcNow.toFixed(2) })}</p><div class="tbl-wrap"><table class="tbl" style="min-width:0"><tbody>${rows(arc.events) || `<tr><td>${t('none', 'нет')}</td></tr>`}</tbody></table></div></div>
      <div class="card stack"><h3>${t('d.deg', 'Символические: 1° = 1 год')}</h3><p class="tiny muted">${t('d.degHint', 'Каждая точка сдвигается ровно на градус в год.')}</p><div class="tbl-wrap"><table class="tbl" style="min-width:0"><tbody>${rows(sym) || `<tr><td>${t('none', 'нет')}</td></tr>`}</tbody></table></div></div></div>
      <a class="btn" href="#pro?tab=chart&type=directions">${icon('chart')} ${t('d.wheel', 'Показать на колесе')}</a>`;
  }

  // ---------- Астрокартография: обычная карта мира (названия всех мест, зум), линии планет, по нажатию — описание ----------
  const acgView = { show: new Set(['sun', 'moon', 'venus', 'mars', 'jupiter', 'saturn']), angles: new Set(['asc', 'dsc', 'mc', 'ic']), style: 'auto', view: null };
  async function acg(body, p, ctx) {
    const c = UI.chartOf(p), TX = UI.TX(), G = ctx.G, here = UI.here();
    const L = root.NACG.lines(c.date);
    const names = Object.fromEntries(Object.keys(L).map((id) => [id, ctx.pName(id)]));
    const A = root.NACG;
    body.innerHTML = `<div class="card stack"><div class="row sb" style="align-items:flex-start"><div class="stack s6"><div class="toggles" data-tpl></div><div class="toggles" data-tan></div></div>
          <div class="seg acg-style" role="group" aria-label="${t('acg.styleA', 'Вид карты')}">${[['auto', t('acg.auto', 'Как тема')], ['light', t('acg.light', 'Светлая')], ['dark', t('acg.dark', 'Тёмная')]].map(([k, n]) => `<button type="button" data-ast="${k}" aria-pressed="${acgView.style === k}">${esc(n)}</button>`).join('')}</div></div>
        <div class="acg-map" data-amap><div class="acg-loading">${t('acg.loading', 'Загружаю карту мира…')}</div></div>
        <p class="tiny muted">${t('acg.legend2', 'Колёсико или +/− — зум, тяни карту мышью или пальцем. Сплошная вертикаль — зенит (MC), пунктир — надир (IC); кривые — восход (ASC, сплошная) и заход (DSC, штрих). Нажми на любую линию — что она значит. Золотая точка — место рождения, синяя — где ты сейчас.')}</p></div>
      <div class="card stack"><h3>${t('acg.cities', 'Города на линиях (до ~280 км)')}</h3><div data-acities></div></div>
      <div class="card stack"><h3>${t('acg.meanings', 'Что значат линии')}</h3><div data-amean></div></div>`;
    const mapBox = body.querySelector('[data-amap]');
    let lmap = null, layer = null, tiles = null, fallback = false;
    const lineInfo = (id, ang, at) => {
      const m = TX.acg[id] && TX.acg[id][ang]; if (!m) return;
      const near = A.cityHits({ [id]: L[id] }, root.NGeo.CITIES, 4).filter((h) => h.angle === ang).slice(0, 10);
      const dist = (pt) => { if (!pt || pt.lat == null) return null; const h = A.cityHits({ [id]: L[id] }, [{ name: 'x', lat: pt.lat, lon: pt.lon }], 180).find((x) => x.angle === ang); return h ? h.km : null; };
      const dB = dist({ lat: p.place.lat, lon: p.place.lon }), dH = here.lat ? dist(here) : null;
      UI.modal(`<div class="stack s18">
        <div class="trx-head"><span class="trx-g conj" style="color:${A.mapColor(id, false)}">${G[id]}</span><div class="stack s6"><b class="trx-t">${esc(names[id])} — ${esc(TX.angles[ang])}</b><span class="small muted">${esc(TX.acgPlanet[id] || '')}</span></div></div>
        <div class="card soft"><p class="small">${esc(TX.acgAngle[ang])}</p></div>
        <div class="grid2"><div class="trx-sum soft"><span class="label">${t('acg.good', 'Что здесь хорошо')}</span><p><b>${esc(m.g)}</b></p></div><div class="trx-sum hard"><span class="label">${t('acg.bad', 'Осторожно')}</span><p><b>${esc(m.b)}</b></p></div></div>
        ${dB != null || dH != null ? `<div class="tags">${dB != null ? `<span class="tag gold">${t('acg.fromBirth', 'Место рождения: {n} км от линии', { n: dB })}</span>` : ''}${dH != null ? `<span class="tag acc">${t('acg.fromHere', 'Где ты сейчас: {n} км от линии', { n: dH })}</span>` : ''}</div>` : ''}
        ${near.length ? `<div class="stack s6"><span class="label">${t('acg.nearCities', 'Города у этой линии')}</span><div class="tags">${near.map((h) => `<span class="tag plain">${esc(UI.lang() === 'en' ? h.city.nameEn || h.city.name : h.city.name)} · ${h.km} ${t('kmS', 'км')}</span>`).join('')}</div></div>` : ''}
        ${at ? `<p class="tiny muted">${t('acg.clicked', 'Точка на карте: {a}, {b}', { a: at.lat.toFixed(2) + '°', b: at.lng.toFixed(2) + '°' })}</p>` : ''}
      </div>`, { title: `${names[id]} — ${TX.angles[ang]}`, eyebrow: t('acg.eyebrow', 'Линия астрокарты') });
    };
    const drawLists = () => {
      const hits = A.cityHits(Object.fromEntries(Object.entries(L).filter(([id]) => acgView.show.has(id))), root.NGeo.CITIES, 2.5).filter((h) => acgView.angles.has(h.angle)).slice(0, 24);
      body.querySelector('[data-tpl]').innerHTML = Object.keys(L).map((id) => `<button class="tg" data-pl="${id}" aria-pressed="${acgView.show.has(id)}" style="${acgView.show.has(id) ? `background:${A.mapColor(id, false)};border-color:${A.mapColor(id, false)};color:#fff` : ''}" title="${esc(names[id])}">${G[id]}</button>`).join('');
      body.querySelector('[data-tan]').innerHTML = ['asc', 'dsc', 'mc', 'ic'].map((a) => `<button class="tg t" data-an="${a}" aria-pressed="${acgView.angles.has(a)}">${esc(TX.angles[a])}</button>`).join('');
      body.querySelector('[data-acities]').innerHTML = hits.length ? `<div class="items">${hits.map((h) => { const m = TX.acg[h.planet][h.angle]; return `<div class="item tap-row" data-hl="${h.planet}|${h.angle}" role="button" tabindex="0"><span class="gl" style="color:${A.mapColor(h.planet, false)}">${G[h.planet]}</span><div><h4>${esc(UI.lang() === 'en' ? h.city.nameEn : h.city.name)} · ${esc(names[h.planet])} — ${esc(TX.angles[h.angle])}</h4><p><b style="color:var(--ok)">+</b> ${esc(m.g)}. <b style="color:var(--bad)">−</b> ${esc(m.b)}.</p><div class="why">${h.km} ${t('km', 'км от линии')}</div></div></div>`; }).join('')}</div>` : `<p class="muted small">${t('acg.none', 'Рядом с линиями выбранных планет крупных городов из списка нет.')}</p>`;
      body.querySelector('[data-amean]').innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('pt.planet', 'Планета')}</th>${['asc', 'dsc', 'mc', 'ic'].map((a) => `<th>${esc(TX.angles[a])}</th>`).join('')}</tr></thead><tbody>${[...acgView.show].map((id) => `<tr><td><span class="g">${G[id]}</span> ${esc(names[id])}</td>${['asc', 'dsc', 'mc', 'ic'].map((a) => `<td class="small tap-row" data-hl="${id}|${a}" role="button" tabindex="0"><b style="color:var(--ok)">+</b> ${esc(TX.acg[id][a].g)}<br><b style="color:var(--bad)">−</b> ${esc(TX.acg[id][a].b)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      body.querySelectorAll('[data-pl]').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.pl; acgView.show.has(id) ? acgView.show.delete(id) : acgView.show.add(id); drawLists(); drawLines(); }));
      body.querySelectorAll('[data-an]').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.an; acgView.angles.has(id) ? acgView.angles.delete(id) : acgView.angles.add(id); drawLists(); drawLines(); }));
      body.querySelectorAll('[data-hl]').forEach((r) => { const go = () => { const [id, a] = r.dataset.hl.split('|'); lineInfo(id, a); }; r.addEventListener('click', go); r.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }); });
    };
    const dark = () => (acgView.style === 'auto' ? UI.isDark() : acgView.style === 'dark');
    const drawLines = () => {
      if (fallback) {
        mapBox.innerHTML = A.svg(L, { show: [...acgView.show], angles: [...acgView.angles], names, glyphs: G, angleNames: TX.angles, cities: root.NGeo.CITIES, birth: { lat: p.place.lat, lon: p.place.lon }, birthLabel: t('acg.birth', 'Место рождения'), here: here.lat ? { lat: here.lat, lon: here.lon } : null, hereLabel: t('acg.here', 'Где я сейчас'), label: t('acg.label', 'Карта линий планет') });
        mapBox.querySelectorAll('[data-acg]').forEach((el) => el.addEventListener('click', () => { const [id, a] = el.dataset.acg.split('|'); lineInfo(id, a); }));
        root.NWheel.bindTips(mapBox);
        return;
      }
      if (!lmap) return;
      A.drawLeafletLines(layer, L, { show: [...acgView.show], angles: [...acgView.angles], dark: dark(), names, glyphs: G, angleNames: TX.angles, onClick: lineInfo, birth: { lat: p.place.lat, lon: p.place.lon }, birthLabel: t('acg.birth', 'Место рождения') + ': ' + p.place.name, here: here.lat ? { lat: here.lat, lon: here.lon } : null, hereLabel: t('acg.here', 'Где я сейчас') + (here.name ? ': ' + here.name : '') });
    };
    const setTiles = () => { if (!lmap) return; if (tiles) lmap.removeLayer(tiles); tiles = A.tileLayer(dark()); tiles.addTo(lmap); mapBox.classList.toggle('dark', dark()); drawLines(); };
    body.querySelectorAll('[data-ast]').forEach((b) => b.addEventListener('click', () => { acgView.style = b.dataset.ast; body.querySelectorAll('[data-ast]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); setTiles(); }));
    drawLists();
    try {
      const Lf = await A.loadLeaflet();
      if (!body.isConnected) return;
      mapBox.innerHTML = '';
      lmap = Lf.map(mapBox, { worldCopyJump: true, minZoom: 1, maxZoom: 14, zoomSnap: 0.5, wheelPxPerZoomLevel: 90, attributionControl: true }).setView(acgView.view ? acgView.view.c : [Math.max(-50, Math.min(60, p.place.lat)), p.place.lon], acgView.view ? acgView.view.z : 2);
      lmap.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
      layer = Lf.layerGroup().addTo(lmap);
      lmap.on('moveend', () => { acgView.view = { c: lmap.getCenter(), z: lmap.getZoom() }; });
      setTiles();
      setTimeout(() => lmap && lmap.invalidateSize(), 60);
      const off = root.NStore.on((w) => { if (!body.isConnected) { off(); return; } if (w === 'settings:theme' && acgView.style === 'auto') setTiles(); });
    } catch (e) {
      // без сети (или в закрытом превью) — запасная схема мира
      fallback = true;
      drawLines();
      const w = await A.loadWorld(); if (w && body.isConnected) drawLines();
    }
  }

  // ---------- Транзиты (бывшая «Динамика»): силы по неделям насыщенными цветами + строки, по нажатию — что значит транзит ----------
  function dynamics(body, p, ctx) {
    const c = UI.chartOf(p), TX = UI.TX(), tz = UI.here().tz;
    const start = AC.addDays(new Date(), -28);
    const dyn = PRO.dynamics(c, start, 30);
    const max = Math.max(1, ...dyn.series.map((s) => Math.max(s.hard, s.soft)));
    const W = 900, H = 240, bw = W / dyn.series.length;
    const y = (v) => H / 2 - (v / max) * (H / 2 - 14);
    let svg = `<svg viewBox="0 0 ${W} ${H + 24}" style="width:100%;height:auto;display:block" role="img" aria-label="${t('dyn.aria', 'Поддержка и напряжение по неделям')}"><rect x="0" y="0" width="${W}" height="${H / 2}" fill="var(--dyn-up-bg)"/><rect x="0" y="${H / 2}" width="${W}" height="${H / 2}" fill="var(--dyn-down-bg)"/><line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="var(--line-strong)" stroke-width="1.5"/>`;
    dyn.series.forEach((s, i) => {
      const x = i * bw + 2, isNow = Date.now() >= s.start.getTime() && Date.now() < s.start.getTime() + 7 * DAY;
      svg += `<g data-tip="${esc(UI.fmtDay(s.start, tz, { year: 'numeric' }) + ': ' + t('dyn.soft', 'поддержка') + ' ' + s.soft.toFixed(1) + ', ' + t('dyn.hard', 'напряжение') + ' ' + s.hard.toFixed(1))}"><rect x="${x}" y="${y(s.soft)}" width="${bw - 4}" height="${H / 2 - y(s.soft)}" rx="3" fill="var(--dyn-up)"/><rect x="${x}" y="${H / 2}" width="${bw - 4}" height="${y(-s.hard) - H / 2}" rx="3" fill="var(--dyn-down)"/>${isNow ? `<rect x="${x - 2}" y="2" width="${bw}" height="${H - 4}" fill="none" stroke="var(--lav-strong)" stroke-width="2.5" rx="4"/>` : ''}</g>`;
      if (i % 4 === 0) svg += `<text x="${x}" y="${H + 16}" font-family="var(--f-mono)" font-size="11" fill="var(--muted)">${UI.fmtDay(s.start, tz)}</text>`;
    });
    svg += '</svg>';
    const ev = dyn.events.filter((e) => e.end > new Date()).slice(0, 24);
    const NE = root.NExplain;
    body.innerHTML = `<div class="card stack"><h3>${t('dyn.title2', 'Транзиты: силы по неделям')}</h3><div class="legend"><span><i style="background:var(--dyn-up)"></i>${t('dyn.soft', 'поддержка')}</span><span><i style="background:var(--dyn-down)"></i>${t('dyn.hard', 'напряжение')}</span><span><i style="border:2px solid var(--lav-strong)"></i>${t('dyn.now', 'эта неделя')}</span></div>${svg}</div>
      <div class="card stack"><div class="row sb"><h3>${t('dyn.events', 'Транзиты в силе и впереди')}</h3><span class="hint-click">${icon('info', 'xs')} ${t('trx.tapRow', 'нажми на строку — что значит этот транзит')}</span></div>
        <div class="tbl-wrap"><table class="tbl tr-tbl"><tbody>${ev.map((e, i) => { const tn = NE.tone(e.transiting, e.type); const now = new Date(); const on = e.start <= now && e.end >= now; return `<tr class="tr-click ${tn}${on ? ' on' : ''}" data-ev="${i}" tabindex="0" role="button"><td><span class="g tr-gl">${ctx.G[e.transiting]} ${ctx.AG[e.type]} ${ctx.G[e.natal]}</span> <b>${esc(NE.phrase(e.transiting, e.natal, e.type))}</b> <span class="tiny muted">· ${esc(TX.ASP[e.type] ? TX.ASP[e.type].name : e.type)}</span><div class="tiny muted">${esc(NE.short({ T: e.transiting, type: e.type }))}</div></td><td class="mono">${e.openStart ? '… ' : ''}${dmy(e.start)} — ${dmy(e.end)}${e.openEnd ? ' …' : ''}</td><td class="mono tiny">${e.exact.map((x) => dmy(x)).join(', ')}</td><td class="tr-more">${icon('right', 'sm')}</td></tr>`; }).join('')}</tbody></table></div></div>`;
    body.querySelectorAll('[data-ev]').forEach((r) => {
      const open = () => { const e = ev[+r.dataset.ev]; NE.transit({ T: e.transiting, N: e.natal, type: e.type, start: e.start, end: e.end, exact: e.exact }, { natal: c, person: p }); };
      r.addEventListener('click', open); r.addEventListener('keydown', (k) => { if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); open(); } });
    });
  }

  // ---------- Луна ----------
  function moon(body, p, ctx) {
    const TX = UI.TX(), here = UI.here(), tz = here.tz;
    const now = new Date(), end = AC.addDays(now, 31);
    const phases = AC.moonPhases(AC.addDays(now, -2), end);
    const voc = AC.voidOfCourse(AC.addDays(now, -1), AC.addDays(now, 14));
    const ing = AC.ingresses('moon', now, AC.addDays(now, 14), 0.25);
    const PN = [t('m.new', 'Новолуние'), t('m.fq', 'Первая четверть'), t('m.full', 'Полнолуние'), t('m.lq', 'Последняя четверть')];
    const days = [];
    for (let i = 0; i < 14; i++) { const d = AC.addDays(now, i); try { const ld = AC.lunarDay(d, here.lat, here.lon); days.push({ d, ld, ms: AC.moonState(d) }); } catch (e) { /* полярные широты */ } }
    body.innerHTML = `<div class="grid2"><div class="card stack"><h3>${t('m.phases', 'Фазы на месяц')}</h3><div class="tbl-wrap"><table class="tbl" style="min-width:0"><tbody>${phases.map((x) => `<tr><td>${UI.moonSVG(x.phase * 90, 26)}</td><td>${esc(PN[x.phase])}</td><td class="mono">${UI.fmtDay(x.date, tz, { hour: '2-digit', minute: '2-digit' })}</td><td>${esc(TX.S[AC.signOf(x.lon)].in)}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="card stack"><h3>${t('m.voc', 'Луна без курса — 2 недели')}</h3><p class="tiny muted">${t('m.vocHint', 'Время начала и конца — в поясе {tz}', { tz })}</p><div class="tbl-wrap"><table class="tbl" style="min-width:0"><tbody>${voc.map((v) => `<tr><td class="mono">${UI.fmtDay(v.start, tz, { hour: '2-digit', minute: '2-digit' })}</td><td class="mono">→ ${UI.fmtDay(v.end, tz, { hour: '2-digit', minute: '2-digit' })}</td><td class="small">${esc(TX.S[v.nextSign].in)}</td><td class="tiny muted">${Math.round((v.end - v.start) / 3600000)} ${t('h', 'ч')}</td></tr>`).join('')}</tbody></table></div></div></div>
      <div class="card stack"><h3>${t('m.days', 'Лунные сутки и знаки')}</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('date', 'Дата')}</th><th>${t('m.ld', 'Лунные сутки')}</th><th>${t('m.sign', 'Луна')}</th><th>${t('m.illum', 'Освещённость')}</th></tr></thead><tbody>${days.map((x) => `<tr><td class="mono">${UI.fmtDay(x.d, tz, { weekday: 'short' })}</td><td>${x.ld.day} <span class="tiny muted">${t('m.from', 'с')} ${UI.fmtTime(x.ld.start, tz)}</span></td><td>${esc(TX.S[x.ms.sign].name)}</td><td class="num">${Math.round(x.ms.illum * 100)}%</td></tr>`).join('')}</tbody></table></div>
      <p class="tiny muted">${t('m.ing', 'Переходы Луны')}: ${ing.map((x) => `${UI.fmtDay(x.date, tz, { hour: '2-digit', minute: '2-digit' })} → ${esc(TX.S[x.to].name)}`).join(' · ')}</p></div>`;
  }

  // ---------- Ретро ----------
  function retro(body, p, ctx) {
    const TX = UI.TX(), tz = UI.here().tz;
    const y = new Date().getUTCFullYear();
    const s = new Date(Date.UTC(y, 0, 1)), e = new Date(Date.UTC(y + 1, 11, 31));
    const ids = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
    const list = AC.retrogradePeriods(ids, s, e);
    const span = e - s, W = 1000;
    const x = (d) => 130 + Math.max(0, Math.min(1, (d - s) / span)) * (W - 140);
    let svg = `<svg viewBox="0 0 ${W} ${ids.length * 30 + 40}" style="width:100%;min-width:680px;height:auto;display:block" role="img" aria-label="${t('r.aria', 'Ретроградные периоды')}">`;
    for (let m = 0; m <= 24; m += 3) { const d = new Date(Date.UTC(y, m, 1)); svg += `<line x1="${x(d)}" y1="16" x2="${x(d)}" y2="${ids.length * 30 + 20}" stroke="var(--line-soft)"/><text x="${x(d) + 3}" y="12" font-family="var(--f-mono)" font-size="10.5" fill="var(--muted)">${UI.fmtDay(d, 'UTC', { month: 'short', year: '2-digit', day: undefined })}</text>`; }
    ids.forEach((id, i) => {
      const yy = 24 + i * 30;
      svg += `<text x="0" y="${yy + 13}" font-family="var(--f-ui)" font-size="13" fill="var(--ink)">${ctx.G[id]} ${esc(ctx.pName(id))}</text>`;
      for (const r of list.filter((q) => q.id === id)) {
        if (r.shadowStart) svg += `<rect x="${x(r.shadowStart)}" y="${yy + 3}" width="${Math.max(1, x(r.shadowEnd) - x(r.shadowStart))}" height="14" rx="4" fill="var(--lv-m1)" opacity=".6"/>`;
        svg += `<rect x="${x(r.start)}" y="${yy + 3}" width="${Math.max(2, x(r.end) - x(r.start))}" height="14" rx="4" fill="${['mercury', 'venus', 'mars'].includes(id) ? 'var(--lv-m2)' : 'var(--lilac)'}" data-tip="${esc(ctx.pName(id) + ': ' + dmy(r.start, tz) + ' — ' + dmy(r.end, tz) + (r.shadowStart ? '\n' + t('r.shadow', 'тень') + ': ' + dmy(r.shadowStart, tz) + ' — ' + dmy(r.shadowEnd, tz) : ''))}"/>`;
      }
    });
    const nowX = x(new Date());
    svg += `<line x1="${nowX}" y1="16" x2="${nowX}" y2="${ids.length * 30 + 20}" stroke="var(--amber-fill)" stroke-width="2"/></svg>`;
    body.innerHTML = `<div class="card stack"><h3>${t('r.title', 'Ретроградные периоды {a}–{b}', { a: y, b: y + 1 })}</h3><div class="scrollx">${svg}</div><p class="tiny muted">${t('r.legend', 'Тёмная полоса — планета движется назад, светлая — тень (до и после). Янтарная линия — сегодня.')}</p></div>
      <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('pt.planet', 'Планета')}</th><th>${t('r.from', 'Назад с')}</th><th>${t('r.to', 'Вперёд с')}</th><th>${t('r.deg', 'Градусы')}</th><th>${t('r.shadowH', 'Тень')}</th></tr></thead><tbody>${list.filter((r) => r.end > new Date(Date.UTC(y, 0, 1))).map((r) => `<tr class="${r.start <= new Date() && r.end >= new Date() ? 'cur' : ''}"><td><span class="g">${ctx.G[r.id]}</span> ${esc(ctx.pName(r.id))}</td><td class="mono">${dmy(r.start, tz)}</td><td class="mono">${dmy(r.end, tz)}</td><td class="mono">${ctx.fmtLon(r.lonStart)} → ${ctx.fmtLon(r.lonEnd)}</td><td class="mono tiny">${r.shadowStart ? dmy(r.shadowStart, tz) + ' — ' + dmy(r.shadowEnd, tz) : '—'}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  root.NProMore = { tables, firdaria, directions, acg, dynamics, moon, retro };
})(window);
