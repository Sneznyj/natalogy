/* Профи → «Ректификация»: события жизни человека, окно поиска, кривая «насколько каждое время объясняет события»,
   лучшие кандидаты с окнами, «почему» по каждому событию, карта выбранного времени с ползунком,
   таблица «событие × кандидат», проверка на случайность. События хранятся у человека (person.events). Движок — js/rectify.js. */
(function (root) {
  'use strict';
  const UI = root.NUI, AC = root.AstroCore, R = root.NRect, W = root.NWheel;
  const { t, esc, icon } = UI;
  const st = { pid: null, from: null, to: null, step: 2, res: null, ctl: null, sel: null, opts: null };
  const hm = (m) => `${UI.pad(Math.floor(m / 60))}:${UI.pad(m % 60)}`;
  const VS = '︎';
  const TYPE_LIST = () => [['marriage', t('rt.marriage', 'Брак, свадьба')], ['relation', t('rt.relation', 'Начало отношений')], ['breakup', t('rt.breakup', 'Расставание, развод')], ['child', t('rt.child', 'Рождение ребёнка')], ['move', t('rt.move', 'Переезд, смена жилья')], ['career', t('rt.career', 'Работа, карьера, взлёт')], ['money', t('rt.money', 'Деньги: большая прибыль или потеря')], ['study', t('rt.study', 'Учёба, диплом, экзамен')], ['travel', t('rt.travel', 'Дальняя поездка, эмиграция')], ['loss', t('rt.loss', 'Утрата, смерть близкого')], ['health', t('rt.health', 'Болезнь, операция')], ['accident', t('rt.accident', 'Авария, травма')], ['other', t('rt.other', 'Другое важное')]];
  const PREC_LIST = () => [['day', t('rp.day', 'точная дата')], ['week', t('rp.week', '± неделя')], ['month', t('rp.month', 'месяц')], ['season', t('rp.season', 'сезон')], ['year', t('rp.year', 'год')]];
  const WEIGHT_LIST = () => [[1, t('rw.1', 'обычное')], [2, t('rw.2', 'важное')], [3, t('rw.3', 'очень важное')]];
  const typeName = (k) => (TYPE_LIST().find((x) => x[0] === k) || [0, k])[1];
  const cuspName = (h) => ({ 1: t('rc.asc', 'Асцендент'), 4: 'IC', 7: t('rc.dsc', 'Десцендент'), 10: 'MC' })[h] || t('rc.cusp', 'куспид {n} дома', { n: h });
  const pg = (id) => root.NDay.pg(id);

  function hitText(h) {
    const TX = UI.TX(), a = W.ASP_G[{ 0: 'conj', 90: 'square', 180: 'opp' }[h.ang]] + VS;
    const pn = (id) => (TX.P[id] ? TX.P[id].name : id);
    switch (h.m) {
      case 'sa': return { g: `${pg(h.P)}${a}${h.h === 1 ? 'AC' : h.h === 10 ? 'MC' : h.h === 4 ? 'IC' : h.h === 7 ? 'DC' : h.h}`, s: t('rh.sa', 'дуга: {p} {a} {c}', { p: pn(h.P), a, c: cuspName(h.h) }) };
      case 'saAng': return { g: `${h.h === 1 ? 'AC' : 'MC'}${a}${pg(h.P)}`, s: t('rh.saAng', 'дуга: {c} {a} {p}', { c: cuspName(h.h), a, p: pn(h.P) }) };
      case 'tr': return { g: `${pg(h.P)}${a}${h.h === 1 ? 'AC' : h.h === 10 ? 'MC' : h.h === 4 ? 'IC' : h.h === 7 ? 'DC' : h.h}`, s: t('rh.tr', 'транзит: {p} {a} {c}', { p: pn(h.P), a, c: cuspName(h.h) }) };
      case 'pm': return { g: `${pg('moon')}${a}${h.h === 1 ? 'AC' : h.h === 10 ? 'MC' : h.h === 4 ? 'IC' : h.h === 7 ? 'DC' : h.h}`, s: t('rh.pm', 'прогрессивная Луна {a} {c}', { a, c: cuspName(h.h) }) };
      case 'ecl': return { g: `☉${VS}☽${VS}→${h.h === 1 ? 'AC' : h.h === 10 ? 'MC' : h.h === 4 ? 'IC' : h.h === 7 ? 'DC' : h.h}`, s: t('rh.ecl', '{k} на оси «{c}»', { k: h.P === 'solarEcl' ? t('rh.sol', 'солнечное затмение') : t('rh.lun', 'лунное затмение'), c: cuspName(h.h) }) };
      default: return { g: '', s: '' };
    }
  }

  function personEvents(p) { return Array.isArray(p.events) ? p.events.map((e) => Object.assign({}, e)) : []; }
  function saveEvents(p, list) { root.NStore.upsertPerson(Object.assign({}, root.NStore.person(p.id) || p, { events: list })); }

  function render(body, pActive, params) {
    const people = root.NStore.people();
    if (params && params.id && root.NStore.person(params.id)) st.pid = params.id;
    if (!st.pid || !root.NStore.person(st.pid)) st.pid = pActive.id;
    const p = root.NStore.person(st.pid);
    const prof = p.timeKnown !== false ? p.h * 60 + p.mi : 12 * 60;
    if (st.from == null || st.pidFor !== p.id) { st.pidFor = p.id; if (p.timeKnown !== false) { st.from = Math.max(0, prof - 90); st.to = Math.min(1439, prof + 90); st.step = 2; } else { st.from = 0; st.to = 1439; st.step = 4; } st.res = null; st.ctl = null; st.sel = null; }
    let events = personEvents(p);
    body.innerHTML = `<div class="stack s18">
      <section class="card pad-lg stack">
        <span class="eyebrow">${t('rect.eyebrow', 'Ректификация')}</span><h2>${t('rect.h2', 'Уточнить время рождения по событиям жизни')}</h2>
        <p class="muted">${t('rect.lead', 'Программа перебирает время рождения в окне и смотрит, при каком времени важные события жизни совпадают с дугами, транзитами, прогрессивной Луной и затмениями на углах карты и куспидах «своих» домов (брак — 7 дом, переезд — 4-й, карьера — 10-й…). Чем больше событий и чем точнее даты — тем надёжнее.')}</p>
        <div class="ctrl">
          <div class="field"><label>${t('rect.who', 'Чья карта')}</label><select class="select" data-rp>${people.map((x) => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
          <div class="field"><label>${t('rect.prof', 'Время в профиле')}</label><div class="input" style="display:flex;align-items:center;background:var(--surface-2)">${p.timeKnown !== false ? hm(prof) : t('rect.noTime', 'не указано')} · ${esc(p.place.name)}</div></div>
          <div class="field"><label>${t('rect.from', 'Искать с')}</label><input class="input" inputmode="numeric" placeholder="${esc(t('ph.time', 'ЧЧ:ММ'))}" data-rf value="${hm(st.from)}"></div>
          <div class="field"><label>${t('rect.to', 'по')}</label><input class="input" inputmode="numeric" placeholder="${esc(t('ph.time', 'ЧЧ:ММ'))}" data-rt value="${hm(st.to)}"></div>
          <div class="field"><label>${t('rect.step', 'Шаг')}</label><select class="select" data-rs>${[1, 2, 4, 10].map((s) => `<option value="${s}" ${st.step === s ? 'selected' : ''}>${s} ${t('rect.min', 'мин')}</option>`).join('')}</select></div>
        </div>
        <div class="chips">${p.timeKnown !== false ? [30, 60, 120].map((w) => `<button class="chip" type="button" data-rw="${w}">${esc(w < 60 ? t('rect.pmMin', '± {n} мин', { n: w }) : t('rect.pmH', '± {n} ч', { n: w / 60 }))}</button>`).join('') : ''}<button class="chip" type="button" data-rw="day">${t('rect.allDay', 'Весь день')}</button></div>
      </section>
      <section class="card stack">
        <div class="row sb"><h3>${t('rect.events', 'События жизни')} <span class="muted" data-rn>(${events.length})</span></h3><span class="hint-click">${icon('info', 'xs')} ${t('rect.evHint', 'нужно 5–7 событий и больше; точные даты — лучше')}</span></div>
        <div class="revs" data-rlist></div>
        <div class="row"><button class="btn sm" type="button" data-radd>${icon('plus', 'sm')} ${t('rect.add', 'Добавить событие')}</button><span class="tiny muted">${t('rect.evSaved', 'События сохраняются у человека в «Людях» — на этом устройстве.')}</span></div>
      </section>
      <div class="row"><button class="btn primary" type="button" data-rrun>${icon('target', 'sm')} ${t('rect.run', 'Найти время рождения')}</button><span class="small muted" data-rmsg></span></div>
      <div id="rectRes" class="stack s18"></div>
      <p class="tiny muted">${t('rect.note', 'Ректификация — гипотеза, а не доказательство: минуту по событиям доказать нельзя. Точное время — в документах роддома. Используй результат как ориентир и проверяй его по своей жизни.')}</p>
    </div>`;
    const list = body.querySelector('[data-rlist]');
    const rowHTML = (e, i) => `<div class="rev" data-i="${i}">
      ${UI.dateFieldHTML(`data-f="date" aria-label="${esc(t('rect.date', 'Дата'))}"`, e.y ? `${UI.pad(e.d)}.${UI.pad(e.mo)}.${e.y}` : '')}
      <select class="select" data-f="prec" aria-label="${t('rect.prec', 'Точность даты')}">${PREC_LIST().map(([k, n]) => `<option value="${k}" ${e.prec === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <select class="select" data-f="type" aria-label="${t('rect.type', 'Что произошло')}">${TYPE_LIST().map(([k, n]) => `<option value="${k}" ${e.type === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <select class="select" data-f="weight" aria-label="${t('rect.weight', 'Важность')}">${WEIGHT_LIST().map(([k, n]) => `<option value="${k}" ${+e.weight === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <input class="input" data-f="label" value="${esc(e.label || '')}" placeholder="${t('rect.labelPh', 'Коротко: что случилось')}" aria-label="${t('rect.label', 'Описание')}">
      <button class="iconbtn" type="button" data-rdel aria-label="${t('delete', 'Удалить')}">${icon('trash')}</button></div>`;
    let saveT = null;
    const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => saveEvents(p, events), 400); body.querySelector('[data-rn]').textContent = `(${events.length})`; };
    const drawList = () => {
      list.innerHTML = events.length ? `<div class="rev rev-h" aria-hidden="true"><span>${t('rect.date', 'Дата')}</span><span>${t('rect.prec', 'Точность даты')}</span><span>${t('rect.type', 'Что произошло')}</span><span>${t('rect.weight', 'Важность')}</span><span>${t('rect.label', 'Описание')}</span><span></span></div>` + events.map(rowHTML).join('') : `<div class="empty"><h3>${t('rect.emptyT', 'Добавь события своей жизни')}</h3><p class="muted small">${t('rect.emptyP', 'Брак, рождение детей, переезды, смена работы, утраты, аварии — всё, что сильно меняло жизнь. Если дата примерная — выбери «месяц» или «сезон».')}</p></div>`;
      list.querySelectorAll('.rev[data-i]').forEach((row) => {
        const i = +row.dataset.i;
        UI.bindDateInput(row.querySelector('[data-f="date"]'), null);
        row.querySelectorAll('[data-f]').forEach((inp) => inp.addEventListener('change', () => {
          const f = inp.dataset.f, e = events[i];
          if (f === 'date') { const r = UI.parseDate(inp.value); if (!r.error) Object.assign(e, { y: r.y, mo: r.mo, d: r.d }); }
          else if (f === 'weight') e.weight = +inp.value; else e[f] = inp.value;
          persist();
        }));
        row.querySelector('[data-rdel]').addEventListener('click', () => { events.splice(i, 1); persist(); drawList(); });
      });
    };
    drawList();
    body.querySelector('[data-radd]').addEventListener('click', () => {
      const td = UI.todayIn(UI.here().tz);
      events.push({ y: td.y - 1, mo: td.mo, d: 1, prec: 'month', type: 'move', weight: 2, label: '' });
      persist(); drawList();
      const last = list.querySelector('.rev[data-i]:last-child [data-f="date"]'); if (last) { last.focus(); last.select(); }
    });
    body.querySelector('[data-rp]').addEventListener('change', (e) => { st.pid = e.target.value; st.from = null; render(body, pActive, {}); });
    const parseHM = (v) => { const m = String(v).match(/^(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; };
    UI.bindTimeInput(body.querySelector('[data-rf]'), null, false); UI.bindTimeInput(body.querySelector('[data-rt]'), null, false);
    body.querySelector('[data-rf]').addEventListener('change', (e) => { const v = parseHM(e.target.value); if (v != null) st.from = v; });
    body.querySelector('[data-rt]').addEventListener('change', (e) => { const v = parseHM(e.target.value); if (v != null) st.to = v; });
    body.querySelector('[data-rs]').addEventListener('change', (e) => { st.step = +e.target.value; });
    body.querySelectorAll('[data-rw]').forEach((b) => b.addEventListener('click', () => {
      const w = b.dataset.rw;
      if (w === 'day') { st.from = 0; st.to = 1439; st.step = Math.max(st.step, 4); } else { st.from = Math.max(0, prof - +w); st.to = Math.min(1439, prof + +w); }
      body.querySelector('[data-rf]').value = hm(st.from); body.querySelector('[data-rt]').value = hm(st.to); body.querySelector('[data-rs]').value = String(st.step);
    }));
    body.querySelector('[data-rrun]').addEventListener('click', async () => {
      const msg = body.querySelector('[data-rmsg]');
      const ev = events.filter((e) => e.y && e.mo && e.d);
      if (ev.length < 3) { msg.textContent = t('rect.need', 'Добавь хотя бы 3 события с датами (лучше 5–7).'); msg.style.color = 'var(--bad)'; return; }
      if (st.to <= st.from) { msg.textContent = t('rect.badWin', 'Окно поиска пустое: «по» должно быть позже «с».'); msg.style.color = 'var(--bad)'; return; }
      msg.style.color = ''; msg.textContent = t('rect.busy', 'Считаю… перебираю {n} вариантов времени', { n: Math.floor((st.to - st.from) / st.step) + 1 });
      await new Promise((r) => setTimeout(r, 30));
      st.opts = { y: p.y, mo: p.mo, d: p.d, h0: Math.floor(prof / 60), m0: prof % 60, tz: p.place.tz, lat: p.place.lat, lon: p.place.lon, hs: root.NStore.settings().houseSystem || 'placidus', from: st.from, to: st.to, step: st.step, events: ev };
      st.res = R.run(st.opts); st.ctl = null; st.sel = st.res.top[0] ? st.res.top[0].min : null;
      msg.textContent = '';
      drawResults(body.querySelector('#rectRes'), p, prof);
    });
    if (st.res) drawResults(body.querySelector('#rectRes'), p, prof);
  }

  function curveSVG(res, prof, sel) {
    const c = res.cands, n = c.length, Wd = 1000, H = 230, L = 40, Rr = 12, T = 26, B = 34;
    const x0 = c[0].min, x1 = c[n - 1].min, span = Math.max(1, x1 - x0);
    const x = (m) => L + (m - x0) / span * (Wd - L - Rr), y = (v) => T + (1 - v) * (H - T - B);
    const pts = c.map((k) => `${x(k.min).toFixed(1)},${y(k.rel).toFixed(1)}`).join(' ');
    const stepL = span > 600 ? 120 : span > 240 ? 60 : span > 90 ? 30 : 10;
    let s = `<svg class="tone" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${esc(t('rect.curve', 'Насколько каждое время объясняет события'))}">`;
    for (let m = Math.ceil(x0 / stepL) * stepL; m <= x1; m += stepL) s += `<line x1="${x(m)}" x2="${x(m)}" y1="${T - 6}" y2="${H - B}" stroke="var(--line-soft)"/><text x="${x(m)}" y="${H - 12}" text-anchor="middle" font-family="var(--f-mono)" font-size="11" fill="var(--muted)">${hm(m)}</text>`;
    s += `<polygon points="${x(x0)},${y(0)} ${pts} ${x(x1)},${y(0)}" fill="color-mix(in srgb,var(--lav) 22%,transparent)"/><polyline points="${pts}" fill="none" stroke="var(--lav-strong)" stroke-width="2" stroke-linejoin="round"/>`;
    if (prof >= x0 && prof <= x1) s += `<line x1="${x(prof)}" x2="${x(prof)}" y1="${T}" y2="${H - B}" stroke="var(--gold)" stroke-width="1.6" stroke-dasharray="4 4"/><text x="${x(prof) + 5}" y="${H - B - 6}" font-family="var(--f-ui)" font-size="11" font-weight="700" fill="var(--gold)">${t('rect.inProfile', 'в профиле')} ${hm(prof)}</text>`;
    const placed = [];
    res.top.slice(0, 3).forEach((tp, i) => {
      const lx = x(tp.min); let ly = y(tp.rel) - 10;
      while (placed.some(([px, py]) => Math.abs(px - lx) < 44 && Math.abs(py - ly) < 14)) ly -= 15;
      placed.push([lx, ly]);
      s += `<circle cx="${lx}" cy="${y(tp.rel)}" r="${i === 0 ? 6 : 4.5}" fill="${i === 0 ? 'var(--dot-p2)' : 'var(--dot-acc)'}" stroke="var(--surface)" stroke-width="2"/><text x="${lx}" y="${Math.max(12, ly)}" text-anchor="middle" font-family="var(--f-ui)" font-size="12" font-weight="800" fill="var(--ink)">${hm(tp.min)}</text>`;
    });
    if (sel != null) s += `<line x1="${x(sel)}" x2="${x(sel)}" y1="${T}" y2="${H - B}" stroke="var(--lav-strong)" stroke-width="2"/>`;
    const colW = (Wd - L - Rr) / Math.max(1, n - 1);
    c.forEach((k) => { s += `<rect x="${(x(k.min) - colW / 2).toFixed(1)}" y="${T}" width="${Math.max(1, colW).toFixed(1)}" height="${H - T - B}" fill="transparent" data-rmin="${k.min}" data-tip="${esc(hm(k.min) + ' · ' + Math.round(k.rel * 100) + '% · ' + t('rect.ascShort', 'Асц') + ' ' + W.fmtDeg(k.asc, UI.lang()))}" style="cursor:pointer"/>`; });
    return s + '</svg>';
  }

  function drawResults(box, p, prof) {
    const res = st.res; if (!res) return;
    const TX = UI.TX(), ev = st.opts.events;
    const fmtA = (l) => W.fmtDeg(l, UI.lang());
    const explained = (tp) => tp.why.filter((w) => w.r.v > 0.3).length;
    box.innerHTML = `<section class="card stack"><div class="row sb"><h3>${t('rect.curve', 'Насколько каждое время объясняет события')}</h3><span class="hint-click">${icon('info', 'xs')} ${t('rect.curveHint', 'нажми на кривую — покажу карту и «почему»')}</span></div><div class="tone-wrap" data-rcurve>${curveSVG(res, prof, st.sel)}</div></section>
      ${res.top[1] && res.top[1].score >= 0.9 * res.top[0].score ? `<div class="alert">${icon('alert')}<div><b>${t('rect.tieT', 'Несколько вариантов почти равны')}:</b> ${esc(res.top.filter((x) => x.score >= 0.9 * res.top[0].score).map((x) => hm(x.min)).join(', '))}. ${t('rect.tieP', 'События их не различают — выбери по другим данным (рассказ мамы, роддом, внешность и характер по Асценденту) или добавь событий с точными датами.')}</div></div>` : ''}
      <section class="stack s6"><span class="label">${t('rect.top', 'Лучшие варианты')}</span><div class="rc-cards">${res.top.map((tp, i) => `<button class="rc tap${st.sel === tp.min ? ' sel' : ''}" type="button" data-rsel="${tp.min}">
          <span class="row sb"><b class="rc-t">${hm(tp.min)}</b>${i === 0 ? `<span class="tag ok">${t('rect.best', 'лучший')}</span>` : `<span class="tag plain">#${i + 1}</span>`}</span>
          <span class="tiny muted">${t('rect.win', 'окно {a}–{b}', { a: hm(tp.win[0]), b: hm(tp.win[1]) })}</span>
          <span class="small">AC ${esc(fmtA(tp.asc))}<br>MC ${esc(fmtA(tp.mc))}</span>
          <span class="pbar"><i class="c-l1" style="width:${Math.round(tp.rel * 100)}%;background:var(--dot-acc)"></i></span>
          <span class="tiny muted">${t('rect.expl', 'объясняет событий: {a} из {b}', { a: explained(tp), b: ev.length })}</span></button>`).join('')}</div></section>
      <div class="grid2" data-rsel-box></div>
      <section class="card stack" data-rtable></section>
      <section class="card stack" data-rctl></section>`;
    box.querySelector('[data-rcurve]').addEventListener('click', (e) => { const r = e.target.closest('[data-rmin]'); if (r) select(+r.dataset.rmin); });
    box.querySelectorAll('[data-rsel]').forEach((b) => b.addEventListener('click', () => select(+b.dataset.rsel)));
    root.NWheel.bindTips(box);
    const select = (min) => { st.sel = min; box.querySelector('[data-rcurve]').innerHTML = curveSVG(res, prof, min); box.querySelectorAll('[data-rsel]').forEach((b) => b.classList.toggle('sel', +b.dataset.rsel === min)); drawSel(min); };
    // выбранное время: карта + ползунок + «почему»
    const drawSel = (min) => {
      const slot = box.querySelector('[data-rsel-box]');
      if (min == null) { slot.innerHTML = ''; return; }
      const ex = R.explain(st.opts, min);
      const dt = AC.localToUTC(p.y, p.mo, p.d, ex.h, ex.mi, p.place.tz).date;
      slot.innerHTML = `<div class="wheel-card"><div class="row sb"><div><h3>${t('rect.chartAt', 'Карта на {t}', { t: hm(min) })}</h3><span class="tiny muted">AC ${esc(fmtA(ex.asc))} · MC ${esc(fmtA(ex.mc))}</span></div><span class="tag acc">${Math.round(ex.score / res.max * 100)}%</span></div>
          <div class="wheel-box" data-rwheel></div><div data-rtb></div>
          <div class="row"><button class="btn sm primary" type="button" data-rapply>${icon('check', 'sm')} ${t('rect.apply2', 'Сохранить {t} в профиль', { t: hm(min) })}</button><a class="btn sm" href="#chart?id=${p.id}">${icon('chart', 'sm')} ${t('rect.openChart', 'Открыть карту')}</a></div></div>
        <div class="card stack"><h3>${t('rect.why', 'Почему {t}', { t: hm(min) })}</h3><div class="evlist">${ex.why.map((w) => { const e = ev[w.ei]; const hits = (w.r.hits || []).filter((h) => h.v > 0.05).slice(0, 3); return `<div class="ev" style="grid-template-columns:88px minmax(0,1fr)"><span class="tm">${UI.pad(e.d)}.${UI.pad(e.mo)}.${e.y}</span><div><b>${esc(e.label || typeName(e.type))}</b> <span class="tiny muted">${esc(typeName(e.type))}</span>${hits.length ? hits.map((h) => { const x = hitText(h); return `<p><span class="g" style="color:var(--lav-strong)">${x.g}</span> ${esc(x.s)} · ${t('orb', 'орбис')} ${h.orb.toFixed(2)}°</p>`; }).join('') : `<p class="faint">${t('rect.noHit', 'при этом времени событие ничем не отмечено')}</p>`}</div></div>`; }).join('')}</div></div>`;
      const drawWheel = (d) => { const q = UI.partsIn(d, p.place.tz); const c = AC.chart({ date: d, timeKnown: true, zone: p.place.tz, lat: p.place.lat, lon: p.place.lon }, { houseSystem: st.opts.hs }); slot.querySelector('[data-rwheel]').innerHTML = root.NChart.wheelOf(c, { label: UI.fmtHMS(q) }); root.NWheel.bindTips(slot.querySelector('[data-rwheel]')); };
      drawWheel(dt);
      const bar = UI.timebar({ date: dt, tz: p.place.tz, play: false, dayRange: 1, nowLabel: t('rect.toPeak', 'К выбранному'), reset: () => dt });
      const tb = slot.querySelector('[data-rtb]'); tb.innerHTML = bar.html;
      const api = bar.bind(tb, (d) => drawWheel(d));
      UI.wheelScrub(slot.querySelector('[data-rwheel]'), () => api);
      slot.querySelector('[data-rapply]').addEventListener('click', () => {
        root.NStore.upsertPerson(Object.assign({}, root.NStore.person(p.id), { h: ex.h, mi: ex.mi, timeKnown: true }));
        UI.toast(t('rect.applied', 'Время {t} сохранено в профиль', { t: hm(min) }));
      });
    };
    drawSel(st.sel);
    // событие × лучшие кандидаты
    const cols = res.top.slice(0, 4);
    const maxPer = ev.map((_, i) => Math.max(1e-6, ...res.cands.map((c) => c.per[i])));
    box.querySelector('[data-rtable]').innerHTML = `<div class="row sb"><h3>${t('rect.table', 'Какие события поддерживают каждый вариант')}</h3><span class="tiny muted">${t('rect.tableHint', 'чем зеленее, тем сильнее событие «за» это время')}</span></div>
      <div class="heat-wrap"><table class="heat" style="min-width:520px"><thead><tr><th></th>${cols.map((c) => `<th class="d">${hm(c.min)}</th>`).join('')}</tr></thead><tbody>${ev.map((e, i) => `<tr><th>${UI.pad(e.mo)}.${e.y} · ${esc(e.label || typeName(e.type))}</th>${cols.map((c) => { const v = c.per[i] / maxPer[i]; const lv = v > 0.75 ? 2 : v > 0.45 ? 1 : v > 0.15 ? 0 : -1; return `<td class="f-${UI.lvCls(lv)}" data-tip="${esc(hm(c.min) + ': ' + Math.round(v * 100) + '%')}">${Math.round(v * 100)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
    // проверка на случайность
    const ctl = box.querySelector('[data-rctl]');
    const drawCtl = () => {
      const c = st.ctl;
      const verdict = !c ? '' : c.p < 0.05 ? ['ok', t('rect.vHigh', 'высокая')] : c.p < 0.2 ? ['acc', t('rect.vMid', 'средняя')] : ['bad', t('rect.vLow', 'низкая — совпадения могли быть случайными')];
      ctl.innerHTML = `<div class="row sb"><h3>${t('rect.ctlT', 'Проверка на случайность')}</h3>${c ? `<span class="tag ${verdict[0]}" style="white-space:normal">${t('rect.rel', 'надёжность')}: ${esc(verdict[1])}</span>` : ''}</div>
        <p class="small muted">${t('rect.ctlP', 'Сдвигаем всю биографию на случайный срок (1–6 лет) и считаем заново. Если у «сдвинутой» жизни пик такой же высокий — совпадения могли получиться случайно.')}</p>
        ${c ? `<p>${t('rect.ctlRes', 'Из {n} сдвинутых биографий у {g} пик был не ниже — вероятность случайного совпадения ≈ {p}%.', { n: c.n, g: c.ge, p: Math.round(c.p * 100) })}</p><div class="viz-bars" style="height:70px">${c.maxes.slice().sort((a, b) => a - b).map((m) => `<button type="button" tabindex="-1" style="height:${Math.max(6, m / Math.max(res.max, ...c.maxes) * 100)}%;background:${m >= res.max ? 'var(--dot-m2)' : 'var(--dot-0)'};cursor:default" data-tip="${esc(t('rect.shifted', 'сдвинутая биография') + ': ' + Math.round(m / res.max * 100) + '%')}"></button>`).join('')}<button type="button" tabindex="-1" style="height:${res.max / Math.max(res.max, ...c.maxes) * 100}%;background:var(--dot-p2);cursor:default" data-tip="${esc(t('rect.real', 'настоящая биография'))}"></button></div><span class="tiny muted">${t('rect.ctlLegend', 'серые — пики сдвинутых биографий, зелёный — настоящая, розовые — не ниже настоящей')}</span>` : `<div class="row"><button class="btn sm" type="button" data-rctlgo>${icon('shield', 'sm')} ${t('rect.ctlGo', 'Проверить (≈10 секунд)')}</button><span class="pbar" style="flex:1;min-width:120px" data-rprog hidden><i style="width:0%;background:var(--lav)"></i></span></div>`}`;
      const go = ctl.querySelector('[data-rctlgo]');
      if (go) go.addEventListener('click', async () => {
        go.disabled = true; const pr = ctl.querySelector('[data-rprog]'); pr.hidden = false;
        st.ctl = await R.control(st.opts, res, 30, (f) => { pr.firstElementChild.style.width = Math.round(f * 100) + '%'; });
        drawCtl(); root.NWheel.bindTips(ctl);
      });
    };
    drawCtl();
  }

  /** Отдельный раздел в меню слева: ректификация — VIP, самая точная информация карты. */
  function vipPage(el, params) {
    const p = (params.id && root.NStore.person(params.id)) || root.NStore.active();
    if (!p) { location.hash = '#onboard'; return; }
    const cfg = (root.NCONFIG || {}).rectVip || {};
    el.innerHTML = `<section class="vip-hero">
        <div class="vip-mark" aria-hidden="true">${icon('crown', 'lg')}</div>
        <div class="stack s6" style="min-width:0">
          <div class="row" style="gap:8px"><span class="vip-badge lg">VIP</span><span class="vip-paid">${t('vip.paid', 'Платная услуга')}</span></div>
          <h1>${t('vip.h1', 'Ректификация — точное время рождения')}</h1>
          <p>${t('vip.lead', 'Самая ценная информация в астрологии: от минуты рождения зависят Асцендент, MC, дома и точность всех прогнозов. Программа сверяет время рождения с событиями твоей жизни и находит, при каком времени они объясняются лучше всего.')}</p>
          <div class="tags"><span class="tag gold">${icon('target', 'xs')} ${t('vip.f1', 'Асцендент и дома — до минуты')}</span><span class="tag gold">${icon('route', 'xs')} ${t('vip.f2', 'дуги, транзиты, прогрессии, затмения')}</span><span class="tag gold">${icon('shield', 'xs')} ${t('vip.f3', 'проверка на случайность')}</span></div>
          ${cfg.note ? `<p class="tiny vip-note">${esc(t('vip.note', cfg.note))}</p>` : ''}
        </div></section>
      <div id="vipBody"></div>`;
    const body = el.querySelector('#vipBody');
    if (cfg.locked) {
      body.innerHTML = `<div class="card pad-lg stack vip-lock">${icon('lock', 'lg')}<h2>${t('vip.lockT', 'Доступно в VIP')}</h2><p class="muted">${t('vip.lockP', 'Подключи VIP, чтобы уточнить время рождения по событиям жизни.')}</p>${cfg.url ? `<a class="btn primary" href="${esc(cfg.url)}" target="_blank" rel="noopener">${icon('crown', 'sm')} ${t('vip.get', 'Получить VIP')}</a>` : ''}</div>`;
      return;
    }
    render(body, p, params);
  }

  root.NRectPage = { render };
  (root.NPages = root.NPages || {}).rectify = { render: vipPage };
})(window);
