/* Цепочки диспозиторов — как в Sotis Online (алгоритм отображения А. Голоушкина): свободная схема, значки планет и серые стрелки
   «планета → её диспозитор»; пунктирный кружок — планета в своём знаке (конечный диспозитор). Переключатели как там:
   набор планет (10 / септенер / 10 + узел и Хирон), достоинство (обитель, изгнание, экзальтация, падение), знаки или дома.
   В режиме «Дома» узлы — дома I–XII: стрелка ведёт от дома к дому, где стоит управитель его куспида.
   Под схемой — расшифровка: главные планеты и дома, петли, каждая цепочка простыми словами. Тексты — NXT (texts-extra.js). */
(function (root) {
  'use strict';
  const UI = root.NUI, AC = root.AstroCore;
  const { t, esc } = UI;
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const TEN = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const SEVEN = TEN.slice(0, 7);
  const EXALT_BY_SIGN = { aries: 'sun', taurus: 'moon', cancer: 'jupiter', virgo: 'mercury', libra: 'saturn', capricorn: 'mars', pisces: 'venus' };
  const st = { set: '10', dig: 'dom', mode: 'signs' };
  const XT = () => (root.NXT && (root.NXT[UI.lang()] || root.NXT.ru)) || {};
  const opp = (sign) => AC.SIGNS[(AC.SIGNS.indexOf(sign) + 6) % 12];
  const isH = (id) => /^h\d+$/.test(id);

  /** Кто «распоряжается» знаком при выбранном достоинстве: обитель — управитель, изгнание — управитель противоположного знака,
   *  экзальтация — планета, экзальтированная в знаке, падение — экзальтированная в противоположном. */
  function lordOf(sign, dig, trad) {
    const R = trad ? AC.TRAD_RULER : AC.RULER;
    if (dig === 'dom') return R[sign];
    if (dig === 'exile') return R[opp(sign)];
    if (dig === 'exalt') return EXALT_BY_SIGN[sign] || null;
    if (dig === 'fall') return EXALT_BY_SIGN[opp(sign)] || null;
    return null;
  }

  /** Граф: узлы и стрелки (у каждого узла не больше одной исходящей). */
  function model(c, o) {
    const trad = o.set === '7';
    const pl = (o.set === '7' ? SEVEN : TEN).filter((id) => c.byId[id]);
    const extra = o.set === '12' ? ['node', 'chiron'].filter((id) => c.byId[id]) : [];
    const houseOf = (id) => (c.byId[id] ? c.byId[id].house : null);
    let nodes, next;
    if (o.mode === 'houses' && c.houses) {
      nodes = ROMAN.map((_, i) => 'h' + (i + 1));
      next = (h) => { const sign = AC.signOf(c.houses.cusps[+h.slice(1) - 1]); const lord = lordOf(sign, o.dig, trad); const hh = lord && houseOf(lord); return hh ? 'h' + hh : null; };
    } else {
      nodes = pl.concat(extra);
      next = (id) => { const lord = lordOf(c.byId[id].sign, o.dig, trad); return lord && pl.includes(lord) ? lord : null; };
    }
    const edges = nodes.map((id) => [id, next(id)]).filter(([, b]) => b);
    // петли: идём по стрелкам, пока не встретим пройденный узел
    const cyc = new Map(), cycles = [];
    for (const id of nodes) {
      const path = []; let cur = id;
      while (cur && !path.includes(cur) && !cyc.has(cur)) { path.push(cur); cur = next(cur); }
      if (cur && path.includes(cur)) { const loop = path.slice(path.indexOf(cur)); const k = cycles.length; cycles.push(loop); loop.forEach((x) => cyc.set(x, k)); }
    }
    // сколько узлов стекается к каждому (по всей цепочке)
    const under = Object.fromEntries(nodes.map((id) => [id, 0]));
    for (const id of nodes) { const seen = new Set([id]); let cur = next(id); while (cur && !seen.has(cur)) { under[cur]++; seen.add(cur); cur = next(cur); } }
    // цепочка от узла до конечного диспозитора или до замыкания петли (петля показывается возвратом к первому её узлу)
    const chainOf = (start) => { const out = [start]; let cur = next(start); while (cur && !out.includes(cur) && out.length < 14) { out.push(cur); cur = next(cur); } if (cur && out.includes(cur) && next(cur) !== cur) out.push(cur); return out; };
    return { nodes, edges, next, cycles, cyc, under, chainOf, trad, houseOf };
  }

  /** Свободная раскладка: пружины по стрелкам, отталкивание узлов (Фрюхтерман — Рейнгольд), детерминированно. Компоненты — рядом. */
  function layout(m) {
    const adj = Object.fromEntries(m.nodes.map((id) => [id, new Set()]));
    for (const [a, b] of m.edges) if (a !== b) { adj[a].add(b); adj[b].add(a); }
    const comp = [], seen = new Set();
    for (const id of m.nodes) {
      if (seen.has(id)) continue;
      const list = [], q = [id]; seen.add(id);
      while (q.length) { const x = q.shift(); list.push(x); for (const y of adj[x]) if (!seen.has(y)) { seen.add(y); q.push(y); } }
      comp.push(list);
    }
    comp.sort((a, b) => b.length - a.length);
    const K = 64, pos = {};
    const boxes = comp.map((list) => {
      const n = list.length, P = {};
      list.forEach((id, i) => { const a = (i / n) * Math.PI * 2 + 0.3; P[id] = { x: Math.cos(a) * K * Math.sqrt(n) * 0.6, y: Math.sin(a) * K * Math.sqrt(n) * 0.6 }; });
      if (n > 1) {
        let temp = K * 1.2;
        for (let it = 0; it < 360; it++) {
          const D = Object.fromEntries(list.map((id) => [id, { x: 0, y: 0 }]));
          for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            const a = list[i], b = list[j]; let dx = P[a].x - P[b].x, dy = P[a].y - P[b].y; let d = Math.hypot(dx, dy) || 0.01;
            const f = (K * K) / d; dx /= d; dy /= d; D[a].x += dx * f; D[a].y += dy * f; D[b].x -= dx * f; D[b].y -= dy * f;
          }
          for (const [a, b] of m.edges) {
            if (a === b || !P[a] || !P[b]) continue;
            let dx = P[a].x - P[b].x, dy = P[a].y - P[b].y; const d = Math.hypot(dx, dy) || 0.01; const f = (d * d) / K; dx /= d; dy /= d;
            D[a].x -= dx * f; D[a].y -= dy * f; D[b].x += dx * f; D[b].y += dy * f;
          }
          for (const id of list) { const d = Math.hypot(D[id].x, D[id].y) || 0.01; const s = Math.min(d, temp) / d; P[id].x += D[id].x * s; P[id].y += D[id].y * s; }
          temp = Math.max(1.5, temp * 0.985);
        }
      }
      // конечный диспозитор (или петля) — сверху: поворачиваем компоненту так, чтобы её «центр тяжести» стрелок смотрел вверх
      const sink = list.find((id) => m.cyc.has(id));
      if (sink && n > 2) {
        const cx = list.reduce((a, id) => a + P[id].x, 0) / n, cy = list.reduce((a, id) => a + P[id].y, 0) / n;
        const ang = Math.atan2(P[sink].y - cy, P[sink].x - cx), rot = -Math.PI / 2 - ang;
        const co = Math.cos(rot), si = Math.sin(rot);
        for (const id of list) { const x = P[id].x - cx, y = P[id].y - cy; P[id] = { x: x * co - y * si, y: x * si + y * co }; }
      }
      const xs = list.map((id) => P[id].x), ys = list.map((id) => P[id].y);
      const b = { list, P, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
      return b;
    });
    // компоненты слева направо, при широком ряде — перенос
    const PAD = 46, GAP = 56, MAXW = 900;
    let x = PAD, y = PAD, rowH = 0, W = 0;
    for (const b of boxes) {
      const w = b.x1 - b.x0, h = b.y1 - b.y0;
      if (x > PAD && x + w > MAXW) { x = PAD; y += rowH + GAP; rowH = 0; }
      for (const id of b.list) pos[id] = { x: x + (b.P[id].x - b.x0), y: y + (b.P[id].y - b.y0) };
      x += w + GAP; rowH = Math.max(rowH, h); W = Math.max(W, x - GAP + PAD);
    }
    return { pos, W: Math.max(W, 260), H: y + rowH + PAD };
  }

  function svg(m, c, label) {
    const TX = UI.TX(), G = root.NWheel.GLYPH;
    const { pos, W, H } = layout(m);
    const R = 17, mk = 'dsa' + Math.random().toString(36).slice(2, 7);
    const name = (id) => (isH(id) ? t('house.n', '{n} дом', { n: id.slice(1) }) : TX.P[id].name);
    let s = `<svg class="disp-svg sotis" viewBox="0 0 ${Math.round(W)} ${Math.round(H)}" width="${Math.round(W)}" height="${Math.round(H)}" role="img" aria-label="${esc(label)}"><defs><marker id="${mk}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 1L9 5L0 9" fill="none" stroke="var(--disp-arrow)" stroke-width="1.4"/></marker><marker id="${mk}r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 1L9 5L0 9" fill="none" stroke="var(--rose)" stroke-width="1.6"/></marker></defs>`;
    const pair = new Set(m.edges.map(([a, b]) => a + '>' + b));
    for (const [a, b] of m.edges) {
      if (a === b) continue;
      const A = pos[a], B = pos[b]; let dx = B.x - A.x, dy = B.y - A.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const loop = m.cyc.has(a) && m.cyc.has(b) && m.cyc.get(a) === m.cyc.get(b);
      // взаимная рецепция: две стрелки навстречу — разводим дугами
      const both = pair.has(b + '>' + a), bend = both ? 14 : 0;
      const x0 = A.x + dx * (R + 2), y0 = A.y + dy * (R + 2), x1 = B.x - dx * (R + 4), y1 = B.y - dy * (R + 4);
      const mx = (x0 + x1) / 2 - dy * bend, my = (y0 + y1) / 2 + dx * bend;
      s += `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${loop ? 'var(--rose)' : 'var(--disp-arrow)'}" stroke-width="${loop ? 1.6 : 1.2}" marker-end="url(#${mk}${loop ? 'r' : ''})"/>`;
    }
    for (const id of m.nodes) {
      const p = pos[id], self = m.next(id) === id;
      const nx = m.next(id);
      let tip;
      if (isH(id)) {
        const sign = AC.signOf(c.houses.cusps[+id.slice(1) - 1]), lord = lordOf(sign, st.dig, m.trad);
        tip = `${name(id)} · ${TX.S[sign].name}${lord ? ' · ' + t('disp.ruler', 'управитель {p}', { p: TX.P[lord].name }) : ''}${nx ? ' → ' + (self ? t('disp.inOwn', 'в своём же доме') : name(nx)) : ''}`;
      } else {
        const b = c.byId[id];
        tip = `${TX.P[id].name} ${TX.S[b.sign].in}${b.house ? ' · ' + t('house.n', '{n} дом', { n: b.house }) : ''}${self ? ' · ' + t('t.selfT', 'в своём знаке — конечный диспозитор') : nx ? ' → ' + TX.P[nx].name : ''}`;
      }
      s += `<g class="dn${self ? ' self' : ''}${m.cyc.has(id) && !self ? ' loop' : ''}" data-tip="${esc(tip)}" data-dn="${id}" tabindex="0"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${R}" fill="var(--surface)" stroke="${self ? 'var(--gold-2)' : 'transparent'}" stroke-width="${self ? 1.6 : 0}" ${self ? 'stroke-dasharray="3 3"' : ''}/>`;
      if (isH(id)) {
        const lord = lordOf(AC.signOf(c.houses.cusps[+id.slice(1) - 1]), st.dig, m.trad);
        s += `<text x="${p.x.toFixed(1)}" y="${(p.y + 0.5).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="15" fill="var(--ink)">${ROMAN[+id.slice(1) - 1]}</text>`;
        if (lord) s += `<text x="${(p.x + R - 1).toFixed(1)}" y="${(p.y + R - 1).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="var(--f-glyph)" font-size="11.5" fill="var(--muted)" stroke="var(--surface)" stroke-width="3" paint-order="stroke">${G[lord]}︎</text>`;
      } else s += `<text x="${p.x.toFixed(1)}" y="${(p.y + 1).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="var(--f-glyph)" font-size="23" fill="var(--ink)">${G[id]}︎</text>`;
      s += '</g>';
    }
    return s + '</svg>';
  }

  // ---------- расшифровка ----------
  function reading(m, c) {
    const TX = UI.TX(), X = XT(), G = root.NWheel.GLYPH;
    const D = X.disp || {};
    const pn = (id) => TX.P[id].name;
    const hx = (n) => (TX.H[n] ? TX.H[n].area : '');
    const out = [];
    const self = m.cycles.filter((l) => l.length === 1).map((l) => l[0]);
    const loops = m.cycles.filter((l) => l.length > 1);
    const sorted = m.nodes.slice().sort((a, b) => m.under[b] - m.under[a]);
    if (m.mode === 'houses') {
      // главные дома: управитель в своём доме или петли домов
      const hn = (id) => +id.slice(1);
      if (self.length) out.push(`<div class="disp-key gold"><b>${esc(self.length === 1 ? t('disp.hFinal1', 'Главный дом карты — {h}', { h: ROMAN[hn(self[0]) - 1] }) : t('disp.hFinalN', 'Главные дома карты: {h}', { h: self.map((x) => ROMAN[hn(x) - 1]).join(', ') }))}</b>${self.map((x) => `<p>${esc((D.hCenter || {})[hn(x)] || '')} ${esc(t('disp.hFlow', 'Сюда сходятся цепочки {n} домов.', { n: m.under[x] }))}</p>`).join('')}</div>`);
      for (const l of loops) out.push(`<div class="disp-key rose"><b>${esc(t('disp.hLoop', 'Петля домов: {l}', { l: l.map((x) => ROMAN[hn(x) - 1]).join(' → ') + ' → ' + ROMAN[hn(l[0]) - 1] }))}</b><p>${esc(D.hLoop ? D.hLoop(l.map((x) => (D.hTopic || {})[hn(x)] || hx(hn(x)))) : '')}</p></div>`);
      const rows = m.nodes.map((h) => {
        const n = hn(h), sign = AC.signOf(c.houses.cusps[n - 1]), lord = lordOf(sign, st.dig, m.trad), to = m.next(h);
        if (!lord) return `<div class="disp-li"><span class="dl-g">${ROMAN[n - 1]}</span><p><b>${esc((D.hTopic || {})[n] || hx(n))}</b> · ${esc(t('disp.noLord', 'в этом знаке нет планеты с выбранным достоинством'))}</p></div>`;
        const m2 = to ? hn(to) : null;
        const txt = m2 === n ? (D.hSame ? D.hSame((D.hTopic || {})[n] || hx(n)) : '') : m2 ? (D.hVia ? D.hVia((D.hTopic || {})[n] || hx(n), (D.hThrough || {})[m2] || hx(m2)) : '') : '';
        return `<div class="disp-li"><span class="dl-g">${ROMAN[n - 1]}<i>${G[lord]}︎</i></span><p><b>${esc(t('disp.hLine', 'Управитель {a} дома — {p} — в {b} доме', { a: n, p: pn(lord), b: m2 || '—' }))}.</b> ${esc(txt)}</p></div>`;
      });
      out.push(`<div class="stack s6"><span class="label">${esc(t('disp.hEach', 'Каждый дом: где его управитель'))}</span>${rows.join('')}</div>`);
      return out.join('');
    }
    // планеты
    if (st.dig === 'dom') {
      if (self.length === 1 && !loops.length) {
        const f = self[0], h = m.houseOf(f);
        out.push(`<div class="disp-key gold"><b>${esc(t('t.final', 'Конечный диспозитор: {p} — главная планета карты', { p: pn(f) }))}</b><p>${esc((D.final || {})[f] || '')}</p>${h ? `<p class="small">${esc(t('disp.finalHouse', '{p} в {h} доме: сила карты собирается в теме «{a}».', { p: pn(f), h, a: hx(h) }))}</p>` : ''}</div>`);
      } else if (self.length) {
        out.push(`<div class="disp-key gold"><b>${esc(t('disp.severalFinal', 'Несколько центров — {l}', { l: self.map(pn).join(', ') }))}</b><p>${esc(D.several || '')}</p>${self.map((f) => `<p class="small"><b>${G[f]}︎ ${esc(pn(f))}.</b> ${esc((D.finalShort || {})[f] || '')}${m.houseOf(f) ? ' ' + esc(t('disp.inH', '({h} дом: {a})', { h: m.houseOf(f), a: hx(m.houseOf(f)) })) : ''}</p>`).join('')}</div>`);
      } else if (!loops.length) out.push(`<div class="disp-key"><b>${esc(t('t.noFinal', 'Единого конечного диспозитора нет'))}</b></div>`);
      for (const l of loops) out.push(`<div class="disp-key rose"><b>${esc(l.length === 2 ? t('disp.mutual', 'Взаимная рецепция: {a} ↔ {b}', { a: pn(l[0]), b: pn(l[1]) }) : t('disp.loopN', 'Петля: {l}', { l: l.map(pn).join(' → ') + ' → ' + pn(l[0]) }))}</b><p>${esc(D.loop ? D.loop(l.map((x) => TX.P[x].area)) : '')}</p><p class="small muted">${esc(l.map((x) => m.houseOf(x) ? t('disp.plH', '{p} — {h} дом ({a})', { p: pn(x), h: m.houseOf(x), a: hx(m.houseOf(x)) }) : pn(x)).join(' · '))}</p></div>`);
      if (!self.length && !loops.length) out.push(`<p class="small">${esc(D.none || '')}</p>`);
      const lead = sorted.filter((id) => m.under[id] >= 2).slice(0, 2);
      if (lead.length) out.push(`<div class="disp-key"><b>${esc(t('disp.lead', 'На ком держится карта'))}</b>${lead.map((id) => `<p class="small"><b>${G[id]}︎ ${esc(pn(id))}</b> — ${esc(t('disp.leadN2', 'опора для {n} планет', { n: m.under[id] }))}. ${esc((D.lead || {})[id] || '')}</p>`).join('')}</div>`);
    } else {
      out.push(`<div class="disp-key"><b>${esc((D.digTitle || {})[st.dig] || '')}</b><p>${esc((D.digHint || {})[st.dig] || '')}</p></div>`);
    }
    const lines = m.nodes.map((id) => {
      const ch = m.chainOf(id), to = m.next(id), b = c.byId[id];
      const glyphs = ch.map((x) => `<span class="g" title="${esc(pn(x))}">${G[x]}︎</span>`).join('<span class="da">→</span>');
      let txt = '';
      if (to === id) txt = D.ownSign ? D.ownSign(TX.P[id].area) : '';
      else if (to) { const h2 = m.houseOf(to); txt = st.dig === 'dom' ? (D.through ? D.through(TX.P[id].area, pn(to), TX.P[to].area, h2 ? hx(h2) : '') : '') : (D.digLine && D.digLine[st.dig] ? D.digLine[st.dig](pn(id), pn(to)) : ''); }
      else txt = st.dig === 'dom' ? '' : t('disp.noLord2', 'в этом знаке нет такой планеты — стрелки нет');
      return `<div class="disp-li"><span class="dl-g">${glyphs}</span><p><b>${esc(pn(id))} ${esc(TX.S[b.sign].in)}${b.house ? ', ' + esc(t('house.n', '{n} дом', { n: b.house })) : ''}.</b> ${esc(txt)}</p></div>`;
    });
    out.push(`<details class="disp-more"><summary class="small"><b>${esc(t('disp.each', 'Каждая планета: кому подчиняется'))}</b></summary><div class="stack s6" style="margin-top:8px">${lines.join('')}</div></details>`);
    return out.join('');
  }

  function card(c) {
    if (!c.houses && st.mode === 'houses') st.mode = 'signs';
    const m = model(c, st); m.mode = st.mode;
    const sel = (k, list) => `<select class="select sm" data-dsel="${k}">${list.map(([v, n]) => `<option value="${v}" ${st[k] === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
    return `<div class="card stack disp-card">
      <div class="row sb"><h3>${t('t.disp', 'Цепочки диспозиторов')}</h3><span class="tiny muted">${esc(t('disp.algo', 'схема как в Sotis (алгоритм А. Голоушкина)'))}</span></div>
      <div class="row disp-sels">${sel('set', [['10', t('disp.s10', '10 планет')], ['7', t('disp.s7', 'Септенер (7)')], ['12', t('disp.s12', '10 + узел и Хирон')]])}${sel('dig', [['dom', t('disp.dom', 'Обитель')], ['exile', t('disp.exile', 'Изгнание')], ['exalt', t('disp.exalt', 'Экзальтация')], ['fall', t('disp.fall', 'Падение')]])}${c.houses ? sel('mode', [['signs', t('disp.signs', 'Знаки')], ['houses', t('disp.houses', 'Дома')]]) : ''}</div>
      <p class="tiny muted">${esc(st.mode === 'houses' ? t('disp.hintH', 'Стрелка ведёт от дома к дому, где стоит управитель его куспида. Пунктирный кружок — управитель в своём же доме: туда сходятся цепочки. Розовые стрелки — петли. Наведи на дом — подробности.') : t('disp.hintP', 'Стрелка ведёт от планеты к её диспозитору — управителю знака, где она стоит. Пунктирный кружок — планета в своём знаке (конечный диспозитор), розовые стрелки — петли (взаимная рецепция). Наведи на значок — подробности.'))}</p>
      <div class="disp-graph scrollx">${svg(m, c, t('t.disp', 'Цепочки диспозиторов'))}</div>
      <div class="stack disp-read">${reading(m, c)}</div>
    </div>`;
  }
  function bind(box, c) {
    box.querySelectorAll('[data-dsel]').forEach((s) => s.addEventListener('change', () => { st[s.dataset.dsel] = s.value; box.innerHTML = card(c); bind(box, c); }));
    root.NWheel.bindTips(box);
  }

  root.NDisp = { card, bind, model, lordOf };
})(window);
