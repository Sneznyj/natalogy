/* «Пара»: совместимость двух людей простым языком — общий процент, пять сфер, что помогает и что мешает, двойное колесо. */
(function (root) {
  'use strict';
  const UI = root.NUI, AC = root.AstroCore;
  const { t, esc, icon } = UI;
  const SPH = { attraction: ['Притяжение', 'Attraction'], emotion: ['Чувства', 'Feelings'], communication: ['Общение', 'Communication'], stability: ['Надёжность', 'Stability'], growth: ['Рост вместе', 'Growth'] };
  const G = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇', node: '☊', chiron: '⚷', asc: 'AC', mc: 'MC' };
  const AG = { conj: '☌', sextile: '⚹', trine: '△', square: '□', opp: '☍' };
  let pick = { a: null, b: null };

  function ring(v) {
    const r = 62, c = 75, len = 2 * Math.PI * r, off = len * (1 - v / 100);
    return `<svg class="ring" viewBox="0 0 150 150" role="img" aria-label="${v}%"><defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stop-color="var(--rose)"/><stop offset="1" stop-color="var(--lilac)"/></linearGradient></defs><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="12"/><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="url(#rg)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${c} ${c})"/><text x="${c}" y="${c + 2}" text-anchor="middle" dominant-baseline="middle" font-family="var(--f-ui)" font-weight="700" font-size="34" fill="var(--night-ink)">${v}%</text></svg>`;
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
      const ca = UI.chartOf(A), cb = UI.chartOf(B);
      const syn = AC.synastry(ca, cb);
      const L = UI.lang() === 'en' ? 1 : 0;
      const list = syn.aspects.filter((x) => AG[x.type] && G[x.a] && G[x.b]).sort((p, q) => q.strength - p.strength);
      const soft = (x) => x.type === 'trine' || x.type === 'sextile' || (x.type === 'conj' && !['saturn', 'pluto', 'mars'].includes(x.a) && !['saturn', 'pluto', 'mars'].includes(x.b));
      const phrase = (x) => { const k = [x.a, x.b].sort().join('|'); const p = TX.syn && TX.syn[k]; return p ? (soft(x) ? p.s : p.h) : TX.synGeneric(x.a, x.b, soft(x)); };
      const row = (x) => `<div class="item ${soft(x) ? 'plus' : 'minus'}"><span class="gl">${G[x.a]}${AG[x.type]}${G[x.b]}</span><div><h4>${esc(A.name)}: ${esc(TX.P[x.a].name)} ${AG[x.type]} ${esc(B.name)}: ${esc(TX.P[x.b].name)}</h4><p>${esc(UI.TX().gend(phrase(x), A.gender))}</p><div class="why">${esc(TX.ASP[x.type].name)}, ${t('orb', 'орбис')} ${x.orb.toFixed(1)}°</div></div></div>`;
      const plus = list.filter(soft).slice(0, 5), minus = list.filter((x) => !soft(x)).slice(0, 5);
      box.innerHTML = `<section class="night chart-hero">
          <div class="stack" style="justify-items:center;text-align:center">${ring(syn.total)}<b>${esc(A.name)} + ${esc(B.name)}</b><p class="small" style="color:#D6D4EC">${t('pair.note', 'Ориентир, а не приговор: напряжённые аспекты тоже дают притяжение и рост.')}</p></div>
          <div class="sbars">${Object.entries(syn.spheres).map(([k, v]) => `<div class="sbar"><span>${esc(SPH[k][L])}</span><div class="bar"><i style="width:${v}%"></i></div><b class="num">${v}%</b></div>`).join('')}
            <div class="sbar"><span>${t('pair.elem', 'Стихии')}</span><div class="bar"><i style="width:${syn.elemScore}%"></i></div><b class="num">${syn.elemScore}%</b></div></div>
        </section>
        <div class="grid2"><div class="card"><h3>${t('pair.plus', 'Что вас соединяет')}</h3><div class="items">${plus.map(row).join('') || `<p class="muted small">—</p>`}</div></div>
          <div class="card"><h3>${t('pair.minus', 'Где будет искрить')}</h3><div class="items">${minus.map(row).join('') || `<p class="muted small">—</p>`}</div></div></div>
        <div class="wheel-card"><div class="row sb"><h3>${t('pair.wheel', 'Двойная карта')}</h3><span class="tiny muted">${esc(A.name)} — ${t('inside', 'внутри')}, ${esc(B.name)} — ${t('outside', 'снаружи')}</span></div>
          <div class="wheel-box">${root.NChart.wheelOf(ca, { outer: { points: cb.points.filter((p) => G[p.id] && !['asc', 'mc', 'node'].includes(p.id)) }, aspects: syn.aspects.filter((x) => AG[x.type] && G[x.a] && G[x.b] && x.a !== 'asc' && x.a !== 'mc' && x.b !== 'asc' && x.b !== 'mc').slice(0, 24).map((x) => Object.assign({}, x, { fromA: 'in', fromB: 'out' })), labels: { in: A.name, out: B.name } })}</div></div>
        <a class="btn" href="#ask?topic=pair&a=${A.id}&b=${B.id}">${icon('ask')} ${t('pair.ask', 'Спросить ИИ про нас')}</a>`;
      root.NWheel.bindTips(box);
    };
    draw();
  }
  (root.NPages = root.NPages || {}).pair = { render: page };
})(window);
