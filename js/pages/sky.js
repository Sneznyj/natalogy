/* «Небо и Луна» — астрособытия для всех: Луна сейчас (фаза, знак, лунные сутки, Луна без курса), лунный календарь на месяц,
   лента событий на 3 месяца (фазы, переходы планет, развороты, тени, затмения), ретро-планеты и затмения на 2 года.
   Работает без карты; если карта есть — у затмений и новолуний подписан твой дом. */
(function (root) {
  'use strict';
  const UI = root.NUI, AC = root.AstroCore, W = root.NWheel;
  const { t, esc, icon } = UI;
  const VS = '︎', DAY = 86400000;
  const PG = (id) => (W.GLYPH[id] || '') + VS;
  const SG = (s) => W.SIGN_G[AC.SIGNS.indexOf(s)] + VS;
  const pad = UI.pad;
  let st = { tab: 'moon', off: 0, filter: 'all', ry: 0 };
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const SLOW = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const RETRO_IDS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

  function natalHouse(lon) {
    const p = root.NStore.active(); if (!p) return null;
    try { const c = UI.chartOf(p); return c.houses ? AC.houseOf(lon, c.houses.cusps) : null; } catch (e) { return null; }
  }

  // ---------- Луна сейчас ----------
  function nowCard(here) {
    const TX = UI.TX(), now = new Date(), tz = here.tz;
    const ms = AC.moonState(now);
    let ld = null; try { ld = AC.lunarDay(now, here.lat, here.lon); } catch (e) { ld = null; }
    let voc = []; try { voc = AC.voidOfCourse(new Date(+now - DAY), new Date(+now + 3 * DAY)); } catch (e) { voc = []; }
    const cur = voc.find((v) => v.start <= now && v.end > now), next = voc.find((v) => v.start > now);
    const retro = RETRO_IDS.filter((id) => AC.body(id, now).retro);
    const ph = AC.moonPhases(now, new Date(+now + 32 * DAY));
    const nextNew = ph.find((x) => x.phase === 0), nextFull = ph.find((x) => x.phase === 2);
    const ecl = AC.eclipses(now, new Date(+now + 400 * DAY))[0];
    const left = (d) => { const h = Math.round((d - now) / 3600000); return h < 48 ? t('sky.inH', 'через {n} ч', { n: h }) : t('sky.inD', 'через {n} дн.', { n: Math.round(h / 24) }); };
    return `<div class="sky-now">
      <div class="card sky-moon">${UI.moonSVG(ms.angle, 96)}<div class="stack s6"><span class="label">${esc(t('sky.moonNow', 'Луна сейчас'))}</span><b class="sm-t">${esc(TX.PHASE8[ms.phase8])} · ${Math.round(ms.illum * 100)}%</b>
        <span><span class="g">${SG(ms.sign)}</span> ${esc(t('sky.moonIn', 'Луна {s}', { s: TX.S[ms.sign].in }))}${ld ? ' · ' + esc(t('sky.ld', '{n}‑е лунные сутки', { n: ld.day })) : ''}</span>
        <span class="small muted">${esc(TX.MOON_SIGN[ms.sign])}</span>
        ${cur ? `<span class="tag bad">${esc(t('sky.vocNow', 'Луна без курса до {t}', { t: UI.fmtDay(cur.end, tz, { hour: true }) }))}</span>` : next ? `<span class="tag">${esc(t('sky.vocNext', 'Луна без курса: {a} — {b}', { a: UI.fmtDay(next.start, tz, { hour: true }), b: UI.fmtDay(next.end, tz) === UI.fmtDay(next.start, tz) ? UI.fmtTime(next.end, tz) : UI.fmtDay(next.end, tz, { hour: true }) }))}</span>` : ''}</div></div>
      <div class="card stack"><span class="label">${esc(t('sky.next', 'Ближайшее'))}</span>
        ${nextNew ? `<div class="sky-li"><span class="g">●</span><span>${esc(t('sky.newM', 'Новолуние {s}', { s: TX.S[AC.signOf(nextNew.lon)].in }))}</span><b>${UI.fmtDay(nextNew.date, tz, { hour: true })}</b><small>${esc(left(nextNew.date))}</small></div>` : ''}
        ${nextFull ? `<div class="sky-li"><span class="g">○</span><span>${esc(t('sky.fullM', 'Полнолуние {s}', { s: TX.S[AC.signOf(nextFull.lon)].in }))}</span><b>${UI.fmtDay(nextFull.date, tz, { hour: true })}</b><small>${esc(left(nextFull.date))}</small></div>` : ''}
        ${ecl ? `<div class="sky-li"><span class="g">◑</span><span>${esc(ecl.type === 'solar' ? t('sky.eclS', 'Солнечное затмение') : t('sky.eclL', 'Лунное затмение'))} ${esc(TX.S[AC.signOf(ecl.lon)].in)}</span><b>${UI.fmtDay(ecl.date, tz, { year: true })}</b><small>${esc(left(ecl.date))}</small></div>` : ''}</div>
      <div class="card stack"><span class="label">${esc(t('sky.retroNow', 'Ретроградны сейчас'))}</span>
        ${retro.length ? `<div class="tags">${retro.map((id) => `<button type="button" class="tag ${['mercury', 'venus', 'mars'].includes(id) ? 'bad' : 'acc'}" data-rp="${id}" title="${esc(t('sky.tapR', 'Что значит и что делать'))}"><span class="g">${PG(id)}</span> ${esc(TX.P[id].name)} R</button>`).join('')}</div><p class="small muted">${esc(retro.filter((id) => TX.RETRO[id] && ['mercury', 'venus', 'mars'].includes(id)).map((id) => TX.RETRO[id].tip).join(' ') || t('sky.retroSlow', 'Медленные планеты в ретро — фон для внутренних перемен, на обычные дни влияют мало.'))}</p>` : `<p class="small muted">${esc(t('sky.retroNone', 'Сейчас ни одной планеты в ретро.'))}</p>`}</div></div>`;
  }

  // ---------- лунный календарь на месяц ----------
  async function moonMonth(box, here) {
    const TX = UI.TX(), tz = here.tz, base = UI.todayIn(tz);
    const m0 = new Date(Date.UTC(base.y, base.mo - 1 + st.off, 1)), y = m0.getUTCFullYear(), mo = m0.getUTCMonth() + 1;
    const n = UI.daysIn(y, mo);
    const starts = root.NScore.dayStarts(y, mo, 1, n + 1, tz);
    const from = starts[0].start, to = starts[n].start;
    let voc = []; try { voc = AC.voidOfCourse(new Date(+from - DAY), new Date(+to + DAY)); } catch (e) { voc = []; }
    const phases = AC.moonPhases(new Date(+from - DAY), new Date(+to + DAY));
    let ing = []; try { ing = AC.ingresses('moon', from, to, 0.25); } catch (e) { ing = []; }
    const days = [];
    for (let i = 0; i < n; i++) {
      const s = starts[i].start, e = starts[i + 1].start, noon = new Date(+s + 12 * 3600000);
      const ms = AC.moonState(noon);
      let ld = null; try { ld = AC.lunarDay(noon, here.lat, here.lon); } catch (er) { ld = null; }
      const vv = voc.filter((v) => v.end > s && v.start < e);
      const pp = phases.filter((x) => x.date >= s && x.date < e);
      const ii = ing.filter((x) => x.date >= s && x.date < e);
      days.push({ d: i + 1, s, e, ms, ld, vv, pp, ii });
      if (i % 6 === 5) await tick();
    }
    const MN = TX.MONTHS_N || TX.MONTHS;
    const lead = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7;
    const tdy = base.y === y && base.mo === mo ? base.d : 0;
    const vocTxt = (d) => d.vv.map((v) => `${v.start < d.s ? '00:00' : UI.fmtTime(v.start, tz)}–${v.end > d.e ? '24:00' : UI.fmtTime(v.end, tz)}`).join(', ');
    box.innerHTML = `<div class="horo-nav"><button class="iconbtn bd" type="button" data-moff="-1" aria-label="${esc(t('prev', 'Назад'))}">${icon('left')}</button><b>${esc(MN[mo - 1])} ${y}</b><button class="iconbtn bd" type="button" data-moff="1" aria-label="${esc(t('next', 'Вперёд'))}">${icon('right')}</button><span class="tiny muted" style="margin-left:auto">${esc(t('sky.tzNote', 'Время — {tz}', { tz }))}</span></div>
      <div class="mc-grid">${[1, 2, 3, 4, 5, 6, 0].map((i) => `<span class="wdh">${esc(TX.WD[i])}</span>`).join('')}${'<span></span>'.repeat(lead)}${days.map((d) => `<button type="button" class="mcd${d.d === tdy ? ' now' : ''}${d.pp.some((x) => x.phase === 0 || x.phase === 2) ? ' ph' : ''}" data-md="${d.d - 1}" data-tip="${esc(UI.fmtDate(y, mo, d.d, { weekday: 'short' }) + '\n' + TX.PHASE8[d.ms.phase8] + ' · ' + Math.round(d.ms.illum * 100) + '%' + (d.ld ? '\n' + t('sky.ld', '{n}‑е лунные сутки', { n: d.ld.day }) : '') + (d.vv.length ? '\n' + t('sky.voc', 'Без курса: {t}', { t: vocTxt(d) }) : ''))}">
        <span class="n">${d.d}</span>${UI.moonSVG(d.ms.angle, 26)}<span class="sg">${d.ii.length ? `${SG(d.ii[0].from)}→${SG(d.ii[d.ii.length - 1].to)}` : SG(d.ms.sign)}</span>${d.ld ? `<small class="ldn">${d.ld.day}</small>` : ''}${d.vv.map((v) => { const a = Math.max(0, (v.start - d.s) / (d.e - d.s)), b = Math.min(1, (v.end - d.s) / (d.e - d.s)); return `<i class="vb" style="left:calc(7px + ${(a * 100).toFixed(1)}% - ${(a * 14).toFixed(1)}px);width:calc(${((b - a) * 100).toFixed(1)}% - ${((b - a) * 14).toFixed(1)}px)" title="${esc(vocTxt(d))}"></i>`; }).join('')}${d.pp.map((x) => `<b class="pmk">${['●', '◐', '○', '◑'][x.phase]}</b>`).join('')}</button>`).join('')}</div>
      <p class="tiny muted">${esc(t('sky.mcLegend', 'В клетке: фаза, знак Луны (→ — переход днём), номер лунных суток в полдень. Розовая черта — Луна без курса. Нажми на день — подробности.'))}</p>`;
    box.querySelectorAll('[data-moff]').forEach((b) => b.addEventListener('click', () => { st.off += +b.dataset.moff; moonMonth(box, here); }));
    box.querySelectorAll('[data-md]').forEach((b) => b.addEventListener('click', () => {
      const d = days[+b.dataset.md];
      const rows = [
        `<p class="lead">${UI.moonSVG(d.ms.angle, 22)} ${esc(TX.PHASE8[d.ms.phase8])} · ${Math.round(d.ms.illum * 100)}%. ${esc(TX.PHASE_TIP[d.ms.phase8])}.</p>`,
        d.ld ? `<p><b>${esc(t('sky.ld', '{n}‑е лунные сутки', { n: d.ld.day }))}</b> — ${esc(t('sky.ldFrom', 'с {a}', { a: UI.fmtDay(d.ld.start, tz, { hour: true }) }))}${d.ld.end ? ', ' + esc(t('sky.ldTo', 'следующие — с {b}', { b: UI.fmtDay(d.ld.end, tz, { hour: true }) })) : ''}.</p>` : '',
        `<p><span class="g">${SG(d.ms.sign)}</span> ${esc(TX.MOON_SIGN[d.ms.sign])}</p>`,
        ...d.ii.map((x) => `<p><b>${UI.fmtTime(x.date, tz)}</b> — ${esc(TX.evText({ kind: 'ingress', T: 'moon', sign: x.to }, tz).title)}. ${esc(TX.MOON_SIGN[x.to])}</p>`),
        ...d.pp.map((x) => `<p><b>${UI.fmtTime(x.date, tz)}</b> — ${esc(TX.PHASE4[x.phase])} ${esc(TX.S[AC.signOf(x.lon)].in)}${(() => { const h = natalHouse(x.lon); return h ? ' · ' + esc(t('sky.yourHouse', 'в твоём {n} доме', { n: h })) : ''; })()}.</p>`),
        ...d.vv.map((v) => `<p class="bad-t"><b>${esc(t('sky.vocT', 'Луна без курса'))}: ${v.start < d.s ? '00:00' : UI.fmtTime(v.start, tz)}–${v.end > d.e ? '24:00' : UI.fmtTime(v.end, tz)}</b>. ${esc(t('sky.vocP', 'Начатое в это время «повисает» — лучше доделывать, отдыхать и думать.'))}</p>`),
      ].join('');
      UI.popup(`<div class="stack">${rows}</div>`, { title: UI.fmtDate(y, mo, d.d, { weekday: 'long' }), eyebrow: t('sky.mc', 'Лунный календарь') });
    }));
    root.NWheel.bindTips(box);
  }

  // ---------- лента событий ----------
  function eventsList(here) {
    const TX = UI.TX(), tz = here.tz, now = new Date(), end = new Date(+now + 92 * DAY);
    const out = [];
    for (const x of AC.moonPhases(now, end)) out.push({ date: x.date, cat: 'moon', g: ['●', '◐', '○', '◑'][x.phase], title: `${TX.PHASE4[x.phase]} ${TX.S[AC.signOf(x.lon)].in}`, text: TX.PHASE_TIP[[0, 2, 4, 6][x.phase]] + '.', lon: x.phase === 0 || x.phase === 2 ? x.lon : null });
    for (const e of AC.eclipses(now, end)) { const tx = TX.evText({ kind: 'eclipse', type: e.type }, tz); out.push({ date: e.date, cat: 'ecl', g: '◑', title: `${tx.title} ${TX.S[AC.signOf(e.lon)].in}`, text: tx.text, lon: e.lon, big: true }); }
    for (const id of ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']) {
      let list = []; try { list = AC.ingresses(id, now, end, SLOW.includes(id) ? 2 : 0.5); } catch (e) { list = []; }
      for (const x of list) { const tx = TX.evText({ kind: 'ingress', T: id, sign: x.to }, tz); out.push({ date: x.date, cat: 'planet', g: `${PG(id)}→${SG(x.to)}`, title: tx.title + (x.retro ? ' (R)' : ''), text: tx.text, big: SLOW.includes(id) }); }
    }
    for (const x of AC.stations(RETRO_IDS, now, end)) { const tx = TX.evText({ kind: 'station', T: x.id, dir: x.kind }, tz); out.push({ date: x.date, cat: 'retro', g: `${PG(x.id)}<sup>${x.kind === 'retro' ? 'R' : 'D'}</sup>`, title: tx.title, text: x.kind === 'retro' && TX.RETRO[x.id] ? TX.RETRO[x.id].tip : tx.text, big: ['mercury', 'venus', 'mars'].includes(x.id) }); }
    for (const r of AC.retrogradePeriods(['mercury', 'venus', 'mars'], now, end)) {
      if (r.shadowStart && r.shadowStart > now && r.shadowStart < end) out.push({ date: r.shadowStart, cat: 'retro', g: `${PG(r.id)}<sup>◐</sup>`, title: t('sky.shIn', '{p} входит в тень', { p: TX.P[r.id].name }), text: TX.SHADOW[r.id] || '' });
      if (r.shadowEnd && r.shadowEnd > now && r.shadowEnd < end) out.push({ date: r.shadowEnd, cat: 'retro', g: `${PG(r.id)}<sup>✓</sup>`, title: t('sky.shOut', '{p} выходит из тени', { p: TX.P[r.id].name }), text: t('sky.shOutP', 'Темы планеты снова идут вперёд — можно начинать.') });
    }
    return out.sort((a, b) => a.date - b.date);
  }
  function eventsView(box, here) {
    const TX = UI.TX(), tz = here.tz;
    const all = eventsList(here);
    const draw = () => {
      const list = all.filter((e) => st.filter === 'all' || e.cat === st.filter);
      let lastM = '';
      const MN = TX.MONTHS_N || TX.MONTHS;
      box.innerHTML = `<div class="chips" role="group">${[['all', t('sky.fAll', 'Все')], ['moon', t('sky.fMoon', 'Луна')], ['planet', t('sky.fPl', 'Переходы планет')], ['retro', t('sky.fRetro', 'Ретро и тени')], ['ecl', t('sky.fEcl', 'Затмения')]].map(([k, n]) => `<button class="chip" type="button" data-f="${k}" aria-pressed="${st.filter === k}">${esc(n)}</button>`).join('')}</div>
        <div class="sky-feed">${list.map((e) => { const m = UI.fmtDay(e.date, tz, { day: undefined }); const mh = m !== lastM ? `<h3 class="sf-m">${esc(MN[+m.slice(0, 2) - 1])} ${m.slice(3)}</h3>` : ''; lastM = m; const h = e.lon != null ? natalHouse(e.lon) : null; return `${mh}<div class="sf-it ${e.cat}${e.big ? ' big' : ''}"><span class="sf-d"><b>${UI.fmtDay(e.date, tz)}</b><small>${UI.fmtTime(e.date, tz)}</small></span><span class="sf-g">${e.g}</span><div><h4>${esc(e.title)}</h4><p>${esc(e.text)}${h ? ` <span class="tag acc">${esc(t('sky.yourHouse', 'в твоём {n} доме', { n: h }))}</span>` : ''}</p></div></div>`; }).join('') || `<p class="muted">—</p>`}</div>`;
      box.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { st.filter = b.dataset.f; draw(); }));
    };
    draw();
  }

  // ---------- ретро и затмения: любые годы (стрелки), по нажатию — расшифровка (14.10, просьба Алины) ----------
  const XK = () => ((root.NXT && (root.NXT[UI.lang()] || root.NXT.ru)) || {}).sky || {};
  const list2 = (arr, cls) => `<ul class="sk-l ${cls}">${(arr || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  /** Окно «ретро планеты»: что значит, когда (с тенями), где у тебя в карте, что делать и чего не делать. */
  function openRetro(id, tz) {
    const TX = UI.TX(), K = XK(), R = (K.retro || {})[id]; if (!R) return;
    const now = new Date();
    const per = AC.retrogradePeriods([id], new Date(+now - 400 * DAY), new Date(+now + 800 * DAY)).filter((r) => r.end >= new Date(+now - 30 * DAY)).slice(0, 3);
    const cur = per.find((r) => r.start <= now && r.end >= now), nx = per.find((r) => r.start > now);
    const focus = cur || nx;
    const h = focus && focus.lonStart != null ? natalHouse(focus.lonStart) : null;
    const row = (r) => `<div class="sk-per${r === cur ? ' now' : ''}"><b>${UI.fmtDay(r.start, tz, { year: true })} — ${UI.fmtDay(r.end, tz, { year: true })}</b>${r === cur ? ` <span class="tag acc">${esc(K.now)}</span>` : r === nx ? ` <span class="tag">${esc(K.next)}</span>` : ''}${r.lonStart != null ? `<small>${esc(W.fmtDeg(r.lonStart, UI.lang()))} → ${esc(W.fmtDeg(r.lonEnd, UI.lang()))}</small>` : ''}${r.shadowStart ? `<small>${esc(t('sky.shadow', 'тень'))}: ${UI.fmtDay(r.shadowStart, tz)} — ${UI.fmtDay(r.shadowEnd, tz, { year: true })}</small>` : ''}</div>`;
    UI.popup(`<div class="stack"><p class="lead">${esc(R.what)}</p>
      ${per.length ? `<span class="label">${esc(K.when)}</span><div class="stack s6">${per.map(row).join('')}</div>` : ''}
      ${h ? `<p class="small sk-pers">${esc(K.personal.replace('{n}', h).replace('{a}', TX.H[h].area))}</p>` : ''}
      <div class="grid2"><div class="stack s6"><span class="label ok">${esc(K.do)}</span>${list2(R.do, 'ok')}</div><div class="stack s6"><span class="label bad">${esc(K.dont)}</span>${list2(R.dont, 'no')}</div></div>
      <p class="tiny muted">${esc(K.shadow)} ${esc(K.station)}</p></div>`, { title: t('sky.retroOf2', '{p} в ретро', { p: TX.P[id].name }), eyebrow: t('nav.sky', 'Небо и Луна') });
  }
  function eclBody(x) {
    const TX = UI.TX(), K = XK(), E = (K.ecl || {})[x.type === 'solar' ? 'solar' : 'lunar'] || {}, h = natalHouse(x.lon);
    return `<div class="sk-ecl-b"><p>${esc(E.what || '')}</p>${h ? `<p class="small sk-pers">${esc(K.eclPersonal.replace('{n}', h).replace('{a}', TX.H[h].area))}</p>` : ''}
      <div class="grid2"><div class="stack s6"><span class="label ok">${esc(K.do)}</span>${list2(E.do, 'ok')}</div><div class="stack s6"><span class="label bad">${esc(K.dont)}</span>${list2(E.dont, 'no')}</div></div><p class="tiny muted">${esc(K.eclGeneral)}</p></div>`;
  }
  function retroView(box, here) {
    const TX = UI.TX(), tz = here.tz, now = new Date(), K = XK();
    const y = now.getUTCFullYear() + (st.ry || 0), s = new Date(Date.UTC(y, 0, 1)), e = new Date(Date.UTC(y + 1, 11, 31));
    const list = AC.retrogradePeriods(RETRO_IDS, s, e);
    const span = e - s, X = (d) => Math.max(0, Math.min(100, (d - s) / span * 100));
    const rows = RETRO_IDS.map((id) => `<div class="rt-row"><button type="button" class="rt-n rt-btn" data-rp="${id}" title="${esc(K.tapRetro || '')}"><span class="g">${PG(id)}</span> ${esc(TX.P[id].name)} ${icon('info', 'xs')}</button><div class="rt-track">${list.filter((r) => r.id === id).map((r) => `${r.shadowStart ? `<i class="sh" style="left:${X(r.shadowStart)}%;width:${Math.max(0.4, X(r.shadowEnd) - X(r.shadowStart))}%"></i>` : ''}<i class="rt ${['mercury', 'venus', 'mars'].includes(id) ? 'fast' : ''}" data-rp="${id}" style="left:${X(r.start)}%;width:${Math.max(0.6, X(r.end) - X(r.start))}%" data-tip="${esc(TX.P[id].name + ': ' + UI.fmtDay(r.start, tz, { year: true }) + ' — ' + UI.fmtDay(r.end, tz, { year: true }) + (r.shadowStart ? '\n' + t('sky.shadow', 'тень') + ': ' + UI.fmtDay(r.shadowStart, tz) + ' — ' + UI.fmtDay(r.shadowEnd, tz, { year: true }) : ''))}"></i>`).join('')}${now >= s && now <= e ? `<b class="nowl" style="left:${X(now)}%"></b>` : ''}</div></div>`).join('');
    const MN = TX.MONTHS_N || TX.MONTHS;
    const axis = Array.from({ length: 8 }, (_, i) => { const d = new Date(Date.UTC(y, i * 3, 1)); return `<span style="left:${X(d)}%">${esc(MN[d.getUTCMonth()].slice(0, 3))} ${String(d.getUTCFullYear()).slice(2)}</span>`; }).join('');
    const ecl = AC.eclipses(s, e);
    const kind = (x) => ({ total: t('ecl.total', 'полное'), partial: t('ecl.partial', 'частное'), annular: t('ecl.annular', 'кольцеобразное'), penumbral: t('ecl.penumbral', 'полутеневое'), hybrid: t('ecl.hybrid', 'гибридное') })[x.kind] || x.kind || '';
    const nav = `<div class="row sk-ynav"><button class="btn sm" type="button" data-ry="-1">${icon('left', 'sm')} ${esc(K.prevY || '')}</button><b class="sk-y">${y}–${y + 1}</b><button class="btn sm" type="button" data-ry="1">${esc(K.nextY || '')} ${icon('right', 'sm')}</button>${st.ry ? `<button class="btn sm ghost" type="button" data-ry="0">${esc(t('sky.thisY', 'Сейчас'))}</button>` : ''}</div>`;
    box.innerHTML = `${nav}<div class="stack"><h3>${esc(t('sky.rtT', 'Ретроградные периоды {a}–{b}', { a: y, b: y + 1 }))}</h3><p class="tiny muted">${esc(K.tapRetro || '')}</p><div class="rt-axis">${axis}</div><div class="rt-list">${rows}</div><p class="tiny muted">${esc(t('sky.rtLegend', 'Тёмная полоса — планета в ретро, светлая — тень до и после. Вертикальная черта — сегодня. Наведи — даты.'))}</p></div>
      <div class="stack" style="margin-top:10px"><h3>${esc(t('sky.eclT', 'Затмения {a}–{b}', { a: y, b: y + 1 }))}</h3><p class="tiny muted">${esc(K.tapEcl || '')}</p><div class="items sk-ecls">${ecl.map((x) => { const h = natalHouse(x.lon); const past = x.date < now; return `<details class="item sk-ecl${past ? ' past' : ''}"><summary><span class="gl">${x.type === 'solar' ? '☉︎' : '☽︎'}</span><div><h4>${esc(x.type === 'solar' ? t('sky.eclS', 'Солнечное затмение') : t('sky.eclL', 'Лунное затмение'))} ${esc(TX.S[AC.signOf(x.lon)].in)} · ${UI.fmtDay(x.date, tz, { year: true, hour: true })}</h4><p>${esc(TX.ECLIPSE[x.type === 'solar' ? 'solar' : 'lunar'])}${h ? ' ' + esc(t('sky.eclH', 'У тебя — в {n} доме: {a}.', { n: h, a: TX.H[h].area })) : ''}</p><div class="why">${esc(kind(x))}</div></div></summary>${eclBody(x)}</details>`; }).join('') || `<p class="muted">—</p>`}</div></div>`;
    root.NWheel.bindTips(box);
    box.querySelectorAll('[data-rp]').forEach((b) => b.addEventListener('click', () => openRetro(b.dataset.rp, tz)));
    box.querySelectorAll('[data-ry]').forEach((b) => b.addEventListener('click', () => { const k = +b.dataset.ry; st.ry = k === 0 ? 0 : (st.ry || 0) + k; retroView(box, here); }));
  }

  async function page(el) {
    const here = UI.here();
    el.innerHTML = `<div class="sec-head"><span class="eyebrow">${esc(t('nav.sky', 'Небо и Луна'))}</span><h1>${t('sky.title', 'События неба <em>и лунный календарь</em>')}</h1><p>${esc(t('sky.p2', 'Фазы и сутки Луны, Луна без курса, переходы планет, ретроградность и затмения — для всех.'))}</p></div>
      <div class="loc-bar sky-loc"><span class="label">${esc(t('sky.city', 'Считаю для города'))}</span>${UI.homeChipHTML(root.NStore.active() ? root.NStore.active().id : null)}<span class="tiny">${esc(t('sky.cityHint', 'Луна без курса, лунные сутки и время событий — по поясу {tz}', { tz: here.tz }))}</span></div>
      ${nowCard(here)}
      <div class="seg" role="tablist">${[['moon', t('sky.tMoon', 'Лунный календарь')], ['events', t('sky.tEv', 'События на 3 месяца')], ['retro', t('sky.tRetro', 'Ретро и затмения')]].map(([k, n]) => `<button type="button" data-tab="${k}" aria-pressed="${st.tab === k}">${esc(n)}</button>`).join('')}</div>
      <section class="card sky-body" id="skyBody"><p class="muted">${esc(t('horo.loading', 'Считаю…'))}</p></section>`;
    const body = el.querySelector('#skyBody');
    const draw = async () => {
      body.innerHTML = `<p class="muted">${esc(t('horo.loading', 'Считаю…'))}</p>`; await tick();
      if (st.tab === 'moon') await moonMonth(body, here); else if (st.tab === 'events') eventsView(body, here); else retroView(body, here);
      body.classList.remove('fade-in'); void body.offsetWidth; body.classList.add('fade-in');
    };
    el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.tab; el.querySelectorAll('[data-tab]').forEach((z) => z.setAttribute('aria-pressed', String(z === b))); draw(); }));
    root.NWheel.bindTips(el);
    el.querySelectorAll('.sky-now [data-rp]').forEach((x) => x.addEventListener('click', () => openRetro(x.dataset.rp, here.tz)));
    UI.bindHomeChips(el, () => page(el));
    draw();
  }

  root.NSky = { openRetro };
  (root.NPages = root.NPages || {}).sky = { render: page, open: true };
})(window);
