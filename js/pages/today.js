/* «Сегодня» и общий показ дня (NDay): баллы 1–10, название дня, «хорошо / лучше не», сферы с баллами,
   сутки по часам с точными событиями, Луна, что лучше делать, карта транзитов, «почему так».
   NDay используют «Сегодня», окно дня в календаре, панель справа и подсказка при наведении. */
(function (root) {
  'use strict';
  const UI = root.NUI, NS = root.NScore, W = root.NWheel, AC = root.AstroCore;
  const { t, esc, icon } = UI;
  const SPH_ICON = { love: 'love', money: 'money', career: 'career', launch: 'launch', talk: 'talk', energy: 'energy', rest: 'rest' };
  const VS = '︎';
  const pg = (id) => { const g = W.GLYPH[id] || ''; return /^[A-Z]{2}$/.test(g) ? `<span style="font:800 .72em var(--f-ui)">${g}</span>` : g + VS; };
  const sg = (id) => W.SIGN_G[AC.SIGNS.indexOf(id)] + VS;
  const lvName = (l) => UI.TX().LEVEL[l];
  const ymd = (d) => `${d.y}-${d.mo}-${d.d}`;

  // ---------- события ----------
  function importance(e) {
    switch (e.kind) {
      case 'transit': return e.w * (e.T === 'moon' ? 0.75 : 1.7) * (e.type === 'conj' || e.type === 'opp' || e.type === 'square' ? 1.1 : 1);
      case 'eclipse': return 4; case 'phase': return 1.5; case 'station': return 1.6;
      case 'ingress': return e.T === 'moon' ? 0.5 : 1.3;
      case 'vocStart': return (e.end - e.at) > 3 * 3600000 ? 0.9 : 0.45;
      default: return 0.15;
    }
  }
  function evGlyph(e) {
    switch (e.kind) {
      case 'transit': return { g: `${pg(e.T)}${e.retro ? '<sup>R</sup>' : ''}${W.ASP_G[e.type]}${VS}${pg(e.N)}`, cls: e.type === 'conj' && Math.abs(e.v) < 0.45 ? 'acc' : e.v > 0 ? 'ok' : 'bad' };
      case 'ingress': return { g: `${pg(e.T)}→${sg(e.sign)}`, cls: 'acc' };
      case 'phase': return { g: UI.moonSVG(e.phase * 90 + 0.01, 16), cls: 'acc' };
      case 'vocStart': return { g: `${pg('moon')}<small style="font:700 10px var(--f-ui)">${t('voc.abbr', 'б/к')}</small>`, cls: 'bad' };
      case 'vocEnd': return { g: `${pg('moon')}<small style="font:700 10px var(--f-ui)">✓</small>`, cls: 'ok' };
      case 'station': return { g: `${pg(e.T)}<sup>${e.dir === 'retro' ? 'R' : 'D'}</sup>`, cls: 'acc' };
      case 'eclipse': return { g: icon('eclipse', 'sm'), cls: 'bad' };
      default: return { g: '•', cls: 'n' };
    }
  }
  function evColor(e) { const c = evGlyph(e).cls; return c === 'ok' ? 'var(--dot-p2)' : c === 'bad' ? 'var(--dot-m2)' : 'var(--dot-acc)'; }
  /** Главные события суток (по важности), в порядке времени. */
  function keyEvents(evs, n) { return evs.filter((e) => e.kind !== 'vocEnd').map((e) => ({ e, k: importance(e) })).sort((a, b) => b.k - a.k).slice(0, n).map((x) => x.e).sort((a, b) => a.at - b.at); }
  function evRow(e, tz, compact) {
    const TX = UI.TX(), x = TX.evText(e, tz), g = evGlyph(e);
    const tm = UI.fmtTime(e.at, tz);
    if (compact) return `<div class="ev compact"><span class="tm">${tm}</span><span><span class="g ${g.cls === 'ok' ? '' : ''}" style="color:${evColor(e)}">${g.g}</span> ${esc(x.short)}</span></div>`;
    return `<div class="ev"><span class="tm">${tm}</span><span class="gly ${g.cls}">${g.g}</span><div><b>${esc(x.title)}</b><p>${esc(x.text)}</p>${x.ctx ? `<div class="ctx">${esc(x.ctx)}</div>` : ''}</div></div>`;
  }
  function eventList(evs, tz, first) {
    const list = evs.filter((e) => e.kind !== 'vocEnd' || true);
    if (!list.length) return `<p class="muted small">${t('ev.none', 'Точных аспектов в этот день нет — фон задают Луна и долгие транзиты.')}</p>`;
    const top = list.length > first + 2 ? keyEvents(list, first) : list;
    const rest = list.length > first + 2 ? list.filter((e) => !top.includes(e)) : [];
    return `<div class="evlist">${top.map((e) => evRow(e, tz)).join('')}</div>` + (rest.length ? `<details class="more-ev"><summary class="btn sm ghost" style="justify-self:start">${t('ev.more', 'Ещё события дня: {n}', { n: rest.length })} ${icon('down', 'sm')}</summary><div class="evlist">${rest.map((e) => evRow(e, tz)).join('')}</div></details>` : '');
  }

  // ---------- части дня ----------
  function tagsHTML(tags) {
    if (!tags.ok.length && !tags.bad.length) return '';
    return `<div class="dd-tags">${tags.ok.length ? `<div class="stack s6"><span class="label ok">${t('tags.ok', 'Хорошо')}</span><div class="tags">${tags.ok.map((x) => `<span class="tag ok">${esc(x)}</span>`).join('')}</div></div>` : ''}${tags.bad.length ? `<div class="stack s6"><span class="label bad">${t('tags.bad', 'Лучше не')}</span><div class="tags">${tags.bad.map((x) => `<span class="tag bad">${esc(x)}</span>`).join('')}</div></div>` : ''}</div>`;
  }
  function sphereBars(day) {
    const TX = UI.TX();
    return `<div class="sbars5">${NS.SPHERES.map((s) => { const r = day.spheres[s]; return `<button class="sb5" type="button" data-sph="${s}" aria-label="${esc(TX.SPH[s].name + ': ' + r.pts + '/10, ' + lvName(r.level))}">${icon(SPH_ICON[s])}<span>${esc(TX.SPH[s].name)}</span>${UI.pbar(r)}${UI.ptsBadge(r, true)}<span class="sb5-q" aria-hidden="true">${icon('help')}</span></button>`; }).join('')}</div>`;
  }
  function dayline(day, tz, best, evs, isToday) {
    const d0 = day.start.getTime(), span = 86400000;
    const pct = (x) => Math.max(0, Math.min(100, ((x - d0) / span) * 100));
    const TX = UI.TX();
    let s = `<div class="dayline" role="img" aria-label="${esc(t('tl.aria', 'Сутки: Луна без курса, лучшие часы и события'))}">`;
    for (const v of day.flags.voc) s += `<i class="voc" style="left:${pct(v.start)}%;width:${pct(v.end) - pct(v.start)}%" data-tip="${esc(t('voc', 'Луна без курса') + ': ' + UI.fmtTime(v.start, tz) + '–' + UI.fmtTime(v.end, tz))}"></i>`;
    for (const h of best) s += `<i class="best" style="left:${pct(h.start)}%;width:${pct(h.end) - pct(h.start)}%" data-tip="${esc(t('hour.of', 'Час {p}', { p: TX.P[h.ruler].gen }) + ': ' + UI.fmtTime(h.start, tz) + '–' + UI.fmtTime(h.end, tz) + '\n' + t('hour.good', 'хорошее время, чтобы начать'))}"></i>`;
    for (const e of evs) { if (e.kind === 'vocEnd') continue; const x = TX.evText(e, tz); s += `<i class="evt" style="left:${pct(e.at)}%;background:${evColor(e)}" data-tip="${esc(UI.fmtTime(e.at, tz) + ' · ' + x.title + '\n' + x.text)}"></i>`; }
    if (isToday) s += `<i class="now" style="left:${pct(Date.now())}%" data-tip="${esc(t('now', 'Сейчас') + ' · ' + UI.fmtTime(new Date(), tz))}"></i>`;
    s += '</div><div class="tl-scale"><span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>';
    s += `<div class="legend"><span><i style="background:var(--gold-2)"></i>${t('lg.best', 'лучшие часы для старта')}</span><span><i style="background:repeating-linear-gradient(135deg,var(--rose) 0 3px,transparent 3px 6px)"></i>${t('lg.voc', 'Луна без курса')}</span><span><i style="background:var(--dot-p2);border-radius:50%"></i>${t('lg.ok', 'помогает')}</span><span><i style="background:var(--dot-m2);border-radius:50%"></i>${t('lg.bad', 'мешает')}</span></div>`;
    return s;
  }
  function moonBlock(day, tz, p) {
    const TX = UI.TX(), here = UI.here();
    const ms = AC.moonState(new Date(day.start.getTime() + 13 * 3600000));
    const lunar = (() => { try { return AC.lunarDay(new Date(day.start.getTime() + 13 * 3600000), here.lat, here.lon); } catch (e) { return null; } })();
    const voc = day.flags.voc.length ? day.flags.voc.map((v) => `${UI.fmtTime(v.start, tz)}–${UI.fmtTime(v.end, tz)}`).join(', ') : t('voc.none', 'нет');
    const mh = day.flags.moonHouse;
    return `<div class="card soft stack s6"><div class="moonline">${UI.moonSVG(ms.angle, 46)}<div><b>${esc(TX.PHASE8[TX.phaseIdx(ms.angle)])}${lunar ? ' · ' + t('lunarDay', '{n}-е лунные сутки', { n: lunar.day }) : ''}</b><p class="small muted">${esc(TX.MOON_SIGN[ms.sign])}</p></div></div>
      <div class="tags">${mh ? `<span class="tag acc">☽${VS} ${t('moon.house', '{n} дом', { n: mh })} · ${esc(TX.H[mh].area.split(',')[0])}</span>` : ''}<span class="tag ${day.flags.voc.length ? 'bad' : 'plain'}">${t('voc', 'Луна без курса')}: ${esc(voc)}</span></div>
      <p class="tiny muted">${esc(TX.PHASE_TIP[TX.phaseIdx(ms.angle)])}.</p></div>`;
  }
  function actsBlock(day, n) {
    const TX = UI.TX();
    const list = Object.keys(NS.ACTIVITIES).map((a) => ({ a, r: NS.activity(day, a) })).sort((x, y) => y.r.ptsF - x.r.ptsF);
    const row = ({ a, r }) => `<div class="bar5" style="grid-template-columns:22px minmax(0,1fr) 70px 28px;gap:8px"><span style="color:var(--lav-strong)">${icon(TX.ACT[a].icon, 'sm')}</span><span class="small">${esc(TX.ACT[a].name)}</span>${UI.pbar(r)}${UI.ptsBadge(r, true)}</div>`;
    return `<div class="card soft stack s6"><span class="label">${t('dd.acts', 'Что лучше делать в этот день')}</span>${list.slice(0, n || 4).map(row).join('')}<details><summary class="more" style="cursor:pointer;list-style:none;margin-top:4px">${t('dd.actsAll', 'Все дела')}</summary><div class="stack s6" style="margin-top:8px">${list.slice(n || 4).map(row).join('')}</div></details></div>`;
  }
  function alerts(day) {
    const TX = UI.TX(), f = day.flags, out = [];
    for (const id of f.retro.filter((x) => ['mercury', 'venus', 'mars'].includes(x))) out.push([TX.RETRO[id].name, TX.RETRO[id].tip]);
    for (const id of f.shadow) out.push([t('shadowOf', 'Тень: {p}', { p: TX.P[id].name }), TX.SHADOW[id]]);
    if (f.station) out.push([TX.P[f.station.id].name + ' ' + (f.station.kind === 'retro' ? t('st.retro', 'разворачивается назад') : t('st.direct', 'разворачивается вперёд')), t('st.tip', 'Темы планеты на пике — не торопись с решениями')]);
    if (f.eclipse) out.push([f.eclipse.type === 'solar' ? t('ecl.solar', 'Солнечное затмение') : t('ecl.lunar', 'Лунное затмение'), TX.ECLIPSE[f.eclipse.type] || TX.ECLIPSE.lunar]);
    if (!out.length) return '';
    return `<div class="alerts">${out.map(([a, b]) => `<div class="alert">${icon('alert')}<div><b>${esc(a)}.</b> ${esc(b)}</div></div>`).join('')}</div>`;
  }
  function reasonList(list, tz, max) {
    const TX = UI.TX();
    const seen = new Set(), rows = [];
    for (const r of list) {
      const txt = TX.reason(r, tz); if (!txt || seen.has(txt)) continue; seen.add(txt);
      rows.push(`<div class="reason"><span class="s ${r.v >= 0 ? 'p' : 'm'}">${r.v >= 0 ? '+' : '−'}</span><span>${esc(txt)}</span></div>`);
      if (rows.length >= (max || 6)) break;
    }
    return rows.length ? `<div class="reasons">${rows.join('')}</div>` : `<p class="muted small">${t('noReasons', 'Сильных влияний нет — обычный день.')}</p>`;
  }
  /** Колесо транзитов дня: внутри карта человека, снаружи небо в полдень (или сейчас). */
  function wheelBlock(day, p, isToday) {
    const natal = UI.chartOf(p), TX = UI.TX();
    const at = isToday ? new Date() : new Date(day.start.getTime() + 12 * 3600000);
    const sky = AC.chart({ date: at, timeKnown: false });
    const ids = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'node'];
    const inner = { points: natal.points.filter((x) => ids.concat(['chiron']).includes(x.id)), cusps: natal.houses ? natal.houses.cusps : null, asc: natal.houses ? natal.houses.asc : 0, mc: natal.houses ? natal.houses.mc : null };
    const outer = { points: sky.points.filter((x) => ids.includes(x.id)) };
    const asp = AC.aspectsBetween(inner.points.concat(natal.houses ? [{ id: 'asc', lon: natal.houses.asc }, { id: 'mc', lon: natal.houses.mc }] : []), outer.points, { orbMult: 0.4 })
      .filter((x) => ['conj', 'sextile', 'square', 'trine', 'opp'].includes(x.type)).sort((a, b) => a.orb - b.orb).slice(0, 14);
    const svg = W.svg(inner, { outer, aspects: asp, lang: UI.lang(), labels: { in: t('natal', 'натал'), out: t('transit', 'транзит') }, label: t('dd.wheel', 'Транзиты к карте') });
    const chips = asp.slice(0, 8).map((x) => `<span class="tag plain" style="font-family:var(--f-glyph)" data-tip="${esc(TX.P[x.b] ? TX.P[x.b].name + ' ' + (TX.ASP[x.type] ? TX.ASP[x.type].name : '') + ' ' + (TX.P[x.a] ? TX.P[x.a].yourDat || TX.P[x.a].name : x.a) : '')}"><span style="color:${x.nature === 'soft' ? 'var(--w-soft)' : x.nature === 'hard' ? 'var(--w-hard)' : 'var(--w-conj)'}">${pg(x.b)}${W.ASP_G[x.type]}${VS}${pg(x.a)}</span> <span class="mono" style="font-size:11px">${x.orb.toFixed(1)}°</span></span>`).join('');
    return `<div class="wheel-card"><div class="wheel-box" style="max-width:420px">${svg}</div><div class="tags" style="justify-content:center">${chips}</div><p class="tiny muted" style="text-align:center">${isToday ? t('dd.wheelNow', 'Внутри — твоя карта, снаружи — небо сейчас ({t}).', { t: UI.fmtTime(at, UI.here().tz) }) : t('dd.wheelNoon', 'Внутри — твоя карта, снаружи — небо в 12:00 этого дня.')}</p></div>`;
  }

  /** Полный показ дня. opts: { person, isToday, sphere, wheel } */
  function render(day, opts) {
    const p = opts.person, TX = UI.TX(), here = UI.here(), tz = here.tz;
    const evs = root.NCompute.dayEvents(p, day, tz);
    const sph = opts.sphere && NS.SPHERES.includes(opts.sphere) ? opts.sphere : 'launch';
    const best = NS.bestHours(day, sph, here);
    const lv = day.overall.level;
    const reasons = day.reasons.filter((r) => Math.abs(r.v) >= 0.12);
    return `<div class="dd">
      <div class="dd-top">${UI.ringPts(day.overall, 86)}
        <div class="stack s6" style="min-width:0"><div class="row" style="gap:10px"><h2 class="dd-title">${esc(TX.dayTitle(day))}</h2><span class="lv ${UI.lvClass(lv)}">${esc(TX.LEVEL_DAY[lv])}</span></div>
          <p class="hl">${esc(TX.headline(day))}</p>${tagsHTML(TX.dayTags(day))}</div></div>
      ${alerts(day)}
      <div class="dd-grid">
        <div class="stack s18">
          <section class="stack s6"><div class="row sb"><span class="label">${t('dd.spheres', 'Баллы по сферам')}</span><span class="hint-click">${icon('info', 'xs')} ${t('dd.tapSphere', 'нажми на сферу — советы и часы')}</span></div>${sphereBars(day)}</section>
          <section class="stack s6"><span class="label">${t('dd.hours', 'Сутки по часам')}</span>${dayline(day, tz, best, evs, opts.isToday)}
            ${best.length ? `<div class="hours">${best.map((h) => `<span class="hour" data-tip="${esc(t('hour.why', 'Планетный час {p}: хорош для начинаний', { p: TX.P[h.ruler].gen }))}">${icon('clock', 'sm')} ${UI.fmtTime(h.start, tz)}–${UI.fmtTime(h.end, tz)}</span>`).join('')}</div>` : ''}</section>
          <section class="stack s6"><span class="label">${t('dd.events', 'Что происходит по времени')}</span>${eventList(evs, tz, 5)}</section>
        </div>
        <div class="stack s18">
          ${opts.wheel !== false ? wheelBlock(day, p, opts.isToday) : ''}
          ${moonBlock(day, tz, p)}
          ${actsBlock(day, 4)}
        </div>
      </div>
      ${UI.acc({ title: t('why', 'Почему так'), sub: t('why.sub', 'Из чего сложились баллы: {n} влияний', { n: Math.min(9, reasons.length) }), icon: icon('list'), body: reasonList(reasons, tz, 9) })}
      <div class="row"><a class="btn" href="#ask?d=${ymd(day)}">${icon('ask')} ${t('askDay', 'Спросить ИИ об этом дне')}</a>${opts.calLink ? `<a class="btn ghost" href="#calendar?d=${ymd(day)}">${icon('calendar')} ${t('toCal', 'Открыть в календаре')}</a>` : ''}</div>
    </div>`;
  }

  /** Короткая панель дня (справа в календаре). */
  function panel(day, opts) {
    const p = opts.person, TX = UI.TX(), here = UI.here(), tz = here.tz;
    const r = opts.key ? NS.rateBy(day, opts.key) : day.overall;
    const evs = root.NCompute.dayEvents(p, day, tz);
    const ms = AC.moonState(new Date(day.start.getTime() + 13 * 3600000));
    const sph = opts.key && NS.SPHERES.includes(opts.key) ? opts.key : 'launch';
    const best = NS.bestHours(day, sph, here);
    const voc = day.flags.voc.length ? day.flags.voc.map((v) => `${UI.fmtTime(v.start, tz)}–${UI.fmtTime(v.end, tz)}`).join(', ') : '';
    const keyName = !opts.key || opts.key === 'overall' ? '' : opts.key.startsWith('act:') ? TX.ACT[opts.key.slice(4)].name : TX.SPH[opts.key].name;
    return `<div class="card stack" style="gap:14px">
      <div class="row sb"><span class="eyebrow" style="font-size:19px">${esc(UI.fmtDate(day.y, day.mo, day.d, { weekday: 'long', year: undefined }))}</span>${opts.isToday ? `<span class="tag acc">${t('today', 'Сегодня')}</span>` : ''}</div>
      <div class="dp-head">${UI.ringPts(r, 70)}<div class="stack s6" style="min-width:0"><h3>${esc(keyName ? keyName + ': ' + lvName(r.level) : TX.dayTitle(day))}</h3><p class="small muted">${esc(TX.headline(day))}</p></div></div>
      ${tagsHTML(TX.dayTags(day))}
      <section class="stack s6"><span class="label">${t('dd.spheres', 'Баллы по сферам')}</span>${sphereBars(day)}</section>
      ${evs.length ? `<section class="stack s6"><span class="label">${t('dd.keyEv', 'Главное по времени')}</span>${keyEvents(evs, 4).map((e) => evRow(e, tz, true)).join('')}</section>` : ''}
      <div class="row small" style="gap:8px">${UI.moonSVG(ms.angle, 22)}<span>${esc(TX.MOON_SIGN[ms.sign].split(':')[0])}${voc ? ` · <span style="color:var(--rose)">${t('voc.short2', 'без курса')} ${esc(voc)}</span>` : ''}</span></div>
      ${best.length ? `<div class="stack s6"><span class="label">${t('bestHours', 'Лучшие часы для старта')}</span><div class="hours">${best.map((h) => `<span class="hour">${icon('clock', 'sm')} ${UI.fmtTime(h.start, tz)}–${UI.fmtTime(h.end, tz)}</span>`).join('')}</div></div>` : ''}
      <button class="btn primary block" type="button" data-open-day>${t('dd.open', 'Подробнее о дне')} ${icon('right', 'sm')}</button>
    </div>`;
  }

  /** Подсказка при наведении на день. */
  function tipHTML(day, opts) {
    const TX = UI.TX(), tz = UI.here().tz;
    const r = opts.key ? NS.rateBy(day, opts.key) : day.overall;
    const list = Object.entries(day.spheres).sort((a, b) => b[1].ptsF - a[1].ptsF);
    const up = list.filter(([, v]) => v.level >= 1).slice(0, 2), down = list.filter(([, v]) => v.level <= -1).slice(-2);
    const ev = keyEvents(root.NCompute.dayEvents(opts.person, day, tz), 2);
    const keyName = !opts.key || opts.key === 'overall' ? TX.dayTitle(day) : opts.key.startsWith('act:') ? TX.ACT[opts.key.slice(4)].name : TX.SPH[opts.key].name;
    return `<div class="rt-h"><b>${esc(UI.fmtDate(day.y, day.mo, day.d, { weekday: 'short', year: undefined }))}</b>${UI.ptsBadge(r)}</div>
      <div class="row" style="gap:6px">${UI.dots(r.level)}<span class="small"><b>${esc(keyName)}</b> · ${esc(lvName(r.level))}</span></div>
      ${up.length ? `<div class="small"><span style="color:var(--mint);font-weight:800">↑</span> ${up.map(([k, v]) => `${esc(TX.SPH[k].name)} ${v.pts}`).join(' · ')}</div>` : ''}
      ${down.length ? `<div class="small"><span style="color:var(--rose);font-weight:800">↓</span> ${down.map(([k, v]) => `${esc(TX.SPH[k].name)} ${v.pts}`).join(' · ')}</div>` : ''}
      ${ev.map((e) => evRow(e, tz, true)).join('')}
      <div class="rt-foot">${t('tip.click', 'Нажми — все подробности дня')} ›</div>`;
  }

  // ---------- окна ----------
  function bindDay(el, day, person) {
    el.querySelectorAll('[data-sph]').forEach((b) => b.addEventListener('click', () => openSphere(day, b.dataset.sph, person)));
  }
  /** Окно дня; ctx.shift(day, ±1) → Promise<day> для стрелок «соседний день». */
  function openDay(day, ctx) {
    const p = ctx.person, here = UI.here(), now = UI.todayIn(here.tz);
    const isToday = now.y === day.y && now.mo === day.mo && now.d === day.d;
    const go = (k) => async () => { const nd = await ctx.shift(day, k); if (nd) { if (ctx.onShift) ctx.onShift(nd); openDay(nd, ctx); } };
    const body = UI.modal(render(day, { person: p, isToday, sphere: ctx.sphere, calLink: ctx.calLink }), { title: UI.fmtDate(day.y, day.mo, day.d, { weekday: 'long' }), eyebrow: p.name, prev: ctx.shift ? go(-1) : null, next: ctx.shift ? go(1) : null, prevLabel: t('prevDay', 'Предыдущий день'), nextLabel: t('nextDay', 'Следующий день') });
    bindDay(body, day, p);
    root.NWheel.bindTips(body);
    return body;
  }
  function openSphere(day, s, person) {
    const TX = UI.TX(), here = UI.here(), tz = here.tz, sp = day.spheres[s];
    const best = NS.bestHours(day, s, here);
    const tips = TX.SPH[s].tips[sp.level];
    const list = day.reasons.filter((r) => r.sphere === s && Math.abs(r.v) >= 0.08);
    const acts = Object.keys(NS.ACTIVITIES).filter((a) => NS.ACTIVITIES[a][s]).map((a) => ({ a, r: NS.activity(day, a) })).sort((x, y) => y.r.ptsF - x.r.ptsF);
    const html = `<div class="stack s18">
      <div class="dp-head">${UI.ringPts(sp, 70)}<div class="stack s6"><span class="lv ${UI.lvClass(sp.level)}" style="justify-self:start">${esc(TX.LEVEL[sp.level])}</span><span class="muted small">${esc(TX.SPH[s].short)}</span></div></div>
      <div class="card stack s6">${tips.map((x) => `<div class="todo">${esc(TX.gend(x, person.gender))}</div>`).join('')}</div>
      ${best.length ? `<div class="stack s6"><span class="label">${t('bestFor', 'Лучшие часы для этого')}</span><div class="hours">${best.map((h) => `<span class="hour">${icon('clock', 'sm')} ${UI.fmtTime(h.start, tz)}–${UI.fmtTime(h.end, tz)} · ${esc(TX.P[h.ruler].name)}</span>`).join('')}</div></div>` : ''}
      ${acts.length ? `<div class="stack s6"><span class="label">${t('sph.acts', 'Дела этой сферы')}</span>${acts.map(({ a, r }) => `<div class="bar5" style="grid-template-columns:22px minmax(0,1fr) 70px 28px;gap:8px"><span style="color:var(--lav-strong)">${icon(TX.ACT[a].icon, 'sm')}</span><span class="small">${esc(TX.ACT[a].name)}</span>${UI.pbar(r)}${UI.ptsBadge(r, true)}</div>`).join('')}</div>` : ''}
      <div class="card"><h3 style="margin-bottom:4px">${t('why', 'Почему так')}</h3>${reasonList(list, tz, 8)}</div>
      <a class="btn" href="#ask?topic=${s}&d=${ymd(day)}">${icon('ask')} ${t('askAbout', 'Спросить ИИ об этом')}</a>
    </div>`;
    UI.popup(html, { title: TX.SPH[s].name, eyebrow: UI.fmtDate(day.y, day.mo, day.d, { weekday: 'long' }) }); // поверх карточки дня: закрыл — вернулся к ней
  }

  // ---------- страница ----------
  /**
   * Лента дней как слайдер: от недели назад до двух месяцев вперёд, тянется мышью и пальцем, стрелки листают,
   * ползунок под лентой мотает дни, «Список дней» — все дни списком.
   */
  const SPAN = 68, BACK = 7;
  async function page(el, params) {
    const p = root.NStore.active();
    if (!p) { location.hash = '#onboard'; return; }
    const here = UI.here(), tz = here.tz;
    const now = UI.todayIn(tz);
    const add = (c, k) => { const dt = new Date(Date.UTC(c.y, c.mo - 1, c.d + k)); return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate() }; };
    const diff = (a, b) => Math.round((Date.UTC(a.y, a.mo - 1, a.d) - Date.UTC(b.y, b.mo - 1, b.d)) / 86400000);
    const same = (a, b) => a.y === b.y && a.mo === b.mo && a.d === b.d;
    let cur = params.d ? (() => { const [y, mo, d] = params.d.split('-').map(Number); return { y, mo, d }; })() : now;
    let start = add(now, -BACK);
    if (diff(cur, start) < 0 || diff(cur, start) >= SPAN) start = add(cur, -BACK);
    let days = new Array(SPAN).fill(null);
    const TX = UI.TX();
    const wdOf = (c) => new Date(Date.UTC(c.y, c.mo - 1, c.d)).getUTCDay();
    const cardHTML = (k) => {
      const c = add(start, k), d = days[k];
      const sel = same(c, cur), td = same(c, now);
      if (!d) return `<button class="ws tap load${sel ? ' sel' : ''}" type="button" data-k="${k}" aria-pressed="${sel}"><span class="ws-d">${esc(TX.WD[wdOf(c)])} <b>${UI.pad(c.d)}.${UI.pad(c.mo)}</b></span></button>`;
      return `<button class="ws tap ${UI.lvCls(d.overall.level)}${sel ? ' sel' : ''}${td ? ' today' : ''}" type="button" data-k="${k}" aria-pressed="${sel}"><span class="ws-d">${esc(TX.WD[wdOf(c)])} <b>${UI.pad(c.d)}.${UI.pad(c.mo)}</b></span>${UI.dots(d.overall.level)}<span class="ws-t">${esc(TX.dayTitle(d))}</span>${UI.ptsBadge(d.overall)}${td ? `<em class="ws-today">${t('todayS', 'сегодня')}</em>` : ''}</button>`;
    };
    const heading = () => `${same(cur, now) ? t('today', 'Сегодня') : t('day', 'День')} · ${UI.fmtDate(cur.y, cur.mo, cur.d, { weekday: 'long' })}`;
    el.innerHTML = `<section class="today-hero">
        <div class="row sb"><span class="eyebrow" data-head>${esc(heading())}</span>
          <div class="daynav"><button class="iconbtn bd" data-dd="-1" aria-label="${t('prevDay', 'Предыдущий день')}">${icon('left')}</button><button class="btn sm" data-dd="0">${t('today', 'Сегодня')}</button><button class="iconbtn bd" data-dd="1" aria-label="${t('nextDay', 'Следующий день')}">${icon('right')}</button><button class="btn sm" data-dlist>${icon('list', 'sm')} ${t('dlist', 'Список дней')}</button></div></div>
        <h1>${esc(t('hi', '{name}, вот твой день', { name: p.name }))}</h1>
        <div class="dslider">
          <div class="hs dstrip-wrap"><button class="hs-btn" type="button" data-hsl aria-label="${t('scrollL', 'Прокрутить влево')}">${icon('left', 'sm')}</button><div class="hs-track"><div class="wstrip dstrip" id="wstrip"></div></div><button class="hs-btn" type="button" data-hsr aria-label="${t('scrollR', 'Прокрутить вправо')}">${icon('right', 'sm')}</button></div>
          <label class="dsl-range"><span class="mono tiny" data-dsl0></span><input type="range" min="0" max="${SPAN - 1}" step="1" data-dsl aria-label="${esc(t('dsl.a', 'Мотать дни'))}"><span class="mono tiny" data-dsl1></span></label>
        </div>
      </section><div id="dayBox"><div class="card" style="min-height:280px;opacity:.5"></div></div>`;
    const ws = el.querySelector('#wstrip'), rng = el.querySelector('[data-dsl]'), box = el.querySelector('#dayBox');
    let hs = null;
    const drawStrip = () => {
      ws.innerHTML = Array.from({ length: SPAN }, (_, k) => cardHTML(k)).join('');
      rng.value = diff(cur, start);
      const e = add(start, SPAN - 1);
      el.querySelector('[data-dsl0]').textContent = `${UI.pad(start.d)}.${UI.pad(start.mo)}`;
      el.querySelector('[data-dsl1]').textContent = `${UI.pad(e.d)}.${UI.pad(e.mo)}`;
      if (!hs) hs = UI.hscroll(el.querySelector('.dstrip-wrap'), { active: '.sel', page: 0.8 });
    };
    let detT = 0, seq = 0;
    const showDay = async (smooth) => {
      const my = ++seq;
      el.querySelector('[data-head]').textContent = heading();
      const k = diff(cur, start);
      const day = days[k] || await root.NCompute.day(p, cur.y, cur.mo, cur.d, tz);
      if (my !== seq || !box.isConnected) return;
      box.innerHTML = render(day, { person: p, isToday: same(cur, now), calLink: true });
      bindDay(box, day, p);
      root.NWheel.bindTips(box);
      if (!smooth) history.replaceState(null, '', `#today${same(cur, now) ? '' : '?d=' + ymd(cur)}`);
    };
    const select = (c, opts) => {
      opts = opts || {};
      if (diff(c, start) < 0 || diff(c, start) >= SPAN) { start = add(c, -BACK); days = new Array(SPAN).fill(null); cur = c; drawStrip(); fill(); }
      cur = c;
      ws.querySelectorAll('.ws').forEach((b) => { const s = +b.dataset.k === diff(cur, start); b.classList.toggle('sel', s); b.setAttribute('aria-pressed', String(s)); });
      rng.value = diff(cur, start);
      if (hs && hs.center) hs.center(!opts.instant);
      clearTimeout(detT);
      if (opts.smooth) { el.querySelector('[data-head]').textContent = heading(); detT = setTimeout(() => showDay(false), 140); } else showDay(false);
    };
    // дни считаем месяцами: сперва ближайшие, остальное — следом, не замораживая экран
    const fill = async () => {
      const myStart = ymd(start);
      for (let k = 0; k < SPAN;) {
        const c = add(start, k);
        const n = Math.min(SPAN - k, UI.daysIn(c.y, c.mo) - c.d + 1);
        const list = await root.NCompute.range(p, c.y, c.mo, c.d, n, tz);
        if (ymd(start) !== myStart || !ws.isConnected) return;
        for (let i = 0; i < n; i++) { days[k + i] = list[i]; const b = ws.querySelector(`[data-k="${k + i}"]`); if (b) b.outerHTML = cardHTML(k + i); }
        k += n;
      }
    };
    ws.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) select(add(start, +b.dataset.k)); });
    rng.addEventListener('input', () => select(add(start, +rng.value), { smooth: true }));
    el.querySelectorAll('[data-dd]').forEach((b) => b.addEventListener('click', () => { const k = +b.dataset.dd; select(k === 0 ? now : add(cur, k)); }));
    el.querySelector('[data-dlist]').addEventListener('click', () => openDayList());
    const openDayList = () => {
      const rows = days.map((d, k) => {
        const c = add(start, k), wdi = wdOf(c);
        if (!d) return '';
        const best = Object.entries(d.spheres).sort((a, b) => b[1].ptsF - a[1].ptsF)[0];
        return `${wdi === 1 || k === 0 ? `<div class="dl-week">${t('dl.week', 'Неделя с {d}', { d: `${UI.pad(c.d)}.${UI.pad(c.mo)}` })}</div>` : ''}<button class="dl-row ${UI.lvCls(d.overall.level)}${same(c, cur) ? ' sel' : ''}${same(c, now) ? ' today' : ''}" type="button" data-lk="${k}"><span class="dl-d"><b>${UI.pad(c.d)}.${UI.pad(c.mo)}</b><small>${esc(TX.WD[wdi])}</small></span>${UI.dots(d.overall.level)}<span class="dl-t">${esc(TX.dayTitle(d))}<small>${esc(TX.SPH[best[0]].name)} ${best[1].pts}/10${same(c, now) ? ' · ' + t('todayS', 'сегодня') : ''}</small></span>${UI.ptsBadge(d.overall)}</button>`;
      }).join('');
      const body = UI.modal(`<div class="dl-list">${rows || `<p class="muted">${t('dl.loading', 'Считаю дни…')}</p>`}</div>`, { title: t('dlist', 'Список дней'), eyebrow: `${UI.pad(start.d)}.${UI.pad(start.mo)} — ${UI.pad(add(start, SPAN - 1).d)}.${UI.pad(add(start, SPAN - 1).mo)}` });
      body.querySelectorAll('[data-lk]').forEach((b) => b.addEventListener('click', () => { UI.closeSheet(); select(add(start, +b.dataset.lk), { instant: true }); window.scrollTo({ top: 0 }); }));
      const s = body.querySelector('.dl-row.sel'); if (s) s.scrollIntoView({ block: 'center' });
    };
    drawStrip();
    showDay(true);
    await fill();
  }

  root.NDay = { render, panel, tipHTML, bindDay, openDay, openSphere, reasonList, keyEvents, evRow, evGlyph, evColor, importance, wheelBlock, SPH_ICON, pg, sg };
  (root.NPages = root.NPages || {}).today = { render: page };
})(window);
