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
          <div class="stack" style="gap:6px">${disp.chains.map((ch) => `<div style="font:400 16px var(--f-glyph)">${chain(ch)}</div>`).join('')}</div>
          <p class="small">${disp.final ? t('t.final', 'Конечный диспозитор: {p} — главная планета карты', { p: ctx.pName(disp.final) }) : t('t.noFinal', 'Единого конечного диспозитора нет')}${disp.loops.length ? ' · ' + t('t.loops', 'петли: {l}', { l: disp.loops.map((l) => l.map((x) => G[x]).join('↔')).join(', ') }) : ''}${disp.self.length ? ' · ' + t('t.self', 'в своём знаке: {l}', { l: disp.self.map((x) => G[x]).join(' ') }) : ''}</p>
          <details><summary class="small">${t('t.trad', 'По традиционным управителям')}</summary><div class="stack" style="gap:6px;margin-top:8px">${dt.chains.map((ch) => `<div style="font:400 16px var(--f-glyph)">${chain(ch)}</div>`).join('')}</div></details></div>
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

  // ---------- Фирдарии ----------
  const FIRD_COL = { sun: '#E59A3A', moon: '#8C8BB4', mercury: '#5FB3A3', venus: '#C98A9E', mars: '#D9544A', jupiter: '#4F86E6', saturn: '#8C7A55', node: '#7D6BC2', southNode: '#5A5870' };
  const FG = { southNode: '☋', node: '☊' };
  function firdaria(body, p, ctx) {
    const c = UI.chartOf(p), TX = UI.TX(), G = Object.assign({}, ctx.G, FG);
    const now = new Date();
    const f = PRO.firdaria(c, now);
    const t0 = c.date.getTime(), span = 75 * 365.2422 * DAY;
    const big = f.periods.filter((x) => x.start.getTime() - t0 < span);
    const cur = big.find((x) => x.current);
    // годовые фирдарии: солнечный год делится между управителями пропорционально большим периодам, начиная с текущего управителя
    const yearStart = (() => { const sr = AC.solarReturn(c, now.getUTCFullYear(), { lat: c.params.lat, lon: c.params.lon, zone: c.params.zone }); return sr.returnDate > now ? AC.solarReturn(c, now.getUTCFullYear() - 1, { lat: c.params.lat, lon: c.params.lon, zone: c.params.zone }).returnDate : sr.returnDate; })();
    const yearLen = 365.2422 * DAY;
    const seq = (f.day === false ? [['moon', 9], ['saturn', 11], ['jupiter', 12], ['mars', 7], ['sun', 10], ['venus', 8], ['mercury', 13], ['node', 3], ['southNode', 2]] : [['sun', 10], ['venus', 8], ['mercury', 13], ['moon', 9], ['saturn', 11], ['jupiter', 12], ['mars', 7], ['node', 3], ['southNode', 2]]);
    const i0 = Math.max(0, seq.findIndex(([id]) => cur && id === cur.id));
    let ys = yearStart.getTime();
    const annual = [];
    for (let k = 0; k < seq.length; k++) { const [id, yrs] = seq[(i0 + k) % seq.length]; const e = ys + yearLen * yrs / 75; annual.push({ id, start: new Date(ys), end: new Date(e), current: now >= ys && now < e }); ys = e; }
    const bar = (list, from, len) => `<div class="fd-bar">${list.map((x) => { const l = (x.start - from) / len * 100, w = (x.end - x.start) / len * 100; return `<i style="left:${l}%;width:${w}%;background:${FIRD_COL[x.id]};${x.current ? 'box-shadow:inset 0 0 0 2px #fff' : ''}" data-tip="${esc((TX.firdar[x.id] || '') + '\n' + dmy(x.start) + ' — ' + dmy(x.end))}">${w > 3 ? G[x.id] : ''}</i>`; }).join('')}</div>`;
    body.innerHTML = `<div class="card stack"><h3>${t('f.big', 'Большие фирдарии — 75 лет')}</h3><p class="tiny muted">${f.unknownTime ? t('f.unknown', 'Время рождения неизвестно: порядок взят как для дневной карты.') : f.day ? t('f.day', 'Дневная карта: цикл начинается с Солнца.') : t('f.night', 'Ночная карта: цикл начинается с Луны.')}</p>
        ${bar(big, t0, span)}<div class="row tiny muted"><span>0</span><span style="flex:1"></span><span>75 ${t('years', 'лет')}</span></div>
        ${cur ? `<div class="night stack"><span class="eyebrow">${t('f.now', 'Сейчас')}</span><h3>${G[cur.id]} ${esc(TX.firdar[cur.id])}</h3><p class="small" style="color:#D6D4EC">${dmy(cur.start)} — ${dmy(cur.end)}</p>
          ${cur.subs.length ? `<div class="tbl-wrap" style="background:transparent;border-color:rgba(255,255,255,.12)"><table class="tbl" style="min-width:0;color:var(--night-ink)"><tbody>${cur.subs.map((s) => `<tr class="${s.current ? 'cur' : ''}" style="${s.current ? 'color:var(--ink)' : ''}"><td><span class="g">${G[cur.id]}/${G[s.id]}</span> ${esc(ctx.pName(s.id))}</td><td class="mono">${dmy(s.start)} — ${dmy(s.end)}</td></tr>`).join('')}</tbody></table></div>` : ''}</div>` : ''}
      </div>
      <div class="card stack"><h3>${t('f.year', 'Годовые фирдарии')}</h3><p class="tiny muted">${esc(TX.firdarYearNote)}</p>${bar(annual, yearStart.getTime(), yearLen)}
        <div class="tbl-wrap"><table class="tbl" style="min-width:0"><tbody>${annual.map((x) => `<tr class="${x.current ? 'cur' : ''}"><td><span class="g">${G[x.id]}</span> ${esc(ctx.pName(x.id === 'southNode' ? 'node' : x.id))}${x.id === 'southNode' ? ' (' + t('south', 'южный') + ')' : ''}</td><td class="mono">${dmy(x.start)} — ${dmy(x.end)}</td><td class="small">${esc(TX.firdar[x.id] || '')}</td></tr>`).join('')}</tbody></table></div></div>`;
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

  // ---------- Астрокартография ----------
  const acgView = { show: new Set(['sun', 'moon', 'venus', 'mars', 'jupiter', 'saturn']), angles: new Set(['asc', 'dsc', 'mc', 'ic']) };
  async function acg(body, p, ctx) {
    const c = UI.chartOf(p), TX = UI.TX(), G = ctx.G, here = UI.here();
    const L = root.NACG.lines(c.date);
    const draw = () => {
      const hits = root.NACG.cityHits(Object.fromEntries(Object.entries(L).filter(([id]) => acgView.show.has(id))), root.NGeo.CITIES, 2.5).filter((h) => acgView.angles.has(h.angle)).slice(0, 24);
      const names = Object.fromEntries(Object.keys(L).map((id) => [id, ctx.pName(id)]));
      body.innerHTML = `<div class="card stack"><div class="toggles">${Object.keys(L).map((id) => `<button class="tg" data-pl="${id}" aria-pressed="${acgView.show.has(id)}" style="${acgView.show.has(id) ? `background:${root.NACG.COLORS[id]};border-color:${root.NACG.COLORS[id]};color:#16173A` : ''}" title="${esc(names[id])}">${G[id]}</button>`).join('')}</div>
        <div class="toggles">${['asc', 'dsc', 'mc', 'ic'].map((a) => `<button class="tg t" data-an="${a}" aria-pressed="${acgView.angles.has(a)}">${esc(TX.angles[a])}</button>`).join('')}</div>
        <div class="acg-map">${root.NACG.svg(L, { show: [...acgView.show], angles: [...acgView.angles], names, glyphs: G, angleNames: TX.angles, cities: root.NGeo.CITIES, birth: { lat: p.place.lat, lon: p.place.lon }, birthLabel: t('acg.birth', 'Место рождения'), here: here.lat ? { lat: here.lat, lon: here.lon } : null, hereLabel: t('acg.here', 'Где я сейчас'), label: t('acg.label', 'Карта линий планет') })}</div>
        <p class="tiny muted">${t('acg.legend', 'Сплошная вертикаль — зенит (MC), пунктир — надир (IC); кривые — восход (ASC, сплошная) и заход (DSC, точки). Янтарная точка — место рождения, белая — где ты сейчас.')}</p></div>
        <div class="card stack"><h3>${t('acg.cities', 'Города на линиях (до ~280 км)')}</h3>${hits.length ? `<div class="items">${hits.map((h) => { const m = TX.acg[h.planet][h.angle]; return `<div class="item"><span class="gl" style="color:${root.NACG.COLORS[h.planet]}">${G[h.planet]}</span><div><h4>${esc(UI.lang() === 'en' ? h.city.nameEn : h.city.name)} · ${esc(names[h.planet])} — ${esc(TX.angles[h.angle])}</h4><p><b style="color:var(--ok)">+</b> ${esc(m.g)}. <b style="color:var(--bad)">−</b> ${esc(m.b)}.</p><div class="why">${h.km} ${t('km', 'км от линии')}</div></div></div>`; }).join('')}</div>` : `<p class="muted small">${t('acg.none', 'Рядом с линиями выбранных планет крупных городов из списка нет.')}</p>`}</div>
        <div class="card stack"><h3>${t('acg.meanings', 'Что значат линии')}</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('pt.planet', 'Планета')}</th>${['asc', 'dsc', 'mc', 'ic'].map((a) => `<th>${esc(TX.angles[a])}</th>`).join('')}</tr></thead><tbody>${[...acgView.show].map((id) => `<tr><td><span class="g">${G[id]}</span> ${esc(names[id])}</td>${['asc', 'dsc', 'mc', 'ic'].map((a) => `<td class="small"><b style="color:var(--ok)">+</b> ${esc(TX.acg[id][a].g)}<br><b style="color:var(--bad)">−</b> ${esc(TX.acg[id][a].b)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
      body.querySelectorAll('[data-pl]').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.pl; acgView.show.has(id) ? acgView.show.delete(id) : acgView.show.add(id); draw(); }));
      body.querySelectorAll('[data-an]').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.an; acgView.angles.has(id) ? acgView.angles.delete(id) : acgView.angles.add(id); draw(); }));
      root.NWheel.bindTips(body);
    };
    draw();
    const w = await root.NACG.loadWorld(); if (w && body.isConnected) draw();
  }

  // ---------- Динамика ----------
  function dynamics(body, p, ctx) {
    const c = UI.chartOf(p), TX = UI.TX();
    const start = AC.addDays(new Date(), -28);
    const dyn = PRO.dynamics(c, start, 30);
    const max = Math.max(1, ...dyn.series.map((s) => Math.max(s.hard, s.soft)));
    const W = 900, H = 240, bw = W / dyn.series.length;
    const y = (v) => H / 2 - (v / max) * (H / 2 - 14);
    let svg = `<svg viewBox="0 0 ${W} ${H + 24}" style="width:100%;height:auto;display:block" role="img" aria-label="${t('dyn.aria', 'Поддержка и напряжение по неделям')}"><line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="var(--line)"/>`;
    dyn.series.forEach((s, i) => {
      const x = i * bw + 2, isNow = Date.now() >= s.start.getTime() && Date.now() < s.start.getTime() + 7 * DAY;
      svg += `<g data-tip="${esc(UI.fmtDay(s.start, UI.here().tz) + ': ' + t('dyn.soft', 'поддержка') + ' ' + s.soft.toFixed(1) + ', ' + t('dyn.hard', 'напряжение') + ' ' + s.hard.toFixed(1))}"><rect x="${x}" y="${y(s.soft)}" width="${bw - 4}" height="${H / 2 - y(s.soft)}" rx="3" fill="var(--lv-p2)"/><rect x="${x}" y="${H / 2}" width="${bw - 4}" height="${y(-s.hard) - H / 2}" rx="3" fill="var(--lv-m2)"/>${isNow ? `<rect x="${x - 2}" y="2" width="${bw}" height="${H - 4}" fill="none" stroke="var(--amber-fill)" stroke-width="2" rx="4"/>` : ''}</g>`;
      if (i % 4 === 0) svg += `<text x="${x}" y="${H + 16}" font-family="var(--f-mono)" font-size="11" fill="var(--muted)">${UI.fmtDay(s.start, UI.here().tz, { month: 'short' })}</text>`;
    });
    svg += '</svg>';
    const ev = dyn.events.filter((e) => e.end > new Date()).slice(0, 18);
    body.innerHTML = `<div class="card stack"><h3>${t('dyn.title', 'Силы по неделям: медленные транзиты')}</h3><div class="legend"><span><i class="lv-2"></i>${t('dyn.soft', 'поддержка')}</span><span><i class="lv-m2"></i>${t('dyn.hard', 'напряжение')}</span><span><i style="border:2px solid var(--amber-fill)"></i>${t('dyn.now', 'эта неделя')}</span></div>${svg}</div>
      <div class="card stack"><h3>${t('dyn.events', 'Транзиты в силе и впереди')}</h3><div class="tbl-wrap"><table class="tbl"><tbody>${ev.map((e) => `<tr><td><span class="g">${ctx.G[e.transiting]} ${ctx.AG[e.type]} ${ctx.G[e.natal]}</span> ${esc(ctx.pName(e.transiting))} — ${esc(ctx.pName(e.natal))}</td><td class="mono">${dmy(e.start)} — ${dmy(e.end)}</td><td class="mono tiny">${e.exact.map((x) => dmy(x)).join(', ')}</td></tr>`).join('')}</tbody></table></div></div>`;
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
