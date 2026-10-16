/* Цепочки диспозиторов: значки планет и серые стрелки «планета → её диспозитор»; пунктирный кружок — планета в своём знаке
   (конечный диспозитор). Схема — ёмкое дерево на один экран (16.10, Алина): конечный диспозитор или петля наверху, кто ему
   подчиняется — уровнями ниже; ветки — полками, размер — по месту на странице (treeLayout, refit). Переключатели как в Sotis:
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

  /**
   * Ёмкая раскладка (16.10, Алина: «схема должна располагаться ёмко, чтобы вся была видна без прокрутки»): дерево по уровням.
   * Корень ветки — петля (конечный диспозитор или взаимная рецепция) либо узел без стрелки; кто ему подчиняется — уровнем ниже.
   * Две ориентации: «вниз» (корни сверху) и «влево» (корни справа, стрелки слева направо) — ветки укладываются полками;
   * берём ту, что крупнее влезает в окно (avail — сколько места под схемой), при равенстве — более низкую. Возвращает { pos, W, H, sc, orient }.
   */
  function treeLayout(m, avail) {
    const R = 17, PAD = 30;
    const kids = Object.fromEntries(m.nodes.map((id) => [id, []]));
    const sameLoop = (a, b) => m.cyc.has(a) && m.cyc.has(b) && m.cyc.get(a) === m.cyc.get(b);
    for (const id of m.nodes) { const nx = m.next(id); if (nx && nx !== id && !sameLoop(id, nx)) kids[nx].push(id); }
    // ветки: петли (в порядке стрелок) и узлы без диспозитора; самые большие — первыми
    const size = (id) => 1 + kids[id].reduce((a, k) => a + size(k), 0);
    const comps = m.cycles.map((l) => l.slice()).concat(m.nodes.filter((id) => !m.next(id)).map((id) => [id]));
    comps.sort((a, b) => b.reduce((s, id) => s + size(id), 0) - a.reduce((s, id) => s + size(id), 0));
    // внутри ветки: b — место поперёк (листья по порядку), d — уровень
    const blocks = comps.map((roots) => {
      const P = {}; let slot = 0, maxD = 0;
      const place = (id, d) => {
        maxD = Math.max(maxD, d);
        const ch = kids[id].slice().sort((a, b) => size(b) - size(a));
        // крупные поддеревья — в середину, чтобы стрелки сходились к узлу ровнее
        const mid = []; ch.forEach((k, i) => (i % 2 ? mid.push(k) : mid.unshift(k)));
        if (!mid.length) { P[id] = { b: slot++, d }; return P[id].b; }
        const bs = mid.map((k) => place(k, d + 1));
        P[id] = { b: (bs[0] + bs[bs.length - 1]) / 2, d };
        return P[id].b;
      };
      roots.forEach((r) => place(r, 0));
      return { P, n: slot, maxD, loop: roots.length > 2 };
    });
    // полки: ветки слева направо (ориентация «вниз») или сверху вниз («вправо») с переносом
    // полки: ветки кладём рядами слева направо (первый подходящий ряд, крупные — первыми), ряд не шире lim;
    // перебираем lim от самой широкой ветки до всех в один ряд и берём крупнейший масштаб, при равенстве — более низкую схему
    const pack = (orient) => {
      const down = orient === 'down', SB = down ? 50 : 44, SD = down ? 64 : 78; // шаг поперёк и между уровнями
      const GAP = down ? 34 : 30, LOOP = 26; // у петли из 3+ узлов — дуга возврата над рядом (справа от столбца) — место под неё
      const dims = blocks.map((b) => { const across = (b.n - 1) * SB + 2 * R, along = b.maxD * SD + 2 * R + (b.loop ? LOOP : 0); return down ? { w: across, h: along } : { w: along, h: across }; });
      const order = dims.map((d, i) => i).sort((i, j) => dims[j].w - dims[i].w || dims[j].h - dims[i].h);
      const total = dims.reduce((a, d) => a + d.w + GAP, 0) - GAP;
      const lims = [...new Set([Math.max(...dims.map((d) => d.w))].concat(order.map((_, k) => total / (k + 1))).map((x) => Math.round(Math.max(x, Math.max(...dims.map((d) => d.w))))))];
      let best = null;
      for (const lim of lims) {
        const rows = []; // { x — занято по ширине, h — высота ряда, items }
        const at = [];
        for (const i of order) {
          const d = dims[i];
          let row = rows.find((r) => r.x + GAP + d.w <= lim + 1);
          if (!row) { row = { x: -GAP, h: 0, items: [] }; rows.push(row); }
          row.items.push(i); at[i] = { x: row.x + GAP, row }; row.x += GAP + d.w; row.h = Math.max(row.h, d.h);
        }
        let y = 0; for (const r of rows) { r.y = y; y += r.h + GAP; }
        const ww = Math.max(...rows.map((r) => r.x)) + 2 * PAD, hh = y - GAP + 2 * PAD;
        const sc = Math.min(1.25, avail.w / ww, avail.h / hh);
        if (!best || sc > best.sc + 1e-6 || (Math.abs(sc - best.sc) < 1e-6 && hh * sc < best.H * best.sc - 0.5)) best = { sc, at: at.map((q) => ({ x: q.x, y: q.row.y })), W: ww, H: hh };
      }
      const pos = {};
      blocks.forEach((b, i) => {
        const o = best.at[i], off = b.loop ? LOOP : 0, bw = dims[i].w;
        for (const id in b.P) {
          const p = b.P[id], across = R + p.b * SB, along = R + off + p.d * SD;
          // «влево»: корни справа, стрелки читаются слева направо (♆ → ♄ → ♂ → ♀ → ☿)
          pos[id] = down ? { x: PAD + o.x + across, y: PAD + o.y + along } : { x: PAD + o.x + bw - along, y: PAD + o.y + across };
        }
      });
      return { pos, W: best.W, H: best.H, sc: best.sc, orient: down ? 'down' : 'left' };
    };
    const a = pack('down'), b = pack('left');
    // крупнее — лучше; при равном размере — та, что ниже ростом (ёмче, меньше листать)
    return b.sc > a.sc * 1.08 || (b.sc >= a.sc * 0.9 && b.H * b.sc < a.H * a.sc * 0.8) ? b : a;
  }

  /** Сколько места под схемой: ширина колонки и высота окна под шапкой и заголовком карточки (box — уже на странице). */
  function availOf(box) {
    const g = box && box.querySelector('.disp-graph');
    const w = g && g.clientWidth ? g.clientWidth - 4 : Math.min(1080, window.innerWidth - (window.innerWidth > 980 ? 330 : 40));
    const stick = Math.max(0, ...[...document.querySelectorAll('.top, .pro-tabs')].map((e) => { const cs = getComputedStyle(e); return cs.position === 'sticky' ? (parseFloat(cs.top) || 0) + e.offsetHeight : 0; }));
    // над схемой в карточке — заголовок, переключатели и подсказка; схема должна влезть под ними целиком
    const head = g ? g.getBoundingClientRect().top - box.getBoundingClientRect().top : 150;
    return { w: Math.max(240, w), h: Math.max(260, window.innerHeight - stick - head - 28) };
  }

  function svg(m, c, label, avail) {
    const TX = UI.TX(), G = root.NWheel.GLYPH;
    const { pos, W, H, sc, orient } = treeLayout(m, avail || availOf(null));
    const R = 17, mk = 'dsa' + Math.random().toString(36).slice(2, 7);
    const name = (id) => (isH(id) ? t('house.n', '{n} дом', { n: id.slice(1) }) : TX.P[id].name);
    let s = `<svg class="disp-svg sotis" viewBox="0 0 ${Math.round(W)} ${Math.round(H)}" width="${Math.round(W * sc)}" height="${Math.round(H * sc)}" data-orient="${orient}" role="img" aria-label="${esc(label)}"><defs><marker id="${mk}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 1L9 5L0 9" fill="none" stroke="var(--disp-arrow)" stroke-width="1.4"/></marker><marker id="${mk}r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 1L9 5L0 9" fill="none" stroke="var(--rose)" stroke-width="1.6"/></marker></defs>`;
    const pair = new Set(m.edges.map(([a, b]) => a + '>' + b));
    for (const [a, b] of m.edges) {
      if (a === b) continue;
      const A = pos[a], B = pos[b]; let dx = B.x - A.x, dy = B.y - A.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const loop = m.cyc.has(a) && m.cyc.has(b) && m.cyc.get(a) === m.cyc.get(b);
      const L = loop ? m.cycles[m.cyc.get(a)] : null;
      // взаимная рецепция: две стрелки навстречу — разводим дугами; петля из 3+ узлов замыкается дугой над рядом (справа от столбца)
      const both = pair.has(b + '>' + a);
      let cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2;
      if (both) { cx -= dy * 14 * 2; cy += dx * 14 * 2; }
      else if (L && L.length > 2 && a === L[L.length - 1] && b === L[0]) { const bend = 24 + 0.12 * d; if (orient === 'down') cy = Math.min(A.y, B.y) - bend; else cx = Math.max(A.x, B.x) + bend; }
      const u0 = Math.hypot(cx - A.x, cy - A.y) || 1, u1 = Math.hypot(B.x - cx, B.y - cy) || 1;
      const x0 = A.x + (cx - A.x) / u0 * (R + 2), y0 = A.y + (cy - A.y) / u0 * (R + 2), x1 = B.x - (B.x - cx) / u1 * (R + 4), y1 = B.y - (B.y - cy) / u1 * (R + 4);
      s += `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${loop ? 'var(--rose)' : 'var(--disp-arrow)'}" stroke-width="${loop ? 1.6 : 1.2}" marker-end="url(#${mk}${loop ? 'r' : ''})"/>`;
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
      <div class="row sb"><h3>${t('t.disp', 'Цепочки диспозиторов')}</h3><span class="tiny muted">${esc(t('disp.algo2', 'стрелки сходятся к главным планетам карты'))}</span></div>
      <div class="row disp-sels">${sel('set', [['10', t('disp.s10', '10 планет')], ['7', t('disp.s7', 'Септенер (7)')], ['12', t('disp.s12', '10 + узел и Хирон')]])}${sel('dig', [['dom', t('disp.dom', 'Обитель')], ['exile', t('disp.exile', 'Изгнание')], ['exalt', t('disp.exalt', 'Экзальтация')], ['fall', t('disp.fall', 'Падение')]])}${c.houses ? sel('mode', [['signs', t('disp.signs', 'Знаки')], ['houses', t('disp.houses', 'Дома')]]) : ''}</div>
      <p class="tiny muted">${esc(st.mode === 'houses' ? t('disp.hintH', 'Стрелка ведёт от дома к дому, где стоит управитель его куспида. Пунктирный кружок — управитель в своём же доме: туда сходятся цепочки. Розовые стрелки — петли. Наведи на дом — подробности.') : t('disp.hintP', 'Стрелка ведёт от планеты к её диспозитору — управителю знака, где она стоит. Пунктирный кружок — планета в своём знаке (конечный диспозитор), розовые стрелки — петли (взаимная рецепция). Наведи на значок — подробности.'))}</p>
      <div class="disp-graph">${svg(m, c, t('t.disp', 'Цепочки диспозиторов'))}</div>
      <div class="stack disp-read">${reading(m, c)}</div>
    </div>`;
  }
  /** Схема по месту на странице: ширина колонки и высота окна под заголовком карточки (и при изменении окна). */
  let fitT = 0, fitBox = null, fitC = null, fitBound = false;
  function refit(box, c) {
    const g = box.querySelector('.disp-graph'); if (!g || !document.body.contains(box)) return;
    if (!c.houses && st.mode === 'houses') st.mode = 'signs';
    const m = model(c, st); m.mode = st.mode;
    g.innerHTML = svg(m, c, t('t.disp', 'Цепочки диспозиторов'), availOf(box));
  }
  function bind(box, c) {
    box.querySelectorAll('[data-dsel]').forEach((s) => s.addEventListener('change', () => { st[s.dataset.dsel] = s.value; box.innerHTML = card(c); bind(box, c); }));
    refit(box, c);
    fitBox = box; fitC = c;
    if (!fitBound) { fitBound = true; window.addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(() => { if (fitBox && document.body.contains(fitBox)) refit(fitBox, fitC); }, 150); }); }
    root.NWheel.bindTips(box);
  }

  root.NDisp = { card, bind, model, lordOf };
})(window);
