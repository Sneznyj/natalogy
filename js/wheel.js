/* Колесо карты (SVG): зодиак, дома, планеты, аспекты; одиночное и двойное (внешний круг — транзиты, соляр, партнёр).
   Без зависимостей: NWheel.svg(chart, opts) → строка SVG; NWheel.bindTips(root) — подсказки при наведении и касании.
   chart: { points:[{id, lon, retro}], cusps:[12], asc, mc }   opts: { outer, aspects:[{a,b,type,nature,orb,strength, from?:'in'|'out'}],
   show:[ids], labels:{in,out}, theme:'night'|'day', size } */
(function (root) {
  'use strict';
  const VS = '︎';
  const GLYPH = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇', node: '☊', snode: '☋', chiron: '⚷', lilith: '⚸', fortune: '⊗', asc: 'AC', mc: 'MC', dsc: 'DC', ic: 'IC' };
  const SIGN_G = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  const ELEM = ['fire', 'earth', 'air', 'water'];
  const ASP_G = { conj: '☌', sextile: '⚹', square: '□', trine: '△', opp: '☍', quincunx: '⚻', semisextile: '⚺', semisquare: '∠', sesquisquare: '⚼', quintile: 'Q' };
  const NAMES = {
    ru: { sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера', mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон', node: 'Северный узел', snode: 'Южный узел', chiron: 'Хирон', lilith: 'Лилит', fortune: 'Парс фортуны', asc: 'Асцендент', mc: 'Середина неба' },
    en: { sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto', node: 'North Node', snode: 'South Node', chiron: 'Chiron', lilith: 'Lilith', fortune: 'Part of Fortune', asc: 'Ascendant', mc: 'Midheaven' },
  };
  const SIGNS = { ru: ['Овен', 'Телец', 'Близнецы', 'Рак', 'Лев', 'Дева', 'Весы', 'Скорпион', 'Стрелец', 'Козерог', 'Водолей', 'Рыбы'], en: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'] };
  const ASP_N = { ru: { conj: 'соединение', sextile: 'секстиль', square: 'квадрат', trine: 'трин', opp: 'оппозиция', quincunx: 'квинконс', semisextile: 'полусекстиль', semisquare: 'полуквадрат', sesquisquare: 'полутораквадрат', quintile: 'квинтиль' }, en: { conj: 'conjunction', sextile: 'sextile', square: 'square', trine: 'trine', opp: 'opposition', quincunx: 'quincunx', semisextile: 'semi-sextile', semisquare: 'semi-square', sesquisquare: 'sesquiquadrate', quintile: 'quintile' } };
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const FONT_G = "'Noto Sans Symbols 2','Noto Sans Symbols','Segoe UI Symbol','Apple Symbols',sans-serif";
  const FONT_T = "var(--f-ui, system-ui), system-ui, sans-serif";
  const FONT_M = "var(--f-mono, ui-monospace), ui-monospace, monospace";
  const norm = (x) => ((x % 360) + 360) % 360;
  const r1 = (n) => Math.round(n * 10) / 10;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const fmtDeg = (lon, lang) => { const l = norm(lon), s = Math.floor(l / 30), d = l - 30 * s; return `${Math.floor(d)}°${String(Math.floor((d % 1) * 60)).padStart(2, '0')}′ ${SIGNS[lang][s]}`; };

  // раздвинуть близкие планеты по кругу, сохраняя порядок
  function spread(items, minSep) {
    const n = items.length;
    if (n < 2) return items;
    items.sort((a, b) => a.ang - b.ang);
    for (let it = 0; it < 120; it++) {
      let moved = false;
      for (let i = 0; i < n; i++) {
        const a = items[i], b = items[(i + 1) % n];
        let gap = b.ang - a.ang; if (i === n - 1) gap += 360;
        if (gap < minSep - 0.01) { const push = (minSep - gap) / 2; a.ang -= push; b.ang += push; moved = true; }
      }
      if (!moved) break;
    }
    return items;
  }

  /**
   * «Бумажное» колесо, как в Sotis/Chronos: белый круг, пастельный пояс знаков, градусы у планет,
   * куспиды с номерами и градусами снаружи, значок аспекта на середине линии. Цвета — переменные --w-* (светлая и тёмная тема).
   */
  function svg(chart, opts) {
    opts = opts || {};
    const lang = opts.lang || 'ru';
    const bi = !!opts.outer;
    const S = 720, C = S / 2;
    // двойное колесо — как в Sotis: пояс знаков, внешний круг планет (транзиты/вторая карта), внутренний круг (натал), аспекты в центре
    const R = bi
      ? { zodOut: 336, zodIn: 300, ring: 244, pl: 214, plDeg: 192, asp: 178, opl: 274, oplDeg: 253, hLab: 352, axis: 350, hNum: 166 }
      : { zodOut: 312, zodIn: 276, tickTo: 267, pl: 246, plDeg: 219, asp: 194, hLab: 334, axis: 330 };
    const PADV = bi ? 18 : 0;
    const asc = chart.asc != null ? chart.asc : 0;
    const ang = (lon) => 180 + norm(lon - asc); // ASC слева, против часовой
    const xy = (r, a) => [C + r * Math.cos(a * Math.PI / 180), C - r * Math.sin(a * Math.PI / 180)];
    const P = (r, a) => { const [x, y] = xy(r, a); return `${r1(x)} ${r1(y)}`; };
    const show = opts.show ? new Set(opts.show) : null;
    const vis = (p) => !show || show.has(p.id);
    const degTxt = (lon) => `${Math.floor(norm(lon) % 30)}°`;
    const degMin = (lon) => { const d = norm(lon) % 30; return `${Math.floor(d)}°${String(Math.floor((d % 1) * 60)).padStart(2, '0')}′`; };
    let s = `<svg class="nw${bi ? ' bi' : ''}" viewBox="${-PADV} ${-PADV} ${S + 2 * PADV} ${S + 2 * PADV}" role="img" aria-label="${esc(opts.label || (lang === 'ru' ? 'Колесо карты' : 'Chart wheel'))}" xmlns="http://www.w3.org/2000/svg">`;
    // поле внутри пояса; у двойного — внешний круг чуть тонирован, чтобы два круга планет читались отдельно
    s += `<circle cx="${C}" cy="${C}" r="${R.zodIn}" fill="${bi ? 'var(--w-ring2)' : 'var(--w-paper)'}"/>`;
    if (bi) s += `<circle cx="${C}" cy="${C}" r="${R.ring}" fill="var(--w-paper)" stroke="var(--w-ring-line)" stroke-width="1.6"/>`;
    s += `<circle cx="${C}" cy="${C}" r="${R.asp}" fill="var(--w-inner)" stroke="${bi ? 'var(--w-ring-line)' : 'var(--w-line2)'}" stroke-width="${bi ? 1.4 : 1}"/>`;
    // пояс знаков: пастельные сектора с просветами, значки знаков — чёрные (контрастно)
    for (let i = 0; i < 12; i++) {
      const a0 = ang(i * 30) + 0.35, a1 = ang(i * 30 + 30) - 0.35;
      const el = ELEM[i % 4];
      s += `<path d="M${P(R.zodOut, a0)} A${R.zodOut} ${R.zodOut} 0 0 0 ${P(R.zodOut, a1)} L${P(R.zodIn, a1)} A${R.zodIn} ${R.zodIn} 0 0 1 ${P(R.zodIn, a0)}Z" fill="var(--w-${el})"/>`;
      const [gx, gy] = xy((R.zodOut + R.zodIn) / 2, ang(i * 30 + 15));
      s += `<text x="${r1(gx)}" y="${r1(gy + 0.5)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_G}" font-size="${bi ? 23 : 24}" font-weight="700" fill="var(--w-sign)" data-tip="${esc(SIGNS[lang][i])}">${SIGN_G[i]}${VS}</text>`;
    }
    // шкала градусов по внутреннему краю пояса
    let ticks = '';
    for (let d = 0; d < 360; d += 1) {
      const len = d % 10 === 0 ? 9 : d % 5 === 0 ? 6 : 3;
      ticks += `M${P(R.zodIn, ang(d))}L${P(R.zodIn - len, ang(d))}`;
    }
    s += `<path d="${ticks}" stroke="var(--w-tick)" stroke-width=".7" fill="none"/>`;
    s += `<circle cx="${C}" cy="${C}" r="${R.zodIn}" fill="none" stroke="var(--w-line2)" stroke-width=".8"/>`;
    // дома: линии куспидов, оси, номера с градусами
    let hnum = '';
    if (chart.cusps) {
      const AX = { 0: ['AC', 'var(--w-angle)'], 3: ['IC', 'var(--w-angle2)'], 6: ['DC', 'var(--w-angle)'], 9: ['MC', 'var(--w-angle2)'] };
      for (let i = 0; i < 12; i++) {
        const c = chart.cusps[i], ax = AX[i];
        const a = ang(c);
        if (ax) {
          s += `<line x1="${r1(xy(R.asp, a)[0])}" y1="${r1(xy(R.asp, a)[1])}" x2="${r1(xy(R.axis - 14, a)[0])}" y2="${r1(xy(R.axis - 14, a)[1])}" stroke="${ax[1]}" stroke-width="2.4" stroke-linecap="round"/>`;
          if (i === 0 || i === 9) { const [hx, hy] = xy(R.axis - 6, a); s += `<circle cx="${r1(hx)}" cy="${r1(hy)}" r="3.6" fill="${ax[1]}"/>`; }
        } else {
          s += `<line x1="${r1(xy(R.asp, a)[0])}" y1="${r1(xy(R.asp, a)[1])}" x2="${r1(xy(R.zodIn, a)[0])}" y2="${r1(xy(R.zodIn, a)[1])}" stroke="var(--w-line2)" stroke-width=".9"/>`;
          s += `<line x1="${r1(xy(R.zodOut, a)[0])}" y1="${r1(xy(R.zodOut, a)[1])}" x2="${r1(xy(R.zodOut + 8, a)[0])}" y2="${r1(xy(R.zodOut + 8, a)[1])}" stroke="var(--w-line2)" stroke-width=".9"/>`;
        }
        const tip = (ax ? ax[0] + ' · ' : '') + (lang === 'ru' ? 'Дом ' : 'House ') + (i + 1) + ' · ' + fmtDeg(c, lang);
        const [hx, hy] = xy(R.hLab, a);
        const label = ax ? ax[0] : ROMAN[i];
        s += `<text x="${r1(hx)}" y="${r1(hy)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_T}" font-size="${ax ? 14 : 12.5}" font-weight="800" fill="${ax ? 'var(--w-ink)' : 'var(--w-muted)'}" data-tip="${esc(tip)}">${label}<tspan font-size="9.5" font-weight="700" dy="-5">${Math.floor(norm(c) % 30)}</tspan></text>`;
        if (bi) { // номер дома — внутри круга аспектов, посередине дома
          const next = chart.cusps[(i + 1) % 12], mid = c + norm(next - c) / 2;
          const [nx, ny] = xy(R.hNum, ang(mid));
          hnum += `<text x="${r1(nx)}" y="${r1(ny)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_T}" font-size="10.5" font-weight="700" fill="var(--w-muted)" stroke="var(--w-inner)" stroke-width="3" paint-order="stroke" data-tip="${esc(tip)}">${i + 1}</text>`;
        }
      }
    }
    // аспекты: линии между точками на внутреннем круге и значок посередине
    const pos = {};
    const ptsIn = chart.points.filter(vis);
    for (const p of chart.points) pos['in:' + p.id] = p.lon;
    if (chart.cusps) chart.cusps.forEach((c, i) => { pos['in:c' + (i + 1)] = c; });
    if (chart.asc != null) pos['in:asc'] = chart.asc;
    if (chart.mc != null) pos['in:mc'] = chart.mc;
    if (bi) { for (const p of opts.outer.points) pos['out:' + p.id] = p.lon; if (opts.outer.cusps) opts.outer.cusps.forEach((c, i) => { pos['out:c' + (i + 1)] = c; }); }
    const glyphsAt = [];
    let aspHTML = '', aspGly = '';
    const nm = (id) => NAMES[lang][id] || (/^c\d+$/.test(id) ? (lang === 'ru' ? 'куспид ' : 'cusp ') + id.slice(1) : id);
    for (const x of (opts.aspects || [])) {
      const la = pos[(x.fromA || 'in') + ':' + x.a], lb = pos[(x.fromB || (bi ? 'out' : 'in')) + ':' + x.b];
      if (la == null || lb == null) continue;
      const [x0, y0] = xy(R.asp, ang(la)), [x1, y1] = xy(R.asp, ang(lb));
      const col = x.type === 'conj' ? 'var(--w-conj)' : x.nature === 'soft' ? 'var(--w-soft)' : x.nature === 'hard' ? 'var(--w-hard)' : 'var(--w-minor)';
      const st = x.strength != null ? x.strength : 0.5;
      const minor = !['conj', 'sextile', 'square', 'trine', 'opp'].includes(x.type);
      const tip = `${nm(x.a)}${x.la ? ' (' + x.la + ')' : ''} ${ASP_G[x.type] || ''} ${nm(x.b)}${x.lb ? ' (' + x.lb + ')' : ''} — ${ASP_N[lang][x.type] || x.type}, ${lang === 'ru' ? 'орбис' : 'orb'} ${x.orb.toFixed(1)}°`;
      const len = Math.hypot(x1 - x0, y1 - y0);
      let g = '';
      if (opts.aspGlyphs !== false && len > 70 && x.type !== 'conj' && ASP_G[x.type]) {
        let tt = x.type === 'opp' ? 0.3 : 0.5, gx = x0 + (x1 - x0) * tt, gy = y0 + (y1 - y0) * tt;
        for (const k of [0.38, 0.62, 0.3, 0.7]) { if (!glyphsAt.some(([a, b]) => Math.hypot(a - gx, b - gy) < 16)) break; tt = k; gx = x0 + (x1 - x0) * tt; gy = y0 + (y1 - y0) * tt; }
        glyphsAt.push([gx, gy]);
        g = `<g class="nw-asp" data-tip="${esc(tip)}"><circle cx="${r1(gx)}" cy="${r1(gy)}" r="7.5" fill="var(--w-asp-bg)" stroke="${col}" stroke-width="1"/><text x="${r1(gx)}" y="${r1(gy + 0.5)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_G}" font-size="10" fill="${col}">${ASP_G[x.type]}${VS}</text></g>`;
      }
      aspHTML += `<g class="nw-asp" data-tip="${esc(tip)}"><line x1="${r1(x0)}" y1="${r1(y0)}" x2="${r1(x1)}" y2="${r1(y1)}" stroke="transparent" stroke-width="10"/><line class="al" x1="${r1(x0)}" y1="${r1(y0)}" x2="${r1(x1)}" y2="${r1(y1)}" stroke="${col}" stroke-width="${r1(0.9 + st * 1.4)}" opacity="${r1(0.55 + st * 0.45)}" ${minor ? 'stroke-dasharray="4 3"' : ''}/></g>`;
      aspGly += g;
    }
    s += aspHTML + aspGly + hnum;
    // планеты
    function ring(points, rGlyph, rDeg, tickFrom, tickTo, cls, sideLabel, minSep) {
      const items = points.map((p) => ({ p, ang: ang(p.lon) }));
      spread(items, minSep);
      const out = cls === 'out';
      const tickCol = out ? 'var(--w-planet2)' : 'var(--w-ink)';
      let h = '';
      for (const it of items) {
        const p = it.p, a0 = ang(p.lon);
        const [gx, gy] = xy(rGlyph, it.ang), [dx, dy] = xy(rDeg, it.ang);
        const g = GLYPH[p.id] || '•';
        const isTxt = /^[A-Z]{2}$/.test(g);
        const name = NAMES[lang][p.id] || p.id;
        const tip = `${name}${sideLabel ? ' · ' + sideLabel : ''}: ${fmtDeg(p.lon, lang)}${p.house ? ` · ${lang === 'ru' ? 'дом' : 'house'} ${p.house}` : ''}${p.retro ? (lang === 'ru' ? ' · ретроградный' : ' · retrograde') : ''}`;
        h += `<g class="nw-pl ${cls}" data-id="${p.id}" data-tip="${esc(tip)}" tabindex="0">`;
        h += `<line x1="${r1(xy(tickFrom, a0)[0])}" y1="${r1(xy(tickFrom, a0)[1])}" x2="${r1(xy(tickTo, a0)[0])}" y2="${r1(xy(tickTo, a0)[1])}" stroke="${tickCol}" stroke-width="2.2"/>`;
        if (Math.abs(it.ang - a0) > 1.2) { const lr = rGlyph + (bi ? 12 : 14); h += `<line x1="${r1(xy(tickTo, a0)[0])}" y1="${r1(xy(tickTo, a0)[1])}" x2="${r1(xy(lr, it.ang)[0])}" y2="${r1(xy(lr, it.ang)[1])}" stroke="var(--w-line2)" stroke-width=".8"/>`; }
        const [px, py] = xy(R.asp, a0);
        h += `<circle cx="${r1(px)}" cy="${r1(py)}" r="${out ? 2.3 : 2.7}" fill="${tickCol}"/>`;
        h += `<circle class="pl-bg" cx="${r1(gx)}" cy="${r1(gy)}" r="${bi ? 13 : 14}" fill="${out ? 'var(--w-plbg2)' : 'var(--w-plbg)'}" stroke="transparent"/>`;
        h += isTxt
          ? `<text x="${r1(gx)}" y="${r1(gy)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_T}" font-size="11.5" font-weight="800" fill="var(--w-ink)">${g}</text>`
          : `<text x="${r1(gx)}" y="${r1(gy + 0.5)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_G}" font-size="${bi ? 22 : 25}" font-weight="700" fill="var(--w-ink)">${g}${VS}</text>`;
        if (opts.degrees !== false) h += `<text x="${r1(dx)}" y="${r1(dy)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_T}" font-size="${bi ? 11.5 : 13}" font-weight="800" fill="${out ? 'var(--w-deg2)' : 'var(--w-deg)'}">${degTxt(p.lon)}${p.retro ? `<tspan fill="var(--w-hard)" font-size="9" font-weight="800">R</tspan>` : ''}</text>`;
        else if (p.retro) h += `<text x="${r1(dx)}" y="${r1(dy)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_T}" font-size="9" font-weight="800" fill="var(--w-hard)">R</text>`;
        h += '</g>';
      }
      return h;
    }
    if (bi) {
      // внутренний круг — натал, внешний — вторая карта (транзиты, соляр, партнёр…); у каждого своя граница
      s += ring(ptsIn.filter((p) => !['asc', 'mc'].includes(p.id)), R.pl, R.plDeg, R.ring, R.ring - 8, 'in', opts.labels && opts.labels.in, 7.6);
      s += ring(opts.outer.points.filter((p) => !['asc', 'mc'].includes(p.id) && (!opts.showOuter || opts.showOuter.includes(p.id))), R.opl, R.oplDeg, R.zodIn, R.zodIn - 8, 'out', opts.labels && opts.labels.out, 6.4);
    } else s += ring(ptsIn.filter((p) => !['asc', 'mc'].includes(p.id)), R.pl, R.plDeg, R.zodIn, R.zodIn - 11, 'in', opts.labels && opts.labels.in, 7.2);
    s += '</svg>';
    return s;
  }

  // ---------- подсказки: наведение, фокус и касание ----------
  let tipEl = null;
  function bindTips(rootEl) {
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.className = 'nw-tip'; tipEl.setAttribute('role', 'tooltip'); tipEl.hidden = true;
      document.body.appendChild(tipEl);
      document.addEventListener('scroll', () => { tipEl.hidden = true; }, { passive: true, capture: true });
    }
    let cur = null;
    const place = (el, x, y) => {
      tipEl.textContent = el.getAttribute('data-tip');
      tipEl.hidden = false;
      const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
      let left = x - tw / 2, top = y - th - 14;
      left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
      if (top < 8) top = y + 18;
      tipEl.style.left = left + 'px'; tipEl.style.top = top + 'px';
      cur = el;
    };
    const hide = () => { tipEl.hidden = true; cur = null; };
    rootEl.addEventListener('pointermove', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (!el || !rootEl.contains(el)) { if (cur && e.pointerType === 'mouse') hide(); return; }
      if (e.pointerType === 'mouse') place(el, e.clientX, e.clientY);
    });
    rootEl.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
    rootEl.addEventListener('click', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (!el) { hide(); return; }
      if (cur === el && !tipEl.hidden) { hide(); return; }
      const r = el.getBoundingClientRect();
      place(el, r.left + r.width / 2, r.top);
    });
    rootEl.addEventListener('focusin', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (el) { const r = el.getBoundingClientRect(); place(el, r.left + r.width / 2, r.top); }
    });
    rootEl.addEventListener('focusout', hide);
    document.addEventListener('click', (e) => { if (!rootEl.contains(e.target)) hide(); });
  }

  root.NWheel = { svg, bindTips, spread, fmtDeg, GLYPH, SIGN_G, ASP_G, NAMES, SIGNS, ASP_N };
})(typeof window !== 'undefined' ? window : globalThis);
