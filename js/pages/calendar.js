/* «Календарь»: месяц (как лунный календарь на сайте Алины) и неделя карточками, баллы 1–10 по сфере или делу.
   Наведение — краткий прогноз, нажатие — день в панели справа (той же высоты, что календарь); окно с подробностями — только кнопкой «Подробнее о дне».
   Ниже: «Что когда делать» (дела по баллам), ритм месяца, карта баллов по сферам, фон долгих транзитов, ход недели по часам. */
(function (root) {
  'use strict';
  const UI = root.NUI, NS = root.NScore, AC = root.AstroCore, W = root.NWheel;
  const { t, esc, icon } = UI;
  const DAY = 86400000;
  const state = { view: 'month', key: 'overall', y: null, mo: null, sel: null, heat: 'sph' };
  const same = (a, b) => a && b && a.y === b.y && a.mo === b.mo && a.d === b.d;
  const addD = (c, k) => { const dt = new Date(Date.UTC(c.y, c.mo - 1, c.d + k)); return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate() }; };
  const wdOf = (c) => (new Date(Date.UTC(c.y, c.mo - 1, c.d)).getUTCDay() + 6) % 7; // пн = 0
  const LVK = (l) => UI.lvCls(l);
  const canHover = () => !!(window.matchMedia && window.matchMedia('(hover: hover)').matches);
  const keyName = (key) => { const TX = UI.TX(); return !key || key === 'overall' ? t('all', 'Всё вместе') : key.startsWith('act:') ? TX.ACT[key.slice(4)].name : TX.SPH[key].name; };

  async function page(el, params) {
    const p = root.NStore.active();
    if (!p) { location.hash = '#onboard'; return; }
    const here = UI.here(), now = UI.todayIn(here.tz), TX = UI.TX();
    if (params.s) state.key = params.s;
    if (params.a) state.key = 'act:' + params.a;
    if (params.v === 'week' || params.v === 'month') state.view = params.v;
    if (params.d) { const [y, mo, d] = params.d.split('-').map(Number); state.sel = { y, mo, d }; state.y = y; state.mo = mo; }
    if (!state.y) { state.y = now.y; state.mo = now.mo; }
    if (!state.sel) state.sel = now;
    const ctx = { p, here, now, el };
    el.innerHTML = `<div class="sec-head"><span class="eyebrow">${t('cal.eyebrow', 'Личный календарь')} · ${esc(p.name)}</span><h1>${t('cal.title2', 'Когда <em>что</em> делать')}</h1>
        <p>${t('cal.lead', 'Баллы от 1 до 10: чем выше, тем легче идёт дело. Выбери сферу или дело — календарь перекрасится под него.')}</p></div>
      <div class="cal-top"><div class="seg" role="group" aria-label="${t('cal.view', 'Вид')}"><button type="button" data-view="month" aria-pressed="${state.view === 'month'}">${t('cal.month', 'Месяц')}</button><button type="button" data-view="week" aria-pressed="${state.view === 'week'}">${t('cal.week', 'Неделя')}</button></div>
        <span class="hint-click">${icon('info', 'xs')} ${canHover() ? t('cal.how2', 'Наведи на день — кратко, нажми — покажу его справа') : t('cal.howTouch2', 'Нажми на день — подробности под календарём')}</span></div>
      <div class="scrollx"><div class="chips" id="flt" role="group" aria-label="${t('cal.filter', 'Сфера')}"></div></div>
      <div id="calBody" class="stack s18"></div>
      <div id="bgBox" class="stack"></div>`;
    el.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { state.view = b.dataset.view; el.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); drawFilters(ctx); drawBody(ctx); }));
    drawFilters(ctx);
    await drawBody(ctx);
    drawBackground(ctx);
  }

  function drawFilters(ctx) {
    const TX = UI.TX(), box = ctx.el.querySelector('#flt');
    const list = [['overall', t('all', 'Всё вместе'), 'grid']].concat(NS.SPHERES.map((s) => [s, TX.SPH[s].name, root.NDay.SPH_ICON[s]]));
    const act = state.key.startsWith('act:') ? state.key.slice(4) : null;
    box.innerHTML = list.map(([k, n, ic]) => `<button class="chip" type="button" data-f="${k}" aria-pressed="${state.key === k}">${icon(ic)} ${esc(n)}</button>`).join('')
      + (act ? `<button class="chip" type="button" data-f="${state.key}" aria-pressed="true">${icon(TX.ACT[act].icon)} ${esc(TX.ACT[act].name)} <span aria-hidden="true">✕</span></button>` : '');
    box.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.f; state.key = k.startsWith('act:') && state.key === k ? 'overall' : k; drawFilters(ctx); drawBody(ctx); }));
  }

  // ---------- месяц ----------
  async function drawBody(ctx) {
    const box = ctx.el.querySelector('#calBody'); if (!box) return;
    if (state.view === 'week') return drawWeek(ctx, box);
    const { p, here, now } = ctx, TX = UI.TX();
    const { y, mo } = state;
    box.innerHTML = `<div class="cal-layout">
        <div class="card stack">
          <div class="cal-head"><button class="iconbtn bd" data-m="-1" aria-label="${t('prevMonth', 'Предыдущий месяц')}">${icon('left')}</button><h2>${esc(TX.MONTHS_N[mo - 1])} ${y}</h2><button class="iconbtn bd" data-m="1" aria-label="${t('nextMonth', 'Следующий месяц')}">${icon('right')}</button>
            ${y !== now.y || mo !== now.mo ? `<button class="btn sm" data-m="0">${t('thisMonth', 'Этот месяц')}</button>` : ''}<span class="spacer"></span>${legend()}</div>
          <div class="cal" id="cal" role="grid" aria-label="${esc(TX.MONTHS_N[mo - 1] + ' ' + y)}">${grid(y, mo, null, now)}</div>
          <div class="row sb tiny muted"><span>${t('cal.marks2', '☽ знак Луны · полоска внизу — часы Луны без курса · R/D — разворот планеты')}</span><span>${esc(keyName(state.key))}</span></div>
        </div>
        <aside class="dpanel" id="dpanel" aria-live="polite"><div class="card" style="opacity:.5"></div></aside>
      </div>
      <div class="grid2"><div class="card stack" id="actsBox"><h3>${t('acts.title', 'Что когда делать')}</h3><p class="muted small">…</p></div><div class="card stack" id="bestBox"><h3>${t('cal.best', 'Лучшие дни месяца')}</h3></div></div>
      <div class="card stack" id="heatBox"></div>`;
    box.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => {
      const k = +b.dataset.m;
      if (k === 0) { state.y = now.y; state.mo = now.mo; state.sel = now; } else { let m = state.mo + k, yy = state.y; if (m < 1) { m = 12; yy--; } if (m > 12) { m = 1; yy++; } state.y = yy; state.mo = m; state.sel = same({ y: yy, mo: m, d: now.d }, now) ? now : { y: yy, mo: m, d: 1 }; }
      drawBody(ctx); drawBackground(ctx);
    }));
    const list = await root.NCompute.month(p, y, mo, here.tz);
    if (state.y !== y || state.mo !== mo || state.view !== 'month') return;
    const cal = box.querySelector('#cal'); if (!cal) return;
    if (!state.sel || state.sel.y !== y || state.sel.mo !== mo) state.sel = { y, mo, d: 1 };
    cal.innerHTML = grid(y, mo, list, now);
    const pick = (d, reveal) => {
      state.sel = { y, mo, d };
      cal.querySelectorAll('.cday.sel').forEach((x) => x.classList.remove('sel'));
      const c = cal.querySelector(`[data-d="${d}"]`); if (c) c.classList.add('sel');
      drawPanel(ctx, list[d - 1]);
      if (reveal) revealPanel(ctx, reveal);
    };
    ctx.pick = (d) => pick(d, 'show');
    // нажатие на день — только выбрать: панель справа покажет его; окно — кнопкой «Подробнее о дне»
    cal.addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (b) pick(+b.dataset.d, 'below'); });
    cal.addEventListener('keydown', (e) => {
      const b = e.target.closest('[data-d]'); if (!b) return;
      const k = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]; if (!k) return;
      const nd = +b.dataset.d + k; if (nd < 1 || nd > list.length) return;
      e.preventDefault(); pick(nd, false); const c = cal.querySelector(`[data-d="${nd}"]`); if (c) c.focus();
    });
    UI.richTip(cal, '.cday[data-d]', (b) => root.NDay.tipHTML(list[+b.dataset.d - 1], { key: state.key, person: p, foot: t('tip.pick', 'Нажми — покажу справа') }));
    drawPanel(ctx, list[state.sel.d - 1]);
    actsBox(ctx, box.querySelector('#actsBox'), list);
    bestBox(ctx, box.querySelector('#bestBox'), list);
    heatBox(ctx, box.querySelector('#heatBox'), list);
  }

  function legend() {
    const TX = UI.TX();
    return `<div class="legend">${[[2, '9–10'], [1, '7–8'], [0, '5–6'], [-1, '3–4'], [-2, '1–2']].map(([l, n]) => `<span><i class="c-${LVK(l)}"></i>${n} ${esc(TX.LEVEL[l])}</span>`).join('')}</div>`;
  }

  function grid(y, mo, list, now) {
    const TX = UI.TX();
    const wd0 = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7;
    const n = UI.daysIn(y, mo);
    let s = [1, 2, 3, 4, 5, 6, 0].map((i) => `<div class="wd" role="columnheader">${TX.WD[i]}</div>`).join('');
    for (let i = 0; i < wd0; i++) s += '<div aria-hidden="true"></div>';
    for (let d = 1; d <= n; d++) {
      const isToday = now.y === y && now.mo === mo && now.d === d, isSel = same(state.sel, { y, mo, d });
      if (!list) { s += `<div class="cday load${isToday ? ' today' : ''}"><span class="cd-h"><span class="cd-n">${d}</span></span></div>`; continue; }
      s += cell(list[d - 1], isToday, isSel);
    }
    return s;
  }

  function cell(day, isToday, isSel) {
    const TX = UI.TX(), f = day.flags, r = NS.rateBy(day, state.key);
    const ms = AC.moonState(new Date(day.start.getTime() + 13 * 3600000));
    const title = state.key === 'overall' ? TX.dayTitle(day) : TX.LEVEL[r.level];
    const mk = [];
    if (f.phaseEvent) mk.push(`<span class="k e">${esc(TX.PHASE4[f.phaseEvent.phase])}</span>`);
    if (f.station) mk.push(`<span class="k r">${root.NDay.pg(f.station.id)}${f.station.kind === 'retro' ? 'R' : 'D'}</span>`);
    if (f.eclipse && Math.abs(f.eclipse.date - (day.start.getTime() + 43200000)) < DAY) mk.push(`<span class="k r">${t('eclipse', 'затмение')}</span>`);
    const d0 = day.start.getTime();
    const voc = f.voc.map((v) => { const a = Math.max(0, (v.start - d0) / DAY), b = Math.min(1, (v.end - d0) / DAY); return b > a ? `<i style="left:${(a * 100).toFixed(1)}%;width:${((b - a) * 100).toFixed(1)}%"></i>` : ''; }).join('');
    const label = `${UI.fmtDate(day.y, day.mo, day.d, { weekday: 'long', year: undefined })}: ${r.pts} ${t('pts.from10', 'из 10')}, ${title}`;
    return `<button class="cday ${LVK(r.level)}${isToday ? ' today' : ''}${isSel ? ' sel' : ''}" type="button" data-d="${day.d}" aria-label="${esc(label)}">
      <span class="cd-h"><span class="cd-n">${day.d}</span><span class="cd-p pts ${LVK(r.level)}">${r.pts}</span></span>
      <span class="cd-t">${esc(title)}</span>
      <span class="cd-m">${UI.moonSVG(ms.angle, 14)}<span class="g">${root.NDay.sg(ms.sign)}</span><span>${esc(TX.S[ms.sign].name)}</span></span>
      ${mk.length ? `<span class="cd-k">${mk.join('')}</span>` : ''}
      <span class="cd-voc">${voc}</span></button>`;
  }

  /** Показать панель дня, если её не видно: на узком экране она под календарём ('below' — только в этом случае), снизу страницы — над нами ('show'). */
  function revealPanel(ctx, mode) {
    const pn = ctx.el.querySelector('#dpanel'), cal = ctx.el.querySelector('#cal'); if (!pn) return;
    const r = pn.getBoundingClientRect(), vh = window.innerHeight;
    const stacked = !!cal && r.top >= cal.getBoundingClientRect().bottom - 2;
    if (mode === 'below' && !stacked) return;
    if (r.top >= 60 && r.top < vh - 200) return; // и так на виду
    const to = stacked ? pn : ctx.el.querySelector('.cal-layout') || pn;
    to.scrollIntoView({ behavior: UI.reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  function drawPanel(ctx, day) {
    const box = ctx.el.querySelector('#dpanel'); if (!box || !day) return;
    box.innerHTML = root.NDay.panel(day, { person: ctx.p, key: state.key, isToday: same(day, ctx.now) });
    box.querySelectorAll('[data-sph]').forEach((b) => b.addEventListener('click', () => root.NDay.openSphere(day, b.dataset.sph, ctx.p)));
    const o = box.querySelector('[data-open-day]'); if (o) o.addEventListener('click', () => openDay(ctx, day));
    root.NWheel.bindTips(box);
  }

  function openDay(ctx, day) {
    const sph = state.key !== 'overall' && !state.key.startsWith('act:') ? state.key : null;
    root.NDay.openDay(day, {
      person: ctx.p, sphere: sph,
      shift: async (d, k) => { const c = addD(d, k); return root.NCompute.day(ctx.p, c.y, c.mo, c.d, ctx.here.tz); },
      onShift: (nd) => {
        state.sel = { y: nd.y, mo: nd.mo, d: nd.d };
        if (state.view === 'month') {
          if (nd.y !== state.y || nd.mo !== state.mo) { state.y = nd.y; state.mo = nd.mo; drawBody(ctx); drawBackground(ctx); }
          else { const cal = ctx.el.querySelector('#cal'); if (cal) { cal.querySelectorAll('.cday.sel').forEach((x) => x.classList.remove('sel')); const c = cal.querySelector(`[data-d="${nd.d}"]`); if (c) c.classList.add('sel'); } drawPanel(ctx, nd); }
        } else drawBody(ctx);
      },
    });
  }

  // «Что когда делать»: дела по баллам
  function actsBox(ctx, box, list) {
    const TX = UI.TX(), now = ctx.now;
    const future = list.filter((d) => d.y > now.y || (d.y === now.y && (d.mo > now.mo || (d.mo === now.mo && d.d >= now.d))));
    const pool = future.length >= 3 ? future : list;
    const acts = Object.keys(NS.ACTIVITIES);
    box.innerHTML = `<div class="row sb"><h3>${t('acts.title', 'Что когда делать')}</h3><span class="tag gold">${future.length >= 3 && future.length < list.length ? t('acts.fromToday', 'с сегодняшнего дня') : t('acts.month', 'весь месяц')}</span></div>
      <p class="muted small">${t('acts.lead2', 'Лучшие дни для дел — по баллам. Нажми на дело, чтобы раскрасить календарь под него; на дату — день покажется в календаре.')}</p>
      <div class="acts">${acts.map((a) => {
        const top = NS.bestBy(pool, 'act:' + a, 3);
        const on = state.key === 'act:' + a;
        return `<div class="act${on ? ' on' : ''}"><button class="act-main" type="button" data-act="${a}" aria-pressed="${on}" title="${esc(t('acts.paint', 'Раскрасить календарь под это дело'))}"><span class="ic">${icon(TX.ACT[a].icon)}</span><span style="min-width:0"><b>${esc(TX.ACT[a].name)}</b><span class="tiny muted" style="display:block">${esc(TX.ACT[a].hint)}</span></span></button>
          <span class="days">${top.map(({ day, r }) => `<button class="dchip" type="button" data-day="${day.d}" title="${esc(UI.fmtDate(day.y, day.mo, day.d, { weekday: 'long', year: undefined }))}">${esc(TX.monthDay(day.d, day.mo))} ${UI.ptsBadge(r, true)}</button>`).join('')}</span></div>`;
      }).join('')}</div>`;
    box.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
      const k = 'act:' + b.dataset.act; state.key = state.key === k ? 'overall' : k;
      drawFilters(ctx); drawBody(ctx);
      const lay = ctx.el.querySelector('#calBody'); if (lay) lay.scrollIntoView({ behavior: UI.reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    }));
    box.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); if (ctx.pick) ctx.pick(+b.dataset.day); }));
  }

  // лучшие и трудные дни + ритм месяца
  function bestBox(ctx, box, list) {
    const TX = UI.TX(), now = ctx.now, key = state.key;
    const future = list.filter((d) => d.y > now.y || (d.y === now.y && (d.mo > now.mo || (d.mo === now.mo && d.d >= now.d))));
    const pool = future.length >= 3 ? future : list;
    const top = NS.bestBy(pool, key, 5), worst = NS.bestBy(pool, key, pool.length).slice(-3).reverse();
    const chip = ({ day, r }) => `<button class="dchip" type="button" data-day="${day.d}">${esc(TX.monthDay(day.d, day.mo))}, ${esc(TX.WD[new Date(Date.UTC(day.y, day.mo - 1, day.d)).getUTCDay()].toLowerCase())} ${UI.ptsBadge(r, true)}</button>`;
    const bars = list.map((d) => { const r = NS.rateBy(d, key); const td = same(d, now); return `<button class="c-${LVK(r.level)}" type="button" data-day="${d.d}" style="height:${Math.max(8, r.ptsF * 10)}%;${td ? 'outline:2px solid var(--lav-strong);outline-offset:1px' : ''}" data-tip="${esc(TX.monthDay(d.d, d.mo) + ': ' + r.pts + '/10 · ' + TX.LEVEL[r.level])}" aria-label="${esc(TX.monthDay(d.d, d.mo) + ': ' + r.pts)}"></button>`; }).join('');
    box.innerHTML = `<div class="row sb"><h3>${t('cal.bestFor2', 'Лучшие дни: {s}', { s: esc(keyName(key).toLowerCase()) })}</h3></div>
      <div class="tags">${top.map(chip).join('')}</div>
      <span class="label bad">${t('cal.avoid', 'Лучше избегать')}</span><div class="tags">${worst.map(chip).join('')}</div>
      <span class="label">${t('cal.rhythm', 'Ритм месяца по баллам')}</span>
      <div class="viz-bars" style="height:96px">${bars}</div><div class="viz-axis">${list.map((d) => `<span>${d.d % 5 === 0 || d.d === 1 ? d.d : ''}</span>`).join('')}</div>`;
    box.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', () => { if (ctx.pick) ctx.pick(+b.dataset.day); }));
  }

  // карта баллов по сферам (или делам) на весь месяц
  function heatBox(ctx, box, list) {
    const TX = UI.TX(), now = ctx.now;
    const rows = state.heat === 'act' ? Object.keys(NS.ACTIVITIES).map((a) => ['act:' + a, TX.ACT[a].name, TX.ACT[a].icon]) : [['overall', t('all', 'Всё вместе'), 'grid']].concat(NS.SPHERES.map((s) => [s, TX.SPH[s].name, root.NDay.SPH_ICON[s]]));
    const head = list.map((d) => { const wd = new Date(Date.UTC(d.y, d.mo - 1, d.d)).getUTCDay(); return `<th class="d${wd === 0 || wd === 6 ? ' we' : ''}">${d.d}</th>`; }).join('');
    box.innerHTML = `<div class="row sb"><div class="stack s6"><h3>${t('heat.title', 'Баллы на весь месяц')}</h3><p class="muted small">${t('heat.lead2', 'Каждая клетка — баллы дня. Сразу видно, когда лучше для любви, денег или запуска. Нажми на клетку — день покажется в календаре.')}</p></div>
      <div class="seg"><button type="button" data-heat="sph" aria-pressed="${state.heat !== 'act'}">${t('heat.sph', 'Сферы')}</button><button type="button" data-heat="act" aria-pressed="${state.heat === 'act'}">${t('heat.act', 'Дела')}</button></div></div>
      <div class="heat-wrap"><table class="heat"><thead><tr><th></th>${head}</tr></thead><tbody>${rows.map(([k, n, ic]) => `<tr><th><span class="row nw" style="gap:6px">${icon(ic, 'sm')}${esc(n)}</span></th>${list.map((d) => { const r = NS.rateBy(d, k); return `<td class="f-${LVK(r.level)}${same(d, now) ? ' today' : ''}" data-day="${d.d}" data-k="${k}" data-tip="${esc(n + ' · ' + TX.monthDay(d.d, d.mo) + ': ' + r.pts + '/10, ' + TX.LEVEL[r.level])}">${r.pts}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
    box.querySelectorAll('[data-heat]').forEach((b) => b.addEventListener('click', () => { state.heat = b.dataset.heat; heatBox(ctx, box, list); root.NWheel.bindTips(box); }));
    box.querySelectorAll('td[data-day]').forEach((c) => c.addEventListener('click', () => { if (ctx.pick) ctx.pick(+c.dataset.day); }));
  }

  // ---------- неделя ----------
  async function drawWeek(ctx, box) {
    const { p, here, now } = ctx, TX = UI.TX();
    const sel = state.sel || now;
    const mon = addD(sel, -wdOf(sel));
    const sun = addD(mon, 6);
    const thisWeek = same(addD(now, -wdOf(now)), mon);
    box.innerHTML = `<div class="card stack">
        <div class="cal-head"><button class="iconbtn bd" data-w="-7" aria-label="${t('prevWeek', 'Предыдущая неделя')}">${icon('left')}</button><h2>${t('week.title', 'Неделя {a}–{b}', { a: mon.mo === sun.mo ? mon.d : TX.monthDay(mon.d, mon.mo), b: TX.monthDay(sun.d, sun.mo) })}</h2><button class="iconbtn bd" data-w="7" aria-label="${t('nextWeek', 'Следующая неделя')}">${icon('right')}</button>
          ${thisWeek ? '' : `<button class="btn sm" data-w="0">${t('thisWeek', 'Эта неделя')}</button>`}<span class="spacer"></span>${legend()}</div>
        <div class="week" id="week">${Array.from({ length: 7 }, () => '<div class="wk" style="opacity:.4"></div>').join('')}</div>
        <p class="tiny muted" id="weekSum"></p>
      </div>
      <div id="wkDay"></div>
      <div class="card stack" id="toneBox"></div>`;
    box.querySelectorAll('[data-w]').forEach((b) => b.addEventListener('click', () => { const k = +b.dataset.w; state.sel = k === 0 ? now : addD(sel, k); state.y = state.sel.y; state.mo = state.sel.mo; drawBody(ctx); drawBackground(ctx); }));
    const days = await root.NCompute.range(p, mon.y, mon.mo, mon.d, 7, here.tz);
    if (state.view !== 'week') return;
    const wk = box.querySelector('#week'); if (!wk) return;
    const tz = here.tz;
    wk.innerHTML = days.map((d) => {
      const r = NS.rateBy(d, state.key), td = same(d, now), sl = same(d, sel);
      const evs = root.NDay.keyEvents(root.NCompute.dayEvents(p, d, tz), 3);
      const mh = d.flags.moonHouse;
      const ms = AC.moonState(new Date(d.start.getTime() + 13 * 3600000));
      const title = state.key === 'overall' ? TX.dayTitle(d) : TX.LEVEL[r.level];
      return `<button class="wk tap ${LVK(r.level)}${sl ? ' sel' : ''}" type="button" data-y="${d.y}" data-m="${d.mo}" data-d="${d.d}" aria-pressed="${sl}">
        ${td ? `<span class="wk-now">${t('today', 'Сегодня')}</span>` : ''}
        <span class="wk-d"><small>${esc(TX.WD[new Date(Date.UTC(d.y, d.mo - 1, d.d)).getUTCDay()])}</small><b>${d.d}</b></span>
        <span class="row" style="gap:8px">${UI.dots(r.level)}${UI.ptsBadge(r)}</span>
        <span class="wk-t">${esc(title)}</span>
        <span class="tag acc" style="justify-self:start;font-size:calc(11.75px*var(--fz))">${mh ? `☽︎ ${t('moon.house', '{n} дом', { n: mh })} · ${esc(TX.H[mh].area.split(',')[0])}` : `☽︎ ${esc(TX.S[ms.sign].name)}`}</span>
        <span class="stack" style="gap:2px">${evs.map((e) => root.NDay.evRow(e, tz, true)).join('')}</span>
      </button>`;
    }).join('');
    UI.richTip(wk, '.wk[data-d]', (b) => root.NDay.tipHTML(days.find((x) => x.d === +b.dataset.d && x.mo === +b.dataset.m), { key: state.key, person: p, foot: t('tip.below', 'Нажми — подробности ниже') }));
    const bestD = days.slice().sort((a, b) => NS.rateBy(b, state.key).ptsF - NS.rateBy(a, state.key).ptsF);
    box.querySelector('#weekSum').textContent = t('week.sum', 'Лучшие дни недели: {a}. Осторожнее: {b}.', { a: bestD.slice(0, 2).map((d) => TX.WD_FULL[new Date(Date.UTC(d.y, d.mo - 1, d.d)).getUTCDay()]).join(', '), b: TX.WD_FULL[new Date(Date.UTC(bestD[6].y, bestD[6].mo - 1, bestD[6].d)).getUTCDay()] });
    const showDay = (d) => {
      const slot = box.querySelector('#wkDay'); if (!slot) return;
      slot.innerHTML = `<div class="card pad-lg stack"><div class="row sb"><h2>${esc(UI.fmtDate(d.y, d.mo, d.d, { weekday: 'long', year: undefined }))}</h2><button class="btn sm" type="button" data-pop>${icon('zoom-in', 'sm')} ${t('dd.popup', 'Открыть окном')}</button></div>${root.NDay.render(d, { person: p, isToday: same(d, now), sphere: NS.SPHERES.includes(state.key) ? state.key : null })}</div>`;
      root.NDay.bindDay(slot, d, p);
      slot.querySelector('[data-pop]').addEventListener('click', () => openDay(ctx, d));
      root.NWheel.bindTips(slot);
    };
    wk.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
      state.sel = { y: +b.dataset.y, mo: +b.dataset.m, d: +b.dataset.d };
      wk.querySelectorAll('.wk').forEach((x) => { const on = x === b; x.classList.toggle('sel', on); x.setAttribute('aria-pressed', String(on)); });
      showDay(days.find((x) => same(x, state.sel)));
      box.querySelector('#wkDay').scrollIntoView({ behavior: UI.reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    }));
    showDay(days.find((x) => same(x, sel)) || days[0]);
    toneBox(ctx, box.querySelector('#toneBox'), days);
    root.NWheel.bindTips(box);
  }

  // ход недели по часам: тон (сверху) и точные аспекты по планетам
  function toneBox(ctx, box, days) {
    const { p, here } = ctx, tz = here.tz, TX = UI.TX();
    const natal = UI.chartOf(p);
    const t0 = days[0].start.getTime(), t1 = days[6].start.getTime() + DAY, span = t1 - t0;
    const curve = NS.toneCurve(natal, days[0].start, (t1 - t0) / 3600000, 60);
    const evs = days.flatMap((d) => root.NCompute.dayEvents(p, d, tz));
    const ROWS = ['moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].filter((id) => id === 'moon' || evs.some((e) => e.T === id));
    const Wd = 1000, L = 92, Rr = 10, top = 26, ch = 86, rowH = 26;
    const H = top + ch + 14 + ROWS.length * rowH + 10;
    const x = (tm) => L + (tm - t0) / span * (Wd - L - Rr);
    const max = Math.max(1.5, ...curve.map((c) => Math.abs(c.v)));
    const y0 = top + ch / 2, yv = (v) => y0 - v / max * (ch / 2 - 4);
    let s = `<svg class="tone" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${esc(t('tone.aria', 'Ход недели по часам'))}">`;
    days.forEach((d, i) => {
      const xa = x(d.start.getTime()), xb = x(d.start.getTime() + DAY), wd = new Date(Date.UTC(d.y, d.mo - 1, d.d)).getUTCDay();
      if (i % 2 === 0) s += `<rect x="${xa}" y="${top - 4}" width="${xb - xa}" height="${H - top}" fill="var(--surface-2)"/>`;
      s += `<text x="${(xa + xb) / 2}" y="16" text-anchor="middle" font-family="var(--f-ui)" font-size="12" font-weight="700" fill="${wd === 0 || wd === 6 ? 'var(--rose)' : 'var(--muted)'}">${esc(TX.WD[wd])} ${d.d}</text>`;
    });
    s += `<line x1="${L}" x2="${Wd - Rr}" y1="${y0}" y2="${y0}" stroke="var(--line-strong)" stroke-dasharray="3 4"/>`;
    s += `<text x="${L - 8}" y="${top + 10}" text-anchor="end" font-family="var(--f-ui)" font-size="11" fill="var(--mint)">${t('tone.easy', 'легче')}</text><text x="${L - 8}" y="${top + ch - 2}" text-anchor="end" font-family="var(--f-ui)" font-size="11" fill="var(--rose)">${t('tone.hard', 'тяжелее')}</text>`;
    const pts = curve.map((c) => `${x(c.t.getTime()).toFixed(1)},${yv(c.v).toFixed(1)}`).join(' ');
    s += `<defs><clipPath id="tUp"><rect x="0" y="0" width="${Wd}" height="${y0}"/></clipPath><clipPath id="tDn"><rect x="0" y="${y0}" width="${Wd}" height="${H}"/></clipPath></defs>`;
    s += `<polygon points="${x(t0)},${y0} ${pts} ${x(t1)},${y0}" fill="var(--dot-p2)" opacity=".28" clip-path="url(#tUp)"/><polygon points="${x(t0)},${y0} ${pts} ${x(t1)},${y0}" fill="var(--dot-m2)" opacity=".26" clip-path="url(#tDn)"/>`;
    s += `<polyline points="${pts}" fill="none" stroke="var(--lav-strong)" stroke-width="1.6" stroke-linejoin="round"/>`;
    const ry = (i) => top + ch + 14 + i * rowH + rowH / 2;
    ROWS.forEach((id, i) => {
      s += `<line x1="${L}" x2="${Wd - Rr}" y1="${ry(i)}" y2="${ry(i)}" stroke="var(--line-soft)"/>`;
      s += `<text x="${L - 8}" y="${ry(i) + 4}" text-anchor="end" font-family="var(--f-ui)" font-size="11.5" fill="var(--muted)"><tspan font-family="var(--f-glyph)" fill="var(--lav-strong)">${W.GLYPH[id]}︎</tspan> ${esc(TX.P[id].name)}</text>`;
    });
    // Луна без курса — штриховка на строке Луны
    const mi = ROWS.indexOf('moon');
    for (const d of days) for (const v of d.flags.voc) {
      const a = Math.max(t0, v.start.getTime()), b = Math.min(t1, v.end.getTime()); if (b <= a) continue;
      s += `<rect x="${x(a)}" y="${ry(mi) - 7}" width="${Math.max(2, x(b) - x(a))}" height="14" rx="4" fill="color-mix(in srgb,var(--rose) 22%,transparent)" stroke="color-mix(in srgb,var(--rose) 45%,transparent)" data-tip="${esc(t('voc', 'Луна без курса') + ': ' + UI.fmtTime(v.start, tz) + '–' + UI.fmtTime(v.end, tz))}"/>`;
    }
    const seen = new Set();
    for (const e of evs) {
      const T = e.T || 'moon'; if (e.kind === 'vocStart' || e.kind === 'vocEnd') continue;
      const k = e.kind + T + (e.N || '') + (e.type || '') + Math.round(e.at / 600000); if (seen.has(k)) continue; seen.add(k);
      const i = ROWS.indexOf(T); if (i < 0) continue;
      const cx = x(e.at.getTime()), cy = ry(i), col = root.NDay.evColor(e), tx = TX.evText(e, tz);
      const tip = esc(UI.fmtDate(...ymdOf(e.at, tz), { weekday: 'short', year: undefined }) + ', ' + UI.fmtTime(e.at, tz) + ' · ' + tx.title + '\n' + tx.text);
      if (e.kind === 'transit') s += `<g data-tip="${tip}" style="cursor:help"><circle cx="${cx.toFixed(1)}" cy="${cy}" r="6" fill="${col}" stroke="var(--surface)" stroke-width="1.5"/>${T !== 'moon' ? `<text x="${cx.toFixed(1)}" y="${cy - 9}" text-anchor="middle" font-family="var(--f-glyph)" font-size="11" fill="${col}">${W.ASP_G[e.type]}︎${/^[A-Z]{2}$/.test(W.GLYPH[e.N]) ? '' : W.GLYPH[e.N] + '︎'}${/^[A-Z]{2}$/.test(W.GLYPH[e.N]) ? W.GLYPH[e.N] : ''}</text>` : ''}</g>`;
      else s += `<g data-tip="${tip}" style="cursor:help"><rect x="${(cx - 5).toFixed(1)}" y="${cy - 5}" width="10" height="10" transform="rotate(45 ${cx.toFixed(1)} ${cy})" fill="var(--dot-acc)" stroke="var(--surface)" stroke-width="1.5"/></g>`;
    }
    const nowT = Date.now();
    if (nowT >= t0 && nowT <= t1) s += `<line x1="${x(nowT)}" x2="${x(nowT)}" y1="${top - 6}" y2="${H - 4}" stroke="var(--lav-strong)" stroke-width="2"/><text x="${x(nowT) + 4}" y="${H - 6}" font-family="var(--f-ui)" font-size="11" font-weight="700" fill="var(--lav-strong)">${t('now', 'Сейчас').toLowerCase()}</text>`;
    s += '</svg>';
    box.innerHTML = `<div class="row sb"><div class="stack s6"><h3>${t('tone.title', 'Ход недели по часам')}</h3><p class="muted small">${t('tone.lead', 'Сверху — общий тон: зелёное — больше поддержки, розовое — больше напряжения. Ниже — точные аспекты планет к твоей карте. Наведи или нажми на точку.')}</p></div></div><div class="tone-wrap">${s}</div>`;
  }
  function ymdOf(date, tz) { const q = NS.ymdIn(date, tz); return [q.y, q.mo, q.d]; }

  // ---------- фон: долгие транзиты и ретро ----------
  function drawBackground(ctx) {
    const box = ctx.el.querySelector('#bgBox'); if (!box) return;
    const { p, here } = ctx, TX = UI.TX(), tz = here.tz;
    const from = new Date(Date.UTC(state.y, state.mo - 3, 1)), to = new Date(Date.UTC(state.y, state.mo + 7, 1));
    const span = to - from;
    const { transits, retro } = root.NCompute.slow(p, from, to);
    const x = (d) => Math.max(0, Math.min(100, (d - from) / span * 100));
    const mStart = new Date(Date.UTC(state.y, state.mo - 1, 1)), mEnd = new Date(Date.UTC(state.y, state.mo, 1));
    // объединяем окна одной пары
    const rows = new Map();
    for (const tr of transits) {
      const k = tr.transiting + '|' + tr.type + '|' + tr.natal;
      if (!rows.has(k)) rows.set(k, { T: tr.transiting, N: tr.natal, type: tr.type, segs: [], exact: [], minOrb: tr.minOrb });
      const r = rows.get(k); r.segs.push([tr.start, tr.end]); r.exact.push(...tr.exact); r.minOrb = Math.min(r.minOrb, tr.minOrb);
    }
    const W_T = { jupiter: 1.25, saturn: 1.3, uranus: 1.05, neptune: 0.85, pluto: 1.05 };
    const I_N = { sun: 1.2, moon: 1.1, asc: 1.1, mc: 1.0, venus: 1.0, mars: 0.9, mercury: 0.9, jupiter: 0.7, saturn: 0.75 };
    const list = [...rows.values()].map((r) => { const near = r.segs.some(([a, b]) => b >= mStart && a <= mEnd); return Object.assign(r, { near, k: (W_T[r.T] || 1) * (I_N[r.N] || 0.6) * (near ? 2 : 1) * (r.exact.length ? 1.2 : 0.8) }); })
      .sort((a, b) => b.k - a.k).slice(0, 12).sort((a, b) => a.segs[0][0] - b.segs[0][0]);
    const nat = (e) => NS.nature(e.T, e.type);
    const col = (v, type) => (type === 'conj' && Math.abs(v) < 0.5 ? 'var(--dot-acc)' : v > 0 ? 'var(--dot-p2)' : 'var(--dot-m2)');
    const months = []; for (let i = 0; i <= 10; i++) { const d = new Date(Date.UTC(state.y, state.mo - 3 + i, 1)); if (d < to) months.push(d); }
    const nowX = x(Date.now());
    const axis = `<div class="gaxis"><span></span><div>${months.map((d) => `<span style="left:${x(d)}%">${esc(TX.MONTHS_N[d.getUTCMonth()].slice(0, 3).toLowerCase())}${d.getUTCMonth() === 0 ? ' ' + d.getUTCFullYear() : ''}</span>`).join('')}</div></div>`;
    const mband = `<i style="left:${x(mStart)}%;width:${x(mEnd) - x(mStart)}%;top:-4px;bottom:-4px;background:var(--lav-soft);border-radius:4px;z-index:0;cursor:default"></i>`;
    const pg = root.NDay.pg;
    const trRows = list.map((r) => {
      const v = nat(r), c = col(v, r.type);
      const e = { kind: 'transit', T: r.T, N: r.N, type: r.type, v, tHouse: null, nHouse: null };
      const tx = TX.evText(e, tz);
      const exact = [...new Set(r.exact.map((d) => d.toISOString().slice(0, 10)))].map((s) => new Date(s + 'T12:00:00Z'));
      const tip = tx.title + '\n' + r.segs.map(([a, b]) => UI.fmtDay(a, tz) + ' — ' + UI.fmtDay(b, tz, { year: 'numeric' })).join('; ') + (exact.length ? '\n' + t('lt.exact', 'точно') + ': ' + exact.map((d) => UI.fmtDay(d, tz)).join(', ') : '');
      return `<div class="gr"><span class="gl-l"><span class="g" style="color:${c}">${pg(r.T)}${W.ASP_G[r.type]}︎${pg(r.N)}</span><span>${esc(tx.title)}</span></span><div class="gb">${mband}${r.segs.map(([a, b]) => `<i style="left:${x(a)}%;width:${Math.max(0.8, x(b) - x(a))}%;background:color-mix(in srgb,${c} 55%,transparent)" data-tip="${esc(tip)}"></i>`).join('')}${exact.map((d) => `<em style="left:${x(d)}%;background:${c}" data-tip="${esc(t('lt.exact', 'точно') + ' ' + UI.fmtDay(d, tz, { year: 'numeric' }) + ' · ' + tx.title)}"></em>`).join('')}<span class="nowl" style="left:${nowX}%"></span></div></div>`;
    }).join('');
    const retroSeg = (r) => `${r.shadowStart ? `<i style="left:${x(r.shadowStart)}%;width:${x(r.start) - x(r.shadowStart)}%;background:color-mix(in srgb,var(--gold-2) 30%,transparent)" data-tip="${esc(t('shadowOf', 'Тень: {p}', { p: TX.P[r.id].name }) + ': ' + UI.fmtDay(r.shadowStart, tz) + ' — ' + UI.fmtDay(r.start, tz))}"></i>` : ''}<i style="left:${x(r.start)}%;width:${Math.max(0.8, x(r.end) - x(r.start))}%;background:color-mix(in srgb,var(--gold-2) 75%,transparent)" data-tip="${esc(TX.RETRO[r.id].name + ': ' + UI.fmtDay(r.start, tz) + ' — ' + UI.fmtDay(r.end, tz, { year: 'numeric' }) + '\n' + TX.RETRO[r.id].tip)}"></i>${r.shadowEnd ? `<i style="left:${x(r.end)}%;width:${x(r.shadowEnd) - x(r.end)}%;background:color-mix(in srgb,var(--gold-2) 30%,transparent)" data-tip="${esc(t('shadowOf', 'Тень: {p}', { p: TX.P[r.id].name }) + ': ' + UI.fmtDay(r.end, tz) + ' — ' + UI.fmtDay(r.shadowEnd, tz))}"></i>` : ''}`;
    const rtRows = ['mercury', 'venus', 'mars'].filter((id) => retro.some((r) => r.id === id)).map((id) => `<div class="gr"><span class="gl-l"><span class="g" style="color:var(--gold)">${pg(id)}<sup>R</sup></span><span>${esc(TX.RETRO[id].name)}</span></span><div class="gb">${mband}${retro.filter((r) => r.id === id).map(retroSeg).join('')}<span class="nowl" style="left:${nowX}%"></span></div></div>`).join('');
    // карточки активных в выбранном месяце
    const active = list.filter((r) => r.near).sort((a, b) => b.k - a.k).slice(0, 6);
    const cards = active.map((r) => {
      const v = nat(r), c = col(v, r.type);
      const natal = UI.chartOf(p);
      const e = { kind: 'transit', T: r.T, N: r.N, type: r.type, v, tHouse: null, nHouse: natal.byId[r.N] && natal.byId[r.N].house };
      const tx = TX.evText(e, tz);
      const seg = r.segs.find(([a, b]) => b >= mStart && a <= mEnd) || r.segs[0];
      const exact = [...new Set(r.exact.filter((d) => d >= AC.addDays(seg[0], -1) && d <= AC.addDays(seg[1], 1)).map((d) => d.toISOString().slice(0, 10)))].map((s) => new Date(s + 'T12:00:00Z'));
      return `<div class="lt" style="--c:${c}"><h4><span class="g" style="color:${c};font-size:calc(16px*var(--fz))">${pg(r.T)}${W.ASP_G[r.type]}︎${pg(r.N)}</span><span>${esc(tx.title)}</span></h4><i class="lt-bar" aria-hidden="true"></i><div class="when">${exact.length ? t('lt.exact', 'точно') + ' ' + exact.map((d) => UI.fmtDay(d, tz)).join(', ') + ' · ' : ''}${UI.fmtDay(seg[0], tz)} — ${UI.fmtDay(seg[1], tz, { year: 'numeric' })}</div><p>${esc(tx.text)}${e.nHouse ? ' ' + esc(t('lt.house', 'Тема {n} дома: {a}.', { n: e.nHouse, a: TX.H[e.nHouse].area })) : ''}</p></div>`;
    }).join('') + retro.filter((r) => r.end >= mStart && r.start <= mEnd).map((r) => `<div class="lt" style="--c:var(--gold-2)"><h4><span class="g" style="color:var(--gold);font-size:calc(16px*var(--fz))">${pg(r.id)}<sup>R</sup></span><span>${esc(TX.RETRO[r.id].name)}</span></h4><i class="lt-bar" aria-hidden="true"></i><div class="when">${UI.fmtDay(r.start, tz)} — ${UI.fmtDay(r.end, tz, { year: 'numeric' })}</div><p>${esc(TX.RETRO[r.id].tip)}</p></div>`).join('');
    box.innerHTML = `<div class="sec-head" style="margin-top:8px"><span class="eyebrow">${t('bg.eyebrow', 'Фон')}</span><h2>${t('bg.title', 'Долгие транзиты')}</h2><p>${t('bg.lead', 'Они действуют неделями и месяцами — дни идут на их фоне. Полоса — время действия, ромб — точный аспект, лиловая зона — выбранный месяц.')}</p></div>
      <div class="card stack"><div class="gantt">${axis}${trRows}${rtRows ? `<hr class="soft">${rtRows}` : ''}</div>
        <div class="legend"><span><i class="c-l2"></i>${t('lg.ok', 'помогает')}</span><span><i class="c-lm2"></i>${t('lg.bad', 'мешает')}</span><span><i style="background:var(--dot-acc)"></i>${t('lg.acc', 'сильный акцент')}</span><span><i style="background:var(--gold-2)"></i>${t('lg.retro', 'ретро и тень')}</span></div></div>
      ${cards ? `<div class="lt-cards">${cards}</div>` : ''}`;
    root.NWheel.bindTips(box);
  }

  (root.NPages = root.NPages || {}).calendar = { render: page };
})(window);
