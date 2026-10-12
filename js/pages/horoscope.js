/* «Гороскоп» — самый частый запрос: знак (свой отмечен ★), день / завтра / неделя / месяц / год с баллами 1–10 по сферам,
   текст по солнечным домам, лучшие часы, события неба; справа — личный день по точной карте (если она есть).
   Открывается и без карты: для гороскопа по знаку данные рождения не нужны. */
(function (root) {
  'use strict';
  const UI = root.NUI, AC = root.AstroCore, NS = root.NScore, W = root.NWheel, H = root.NHoro;
  const { t, esc, icon } = UI;
  const VS = '︎', DAY = 86400000;
  const SIGNS = AC.SIGNS;
  const HT = () => root.NHoroTexts[UI.lang()] || root.NHoroTexts.ru;
  const SG = (si) => W.SIGN_G[si] + VS;
  const PG = (id) => (W.GLYPH[id] || '') + VS;
  // границы знаков (тропический зодиак): [день, месяц] начала и конца
  const DATES = [[21, 3, 19, 4], [20, 4, 20, 5], [21, 5, 20, 6], [21, 6, 22, 7], [23, 7, 22, 8], [23, 8, 22, 9], [23, 9, 22, 10], [23, 10, 21, 11], [22, 11, 21, 12], [22, 12, 19, 1], [20, 1, 18, 2], [19, 2, 20, 3]];
  const SPH_ICON = { mood: 'sun', love: 'love', money: 'money', career: 'career', energy: 'energy' };
  const MODES = ['today', 'tomorrow', 'week', 'month', 'year'];
  let st = { sign: null, mode: 'today', off: 0 };
  let conjured = false;

  const pad = UI.pad;
  const dates = (si) => { const [a, b, c, d] = DATES[si]; return `${pad(a)}.${pad(b)}–${pad(c)}.${pad(d)}`; };
  const sphName = (s) => (s === 'mood' ? t('horo.mood', 'Настроение') : UI.TX().SPH[s].name);
  const houseN = (n) => t('horo.houseN', '{n}-й дом', { n });
  const houseIn = (n) => t('horo.houseIn', '{n}-м доме', { n });
  const addDays = (o, k) => { const x = new Date(Date.UTC(o.y, o.mo - 1, o.d + k)); return { y: x.getUTCFullYear(), mo: x.getUTCMonth() + 1, d: x.getUTCDate() }; };
  const wdOf = (o) => new Date(Date.UTC(o.y, o.mo - 1, o.d)).getUTCDay();
  const ymd = (o) => `${o.y}-${o.mo}-${o.d}`;
  const gender = () => { const p = root.NStore.active(); return p && p.gender === 'm' ? 'm' : 'f'; };
  const tip = (s, level) => { const TX = UI.TX(); const arr = TX.SPH[s] && TX.SPH[s].tips[level]; return arr ? TX.gend(arr[0], gender()) : ''; };
  const sunSignOf = (p) => { try { return AC.signOf(UI.chartOf(p).byId.sun.lon); } catch (e) { return null; } };

  // ---------- расчёт периода ----------
  function ctxFor(startDate, endDate, withVoc) {
    let voc = []; if (withVoc) { try { voc = AC.voidOfCourse(new Date(startDate - DAY), new Date(+endDate + DAY)); } catch (e) { voc = []; } }
    return { voc, ecl: AC.eclipses(new Date(startDate - 3 * DAY), new Date(+endDate + 3 * DAY)) };
  }
  const tick = () => new Promise((r) => setTimeout(r, 0));
  async function scoreRange(si, from, n, tz, withVoc) {
    const starts = NS.dayStarts(from.y, from.mo, from.d, n + 1, tz);
    const ctx = ctxFor(starts[0].start, starts[n].start, withVoc);
    const out = [];
    for (let i = 0; i < n; i++) { out.push(Object.assign({ y: starts[i].y, mo: starts[i].mo, d: starts[i].d, start: starts[i].start }, H.scoreDay(SIGNS.indexOf(SIGNS[si]), starts[i].start, ctx))); if (i % 40 === 39) await tick(); }
    return { days: out, ctx };
  }

  // ---------- кусочки разметки ----------
  const sphRow = (s, r) => `<div class="hs ${UI.lvCls(r.level)}" data-tip="${esc(sphName(s) + ': ' + r.pts + '/10 · ' + UI.TX().LEVEL[r.level])}"><span class="ic">${icon(SPH_ICON[s], 'sm')}</span><span class="nm">${esc(sphName(s))}</span>${UI.pbar(r)}${UI.ptsBadge(r, true)}</div>`;
  const block = (glyph, title, html) => `<div class="hblock"><h4><span class="g">${glyph}</span>${esc(title)}</h4>${html}</div>`;
  function planetHouseText(id, si, at) {
    const lon = AC.body(id, at).lon, n = H.house(lon, si), T = HT();
    return { n, sign: AC.signOf(lon), text: T[id] ? T[id][n] : '' };
  }
  function ingressNotes(ids, si, from, to, tz) {
    const TX = UI.TX(), out = [];
    for (const id of ids) {
      let list = []; try { list = AC.ingresses(id, from, to); } catch (e) { list = []; }
      for (const x of list) {
        const n = H.house(AC.SIGNS.indexOf(x.to) * 30 + 1, si);
        out.push({ date: x.date, html: `<p><b>${UI.fmtDay(x.date, tz)}</b> — ${esc(t('horo.ingr2', '{p} {s} — в твоём {n}', { p: TX.P[id].name, s: TX.S[x.to].in, n: houseIn(n) }))}${x.retro ? ' (R)' : ''}. ${esc((HT()[id] || {})[n] || '')}</p>` });
      }
    }
    return out.sort((a, b) => a.date - b.date).map((x) => x.html).join('');
  }
  function lunations(si, from, to, tz) {
    const TX = UI.TX();
    return AC.moonPhases(from, to).filter((x) => x.phase === 0 || x.phase === 2).map((x) => {
      const n = H.house(x.lon, si);
      return `<p><b>${UI.fmtDay(x.date, tz, { hour: true })}</b> — ${esc(x.phase === 0 ? t('horo.newIn', 'новолуние {s}', { s: TX.S[AC.signOf(x.lon)].in }) : t('horo.fullIn', 'полнолуние {s}', { s: TX.S[AC.signOf(x.lon)].in }))} · ${esc(houseN(n))}: ${esc(x.phase === 0 ? t('horo.newDo', 'хорошо задумать новое в теме «{a}»', { a: TX.H[n].area }) : t('horo.fullDo', 'итоги и кульминация в теме «{a}»', { a: TX.H[n].area }))}.</p>`;
    }).join('');
  }
  function eclipseNotes(si, from, to, tz) {
    const TX = UI.TX();
    return AC.eclipses(from, to).map((e) => { const n = H.house(e.lon, si); return `<p><b>${UI.fmtDay(e.date, tz, { year: true })}</b> — ${esc(e.type === 'solar' ? t('horo.eclS', 'солнечное затмение') : t('horo.eclL', 'лунное затмение'))} ${esc(TX.S[AC.signOf(e.lon)].in)} · ${esc(houseN(n))} («${esc(TX.H[n].area)}»). ${esc(TX.ECLIPSE[e.type === 'solar' ? 'solar' : 'lunar'])}</p>`; }).join('');
  }
  function retroNotes(ids, from, to, tz) {
    const TX = UI.TX();
    return AC.retrogradePeriods(ids, from, to).map((r) => `<p><b>${esc(TX.P[r.id].name)}: ${UI.fmtDay(r.start, tz)} — ${UI.fmtDay(r.end, tz, { year: true })}.</b> ${esc(TX.RETRO[r.id] ? TX.RETRO[r.id].tip : '')}</p>`).join('');
  }
  function bestOf(days, s, n) { return days.slice().sort((a, b) => b.r[s].ptsF - a.r[s].ptsF).slice(0, n); }

  // ---------- день ----------
  async function dayView(si, o, tz) {
    const TX = UI.TX(), T = HT();
    const { days, ctx } = await scoreRange(si, o, 1, tz, true);
    const D = days[0], r = D.r, start = D.start, end = new Date(+start + DAY);
    const sign = SIGNS[si];
    const asp = H.dayAspects(si, start);
    const bh = H.bestHours(si, start, ctx.voc)[0];
    const voc = ctx.voc.filter((v) => v.end > start && v.start < end);
    let moonIng = []; try { moonIng = AC.ingresses('moon', start, end, 0.1); } catch (e) { moonIng = []; }
    const others = ingressNotes(['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'], si, start, end, tz);
    const st2 = AC.stations(['mercury', 'venus', 'mars', 'jupiter', 'saturn'], start, end);
    const retro = ['mercury', 'venus', 'mars'].filter((id) => H.positions(start)[id].retro);
    const phases = AC.moonPhases(start, end);
    const best = H.SPH.filter((s) => s !== 'mood').sort((a, b) => r[b].ptsF - r[a].ptsF);
    const top = best[0], low = best[best.length - 1];
    const ph = TX.PHASE8[D.phase8];
    const facts = [
      `<span class="tag acc"><span class="g">${PG('moon')}</span> ${esc(t('horo.moonIn', 'Луна {s}', { s: TX.S[D.moonSign].in }))} · ${esc(houseN(D.moonHouse))}</span>`,
      `<span class="tag">${UI.moonSVG(AC.moonState(new Date(+start + 12 * 3600000)).angle, 16)} ${esc(ph)}</span>`,
      bh ? `<span class="tag ok">${icon('clock', 'xs')} ${esc(t('horo.best', 'Лучшее время: {a}–{b}', { a: UI.fmtTime(bh.start, tz), b: UI.fmtTime(bh.end, tz) }))}</span>` : '',
      ...voc.map((v) => `<span class="tag bad">${esc(t('horo.voc', 'Луна без курса {a}–{b}', { a: v.start < start ? '00:00' : UI.fmtTime(v.start, tz), b: v.end > end ? '24:00' : UI.fmtTime(v.end, tz) }))}</span>`),
    ].join('');
    const evs = [
      ...asp.map((a) => `<p><span class="g asp-${a.soft ? 'soft' : 'hard'}"><span class="ag">${PG(a.id)}${W.ASP_G[a.a === 0 ? 'conj' : a.a === 60 ? 'sextile' : a.a === 90 ? 'square' : a.a === 120 ? 'trine' : 'opp']}${VS}</span></span> ${esc(T.aspect[a.id][a.soft ? 0 : 1])}.</p>`),
      ...moonIng.map((x) => { const n = H.house(AC.SIGNS.indexOf(x.to) * 30 + 1, si); return `<p><b>${UI.fmtTime(x.date, tz)}</b> — ${esc(t('horo.moonMove2', 'Луна {s}: фокус в твоём {n} — {a}', { s: TX.S[x.to].in, n: houseIn(n), a: TX.H[n].area }))}.</p>`; }),
      ...phases.map((x) => `<p><b>${UI.fmtTime(x.date, tz)}</b> — ${esc(TX.PHASE4[x.phase])}. ${esc(TX.PHASE_TIP[[0, 2, 4, 6][x.phase]])}.</p>`),
      ...st2.map((x) => `<p><b>${esc(TX.P[x.id].name)}</b> ${esc(x.kind === 'retro' ? t('horo.stR', 'разворачивается назад — замедлись в его темах') : t('horo.stD', 'разворачивается вперёд — дела сдвинутся'))}.</p>`),
      others,
      ...retro.map((id) => `<p><b>${esc(TX.RETRO[id].name)}.</b> ${esc(TX.RETRO[id].tip)}</p>`),
    ].join('');
    return `<div class="horo-day">
      <div class="hd-score">${UI.ringPts(r.overall, 92)}<div class="stack s6"><b class="hd-title">${esc(TX.LEVEL_DAY[r.overall.level])}</b><p class="muted">${esc(t('horo.focus', 'В фокусе: {a}', { a: TX.H[D.moonHouse].area }))}</p></div></div>
      <div class="hd-sph">${H.SPH.map((s) => sphRow(s, r[s])).join('')}</div>
      <div class="hd-text"><p class="lead">${esc(T.moonDay[D.moonHouse])}</p><p class="small muted">${esc(TX.MOON_SIGN[D.moonSign])}</p></div>
      <div class="tags hd-facts">${facts}</div>
      <div class="hd-tips"><div class="htip ok"><span class="label ok">${esc(t('horo.do', 'Лучше всего сегодня'))} · ${esc(sphName(top))} ${r[top].pts}/10</span><p>${esc(tip(top, r[top].level))}</p></div>${r[low].level < 0 ? `<div class="htip bad"><span class="label bad">${esc(t('horo.care', 'Осторожнее'))} · ${esc(sphName(low))} ${r[low].pts}/10</span><p>${esc(tip(low, r[low].level))}</p></div>` : ''}</div>
      ${evs ? block('✦', t('horo.sky', 'Что происходит на небе'), evs) : ''}
    </div>`;
  }

  // ---------- неделя ----------
  async function weekView(si, o, tz) {
    const TX = UI.TX();
    const { days } = await scoreRange(si, o, 7, tz, true);
    const from = days[0].start, to = new Date(+days[6].start + DAY);
    // Луна по домам: подряд идущие дни с одним домом
    const runs = [];
    for (const d of days) { const last = runs[runs.length - 1]; if (last && last.h === d.moonHouse) last.to = d; else runs.push({ h: d.moonHouse, from: d, to: d }); }
    const T = HT();
    const sun = planetHouseText('sun', si, new Date(+from + 3.5 * DAY));
    const ev = [lunations(si, from, to, tz), eclipseNotes(si, from, to, tz), ingressNotes(['sun', 'mercury', 'venus', 'mars'], si, from, to, tz)].join('');
    return `<div class="hw-days">${days.map((d, i) => `<button class="hwd ${UI.lvCls(d.r.overall.level)}" type="button" data-goday="${i}"><span class="wd">${esc(TX.WD[wdOf(d)])}</span><span class="dt">${pad(d.d)}.${pad(d.mo)}</span>${UI.ringPts(d.r.overall, 50)}<span class="g" title="${esc(TX.S[d.moonSign].name)}">${PG('moon')}${SG(SIGNS.indexOf(d.moonSign))}</span></button>`).join('')}</div>
      <p class="tiny muted hint-click">${icon('info', 'xs')} ${esc(t('horo.tapDay', 'Нажми на день — откроется гороскоп на этот день'))}</p>
      <div class="hw-best">${H.SPH.filter((s) => s !== 'mood').map((s) => { const b = bestOf(days, s, 1)[0]; return `<div class="hs ${UI.lvCls(b.r[s].level)}"><span class="ic">${icon(SPH_ICON[s], 'sm')}</span><span class="nm">${esc(sphName(s))}</span><span class="small">${esc(TX.WD[wdOf(b)])}, ${pad(b.d)}.${pad(b.mo)}</span>${UI.ptsBadge(b.r[s], true)}</div>`; }).join('')}</div>
      ${block(PG('sun'), t('horo.weekTheme', 'Тема недели'), `<p>${esc(T.sunMonth[sun.n])}</p>`)}
      ${block(PG('moon'), t('horo.weekMoon', 'Луна по твоим домам'), runs.map((x) => `<p><b>${pad(x.from.d)}.${pad(x.from.mo)}${x.to !== x.from ? '–' + pad(x.to.d) + '.' + pad(x.to.mo) : ''}</b> · ${esc(houseN(x.h))}: ${esc(TX.H[x.h].area)}.</p>`).join(''))}
      ${ev ? block('✦', t('horo.weekEv', 'События недели'), ev) : ''}`;
  }

  // ---------- месяц ----------
  async function monthView(si, y, mo, tz) {
    const TX = UI.TX(), T = HT();
    const n = UI.daysIn(y, mo);
    const { days } = await scoreRange(si, { y, mo, d: 1 }, n, tz, true);
    const from = days[0].start, to = new Date(+days[n - 1].start + DAY), mid = new Date(+from + 14.5 * DAY);
    const lead = (wdOf(days[0]) + 6) % 7;
    const today = UI.todayIn(tz);
    const phases = AC.moonPhases(from, to);
    const phOn = (d) => { const x = phases.find((q) => (q.phase === 0 || q.phase === 2) && q.date >= d.start && q.date < new Date(+d.start + DAY)); return x ? (x.phase === 0 ? '●' : '○') : ''; };
    const sun = planetHouseText('sun', si, mid), ven = planetHouseText('venus', si, mid), mar = planetHouseText('mars', si, mid), mer = planetHouseText('mercury', si, mid);
    const wdh = [1, 2, 3, 4, 5, 6, 0].map((i) => `<span class="wdh">${esc(TX.WD[i])}</span>`).join('');
    const ingr = ingressNotes(['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'], si, from, to, tz);
    const ecl = eclipseNotes(si, from, to, tz), rt = retroNotes(['mercury', 'venus', 'mars', 'jupiter', 'saturn'], from, to, tz);
    return `<div class="hm-grid">${wdh}${'<span></span>'.repeat(lead)}${days.map((d, i) => `<button type="button" class="hmd ${UI.lvCls(d.r.overall.level)}${d.y === today.y && d.mo === today.mo && d.d === today.d ? ' now' : ''}" data-goday="${i}" data-tip="${esc(UI.fmtDate(d.y, d.mo, d.d, { weekday: 'short' }) + ' · ' + d.r.overall.pts + '/10\n' + H.SPH.filter((s) => s !== 'mood').map((s) => sphName(s) + ' ' + d.r[s].pts).join(' · '))}"><span class="n">${d.d}</span><b>${d.r.overall.pts}</b><i>${phOn(d)}</i></button>`).join('')}</div>
      <p class="tiny muted">${esc(t('horo.monthLegend', 'Цифра в клетке — общий балл дня. ● новолуние, ○ полнолуние. Нажми на день — откроется его гороскоп.'))}</p>
      <div class="hw-best">${H.SPH.filter((s) => s !== 'mood').map((s) => `<div class="hs"><span class="ic">${icon(SPH_ICON[s], 'sm')}</span><span class="nm">${esc(sphName(s))}</span><span class="small">${bestOf(days, s, 3).sort((a, b) => a.d - b.d).map((b) => `<button class="dchip" type="button" data-goday="${b.d - 1}">${pad(b.d)}.${pad(b.mo)} ${UI.ptsBadge(b.r[s], true)}</button>`).join(' ')}</span></div>`).join('')}</div>
      ${block(PG('sun'), t('horo.mTheme', 'Главная тема месяца — {a}', { a: TX.H[sun.n].area }), `<p>${esc(T.sunMonth[sun.n])}</p>`)}
      ${block(PG('venus'), t('horo.mLove', 'Любовь и деньги'), `<p>${esc(ven.text)}</p>`)}
      ${block(PG('mars'), t('horo.mMars', 'Энергия и действия'), `<p>${esc(mar.text)}</p>`)}
      ${block(PG('mercury'), t('horo.mMerc', 'Мысли и разговоры'), `<p>${esc(mer.text)}</p>`)}
      ${block('◐', t('horo.mLun', 'Новолуния и полнолуния'), lunations(si, from, to, tz) || `<p class="muted">—</p>`)}
      ${ingr ? block('→', t('horo.mIngr', 'Планеты меняют знак'), ingr) : ''}
      ${ecl ? block('◑', t('horo.ecl', 'Затмения'), ecl) : ''}
      ${rt ? block('℞', t('horo.retro', 'Ретроградные периоды'), rt) : ''}`;
  }

  // ---------- год ----------
  async function yearView(si, y, tz) {
    const TX = UI.TX(), T = HT();
    const n = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
    const { days } = await scoreRange(si, { y, mo: 1, d: 1 }, n, tz, false);
    const from = days[0].start, to = new Date(+days[n - 1].start + DAY);
    const months = Array.from({ length: 12 }, (_, m) => {
      const list = days.filter((d) => d.mo === m + 1);
      const avg = (s) => list.reduce((a, d) => a + d.r[s].ptsF, 0) / list.length;
      const o = { m }; for (const s of ['overall', ...H.SPH]) { const f = avg(s); o[s] = H.fromF(f); }
      return o;
    });
    // столбики года: среднее за месяц сглаживает разницу, поэтому высота и цвет — относительно лучшего и худшего месяца
    const rel = {};
    for (const s of ['overall', ...H.SPH]) {
      const v = months.map((x) => x[s].ptsF), lo = Math.min(...v), hi = Math.max(...v), order = v.slice().sort((a, b) => b - a);
      rel[s] = months.map((x) => { const f = x[s].ptsF, k = hi > lo ? (f - lo) / (hi - lo) : 0.5; return { h: 18 + k * 82, cls: f >= order[1] ? 'l2' : f >= order[3] ? 'l1' : f <= order[10] ? 'lm1' : 'l0', txt: f.toFixed(1).replace('.', UI.lang() === 'en' ? '.' : ',') }; });
    }
    const bestM = (s) => months.slice().sort((a, b) => b[s].ptsF - a[s].ptsF).slice(0, 2).map((x) => TX.MONTHS_N ? TX.MONTHS_N[x.m] : UI.TX().MONTHS[x.m]).join(', ');
    const jup = planetHouseText('jupiter', si, new Date(Date.UTC(y, 0, 15))), sat = planetHouseText('saturn', si, new Date(Date.UTC(y, 0, 15)));
    const jIngr = ingressNotes(['jupiter'], si, from, to, tz), sIngr = ingressNotes(['saturn'], si, from, to, tz);
    const MN = TX.MONTHS_N || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const ecl = eclipseNotes(si, from, to, tz), rt = retroNotes(['mercury', 'venus', 'mars'], from, to, tz);
    return `<div class="hy-wrap"><div class="hy-bars" data-ys="overall">${months.map((x) => `<button type="button" class="hyb" data-gomonth="${x.m}" data-tip="${esc(MN[x.m] + ': ' + x.overall.pts + '/10\n' + H.SPH.filter((s) => s !== 'mood').map((s) => sphName(s) + ' ' + x[s].pts).join(' · '))}">${['overall', ...H.SPH].map((s) => `<i class="c-${rel[s][x.m].cls}" data-s="${s}" style="height:${rel[s][x.m].h.toFixed(0)}%"></i>`).join('')}${['overall', ...H.SPH].map((s) => `<b data-s="${s}">${rel[s][x.m].txt}</b>`).join('')}<span>${esc(MN[x.m].slice(0, 3))}</span></button>`).join('')}</div>
      <div class="chips hy-chips" role="group">${['overall', ...H.SPH.filter((s) => s !== 'mood')].map((s, i) => `<button class="chip" type="button" data-ys="${s}" aria-pressed="${i === 0}">${s === 'overall' ? esc(t('horo.overall', 'Общий')) : icon(SPH_ICON[s], 'xs') + ' ' + esc(sphName(s))}</button>`).join('')}</div></div>
      <div class="hw-best">${H.SPH.filter((s) => s !== 'mood').map((s) => `<div class="hs"><span class="ic">${icon(SPH_ICON[s], 'sm')}</span><span class="nm">${esc(sphName(s))}</span><span class="small">${esc(bestM(s))}</span></div>`).join('')}</div>
      ${block(PG('jupiter'), t('horo.yJup', 'Юпитер: где удача в этом году'), `<p>${esc(jup.text)}</p>${jIngr}`)}
      ${block(PG('saturn'), t('horo.ySat', 'Сатурн: где нужна опора'), `<p>${esc(sat.text)}</p>${sIngr}`)}
      ${ecl ? block('◑', t('horo.yEcl', 'Затмения года'), ecl) : ''}
      ${rt ? block('℞', t('horo.yRetro', 'Ретро Меркурия, Венеры и Марса'), rt) : ''}`;
  }

  // ---------- личный день по карте ----------
  async function personal(box, o, tz, sign) {
    const p = root.NStore.active();
    if (!p) {
      box.innerHTML = `<div class="card stack horo-me"><span class="label">${esc(t('horo.meL', 'Твой личный гороскоп'))}</span><p>${esc(t('horo.meP', 'Гороскоп по знаку общий для всех, кто родился в эти даты. Личный учитывает дату, время и город рождения — и показывает баллы именно твоих дней.'))}</p><a class="btn primary" href="#onboard?next=today">${icon('ask')} ${esc(t('horo.meGo', 'Построить мою карту'))}</a><p class="tiny muted">${esc(t('horo.meFree', 'Бесплатно, без регистрации.'))}</p></div>`;
      return;
    }
    const TX = UI.TX();
    try {
      const day = await root.NCompute.day(p, o.y, o.mo, o.d, tz);
      const mine = sunSignOf(p) === sign;
      box.innerHTML = `<div class="card stack horo-me"><div class="row sb"><span class="label">${esc(t('horo.meL2', 'Личный день · {n}', { n: p.name }))}</span>${mine ? `<span class="tag acc">★ ${esc(t('horo.yourSign', 'твой знак'))}</span>` : ''}</div>
        <div class="dp-head">${UI.ringPts(day.overall, 64)}<div class="stack s6"><b style="font:600 calc(20px*var(--fz))/1.15 var(--f-display)">${esc(TX.dayTitle(day))}</b><span class="small muted">${esc(TX.headline(day))}</span></div></div>
        <p class="tiny muted">${esc(t('horo.meNote', 'По твоей карте баллы точнее, чем по знаку: учитываются все планеты и дома.'))}</p>
        <div class="row"><a class="btn sm primary" href="#calendar?d=${ymd(o)}">${icon('calendar', 'sm')} ${esc(t('horo.meCal', 'Мой день в календаре'))}</a><a class="btn sm" href="#ask">${icon('ask', 'sm')} ${esc(t('nav.ask', 'Спросить'))}</a></div></div>`;
    } catch (e) { box.innerHTML = ''; }
  }

  // ---------- «волшебство»: зодиак доворачивается, выбранный знак — наверху ----------
  function conjure(box, si) {
    return new Promise((done) => {
      if (UI.reduceMotion()) return done();
      const dur = conjured ? 520 : 1100; conjured = true;
      const R = 74, C = 100;
      const g = SIGNS.map((s, i) => { const a = (i * 30 - 90) * Math.PI / 180; return `<text x="${(C + R * Math.cos(a)).toFixed(1)}" y="${(C + R * Math.sin(a)).toFixed(1)}" text-anchor="middle" dominant-baseline="central" class="${i === si ? 'on' : ''}">${W.SIGN_G[i]}${VS}</text>`; }).join('');
      box.insertAdjacentHTML('afterbegin', `<div class="horo-conj"><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="92" class="c1"/><circle cx="100" cy="100" r="56" class="c2"/><g class="zr" style="--to:${-si * 30}deg;--dur:${dur}ms">${g}</g></svg></div>`);
      setTimeout(() => { const c = box.querySelector('.horo-conj'); if (c) c.remove(); done(); }, dur + 80);
    });
  }

  // ---------- страница ----------
  async function page(el, params) {
    const TX = UI.TX(), S = root.NStore.settings();
    const here = UI.here(), tz = here.tz;
    const p = root.NStore.active();
    const mySign = p ? sunSignOf(p) : null;
    if (params.sign && SIGNS.includes(params.sign)) st.sign = params.sign;
    if (!st.sign) st.sign = S.horoSign && SIGNS.includes(S.horoSign) ? S.horoSign : mySign || AC.signOf(AC.body('sun', new Date()).lon);
    if (params.mode && MODES.includes(params.mode)) { st.mode = params.mode; st.off = 0; }
    const people = root.NStore.people();
    const pplSigns = people.map((x) => ({ x, s: sunSignOf(x) })).filter((q) => q.s);
    el.innerHTML = `<div class="sec-head"><span class="eyebrow">${esc(t('horo.eyebrow', 'Гороскоп'))}</span><h1>${t('horo.title', 'Гороскоп <em>на каждый день</em>')}</h1>
      <p>${esc(t('horo.p', 'Выбери знак — покажу день, неделю, месяц и год с баллами по сферам. Твой знак отмечен звёздочкой.'))}</p></div>
      <div class="horo-signs" role="group" aria-label="${esc(t('horo.signs', 'Знаки зодиака'))}">${SIGNS.map((s, i) => `<button class="hsign" type="button" data-sign="${s}" aria-pressed="${s === st.sign}"><span class="g">${SG(i)}</span><b>${esc(TX.S[s].name)}</b><small>${dates(i)}</small>${s === mySign ? `<i class="me" title="${esc(t('horo.yourSign', 'твой знак'))}">★</i>` : ''}</button>`).join('')}</div>
      ${pplSigns.length > 1 ? `<div class="row horo-people"><span class="small muted">${esc(t('horo.people', 'Знаки моих людей:'))}</span>${pplSigns.slice(0, 8).map((q) => `<button class="chip" type="button" data-sign="${q.s}"><span class="g">${SG(SIGNS.indexOf(q.s))}</span> ${esc(q.x.name)}</button>`).join('')}</div>` : ''}
      <div class="horo-layout"><section class="card horo-card" id="horoCard"></section><aside class="horo-side" id="horoSide"></aside></div>`;
    const card = el.querySelector('#horoCard'), side = el.querySelector('#horoSide');
    let token = 0;
    const draw = async (magic) => {
      const my = ++token;
      const si = SIGNS.indexOf(st.sign), sign = st.sign;
      const base = UI.todayIn(tz);
      const mode = st.mode;
      let o = base, label = '';
      if (mode === 'today' || mode === 'tomorrow') { o = addDays(base, (mode === 'tomorrow' ? 1 : 0) + st.off); label = UI.fmtDate(o.y, o.mo, o.d, { weekday: 'long' }); }
      else if (mode === 'week') { o = addDays(base, 7 * st.off); const e = addDays(o, 6); label = `${pad(o.d)}.${pad(o.mo)} — ${pad(e.d)}.${pad(e.mo)}.${e.y}`; }
      else if (mode === 'month') { const m0 = new Date(Date.UTC(base.y, base.mo - 1 + st.off, 1)); o = { y: m0.getUTCFullYear(), mo: m0.getUTCMonth() + 1, d: 1 }; label = `${(TX.MONTHS_N || TX.MONTHS)[o.mo - 1]} ${o.y}`; }
      else { o = { y: base.y + st.off, mo: 1, d: 1 }; label = String(o.y); }
      const rel = mode === 'today' && st.off === 0 ? t('horo.today', 'Сегодня') : mode === 'tomorrow' && st.off === 0 ? t('horo.tomorrow', 'Завтра') : '';
      const ruler = AC.RULER[sign];
      card.innerHTML = `<div class="horo-top"><div class="horo-id"><span class="horo-glyph">${SG(si)}</span><div><h2>${esc(TX.S[sign].name)}</h2><p class="small muted">${dates(si)} · ${esc(HT().element[AC.elementOf(si)])} · ${esc(t('horo.ruler', 'управитель {p}', { p: TX.P[ruler].name }))}</p></div></div>
          <div class="seg" role="group" aria-label="${esc(t('horo.period', 'Период'))}">${[['today', t('horo.today', 'Сегодня')], ['tomorrow', t('horo.tomorrow', 'Завтра')], ['week', t('horo.week', 'Неделя')], ['month', t('horo.month', 'Месяц')], ['year', t('horo.year', 'Год')]].map(([k, n]) => `<button type="button" data-mode="${k}" aria-pressed="${mode === k}">${esc(n)}</button>`).join('')}</div></div>
        <div class="horo-nav"><button class="iconbtn bd" type="button" data-off="-1" aria-label="${esc(t('prev', 'Назад'))}">${icon('left')}</button><b>${rel ? esc(rel) + ', ' : ''}${esc(label)}</b><button class="iconbtn bd" type="button" data-off="1" aria-label="${esc(t('next', 'Вперёд'))}">${icon('right')}</button>
          <button class="btn sm horo-share" type="button" data-share>${icon('share', 'sm')} ${esc(t('horo.share', 'Поделиться'))}</button></div>
        <div class="horo-body" id="horoBody" aria-live="polite"><p class="muted">${esc(t('horo.loading', 'Считаю…'))}</p></div>`;
      const body = card.querySelector('#horoBody');
      const work = mode === 'week' ? weekView(si, o, tz) : mode === 'month' ? monthView(si, o.y, o.mo, tz) : mode === 'year' ? yearView(si, o.y, tz) : dayView(si, o, tz);
      const [html] = await Promise.all([work, magic ? conjure(body, si) : null]);
      if (my !== token) return;
      body.innerHTML = html; body.classList.remove('fade-in'); void body.offsetWidth; body.classList.add('fade-in');
      root.NWheel.bindTips(body);
      body.querySelectorAll('[data-goday]').forEach((b) => b.addEventListener('click', () => {
        const i = +b.dataset.goday; const start = mode === 'week' ? addDays(o, i) : { y: o.y, mo: o.mo, d: 1 + i };
        const k = Math.round((Date.UTC(start.y, start.mo - 1, start.d) - Date.UTC(base.y, base.mo - 1, base.d)) / DAY);
        st.mode = 'today'; st.off = k; draw(false); card.scrollIntoView({ block: 'start', behavior: UI.reduceMotion() ? 'auto' : 'smooth' });
      }));
      body.querySelectorAll('[data-gomonth]').forEach((b) => b.addEventListener('click', () => { st.mode = 'month'; st.off = (o.y - base.y) * 12 + (+b.dataset.gomonth) - (base.mo - 1); draw(false); }));
      body.querySelectorAll('.hy-chips [data-ys]').forEach((b) => b.addEventListener('click', () => {
        body.querySelectorAll('.hy-chips [data-ys]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        body.querySelector('.hy-bars').dataset.ys = b.dataset.ys;
      }));
      personal(side, mode === 'today' || mode === 'tomorrow' ? o : base, tz, sign);
    };
    card.addEventListener('click', (e) => {
      const m = e.target.closest('[data-mode]'); if (m) { st.mode = m.dataset.mode; st.off = 0; draw(false); return; }
      const f = e.target.closest('[data-off]'); if (f) { st.off += +f.dataset.off; draw(false); return; }
      if (e.target.closest('[data-share]')) share();
    });
    const pick = (s) => {
      st.sign = s; root.NStore.set('horoSign', s);
      el.querySelectorAll('.hsign').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sign === s)));
      if (location.hash.indexOf('sign=') >= 0) history.replaceState(null, '', '#horoscope');
      draw(true);
      if (window.innerWidth < 980) card.scrollIntoView({ block: 'start', behavior: UI.reduceMotion() ? 'auto' : 'smooth' });
    };
    el.querySelectorAll('[data-sign]').forEach((b) => b.addEventListener('click', () => pick(b.dataset.sign)));
    async function share() {
      const s = st.sign, si = SIGNS.indexOf(s);
      const lead = card.querySelector('.hd-text .lead, .hblock p');
      const pts = card.querySelector('.hd-score .ring-pts b');
      const url = (root.NCONFIG.siteUrl || location.origin + location.pathname.replace(/[^/]*$/, '')) + 'app.html#horoscope?sign=' + s;
      const text = `${W.SIGN_G[si]}${VS} ${TX.S[s].name} · ${card.querySelector('.horo-nav b').textContent}${pts ? ' · ' + pts.textContent.replace('/10', '') + '/10' : ''}\n${lead ? lead.textContent : ''}\n${url}`;
      try { if (navigator.share) { await navigator.share({ title: root.NCONFIG.brand, text }); return; } } catch (e) { return; }
      try { await navigator.clipboard.writeText(text); UI.toast(t('horo.copied', 'Гороскоп скопирован — вставь в сообщение')); } catch (e) { UI.sheet(`<textarea class="input" rows="6" readonly>${esc(text)}</textarea>`, { title: t('horo.share', 'Поделиться') }); }
    }
    draw(!conjured);
  }

  (root.NPages = root.NPages || {}).horoscope = { render: page, open: true };
})(window);
