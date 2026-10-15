/* «Пара»: совместимость двух людей простым языком — общий процент, пять сфер, что помогает и что мешает, двойное колесо.
   14.10 (просьба Алины): у каждого напряжённого аспекта — «как вывести в плюс»; блок «как повысить процент» по самым слабым сферам
   и самым тяжёлым аспектам; все аспекты между картами — таблицей и списком (раньше было видно только по пять). Тексты — NXT.*.pair. */
(function (root) {
  'use strict';
  const UI = root.NUI, AC = root.AstroCore;
  const { t, esc, icon } = UI;
  const SPH = { attraction: ['Притяжение', 'Attraction'], emotion: ['Чувства', 'Feelings'], communication: ['Общение', 'Communication'], stability: ['Надёжность', 'Stability'], growth: ['Рост вместе', 'Growth'] };
  const G = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '⯓', node: '☊', chiron: '⚷', asc: 'AC', mc: 'MC' };
  const AG = { conj: '☌', sextile: '⚹', trine: '△', square: '□', opp: '☍', quincunx: '⚻' };
  const ORDER = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'node', 'chiron', 'asc', 'mc'];
  const XP = () => ((root.NXT && (root.NXT[UI.lang()] || root.NXT.ru)) || {}).pair || {};
  let pick = { a: null, b: null }, filt = 'all';

  function ring(v) {
    const r = 62, c = 75, len = 2 * Math.PI * r, off = len * (1 - v / 100);
    return `<svg class="ring" viewBox="0 0 150 150" role="img" aria-label="${v}%"><defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stop-color="var(--rose)"/><stop offset="1" stop-color="var(--lilac)"/></linearGradient></defs><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="12"/><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="url(#rg)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${c} ${c})"/><text x="${c}" y="${c + 2}" text-anchor="middle" dominant-baseline="middle" font-family="var(--f-ui)" font-weight="700" font-size="34" fill="var(--night-ink)">${v}%</text></svg>`;
  }
  // мягкий аспект: трин, секстиль, соединение без тяжёлых планет
  const soft = (x) => x.type === 'trine' || x.type === 'sextile' || (x.type === 'conj' && !['saturn', 'pluto', 'mars'].includes(x.a) && !['saturn', 'pluto', 'mars'].includes(x.b));
  /** Как вывести напряжённый аспект в плюс: свой текст для пары планет или общий — из «характера» обеих планет. */
  function fixOf(x) {
    const X = XP(); if (!X.plFix) return '';
    const k = [x.a, x.b].sort().join('|');
    return (X.fix && X.fix[k]) || X.generic((X.frame || {})[x.type] || '', X.plFix[x.a] || '', X.plFix[x.b] || '');
  }

  async function page(el) {
    const people = root.NStore.people();
    const TX = UI.TX();
    if (!pick.a || !root.NStore.person(pick.a)) pick.a = (root.NStore.active() || {}).id;
    if (!pick.b || !root.NStore.person(pick.b) || pick.b === pick.a) pick.b = (people.find((x) => x.id !== pick.a) || {}).id;
    const opt = (sel) => people.map((x) => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
    el.innerHTML = `<div class="sec-head"><span class="eyebrow">${t('pair.eyebrow', 'Совместимость')}</span><h1>${t('pair.title', 'Как вам вместе')}</h1></div>
      ${people.length < 2 ? `<div class="empty"><h3>${t('pair.need', 'Добавьте второго человека')}</h3><p class="muted">${t('pair.needP', 'Нужны дата, время и город рождения партнёра, друга или коллеги.')}</p><button class="btn primary" data-add>${icon('plus')} ${t('people.add', 'Добавить человека')}</button></div>` : `
      <div class="card pairpick"><div class="field"><label for="pa">${t('pair.a', 'Первый')}</label><select class="select" id="pa">${opt(pick.a)}</select></div><button class="iconbtn" data-swap aria-label="${t('swap', 'Поменять местами')}">${icon('swap')}</button><div class="field"><label for="pb">${t('pair.b', 'Второй')}</label><select class="select" id="pb">${opt(pick.b)}</select></div></div>
      <div id="pairBox"></div><button class="btn" data-add>${icon('plus')} ${t('people.add', 'Добавить человека')}</button>`}`;
    const add = el.querySelector('[data-add]');
    if (add) add.addEventListener('click', () => root.NApp.editPerson(null, (id) => { pick.b = id; page(el); }));
    if (people.length < 2) return;
    el.querySelector('#pa').addEventListener('change', (e) => { pick.a = e.target.value; draw(); });
    el.querySelector('#pb').addEventListener('change', (e) => { pick.b = e.target.value; draw(); });
    el.querySelector('[data-swap]').addEventListener('click', () => { const x = pick.a; pick.a = pick.b; pick.b = x; page(el); });
    const draw = () => {
      const A = root.NStore.person(pick.a), B = root.NStore.person(pick.b);
      const box = el.querySelector('#pairBox');
      if (!A || !B || A.id === B.id) { box.innerHTML = `<p class="muted">${t('pair.same', 'Выберите двух разных людей')}</p>`; return; }
      const X = XP();
      const ca = UI.chartOf(A), cb = UI.chartOf(B);
      const syn = AC.synastry(ca, cb);
      const L = UI.lang() === 'en' ? 1 : 0;
      const all = syn.aspects.filter((x) => AG[x.type] && G[x.a] && G[x.b]).sort((p, q) => q.strength - p.strength);
      const phrase = (x) => { const k = [x.a, x.b].sort().join('|'); const p = TX.syn && TX.syn[k]; return p ? (soft(x) ? p.s : p.h) : TX.synGeneric(x.a, x.b, soft(x)); };
      const fixBlock = (x) => (soft(x) ? '' : `<div class="pair-fix"><span class="label">${icon('bulb', 'xs')} ${esc(X.fixL || t('pair.fixL', 'Как вывести в плюс'))}</span><p>${esc(fixOf(x))}</p></div>`);
      const row = (x) => `<div class="item ${soft(x) ? 'plus' : 'minus'}"><span class="gl">${G[x.a]}${AG[x.type]}${G[x.b]}</span><div><h4>${esc(A.name)}: ${esc(TX.P[x.a].name)} ${AG[x.type]} ${esc(B.name)}: ${esc(TX.P[x.b].name)}</h4><p>${esc(UI.TX().gend(phrase(x), A.gender))}</p>${fixBlock(x)}<div class="why">${esc(TX.ASP[x.type].name)}, ${t('orb', 'орбис')} ${x.orb.toFixed(1)}°</div></div></div>`;
      const plus = all.filter(soft).slice(0, 5), minus = all.filter((x) => !soft(x)).slice(0, 5);
      // как повысить процент: самые слабые сферы + самые тяжёлые аспекты + стихии
      const weak = Object.entries(syn.spheres).sort((a, b) => a[1] - b[1]).slice(0, 2);
      const hardTop = all.filter((x) => !soft(x)).slice(0, 3);
      const raise = `<div class="card stack pair-raise"><div class="row sb"><h3>${icon('target')} ${esc(t('pair.raiseT', 'Как повысить процент'))}</h3><span class="tag">${syn.total}%</span></div>
        <p class="small muted">${esc(X.note || '')}</p>
        ${weak.map(([k, v]) => `<div class="pr-item"><div class="row sb"><b>${esc(SPH[k][L])}</b><span class="num">${v}%</span></div><div class="bar"><i style="width:${v}%"></i></div><p>${esc((X.raise || {})[k] || '')}</p></div>`).join('')}
        ${hardTop.length ? `<span class="label">${esc(t('pair.raiseAsp', 'Что проработать в первую очередь'))}</span>${hardTop.map((x) => `<div class="pr-item"><b><span class="g">${G[x.a]}${AG[x.type]}${G[x.b]}</span> ${esc(TX.P[x.a].name)} — ${esc(TX.P[x.b].name)}</b><p>${esc(fixOf(x))}</p></div>`).join('')}` : ''}
        ${syn.elemScore < 60 ? `<div class="pr-item"><b>${esc(t('pair.elem', 'Стихии'))} · ${syn.elemScore}%</b><p>${esc(X.elem || '')}</p></div>` : ''}</div>`;
      // все аспекты: сетка «точки первого × точки второго» и список
      const rows = ORDER.filter((id) => ca.byId[id]), cols = ORDER.filter((id) => cb.byId[id]);
      const map = new Map(all.map((x) => [x.a + '>' + x.b, x]));
      const cls = (x) => (x.type === 'conj' ? (soft(x) ? 'conj' : 'hard') : soft(x) ? 'soft' : 'hard');
      const grid = `<div class="tbl-wrap pair-grid"><table class="asp-grid"><tr><th class="corner"><small>${esc(A.name)} ↓ · ${esc(B.name)} →</small></th>${cols.map((c) => `<th title="${esc(TX.P[c].name)}">${G[c]}</th>`).join('')}</tr>${rows.map((r) => `<tr><th title="${esc(TX.P[r].name)}">${G[r]}</th>${cols.map((c) => { const x = map.get(r + '>' + c); return x ? `<td class="${cls(x)}" data-tip="${esc(`${A.name}: ${TX.P[r].name} ${AG[x.type]} ${B.name}: ${TX.P[c].name} · ${TX.ASP[x.type].name}, ${t('orb', 'орбис')} ${x.orb.toFixed(1)}°`)}"><span class="a">${AG[x.type]}</span><span class="o">${Math.round(x.orb)}°</span></td>` : '<td></td>'; }).join('')}</tr>`).join('')}</table></div>`;
      const listOf = (f) => all.filter((x) => (f === 'all' ? true : f === 'plus' ? soft(x) : !soft(x))).sort((a, b) => a.orb - b.orb);
      const allList = (f) => listOf(f).map((x) => `<div class="pa-row ${soft(x) ? 'plus' : 'minus'}"><span class="g">${G[x.a]} ${AG[x.type]} ${G[x.b]}</span><div><b>${esc(TX.P[x.a].name)} (${esc(A.name)}) — ${esc(TX.P[x.b].name)} (${esc(B.name)})</b> <span class="tiny muted">· ${esc(TX.ASP[x.type].name)}, ${x.orb.toFixed(1)}°</span><p class="small">${esc(UI.TX().gend(phrase(x), A.gender))}</p>${soft(x) ? '' : `<p class="small pa-fix">${icon('bulb', 'xs')} ${esc(fixOf(x))}</p>`}</div></div>`).join('') || `<p class="muted small">—</p>`;
      box.innerHTML = `<section class="night chart-hero">
          <div class="stack" style="justify-items:center;text-align:center">${ring(syn.total)}<b>${esc(A.name)} + ${esc(B.name)}</b><p class="small" style="color:#D6D4EC">${t('pair.note', 'Ориентир, а не приговор: напряжённые аспекты тоже дают притяжение и рост.')}</p></div>
          <div class="sbars">${Object.entries(syn.spheres).map(([k, v]) => `<div class="sbar"><span>${esc(SPH[k][L])}</span><div class="bar"><i style="width:${v}%"></i></div><b class="num">${v}%</b></div>`).join('')}
            <div class="sbar"><span>${t('pair.elem', 'Стихии')}</span><div class="bar"><i style="width:${syn.elemScore}%"></i></div><b class="num">${syn.elemScore}%</b></div></div>
        </section>
        <div class="grid2"><div class="card"><h3>${t('pair.plus', 'Что вас соединяет')}</h3><div class="items">${plus.map(row).join('') || `<p class="muted small">—</p>`}</div></div>
          <div class="card"><h3>${t('pair.minus2', 'Где будет искрить — и как вывести в плюс')}</h3><div class="items">${minus.map(row).join('') || `<p class="muted small">—</p>`}</div></div></div>
        ${raise}
        <div class="card stack"><div class="row sb"><h3>${esc(t('pair.allT', 'Все аспекты между вами · {n}', { n: all.length }))}</h3><span class="tiny muted">${esc(t('pair.allHint', 'мажорные аспекты всех планет, узла, Хирона, ASC и MC; наведи на клетку — подробности'))}</span></div>
          ${grid}
          <details class="pa-more"><summary class="small"><b>${esc(t('pair.listT', 'Список всех аспектов с расшифровкой'))}</b></summary><div class="stack" style="margin-top:10px">
          <div class="seg sm" role="group">${[['all', t('pair.fAll', 'Все')], ['plus', t('pair.fPlus', 'Гармоничные')], ['minus', t('pair.fMinus', 'Напряжённые')]].map(([k, n]) => `<button type="button" data-pf="${k}" aria-pressed="${filt === k}">${esc(n)} · ${listOf(k).length}</button>`).join('')}</div>
          <div class="pa-list" data-palist>${allList(filt)}</div></div></details></div>
        <div class="wheel-card"><div class="row sb"><h3>${t('pair.wheel', 'Двойная карта')}</h3><span class="tiny muted">${esc(A.name)} — ${t('inside', 'внутри')}, ${esc(B.name)} — ${t('outside', 'снаружи')}</span></div>
          <div class="wheel-box">${root.NChart.wheelOf(ca, { outer: { points: cb.points.filter((p) => G[p.id] && !['asc', 'mc'].includes(p.id)) }, aspects: all.filter((x) => x.a !== 'mc' && x.b !== 'asc' && x.b !== 'mc').map((x) => Object.assign({}, x, { fromA: 'in', fromB: 'out' })), labels: { in: A.name, out: B.name } })}</div></div>
        <a class="btn" href="#ask?topic=pair&a=${A.id}&b=${B.id}">${icon('ask')} ${t('pair.ask', 'Спросить ИИ про нас')}</a>`;
      box.querySelectorAll('[data-pf]').forEach((b) => b.addEventListener('click', () => { filt = b.dataset.pf; box.querySelectorAll('[data-pf]').forEach((z) => z.setAttribute('aria-pressed', String(z === b))); box.querySelector('[data-palist]').innerHTML = allList(filt); }));
      root.NWheel.bindTips(box);
      root.NWheel.linkAspects(box);
    };
    draw();
  }
  (root.NPages = root.NPages || {}).pair = { render: page };
})(window);
