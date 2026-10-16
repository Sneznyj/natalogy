/* Колесо карты (SVG): зодиак, дома, планеты, аспекты; одиночное и двойное (внешний круг — транзиты, соляр, партнёр).
   Без зависимостей: NWheel.svg(chart, opts) → строка SVG; NWheel.bindTips(root) — подсказки при наведении и касании.
   chart: { points:[{id, lon, retro}], cusps:[12], asc, mc }   opts: { outer:{points, cusps?:[12], asc?, mc?}, aspects:[{a,b,type,nature,orb,strength, from?:'in'|'out'}],
   show:[ids], labels:{in,out}, outerCusps:false — не рисовать дома внешней карты, cosmo — космограмма (без домов, 0° Овна слева),
   cosmoIn / cosmoOut — космограммой только внутренний или только внешний круг (16.10, Алина): у этого круга нет домов и осей,
   rot — градус, который стоит слева (по умолчанию ASC внутренней карты; «главный АС» внешней карты — её ASC) } */
(function (root) {
  'use strict';
  const VS = '︎';
  const GLYPH = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '⯓', node: '☊', snode: '☋', chiron: '⚷', lilith: '⚸', fortune: '⊗', asc: 'AC', mc: 'MC', dsc: 'DC', ic: 'IC' };
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
  const d180 = (x) => norm(x + 180) - 180;
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
   * Точки на отрезке [lo, hi] в заданном порядке, шаг не меньше d, как можно ближе к желаемым xs (xs по возрастанию).
   * Замена y = x − k·d сводит задачу к неубывающей последовательности: склеиваем соседей, нарушающих порядок (pool adjacent violators),
   * потом каждый блок ставим в границы. Не хватает места — шаг уменьшается ровно до того, что помещается.
   */
  function place1D(xs, d, lo, hi) {
    const n = xs.length;
    if (!n) return [];
    if (hi < lo) hi = lo = (lo + hi) / 2;
    if (n > 1 && (n - 1) * d > hi - lo) d = (hi - lo) / (n - 1);
    const blocks = [];
    xs.forEach((x, k) => {
      blocks.push({ s: x - k * d, c: 1 });
      while (blocks.length > 1) {
        const b = blocks[blocks.length - 1], a = blocks[blocks.length - 2];
        if (a.s / a.c <= b.s / b.c) break;
        a.s += b.s; a.c += b.c; blocks.pop();
      }
    });
    const out = [], ylo = lo, yhi = hi - (n - 1) * d;
    let k = 0;
    for (const b of blocks) { const m = Math.min(yhi, Math.max(ylo, b.s / b.c)); for (let j = 0; j < b.c; j++, k++) out.push(m + k * d); }
    return out;
  }

  /**
   * Значки планет не закрывают линии куспидов (16.10, Алина): каждый значок стоит в своём доме (между соседними линиями)
   * и отходит от линии на clear(угол линии) градусов; внутри дома значки раздвигаются на minSep как можно ближе к своим градусам.
   * Тесный дом: отступ от линии уменьшается до clearMin (значок только касается линии), шаг между значками — до RHO·minSep
   * (рамка значка шире самого символа). Не помещаются и так — ближайший к линии значок переходит за линию, в соседний дом,
   * если там есть место (так рисуют планету «на куспиде»; засечка на градусе и выноска остаются на своём месте).
   * lines — углы линий на колесе (куспиды или оси); без линий — обычный разнос по кругу.
   */
  function spreadAround(items, lines, minSep, clear, clearMin) {
    if (!lines || lines.length < 2) return spread(items, minSep);
    const L = lines.map(norm).sort((a, b) => a - b), n = L.length;
    const W = L.map((s, i) => norm(L[(i + 1) % n] - s) || 360);
    const RHO = 0.7;
    const homeOf = (a) => { let k = n - 1; for (let i = 0; i < n; i++) if (a >= L[i]) k = i; return k; };
    // sec — в каком доме рисуем значок, want — желаемое место от начала этого дома (за линией — меньше 0 или больше ширины)
    const pl = items.map((it) => { const sec = homeOf(norm(it.ang)); return { it, sec, want: norm(it.ang - L[sec]) }; });
    const inSec = (j) => pl.filter((q) => q.sec === j);
    const room = (j, cnt) => W[j] - clearMin(L[j]) - clearMin(L[(j + 1) % n]) - Math.max(0, cnt - 1) * minSep * RHO; // ≥ 0 — помещаются
    const stuck = new Set();
    for (let guard = 0; guard < 4 * pl.length + 4; guard++) {
      let worst = -1, wv = 0;
      for (let j = 0; j < n; j++) { if (stuck.has(j)) continue; const c = inSec(j).length; if (c > 1) { const r = room(j, c); if (r < wv) { wv = r; worst = j; } } }
      if (worst < 0) break;
      const list = inSec(worst).sort((p, q) => p.want - q.want);
      const first = list[0], last = list[list.length - 1], nx = (worst + 1) % n, pv = (worst - 1 + n) % n;
      const cand = [];
      if (room(nx, inSec(nx).length + 1) >= 0) cand.push({ q: last, to: nx, d: W[worst] - last.want, want: -(W[worst] - last.want) });
      if (room(pv, inSec(pv).length + 1) >= 0) cand.push({ q: first, to: pv, d: first.want, want: W[pv] + first.want });
      if (!cand.length) { stuck.add(worst); continue; } // соседям тоже тесно — сожмём как есть
      cand.sort((a, b) => a.d - b.d);
      cand[0].q.sec = cand[0].to; cand[0].q.want = cand[0].want;
    }
    for (let i = 0; i < n; i++) {
      const list = inSec(i).sort((p, q) => p.want - q.want);
      if (!list.length) continue;
      const s = L[i], e = L[(i + 1) % n], w = W[i];
      const xs = list.map((q) => q.want);
      const cmL = clearMin(s), cmR = clearMin(e);
      let lo = clear(s), hi = w - clear(e);
      let def = (list.length - 1) * minSep - (hi - lo);
      if (def > 0) { // тесно: сначала поровну с двух сторон, потом сколько осталось
        const dl = Math.max(0, Math.min(def / 2, lo - cmL)); lo -= dl; def -= dl;
        const dr = Math.max(0, Math.min(def, w - cmR - hi)); hi += dr; def -= dr;
        if (def > 0) lo -= Math.max(0, Math.min(def, lo - cmL));
      }
      const pos = place1D(xs, minSep, lo, hi);
      list.forEach((q, j) => { q.it.ang = s + pos[j]; });
    }
    return items;
  }

  // ширина подписи (Manrope 800) в долях кегля — чтобы подписи куспидов вставали рядом с линией и не наезжали на соседей
  const CW = { I: 0.3, V: 0.66, X: 0.64, A: 0.7, C: 0.68, D: 0.72, M: 0.86 };
  const textW = (str, fs) => [...String(str)].reduce((w, ch) => w + (CW[ch] || 0.6) * fs, 0);
  // насколько прямоугольник w×h выступает от своего центра вдоль направления a (радиально) и поперёк него
  const extR = (a, w, h) => { const t = a * Math.PI / 180; return Math.abs(Math.cos(t)) * w / 2 + Math.abs(Math.sin(t)) * h / 2; };
  const extT = (a, w, h) => { const t = a * Math.PI / 180; return Math.abs(Math.sin(t)) * w / 2 + Math.abs(Math.cos(t)) * h / 2; };

  /**
   * «Бумажное» колесо, как в Sotis/Chronos: белый круг, пастельный пояс знаков, градусы у планет,
   * куспиды с номерами и градусами снаружи, значок аспекта на середине линии. Цвета — переменные --w-* (светлая и тёмная тема).
   * Пояс знаков узкий (знаки мельче), кольца планет широкие (значки планет крупнее). У двойного колеса у каждой карты свои куспиды:
   * внутренняя — графитовые линии через оба круга и подписи снаружи пояса, внешняя — фиолетовые линии во внешнем круге и подписи у пояса.
   */
  function svg(chart, opts) {
    opts = opts || {};
    const lang = opts.lang || 'ru';
    const bi = !!opts.outer;
    const S = 720, C = S / 2;
    // opts.scale — крупнее значки и подписи (Профи: «видно издалека»); кольца чуть раздвигаются под них
    const K = Math.max(1, Math.min(1.25, +opts.scale || 1));
    const R = bi
      ? { zodOut: 336, zodIn: 308, ring: 238, pl: 211, plDeg: 181, asp: 158, opl: K > 1 ? 276 : 273, oplDeg: 249, hNum: 146 }
      : { zodOut: 320, zodIn: 292, pl: 251, plDeg: 215, asp: 190 };
    // кегли: планеты внутреннего и внешнего круга, градусы, подложка значка, знаки зодиака, подписи куспидов (hl — внутренняя карта, oc — внешняя)
    const GS0 = bi
      ? { in: 28, out: 27, deg: 14, bg: 15, sign: 16, hl: 16, hlAx: 16.5, hd: 12, oc: 14, ocAx: 14.5, od: 11 }
      : { in: 31, out: 31, deg: 15, bg: 17, sign: 18, hl: 16, hlAx: 16.5, hd: 12 };
    const GS = Object.fromEntries(Object.entries(GS0).map(([k, v]) => [k, Math.round(v * K * 10) / 10]));
    const PADV = (bi ? 28 : 12) + Math.ceil(36 * (K - 1)); // поля вокруг — под подписи куспидов снаружи пояса (крупнее подписи — шире поля)
    // космограмма — без домов и осей, 0° Овна слева; opts.rot — какой градус поставить слева (ASC внешней карты, если «главный АС» — её).
    // Космограммой может быть один круг (16.10, Алина): внутренний без домов — слева главный АС внешней карты (если у неё есть дома);
    // внешний без домов — внешние куспиды и оси не рисуются, слева — АС натала.
    const cosmoIn = !!(opts.cosmo || opts.cosmoIn), cosmoOut = !!(opts.cosmo || opts.cosmoOut);
    const ob = bi ? opts.outer : null;
    const outerHouses = !!(ob && !cosmoOut && opts.outerCusps !== false && (ob.cusps || ob.asc != null || ob.mc != null));
    // линии домов внешней карты: все 12 куспидов или только оси (у прогрессий есть лишь ASC и MC)
    const oList = !outerHouses ? [] : ob.cusps ? ob.cusps.map((c, i) => [c, i])
      : [[ob.asc, 0], [ob.mc, 9], [ob.asc != null ? ob.asc + 180 : null, 6], [ob.mc != null ? ob.mc + 180 : null, 3]].filter((x) => x[0] != null);
    const oAsc0 = outerHouses ? (ob.cusps ? ob.cusps[0] : ob.asc != null ? ob.asc : null) : null;
    const asc = chart.asc != null ? chart.asc : 0;
    const rot = cosmoIn ? (!opts.cosmo && oAsc0 != null ? (opts.rot != null ? opts.rot : oAsc0) : 0) : opts.rot != null ? opts.rot : asc;
    const ang = (lon) => 180 + norm(lon - rot); // главный ASC слева, против часовой
    const xy = (r, a) => [C + r * Math.cos(a * Math.PI / 180), C - r * Math.sin(a * Math.PI / 180)];
    const P = (r, a) => { const [x, y] = xy(r, a); return `${r1(x)} ${r1(y)}`; };
    const L = (ra, rb, a, attrs) => { const [x0, y0] = xy(ra, a), [x1, y1] = xy(rb, a); return `<line x1="${r1(x0)}" y1="${r1(y0)}" x2="${r1(x1)}" y2="${r1(y1)}" ${attrs}/>`; };
    const show = opts.show ? new Set(opts.show) : null;
    const vis = (p) => !show || show.has(p.id);
    const degTxt = (lon) => `${Math.floor(norm(lon) % 30)}°`;
    const noAxis = (p) => !['asc', 'mc'].includes(p.id);
    // планеты по кругам: разносим близкие значки заранее — по этим местам потом раскладываются подписи куспидов внешней карты.
    // Линии домов своего круга — препятствия: значок не ложится на куспид (см. spreadAround), градус под значком — тоже.
    const sep = (rG, rD, wG, wD) => Math.max(wG / rG, wD / rD) * 180 / Math.PI; // минимальный разнос значков, градусы
    const asinD = (x) => Math.asin(Math.min(1, Math.max(0, x))) * 180 / Math.PI;
    const wDeg = 1.75 * GS.deg, hDeg = GS.deg; // подпись градуса «29°» под значком
    const clearOf = (rG, rD) => (a) => Math.max(asinD((GS.bg + 3) / rG), asinD((extT(a, wDeg, hDeg) + 2.5) / rD));
    const clearMinOf = (rG) => () => asinD((GS.bg + 0.5) / rG);
    const layout = (points, minSep, lines, rG, rD) => spreadAround(points.map((p) => ({ p, ang: ang(p.lon) })), lines.map(ang), minSep, clearOf(rG, rD), clearMinOf(rG));
    const ptsIn = chart.points.filter(vis);
    const inLines = chart.cusps && !cosmoIn ? chart.cusps : [];
    const inItems = layout(ptsIn.filter(noAxis), bi ? sep(R.pl, R.plDeg, 30 * K, 26 * K) : sep(R.pl, R.plDeg, 34 * K, 28 * K), inLines, R.pl, R.plDeg);
    const outItems = bi ? layout(opts.outer.points.filter((p) => noAxis(p) && (!opts.showOuter || opts.showOuter.includes(p.id))), sep(R.opl, R.oplDeg, 30 * K, 26 * K), oList.map((x) => x[0]), R.opl, R.oplDeg) : [];

    let s = `<svg class="nw${bi ? ' bi' : ''}${cosmoIn ? ' cosmo' : ''}" data-rin="${R.zodIn}" viewBox="${-PADV} ${-PADV} ${S + 2 * PADV} ${S + 2 * PADV}" role="img" aria-label="${esc(opts.label || (lang === 'ru' ? 'Колесо карты' : 'Chart wheel'))}" xmlns="http://www.w3.org/2000/svg">`;
    // поле внутри пояса; у двойного внутренний круг (натал) — сиреневый, внешний — без фона, чтобы планеты в нём читались чётко (15.10, Алина)
    s += `<circle cx="${C}" cy="${C}" r="${R.zodIn}" fill="var(--w-paper)"/>`;
    if (bi) s += `<circle cx="${C}" cy="${C}" r="${R.ring}" fill="var(--w-ring-in)" stroke="var(--w-ring-line)" stroke-width="1.6"/>`;
    s += `<circle cx="${C}" cy="${C}" r="${R.asp}" fill="var(--w-inner)" stroke="${bi ? 'var(--w-ring-line)' : 'var(--w-line2)'}" stroke-width="${bi ? 1.4 : 1}"/>`;
    // пояс знаков: пастельные сектора с просветами, значки знаков — чёрные (контрастно)
    for (let i = 0; i < 12; i++) {
      const a0 = ang(i * 30) + 0.35, a1 = ang(i * 30 + 30) - 0.35;
      const el = ELEM[i % 4];
      s += `<path d="M${P(R.zodOut, a0)} A${R.zodOut} ${R.zodOut} 0 0 0 ${P(R.zodOut, a1)} L${P(R.zodIn, a1)} A${R.zodIn} ${R.zodIn} 0 0 1 ${P(R.zodIn, a0)}Z" fill="var(--w-${el})"/>`;
      const [gx, gy] = xy((R.zodOut + R.zodIn) / 2, ang(i * 30 + 15));
      s += `<text x="${r1(gx)}" y="${r1(gy + 0.5)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_G}" font-size="${GS.sign}" font-weight="700" fill="var(--w-sign)" data-tip="${esc(SIGNS[lang][i])}">${SIGN_G[i]}${VS}</text>`;
    }
    // шкала градусов по внутреннему краю пояса
    let ticks = '';
    for (let d = 0; d < 360; d += 1) {
      const len = d % 10 === 0 ? 9 : d % 5 === 0 ? 6 : 3;
      ticks += `M${P(R.zodIn, ang(d))}L${P(R.zodIn - len, ang(d))}`;
    }
    s += `<path d="${ticks}" stroke="var(--w-tick)" stroke-width=".7" fill="none"/>`;
    s += `<circle cx="${C}" cy="${C}" r="${R.zodIn}" fill="none" stroke="var(--w-line2)" stroke-width=".8"/>`;

    // ---- дома внутренней карты: линии только в своём круге (через внешний круг не идут — там планеты второй карты), ----
    // оси цветом (AC — красная, IC — салатовая, DC — синяя, MC — жёлтая), номер и градус — снаружи пояса (как в Sotis)
    const AX = { 0: ['AC', 'var(--w-ax-asc)', 'var(--w-ax-asc-ink)'], 3: ['IC', 'var(--w-ax-ic)', 'var(--w-ax-ic-ink)'], 6: ['DC', 'var(--w-ax-dsc)', 'var(--w-ax-dsc-ink)'], 9: ['MC', 'var(--w-ax-mc)', 'var(--w-ax-mc-ink)'] };
    const HOUSE = lang === 'ru' ? 'Дом ' : 'House ';
    let hnum = '', axes = '';
    if (chart.cusps && !cosmoIn) {
      const rEnd = bi ? R.ring : R.zodIn;
      for (let i = 0; i < 12; i++) {
        const c = chart.cusps[i], ax = AX[i];
        const a = ang(c);
        // оси — поверх линий внешней карты, но под планетами
        if (ax) axes += L(R.asp, rEnd, a, `stroke="${ax[1]}" stroke-width="3.2" stroke-linecap="round"`);
        else s += L(R.asp, rEnd, a, `stroke="var(--w-cusp)" stroke-width="1.2"`);
        const tip = (bi && opts.labels && opts.labels.in ? opts.labels.in + ' · ' : '') + (ax ? ax[0] + ' · ' : '') + HOUSE + (i + 1) + ' · ' + fmtDeg(c, lang);
        const label = ax ? ax[0] : ROMAN[i], dg = String(Math.floor(norm(c) % 30));
        const fs = ax ? GS.hlAx : GS.hl;
        // подпись прижата к поясу снаружи, на продолжении линии
        const w = textW(label, fs) + textW(dg, GS.hd) + 1;
        const [hx, hy] = xy(R.zodOut + (ax ? 8 : 6) + extR(a, w, fs), a);
        s += `<text x="${r1(hx)}" y="${r1(hy)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_T}" font-size="${fs}" font-weight="800" fill="${ax ? ax[2] : 'var(--w-cusp-ink)'}" data-tip="${esc(tip)}">${label}<tspan font-size="${GS.hd}" font-weight="800" dy="-6">${dg}</tspan></text>`;
        if (bi) { // номер дома — внутри круга аспектов, посередине дома
          const next = chart.cusps[(i + 1) % 12], mid = c + norm(next - c) / 2;
          const [nx, ny] = xy(R.hNum, ang(mid));
          hnum += `<text x="${r1(nx)}" y="${r1(ny)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_T}" font-size="${r1(11.5 * K)}" font-weight="800" fill="var(--w-cusp-ink)" stroke="var(--w-inner)" stroke-width="3" paint-order="stroke" data-tip="${esc(tip)}">${i + 1}</text>`;
        }
      }
    }

    // ---- дома внешней карты (транзиты на место, дирекции, прогрессии, вторая карта…) ----
    // фиолетовые линии только во внешнем круге; номер дома и градус — у пояса знаков, рядом с линией;
    // если там стоит планета — подпись уходит на другую сторону линии или чуть дальше. Оси внешней карты — пунктиром.
    let ocusps = '', olabels = '';
    if (outerHouses) {
      const list = oList;
      const busy = outItems.map((it) => { const [x, y] = xy(R.opl, it.ang); return { x, y, r: GS.bg + 1.5 }; })
        .concat(outItems.map((it) => { const [x, y] = xy(R.oplDeg, it.ang); return { x, y, r: 11 }; }));
      const placed = [];
      const axAng = []; // оси натала больше не проходят через внешний круг — подписям мешают только планеты и соседние подписи
      // штраф места: налезть на планету или другую подпись — плохо, лечь на линию оси — терпимо (у подписи есть подложка)
      const cost = (b) => 3 * busy.filter((g) => { const dx = Math.max(Math.abs(g.x - b.x) - b.w / 2, 0), dy = Math.max(Math.abs(g.y - b.y) - b.h / 2, 0); return dx * dx + dy * dy < g.r * g.r; }).length
        + 3 * placed.filter((q) => Math.abs(q.x - b.x) < (q.w + b.w) / 2 + 1 && Math.abs(q.y - b.y) < (q.h + b.h) / 2 + 1).length
        + axAng.filter((x) => Math.abs(d180(b.a - x)) < (extT(b.a, b.w, b.h) + 2) / b.r * 180 / Math.PI).length;
      for (const [c, i] of list) {
        const ax = AX[i], a = ang(c);
        // оси внешней карты — тем же цветом, что у натала, но пунктиром
        ocusps += ax
          ? L(R.ring, R.zodIn, a, `stroke="${ax[1]}" stroke-width="2.8" stroke-dasharray="7 4" stroke-linecap="round"`)
          : L(R.ring, R.zodIn, a, `stroke="var(--w-cusp2)" stroke-width="1.4"`);
        const lab = ax ? ax[0] : String(i + 1), deg = String(Math.floor(norm(c) % 30));
        const fs = ax ? GS.ocAx : GS.oc, w = textW(lab, fs) + textW(deg, GS.od) + 1, h = fs + 2;
        let best = null, bestCost = Infinity;
        for (const [side, gap] of [[1, 4], [-1, 4], [1, 16], [-1, 16], [1, 30], [-1, 30]]) {
          let la = a, rc = R.zodIn - 3 - extR(a, w, h);
          for (let k = 0; k < 2; k++) { la = a + side * ((extT(la, w, h) + gap) / rc) * 180 / Math.PI; rc = R.zodIn - 3 - extR(la, w, h); }
          const [x, y] = xy(rc, la), b = { x, y, w, h, a: la, r: rc }, k = cost(b) + gap / 100; // при равенстве — ближе к линии
          if (k < bestCost) { best = b; bestCost = k; }
          if (k < 1) break;
        }
        placed.push(best);
        const tip = (opts.labels && opts.labels.out ? opts.labels.out + ' · ' : '') + (ax ? ax[0] + ' · ' : '') + HOUSE + (i + 1) + ' · ' + fmtDeg(c, lang);
        olabels += `<text class="nw-oc" x="${r1(best.x)}" y="${r1(best.y)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_T}" font-size="${fs}" font-weight="800" fill="${ax ? ax[2] : 'var(--w-cusp2-ink)'}" stroke="var(--w-paper)" stroke-width="3" paint-order="stroke" data-tip="${esc(tip)}">${lab}<tspan font-size="${GS.od}" dy="-5">${deg}</tspan></text>`;
      }
    }
    s += ocusps + axes + olabels; // подписи внешних куспидов — поверх осей натала, чтобы линии их не перечёркивали

    // ---- аспекты: линии между точками на внутреннем круге и значок посередине ----
    const pos = {};
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
      // ключ аспекта — по нему таблица аспектов и колесо подсвечивают друг друга (linkAspects)
      const ak = bi ? x.a + '>' + x.b : [x.a, x.b].sort().join('~');
      const akA = `data-ak="${esc(ak)}" data-pa="${esc(x.a)}" data-pb="${esc(x.b)}"`;
      let g = '';
      if (opts.aspGlyphs !== false && len > 70 && x.type !== 'conj' && ASP_G[x.type]) {
        let tt = x.type === 'opp' ? 0.3 : 0.5, gx = x0 + (x1 - x0) * tt, gy = y0 + (y1 - y0) * tt;
        for (const k of [0.38, 0.62, 0.3, 0.7]) { if (!glyphsAt.some(([a, b]) => Math.hypot(a - gx, b - gy) < 16)) break; tt = k; gx = x0 + (x1 - x0) * tt; gy = y0 + (y1 - y0) * tt; }
        glyphsAt.push([gx, gy]);
        g = `<g class="nw-asp" ${akA} data-tip="${esc(tip)}"><circle cx="${r1(gx)}" cy="${r1(gy)}" r="${r1(7.5 * K)}" fill="var(--w-asp-bg)" stroke="${col}" stroke-width="1"/><text x="${r1(gx)}" y="${r1(gy + 0.5)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_G}" font-size="${r1(10 * K)}" fill="${col}">${ASP_G[x.type]}${VS}</text></g>`;
      }
      aspHTML += `<g class="nw-asp" ${akA} data-tip="${esc(tip)}"><line x1="${r1(x0)}" y1="${r1(y0)}" x2="${r1(x1)}" y2="${r1(y1)}" stroke="transparent" stroke-width="10"/><line class="al" x1="${r1(x0)}" y1="${r1(y0)}" x2="${r1(x1)}" y2="${r1(y1)}" stroke="${col}" stroke-width="${r1(0.9 + st * 1.4)}" opacity="${r1(0.55 + st * 0.45)}" ${minor ? 'stroke-dasharray="4 3"' : ''}/></g>`;
      aspGly += g;
    }
    s += aspHTML + aspGly + hnum;

    // ---- планеты ----
    function ring(items, rGlyph, rDeg, tickFrom, tickTo, cls, sideLabel) {
      const out = cls === 'out';
      const tickCol = out ? 'var(--w-planet2)' : 'var(--w-ink)';
      const gSize = out ? GS.out : GS.in;
      let h = '';
      for (const it of items) {
        const p = it.p, a0 = ang(p.lon);
        const [gx, gy] = xy(rGlyph, it.ang), [dx, dy] = xy(rDeg, it.ang);
        const g = GLYPH[p.id] || '•';
        const isTxt = /^[A-Z]{2}$/.test(g);
        const name = NAMES[lang][p.id] || p.id;
        const tip = `${name}${sideLabel ? ' · ' + sideLabel : ''}: ${fmtDeg(p.lon, lang)}${p.house ? ` · ${lang === 'ru' ? 'дом' : 'house'} ${p.house}` : ''}${p.retro ? (lang === 'ru' ? ' · ретроградный' : ' · retrograde') : ''}`;
        h += `<g class="nw-pl ${cls}" data-id="${p.id}" data-tip="${esc(tip)}" tabindex="0">`;
        h += L(tickFrom, tickTo, a0, `stroke="${tickCol}" stroke-width="2.2"`);
        if (Math.abs(d180(it.ang - a0)) > 1.2) { const lr = rGlyph + GS.bg - 1; h += `<line x1="${r1(xy(tickTo, a0)[0])}" y1="${r1(xy(tickTo, a0)[1])}" x2="${r1(xy(lr, it.ang)[0])}" y2="${r1(xy(lr, it.ang)[1])}" stroke="var(--w-line2)" stroke-width=".8"/>`; }
        const [px, py] = xy(R.asp, a0);
        h += `<circle cx="${r1(px)}" cy="${r1(py)}" r="${out ? 2.3 : 2.7}" fill="${tickCol}"/>`;
        h += `<circle class="pl-bg" cx="${r1(gx)}" cy="${r1(gy)}" r="${GS.bg}" fill="${!bi ? 'var(--w-plbg)' : out ? 'var(--w-paper)' : 'var(--w-ring-in)'}" stroke="transparent"/>`;
        h += isTxt
          ? `<text x="${r1(gx)}" y="${r1(gy)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_T}" font-size="${r1(13 * K)}" font-weight="800" fill="var(--w-ink)">${g}</text>`
          : `<text x="${r1(gx)}" y="${r1(gy + 0.5)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_G}" font-size="${gSize}" font-weight="700" fill="var(--w-ink)">${g}${VS}</text>`;
        if (opts.degrees !== false) h += `<text x="${r1(dx)}" y="${r1(dy)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_T}" font-size="${GS.deg}" font-weight="800" fill="${out ? 'var(--w-deg2)' : 'var(--w-deg)'}">${degTxt(p.lon)}${p.retro ? `<tspan fill="var(--w-hard)" font-size="${GS.deg - 2.5}" font-weight="800">R</tspan>` : ''}</text>`;
        else if (p.retro) h += `<text x="${r1(dx)}" y="${r1(dy)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_T}" font-size="${GS.deg - 2.5}" font-weight="800" fill="var(--w-hard)">R</text>`;
        h += '</g>';
      }
      return h;
    }
    if (bi) {
      // внутренний круг — натал, внешний — вторая карта (транзиты, соляр, партнёр…); у каждого своя граница
      s += ring(inItems, R.pl, R.plDeg, R.ring, R.ring - 8, 'in', opts.labels && opts.labels.in);
      s += ring(outItems, R.opl, R.oplDeg, R.zodIn, R.zodIn - 8, 'out', opts.labels && opts.labels.out);
    } else s += ring(inItems, R.pl, R.plDeg, R.zodIn, R.zodIn - 11, 'in', opts.labels && opts.labels.in);
    s += '</svg>';
    return s;
  }

  // ---------- подсказки: наведение, фокус и касание ----------
  let tipEl = null;
  function bindTips(rootEl) {
    if (!rootEl) return;
    // один раз на элемент: колесо перерисовывается десятки раз в секунду (стрелки, «Пуск»), а слушатели живут на контейнере
    if (rootEl.dataset.tipBound) return;
    rootEl.dataset.tipBound = '1';
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

  /**
   * Наведение связывает колесо и таблицу аспектов (по просьбе Алины 14.10): навёл на клетку таблицы — на колесе загорается
   * этот аспект и обе планеты, остальные линии бледнеют; навёл на линию аспекта на колесе — загорается клетка таблицы;
   * навёл на планету — горят все её аспекты. scope — общий предок колеса (svg.nw) и таблицы (td[data-ak]).
   * Ключи: data-ak — «a>b» у двойного колеса (a — внутренний круг) и «a~b» (по алфавиту) у одинарного; data-pa / data-pb — точки.
   */
  function linkAspects(scope) {
    if (!scope || scope.dataset.akLinked) return;
    scope.dataset.akLinked = '1';
    let on = false;
    const clear = () => {
      if (!on) return; on = false;
      scope.querySelectorAll('.has-hl').forEach((x) => x.classList.remove('has-hl'));
      scope.querySelectorAll('.hl').forEach((x) => x.classList.remove('hl'));
    };
    const light = (match) => {
      clear();
      const svgs = scope.querySelectorAll('svg.nw');
      let any = false;
      scope.querySelectorAll('[data-ak]').forEach((el) => { if (match(el)) { el.classList.add('hl'); any = true; } });
      if (!any) return;
      on = true;
      svgs.forEach((s) => {
        s.classList.add('has-hl');
        // планеты горящих аспектов: у двойного колеса a — во внутреннем круге, b — во внешнем
        const bi = s.classList.contains('bi');
        s.querySelectorAll('.nw-asp.hl').forEach((g) => {
          const a = g.getAttribute('data-pa'), b = g.getAttribute('data-pb');
          s.querySelectorAll(bi ? `.nw-pl.in[data-id="${a}"], .nw-pl.out[data-id="${b}"]` : `.nw-pl[data-id="${a}"], .nw-pl[data-id="${b}"]`).forEach((p) => p.classList.add('hl'));
        });
      });
      // заголовки строки и столбца у горящих клеток
      scope.querySelectorAll('td.hl[data-ak]').forEach((td) => {
        const tr = td.parentElement, tbl = td.closest('table'); if (!tr || !tbl) return;
        const th = tr.querySelector('th'); if (th) th.classList.add('hl');
        const head = tbl.rows[0] && tbl.rows[0].cells[td.cellIndex]; if (head) head.classList.add('hl');
      });
    };
    scope.addEventListener('pointerover', (e) => {
      const el = e.target.closest && e.target.closest('[data-ak], .nw-pl[data-id]');
      if (!el || !scope.contains(el)) { clear(); return; }
      if (el.hasAttribute('data-ak')) { const k = el.getAttribute('data-ak'); light((x) => x.getAttribute('data-ak') === k); return; }
      // планета: все её аспекты (у двойного колеса — только со своей стороны)
      const id = el.getAttribute('data-id'), svg = el.closest('svg.nw'), bi = svg && svg.classList.contains('bi');
      const side = el.classList.contains('out') ? 'b' : 'a';
      light((x) => (bi ? x.getAttribute('data-p' + side) === id : x.getAttribute('data-pa') === id || x.getAttribute('data-pb') === id));
    });
    scope.addEventListener('pointerout', (e) => { if (!e.relatedTarget || !scope.contains(e.relatedTarget) || !e.relatedTarget.closest('[data-ak], .nw-pl[data-id]')) clear(); });
    scope.addEventListener('pointerleave', clear);
  }

  root.NWheel = { svg, bindTips, linkAspects, spread, spreadAround, place1D, fmtDeg, GLYPH, SIGN_G, ASP_G, NAMES, SIGNS, ASP_N };
})(typeof window !== 'undefined' ? window : globalThis);
