/* Нумерология → «Матрица судьбы» и «Чакры» (14.10, просьба Алины): схема матрицы со всеми точками и возрастами,
   расшифровка каждой точки, любовь и деньги, кармический хвост, предназначения, прогноз по возрастам, совместимость по матрице;
   карта здоровья (чакры: физика, энергия, эмоции) и семилетние периоды чакр. Расчёт — NMatrix (matrix.js), тексты — NMX (matrix-texts.js). */
(function (root) {
  'use strict';
  const UI = root.NUI, M = root.NMatrix;
  const { t, esc, icon } = UI;
  const X = () => root.NMX[UI.lang()] || root.NMX.ru;
  const arc = (n) => X().arc[n] || X().arc[22];
  const CH_COL = { sahasrara: '#9B6FD6', ajna: '#5B6FD6', vishuddha: '#3FA3D6', anahata: '#4DB07A', manipura: '#E2B23A', svadhisthana: '#E8833A', muladhara: '#D6455A' };
  const ageOf = (x) => { const now = UI.todayIn(UI.here().tz); let a = now.y - x.y; if (now.mo < x.mo || (now.mo === x.mo && now.d < x.d)) a--; const last = new Date(Date.UTC(now.y - (now.mo < x.mo || (now.mo === x.mo && now.d < x.d) ? 1 : 0), x.mo - 1, x.d)); return a + (Date.UTC(now.y, now.mo - 1, now.d) - last) / (365.2422 * 86400000); };
  const fmtAge = (a) => { const r = Math.round(a * 2) / 2; return String(r).replace('.', UI.lang() === 'en' ? '.' : ','); };
  const badge = (n, cls) => `<span class="mx-b ${cls || ''}" data-arc="${n}">${n}</span>`;

  // ---------- схема матрицы ----------
  function svg(m) {
    const p = m.p, S = 560, C = S / 2, R = 230, rr = R / Math.SQRT2;
    const P = {}; // координаты точек
    const put = (k, x, y) => { P[k] = [C + x, C + y]; };
    put('a', -R, 0); put('b', 0, -R); put('c', R, 0); put('d', 0, R); put('e', 0, 0);
    put('f', -rr, -rr); put('g', rr, -rr); put('i', rr, rr); put('h', -rr, rr);
    put('o', -R * 0.74, 0); put('s', -R * 0.52, 0); put('w', -R * 0.29, 0);
    put('pp', 0, -R * 0.74); put('t', 0, -R * 0.52); put('x', 0, -R * 0.29);
    put('q', R * 0.74, 0); put('n', R * 0.52, 0);
    put('r', 0, R * 0.74); put('j', 0, R * 0.52);
    put('l', R * 0.26, R * 0.26); put('m', R * 0.39, R * 0.13); put('k', R * 0.13, R * 0.39);
    for (const [k, sx, sy] of [['f', -1, -1], ['g', 1, -1], ['i', 1, 1], ['h', -1, 1]]) { put(k + '1', sx * rr * 0.74, sy * rr * 0.74); put(k + '2', sx * rr * 0.52, sy * rr * 0.52); }
    const L = (a, b, st) => `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" ${st}/>`;
    let s = `<svg class="mx-svg" viewBox="-20 -20 ${S + 40} ${S + 40}" role="img" aria-label="${esc(t('mx.aria', 'Матрица судьбы'))}">`;
    s += `<polygon points="${['a', 'b', 'c', 'd'].map((k) => P[k].join(',')).join(' ')}" fill="var(--mx-fill)" stroke="var(--mx-line)" stroke-width="1.6"/>`;
    s += `<polygon points="${['f', 'g', 'i', 'h'].map((k) => P[k].join(',')).join(' ')}" fill="none" stroke="var(--mx-line)" stroke-width="1.6"/>`;
    s += L('a', 'c', 'stroke="var(--mx-line2)" stroke-width="1.1"') + L('b', 'd', 'stroke="var(--mx-line2)" stroke-width="1.1"') + L('f', 'i', 'stroke="var(--mx-line2)" stroke-width="1" stroke-dasharray="4 4"') + L('g', 'h', 'stroke="var(--mx-line2)" stroke-width="1" stroke-dasharray="4 4"');
    s += L('j', 'n', 'stroke="var(--mx-love)" stroke-width="2"'); // линия любви и денег
    // возрасты у внешних точек
    const ages = { a: '0 · 80', f: '10', b: '20', g: '30', c: '40', i: '50', d: '60', h: '70' };
    for (const [k, txt] of Object.entries(ages)) { const [x, y] = P[k], dx = x - C, dy = y - C, dl = Math.hypot(dx, dy) || 1; s += `<text x="${(x + dx / dl * 40).toFixed(1)}" y="${(y + dy / dl * 40).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="var(--f-ui)" font-size="13" font-weight="700" fill="var(--muted)">${txt}</text>`; }
    const PT = X().pt;
    const dot = (k, r, cls, nKey) => {
      const n = p[nKey || k], nm = PT[k] ? PT[k][0] : k.toUpperCase();
      return `<g class="mx-pt ${cls}" data-mx="${k}" data-tip="${esc(nm + ': ' + n + ' — ' + arc(n).n)}" tabindex="0" role="button"><circle cx="${P[k][0]}" cy="${P[k][1]}" r="${r}"/><text x="${P[k][0]}" y="${P[k][1] + 0.5}" text-anchor="middle" dominant-baseline="central" font-family="var(--f-ui)" font-weight="800" font-size="${Math.round(r * 0.9)}">${n}</text></g>`;
    };
    for (const k of ['o', 's', 'w', 'pp', 't', 'x', 'q', 'n', 'r', 'j', 'f1', 'f2', 'g1', 'g2', 'h1', 'h2', 'i1', 'i2']) s += dot(k, 14, 'in');
    for (const k of ['l', 'm', 'k']) s += dot(k, 15, 'lm ' + k);
    for (const k of ['f', 'g', 'h', 'i']) s += dot(k, 21, 'anc');
    s += dot('a', 26, 'main a') + dot('b', 26, 'main b') + dot('c', 26, 'main c') + dot('d', 26, 'main d') + dot('e', 30, 'main e');
    // подписи главных точек
    const lab = { a: ['A', -1, 0], b: ['B', 0, -1], c: ['C', 1, 0], d: ['D', 0, 1] };
    for (const [k, [tx]] of Object.entries(lab)) s += `<text x="${P[k][0] + (k === 'a' ? -2 : k === 'c' ? 2 : 34)}" y="${P[k][1] + (k === 'b' ? -34 : k === 'd' ? 34 : -32)}" text-anchor="middle" font-family="var(--f-ui)" font-size="12" font-weight="800" fill="var(--lav-ink)">${tx}</text>`;
    s += `<text x="${P.l[0] - 30}" y="${P.l[1] - 18}" text-anchor="middle" font-family="var(--f-ui)" font-size="11.5" font-weight="700" fill="var(--mx-love)">♥ $</text>`;
    return s + '</svg>';
  }

  function arcBlock(n, title, sub, mode) {
    const a = arc(n);
    const extra = mode === 'love' ? a.love : mode === 'money' ? a.money : mode === 'year' ? a.year : mode === 'tail' ? (UI.lang() === 'en' ? 'Lesson: ' : 'Урок: ') + a.tail : '';
    return `<div class="mx-card"><div class="mx-h">${badge(n)}<div><b>${esc(title)}</b><small>${esc(sub || '')}</small></div></div><p class="mx-an"><b>${n}. ${esc(a.n)}</b> · ${esc(a.k)}</p>
      ${extra ? `<p>${esc(extra)}</p>` : ''}<p class="small"><span class="okc">+</span> ${esc(a.p)}</p><p class="small"><span class="noc">−</span> ${esc(a.m)}</p>${mode ? '' : `<p class="small muted">${esc(a.adv)}</p>`}</div>`;
  }
  function openPoint(m, k) {
    const PT = X().pt, n = m.p[k], a = arc(n);
    const pt = PT[k] || [k.toUpperCase(), '', ''];
    UI.popup(`<div class="stack"><div class="mx-h">${badge(n, 'lg')}<div><b style="font:600 calc(22px*var(--fz))/1.1 var(--f-display)">${n}. ${esc(a.n)}</b><small>${esc(a.k)}</small></div></div>
      ${pt[2] ? `<p class="small muted">${esc(pt[2])}</p>` : ''}<p><span class="okc">+</span> ${esc(a.p)}</p><p><span class="noc">−</span> ${esc(a.m)}</p>
      <p class="small"><b>${esc(t('mx.love', 'Любовь'))}.</b> ${esc(a.love)}</p><p class="small"><b>${esc(t('mx.money', 'Деньги'))}.</b> ${esc(a.money)}</p><p class="small"><b>${esc(t('num.adv', 'Совет'))}.</b> ${esc(a.adv)}</p></div>`, { title: pt[0], eyebrow: t('mx.title', 'Матрица судьбы') });
  }

  function matrixView(x) {
    const m = M.calc(x.y, x.mo, x.d), T = X(), age = ageOf(x);
    const pos = M.ageAt(m, age), list = pos.list;
    const near = list.slice(pos.idx, pos.idx + 7);
    const pur = m.purpose, PU = T.pur;
    return `<div class="mx-top"><div class="card mx-dia">${svg(m)}<p class="tiny muted">${esc(t('mx.hint', 'Нажми на число — расшифровка. Снаружи — возраст: по кругу матрицы идёт прогноз по годам.'))}</p></div>
      <div class="stack s10">${arcBlock(m.p.a, T.pt.a[0], T.pt.a[2])}${arcBlock(m.p.e, T.pt.e[0], T.pt.e[2])}</div></div>
      <div class="mx-grid">${arcBlock(m.p.b, T.pt.b[0], T.pt.b[2])}${arcBlock(m.p.c, T.pt.c[0], T.pt.c[2])}${arcBlock(m.p.d, T.pt.d[0], T.pt.d[2])}</div>
      <div class="card stack"><h3>${icon('love')} ${esc(t('mx.lm', 'Любовь и деньги'))}</h3><div class="mx-grid">${arcBlock(m.p.k, T.pt.k[0], T.pt.k[2], 'love')}${arcBlock(m.p.m, T.pt.m[0], T.pt.m[2], 'money')}${arcBlock(m.p.l, T.pt.l[0], T.pt.l[2])}</div></div>
      <div class="card stack"><h3>${esc(T.tailT)} · ${m.tail.join('-')}</h3><p class="small muted">${esc(T.tailP)}</p><div class="mx-grid">${m.tail.map((n, i) => arcBlock(n, ['D', 'R', 'J'][i] + ' · ' + T.tailPos[i], '', 'tail')).join('')}</div></div>
      <div class="card stack"><h3>${icon('target')} ${esc(t('mx.purT', 'Предназначение'))}</h3>
        <div class="mx-pur">${[['personal', `${PU.sky[0]} ${pur.sky} + ${PU.earth[0]} ${pur.earth}`], ['social', `${PU.male[0]} ${pur.male} + ${PU.female[0]} ${pur.female}`], ['spiritual', ''], ['planetary', '']].map(([k, calc]) => { const n = pur[k], a = arc(n); return `<div class="mx-pu">${badge(n)}<div><b>${esc(PU[k][0])}</b> <span class="tiny muted">${esc(PU[k][1])}${calc ? ' · ' + esc(calc) : ''}</span><p class="small">${esc(PU[k][2])}</p><p><b>${n}. ${esc(a.n)}:</b> ${esc(a.p)}</p></div></div>`; }).join('')}</div></div>
      <div class="card stack"><h3>${icon('timeline')} ${esc(T.yearsT)}</h3><p class="small muted">${esc(T.yearsP)}</p>
        <div class="mx-years">${near.map((r, i) => { const nx = list[pos.idx + i + 1]; return `<div class="mx-yr${i === 0 ? ' now' : ''}">${badge(r.n)}<span class="mono">${fmtAge(r.age)}–${fmtAge(nx ? nx.age : r.age + 1.25)} ${esc(t('mx.yrs', 'лет'))}</span><span><b>${esc(arc(r.n).n)}.</b> ${esc(arc(r.n).year)}</span></div>`; }).join('')}</div>
        <details><summary class="small"><b>${esc(t('mx.allYears', 'Все возрасты 0–80'))}</b></summary><div class="mx-years all">${list.map((r, i) => `<div class="mx-yr${i === pos.idx ? ' now' : ''}">${badge(r.n)}<span class="mono">${fmtAge(r.age)}</span><span>${esc(arc(r.n).n)} — ${esc(arc(r.n).k)}</span></div>`).join('')}</div></details></div>
      <details class="card"><summary><b>${esc(t('mx.rod', 'Родовые программы'))}</b></summary><div class="mx-grid" style="margin-top:10px">${['f', 'i', 'g', 'h'].map((k) => arcBlock(m.p[k], T.pt[k][0], T.pt[k][2])).join('')}</div></details>`;
  }

  function chakraView(x) {
    const m = M.calc(x.y, x.mo, x.d), T = X(), age = ageOf(x);
    const rows = m.chakra.rows, per = M.chakraPeriods(age), cur = per.find((p) => p.current) || per[0];
    const cell = (n, col) => `<td><button type="button" class="mx-b" data-arc="${n}" data-tip="${esc(T.cols[col] + ': ' + n + ' — ' + arc(n).n + ' (' + arc(n).k + ')')}">${n}</button></td>`;
    return `<div class="card stack"><h3>${esc(T.chakT)}</h3><p class="small muted">${esc(T.chakP)}</p>
      <div class="tbl-wrap"><table class="ch-tbl"><thead><tr><th></th>${T.cols.map((c) => `<th>${esc(c)}</th>`).join('')}<th></th></tr></thead><tbody>
        ${rows.map((r) => { const c = T.chak[r.id]; return `<tr data-ch="${r.id}" style="--chc:${CH_COL[r.id]}"><th><span class="ch-dot"></span><b>${esc(c.n)}</b><small>${esc(c.w)} · ${esc(c.theme)}</small></th>${cell(r.phys, 0)}${cell(r.energy, 1)}${cell(r.emo, 2)}<td><button class="iconbtn sm" type="button" data-chopen="${r.id}" aria-label="${esc(c.n)}">${icon('info', 'sm')}</button></td></tr>`; }).join('')}
        <tr class="tot"><th><b>${esc(T.total)}</b></th>${cell(m.chakra.total.phys, 0)}${cell(m.chakra.total.energy, 1)}${cell(m.chakra.total.emo, 2)}<td></td></tr></tbody></table></div>
      <p class="tiny muted">${esc(t('ch.tap', 'Нажми на строку чакры — что она значит и как её поддержать; на число — смысл аркана.'))}</p></div>
      <div class="card stack"><h3>${esc(T.perT)}</h3><p class="small muted">${esc(T.perP)}</p>
        <div class="ch-line">${per.map((p) => `<div class="ch-seg${p.current ? ' now' : ''}" style="--chc:${CH_COL[p.id]}" data-tip="${esc(p.from + '–' + p.to + ' · ' + T.chak[p.id].n)}"><b>${p.from}</b><i></i><small>${esc(T.chak[p.id].n)}</small></div>`).join('')}</div>
        <div class="ch-now" style="--chc:${CH_COL[cur.id]}"><span class="label">${esc(t('ch.now', 'Сейчас: {a}–{b} лет · {c}', { a: cur.from, b: cur.to, c: T.chak[cur.id].n }))}${cur.cycle > 1 ? ' · ' + esc(t('ch.cycle', 'круг {n}', { n: cur.cycle })) : ''}</span><p>${esc(T.chak[cur.id].period)}</p>
          <p class="small">${esc(t('ch.nowMx', 'Твоя {c} по матрице: физика {a}, энергия {b}, эмоции {e}.', { c: T.chak[cur.id].n, a: rows.find((r) => r.id === cur.id).phys + ' (' + arc(rows.find((r) => r.id === cur.id).phys).n + ')', b: rows.find((r) => r.id === cur.id).energy + ' (' + arc(rows.find((r) => r.id === cur.id).energy).n + ')', e: rows.find((r) => r.id === cur.id).emo + ' (' + arc(rows.find((r) => r.id === cur.id).emo).n + ')' }))}</p>
          <p class="small"><b>${esc(t('ch.help', 'Что поддержит'))}:</b> ${esc(T.chak[cur.id].help)}</p></div></div>`;
  }
  function openChakra(x, id) {
    const m = M.calc(x.y, x.mo, x.d), T = X(), c = T.chak[id], r = m.chakra.rows.find((z) => z.id === id);
    const line = (lab, n) => `<div class="mx-h">${badge(n)}<div><b>${esc(lab)}: ${n}. ${esc(arc(n).n)}</b><small>${esc(arc(n).k)}</small></div></div><p class="small">${esc(arc(n).p)}</p>`;
    UI.popup(`<div class="stack"><p class="lead">${esc(c.theme)}</p>
      <p class="small"><b>${esc(t('ch.body', 'Тело'))}:</b> ${esc(c.body)}</p>
      <p class="small"><span class="okc">${esc(t('ch.ok', 'В балансе'))}:</span> ${esc(c.ok)}</p><p class="small"><span class="noc">${esc(t('ch.bad', 'Если перекос'))}:</span> ${esc(c.bad)}</p>
      <p class="small"><b>${esc(t('ch.help', 'Что поддержит'))}:</b> ${esc(c.help)}</p>
      ${line(T.cols[0], r.phys)}${line(T.cols[1], r.energy)}${line(T.cols[2], r.emo)}
      <p class="tiny muted">${esc(t('ch.note', 'Ориентир для самочувствия, не медицинский диагноз.'))}</p></div>`, { title: c.n + ' · ' + c.w, eyebrow: T.chakT });
  }
  /** Совместимость по матрице — для вкладки «Совместимость». */
  function pairMatrix(x, other) {
    const m1 = M.calc(x.y, x.mo, x.d), m2 = M.calc(other.y, other.mo, other.d), cp = M.compat(m1, m2), T = X();
    const PP = T.pairPt;
    return `<div class="card stack"><h3>${esc(T.pairT)}</h3><p class="small muted">${esc(T.pairP)}</p>
      <div class="mx-grid">${arcBlock(cp.p.e, PP.e, '')}${arcBlock(cp.p.d, PP.d, '')}${arcBlock(cp.p.k, PP.k, '', 'love')}${arcBlock(cp.p.m, PP.m, '', 'money')}${arcBlock(cp.purpose.personal, PP.personal, '')}${arcBlock(cp.p.d, PP.tail + ' · ' + cp.tail.join('-'), '', 'tail')}</div></div>`;
  }
  function bind(body, x) {
    body.querySelectorAll('[data-mx]').forEach((g) => { const go = () => openPoint(M.calc(x.y, x.mo, x.d), g.dataset.mx); g.addEventListener('click', go); g.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }); });
    body.querySelectorAll('[data-chopen]').forEach((b) => b.addEventListener('click', () => openChakra(x, b.dataset.chopen)));
    body.querySelectorAll('tr[data-ch] th').forEach((th) => th.addEventListener('click', () => openChakra(x, th.parentElement.dataset.ch)));
    body.querySelectorAll('button[data-arc]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); const n = +b.dataset.arc, a = arc(n); UI.popup(`<div class="stack"><p class="lead">${esc(a.k)}</p><p><span class="okc">+</span> ${esc(a.p)}</p><p><span class="noc">−</span> ${esc(a.m)}</p><p class="small muted">${esc(a.adv)}</p></div>`, { title: n + '. ' + a.n, eyebrow: t('mx.arc', 'Аркан') }); }));
  }
  root.NNumX = { matrixView, chakraView, pairMatrix, bind, ageOf };
})(window);
