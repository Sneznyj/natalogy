/* Окна-расшифровки: «что значит этот транзит» — по нажатию на строку транзита (на «Карте» рядом с колесом
   и в «Профи → Транзиты»). Тексты — TX.trx (texts-*-pro.js), планеты/дома — TX.P, TX.H. */
(function (root) {
  'use strict';
  const UI = root.NUI, W = root.NWheel;
  const { t, esc } = UI;
  const VS = '︎';
  const pg = (id) => root.NDay.pg(id);
  /** soft — помогает, hard — напрягает, conj — смотря по планетам (у Юпитера, Венеры, Солнца — скорее плюс). */
  function tone(T, type) {
    if (type === 'trine' || type === 'sextile') return 'soft';
    if (type === 'conj') return ['jupiter', 'venus', 'sun'].includes(T) ? 'soft' : ['saturn', 'pluto', 'mars', 'uranus', 'neptune'].includes(T) ? 'hard' : 'conj';
    return 'hard';
  }
  const nat = (type) => (type === 'conj' ? 'conj' : type === 'trine' || type === 'sextile' ? 'soft' : 'hard');
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
  /** «Сатурн давит на твоё Солнце» — как в событиях дня. */
  function phrase(T, N, type) {
    const TX = UI.TX(), tp = TX.P[T] || { name: T }, np = TX.P[N] || { name: N }, a = TX.ASP[type];
    if (!a) return `${tp.name} ${type} ${np.name}`;
    return `${tp.name} ${a.verb} ${(a.dat ? np.yourDat : np.yourAcc) || np.name}`;
  }
  // ---------- дома: за какой дом отвечает планета, по какому дому идёт транзит ----------
  const CO_RULE = { sun: ['leo'], moon: ['cancer'], mercury: ['gemini', 'virgo'], venus: ['taurus', 'libra'], mars: ['aries', 'scorpio'], jupiter: ['sagittarius', 'pisces'], saturn: ['capricorn', 'aquarius'], uranus: ['aquarius'], neptune: ['pisces'], pluto: ['scorpio'] };
  /** Какими домами натала управляет планета: знак на куспиде дома — её знак (современный и классический управитель). */
  function rulesOf(id, natal) {
    if (!natal || !natal.houses || !CO_RULE[id]) return [];
    return natal.houses.cusps.map((c, i) => [root.AstroCore.signOf(c), i + 1]).filter(([s]) => CO_RULE[id].includes(s)).map(([, h]) => h);
  }
  /** В каком доме натала стоит точка карты (ASC — 1-й, MC — 10-й). */
  function natalHouse(id, natal) { if (!natal || !natal.houses) return null; if (id === 'asc') return 1; if (id === 'mc') return 10; const b = natal.byId[id]; return b ? b.house || root.AstroCore.houseOf(b.lon, natal.houses.cusps) : null; }
  /** По какому дому натала идёт транзитная планета в момент at. */
  function transitHouse(T, natal, at) { if (!natal || !natal.houses) return null; try { const b = root.AstroCore.body(T, at || new Date()); return b ? root.AstroCore.houseOf(b.lon, natal.houses.cusps) : null; } catch (er) { return null; } }
  const ord = (n) => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
  /** Скобки к планете: «(упр. 7, 8 д. · идёт по 9 д.)», «(упр. 1 д. · в 11 д.)». */
  function bracket(rules, house, transiting) {
    const en = UI.lang() === 'en', parts = [];
    if (rules.length) parts.push(en ? `rules ${rules.join(', ')}` : `упр. ${rules.join(', ')} д.`);
    if (house) parts.push(en ? (transiting ? `in ${ord(house)}` : `in ${ord(house)}`) : (transiting ? `идёт по ${house} д.` : `в ${house} д.`));
    return parts.length ? `(${parts.join(' · ')})` : '';
  }
  /** Строка для списков транзитов: «♄ Сатурн (упр. 7, 8 д. · идёт по 9 д.) □ ☉ Солнце (упр. 1 д. · в 11 д.)». at — момент (по нему — дом транзита). */
  function houseLine(e, natal, at) {
    if (!natal || !natal.houses) return '';
    const TX = UI.TX(), tp = TX.P[e.T] || { name: e.T }, np = TX.P[e.N] || { name: e.N };
    return `${pg(e.T)} ${esc(tp.name)} <span class="hb">${esc(bracket(rulesOf(e.T, natal), transitHouse(e.T, natal, at), true))}</span> ${W.ASP_G[e.type] || ''}${VS} ${pg(e.N)} ${esc(np.name)} <span class="hb">${esc(bracket(rulesOf(e.N, natal), natalHouse(e.N, natal), false))}</span>`;
  }
  /** Как транзитная планета влияет на натальную — с учётом домов: по какому дому идёт транзит, какими управляет, где стоит и чем управляет натальная. */
  function houseStory(e, natal, at, gender) {
    if (!natal || !natal.houses) return null;
    const TX = UI.TX(), H = TX.H, X = TX.trx, en = UI.lang() === 'en';
    const tp = TX.P[e.T] || { name: e.T }, np = TX.P[e.N] || { name: e.N };
    const tIn = transitHouse(e.T, natal, at), tR = rulesOf(e.T, natal), nIn = natalHouse(e.N, natal), nR = rulesOf(e.N, natal);
    if (!tIn || !nIn) return null;
    const uniq = (a) => a.filter((x, i) => x && a.indexOf(x) === i);
    const from = uniq([tIn].concat(tR)), to = uniq([nIn].concat(nR));
    const tn = tone(e.T, e.type), combo = (X && X.combo[e.T] ? X.combo[e.T][nat(e.type)] : '') || '';
    const and = (list, w) => (list.length > 1 ? list.slice(0, -1).join(', ') + ' ' + w + ' ' + list[list.length - 1] : list[0] || '');
    if (en) {
      const p1 = `Transiting ${tp.name} is moving through your ${ord(tIn)} house — ${H[tIn].area}.` + (tR.length ? ` In your chart ${tp.name} rules house${tR.length > 1 ? 's' : ''} ${and(tR.map(String), 'and')}: ${tR.map((h) => H[h].area).join('; ')}.` : '');
      const p2 = `Your natal ${np.name} sits in the ${ord(nIn)} house — ${H[nIn].area}` + (nR.length ? ` — and rules house${nR.length > 1 ? 's' : ''} ${and(nR.map(String), 'and')}: ${nR.map((h) => H[h].area).join('; ')}` : '') + '.';
      const verb = tn === 'soft' ? 'now support' : tn === 'hard' ? 'now press on' : 'now merge with';
      const p3 = `How it plays out: matters connected ${and(from.map((h) => H[h].with), 'and')} ${verb} the themes of ${and(to.map((h) => `“${H[h].area}”`), 'and')}${combo ? ' — ' + combo : ''}.`;
      return { title: `How ${tp.name} affects your ${np.name} through the houses`, ps: [p1, p2, p3], tIn, nIn, tR, nR };
    }
    const dom = (list) => `${and(list.map(String), 'и')} ${list.length > 1 ? 'дома' : 'дом'}`;
    const adj = (id, stem) => stem + (['moon', 'venus', 'lilith', 'mc'].includes(id) ? 'ая' : id === 'sun' ? 'ое' : 'ый'); // «натальная Луна», «натальное Солнце»
    const p1 = `${adj(e.T, 'Транзитн')} ${tp.name} сейчас идёт по твоему ${tIn} дому — ${H[tIn].area}.` + (tR.length ? ` В твоей карте ${tp.name} отвечает за ${dom(tR)}: ${tR.map((h) => H[h].area).join('; ')}.` : '');
    const p2 = `${adj(e.N, 'Натальн')} ${np.name} стоит в ${nIn} доме — ${H[nIn].area}` + (nR.length ? ` — и отвечает за ${dom(nR)}: ${nR.map((h) => H[h].area).join('; ')}` : '') + '.';
    const verb = tn === 'soft' ? 'сейчас помогают темам' : tn === 'hard' ? 'сейчас давят на темы' : 'сейчас сливаются с темами';
    const p3 = `Как это работает: дела, связанные ${and(from.map((h) => H[h].with), 'и')}, ${verb} ${and(to.map((h) => `«${H[h].area}»`), 'и')}${combo ? ' — ' + combo : ''}.`;
    return { title: `Как ${tp.name} влияет на ${np.yourAcc || np.name} через дома`, ps: [p1, p2, TX.gend ? TX.gend(p3, gender) : p3], tIn, nIn, tR, nR };
  }

  /** Короткая строка «итог» для списков. */
  function short(e) { const X = UI.TX().trx; return X && X.combo[e.T] ? X.combo[e.T][nat(e.type)] : ''; }

  /**
   * e: { T — транзитная планета, N — точка карты, type, orb?, applying?, start?, end?, exact?:[Date], nHouse? }
   * ctx: { natal?, person? }
   */
  function transit(e, ctx) {
    ctx = ctx || {};
    const TX = UI.TX(), X = TX.trx, tz = UI.here().tz;
    if (!X) return;
    const tn = tone(e.T, e.type), n = nat(e.type);
    const tp = TX.P[e.T] || { name: e.T }, np = TX.P[e.N] || { name: e.N, area: '', short: '' };
    const an = TX.ASP[e.type] ? TX.ASP[e.type].name : e.type;
    const nb = ctx.natal && ctx.natal.byId ? ctx.natal.byId[e.N] : null;
    const nh = e.nHouse || (nb && nb.house) || null;
    const combo = (X.combo[e.T] || {})[n] || '';
    const phase = e.orb != null && e.orb < 0.3 ? X.phase.exact : e.applying === true ? X.phase.applying : e.applying === false ? X.phase.separating : '';
    const g = `${pg(e.T)}${W.ASP_G[e.type] || ''}${VS}${pg(e.N)}`;
    const at = e.at || (e.start && e.end ? (Date.now() >= +e.start && Date.now() <= +e.end ? new Date() : (e.exact && e.exact[0]) || e.start) : new Date());
    const hs = houseStory(e, ctx.natal, at, ctx.person && ctx.person.gender);
    const hl = houseLine(e, ctx.natal, at);
    const gend = (s) => (TX.gend ? TX.gend(s, ctx.person && ctx.person.gender) : s);
    const when = [];
    if (e.start && e.end) when.push([t('trx.period', 'В силе'), `${UI.fmtDay(e.start, tz, { year: 'numeric' })} — ${UI.fmtDay(e.end, tz, { year: 'numeric' })}`]);
    if (e.exact && e.exact.length) when.push([t('trx.exact', 'Точно'), e.exact.map((x) => UI.fmtDay(x, tz, { year: 'numeric', hour: '2-digit' })).join(' · ')]);
    if (e.orb != null) when.push([t('orb', 'орбис'), `${e.orb.toFixed(2)}°${e.applying != null ? (e.applying ? ' ↗' : ' ↘') : ''}`]);
    const html = `<div class="stack s18 trx">
      <div class="trx-head"><span class="trx-g ${tn}">${g}</span><div class="stack s6" style="min-width:0"><b class="trx-t">${esc(phrase(e.T, e.N, e.type))}</b><span class="small muted">${esc(cap(an))} · ${hl || `${pg(e.T)} ${esc(tp.name)} → ${pg(e.N)} ${esc(np.name)}`}</span>
        ${when.length ? `<div class="tags">${when.map(([k, v]) => `<span class="tag plain">${esc(k)}: <b class="mono" style="font-size:calc(12px*var(--fz))">${esc(v)}</b></span>`).join('')}</div>` : ''}</div></div>
      <div class="trx-sum ${tn}"><span class="label">${t('trx.sum', 'Что это значит')}</span><p><b>${esc(cap(combo))}</b>${np.area ? ` — ${esc(t('trx.inTheme', 'в теме «{a}»', { a: np.area }))}` : ''}.</p><div class="todo">${esc(gend(X.advice[tn === 'conj' ? 'conj' : tn]))}</div></div>
      <div class="grid2">
        <div class="card soft stack s6"><span class="label">${pg(e.T)} ${esc(tp.name)}</span><p class="small">${esc(X.planet[e.T] || '')}</p></div>
        <div class="card soft stack s6"><span class="label">${W.ASP_G[e.type] || ''}${VS} ${esc(cap(an))}</span><p class="small">${esc(X.aspect[e.type] || '')}</p>${phase ? `<p class="small muted">${esc(phase)}</p>` : ''}</div>
      </div>
      ${hs ? `<div class="card soft stack s6 trx-houses"><span class="label">${esc(hs.title)}</span>${hs.ps.map((x, i) => `<p class="small${i === 2 ? ' trx-sum2' : ''}">${esc(x)}</p>`).join('')}</div>` : ''}
      <div class="card soft stack s6"><span class="label">${t('trx.touched', 'Что затронуто в твоей карте')}</span><p class="small"><b>${pg(e.N)} ${esc(np.name)}</b> — ${esc(gend(np.short || np.area || ''))}.${nh && TX.H[nh] ? ' ' + esc(t('trx.house', 'В карте — {n} дом: {a}.', { n: nh, a: TX.H[nh].area })) : ''}</p></div>
      <details class="card soft"><summary>${t('trx.whatT', 'Что такое транзит')}</summary><p class="small" style="margin-top:8px">${esc(X.what)}</p></details>
    </div>`;
    UI.modal(html, { title: `${tp.name} ${an} ${np.name}`, eyebrow: t('trx.eyebrow', 'Транзит') });
  }

  // ---------- короткая подсказка по нажатию на аспект (Профи: клетка таблицы аспектов или линия на колесе; 15.10, Алина) ----------
  // что даёт аспект — по характеру планет (тон задаёт более медленная планета или внешняя карта) и с учётом домов: где стоят и чем управляют
  const SLOW = ['moon', 'mercury', 'venus', 'sun', 'mars', 'jupiter', 'saturn', 'chiron', 'uranus', 'neptune', 'pluto', 'node'];
  const natureOf = (type) => { if (type === 'conj') return 'conj'; const a = (root.AstroCore.ASPECTS || []).find((x) => x.id === type); return a && a.nature === 'soft' ? 'soft' : 'hard'; };
  const cuspN = (id) => (/^c(\d+)$/.test(id) ? +id.slice(1) : id === 'asc' ? 1 : id === 'mc' ? 10 : null);
  let card = null, cardOff = null;
  function closeCard() { if (card) { card.remove(); card = null; } if (cardOff) { cardOff(); cardOff = null; } }
  /**
   * info: { a, b, type, orb, applying, kind: natal | transit | solar | lunar | own | synastry | directions | progressions,
   *         chart — карта с домами, по которой считаем дома (внутренний круг), bLon — долгота точки b, если она из второй карты,
   *         labels: { in, out }, at — момент (для транзита), person }
   * at: { x, y } — где нажали (подсказка встаёт рядом).
   */
  // ---------- «что даёт аспект» (16.10, Алина: «при нажатии на аспект расписывай, что он даёт») — тексты aspect-texts.js ----------
  const PT_RANK = (id) => (/^c\d+$/.test(id) ? 6 : id === 'asc' || id === 'mc' ? 5 : id === 'node' ? 4 : id === 'lilith' ? 3 : id === 'chiron' ? 2 : id === 'fortune' ? 1 : 0);
  /** [что даёт, совет] для пары точек и характера аспекта (c — соединение, s — гармония, h — напряжение). */
  function aspectGives(a, b, nk) {
    const TX = UI.TX(), AX = TX.aspx || (root.NAspTexts || {})[UI.lang()] || {}, H = TX.H;
    // планета к самой себе (транзит к своему месту, «Солнце — Солнце» в синастрии, возвращения)
    if (a === b && AX.self && AX.self[a] && AX.self[a][nk]) return { g: AX.self[a][nk][0], t: AX.self[a][nk][1] };
    const pair = AX.pairs && AX.pairs[[a, b].sort().join('|')];
    if (pair && pair[nk]) return { g: pair[nk][0], t: pair[nk][1] };
    const area = (id) => (/^c\d+$/.test(id) ? (H[+id.slice(1)] || {}).area : id === 'asc' ? (H[1] || {}).area : id === 'mc' ? (H[10] || {}).area : TX.P[id] ? TX.P[id].area : '') || '';
    const [pt, pl] = PT_RANK(a) >= PT_RANK(b) ? [a, b] : [b, a];
    const fill = (s) => String(s || '').replace('{n}', /^c\d+$/.test(pt) ? pt.slice(1) : '').replace('{a}', area(pt));
    const tip = (AX.tipGen || {})[nk] || '';
    if (PT_RANK(pl) >= 5 || !(AX.role || {})[pl]) return { g: fill(((AX.pointPair || {})[nk] || '').replace('{b}', area(pl))), t: tip };
    const ptKey = /^c\d+$/.test(pt) ? 'cusp' : pt;
    const head = AX.point && AX.point[ptKey] ? fill(AX.point[ptKey][nk]) : '';
    return { g: (head ? head + ' ' : '') + AX.role[pl][nk] + '.', t: tip };
  }

  function aspectCard(info, at) {
    closeCard();
    $$hide();
    const TX = UI.TX(), X = TX.trx || {}, H = TX.H, en = UI.lang() === 'en', AC = root.AstroCore;
    const AX = TX.aspx || (root.NAspTexts || {})[UI.lang()] || {}, AL = AX.lbl || {};
    const ch = info.chart && info.chart.houses ? info.chart : null;
    const bi = info.bLon != null;
    const nm = (id) => (TX.P[id] ? TX.P[id].name : /^c\d+$/.test(id) ? ({ c4: 'IC', c7: 'DC' }[id] || (en ? 'Cusp ' : 'Куспид ') + id.slice(1)) + (['c4', 'c7'].includes(id) ? (en ? ` (${id.slice(1)}th house)` : ` (${id.slice(1)} дом)`) : '') : id);
    const area = (id) => (TX.P[id] ? TX.P[id].area : cuspN(id) && H[cuspN(id)] ? H[cuspN(id)].area : '');
    const gl = (id) => (W.GLYPH[id] ? `<span class="g">${W.GLYPH[id]}${/^[A-Z]/.test(W.GLYPH[id]) ? '' : VS}</span>` : /^c\d+$/.test(id) ? `<span class="g t">${{ c4: 'IC', c7: 'DC' }[id] || id.slice(1)}</span>` : '');
    // дома: где стоит точка и какими домами управляет (по знакам на куспидах той же карты)
    const houseOf = (id, lon) => { if (!ch) return null; const n = cuspN(id); if (n) return null; if (lon != null) return AC.houseOf(lon, ch.houses.cusps); const p = ch.byId && ch.byId[id]; return p ? p.house || AC.houseOf(p.lon, ch.houses.cusps) : null; };
    const hA = houseOf(info.a), hB = bi ? houseOf(info.b, info.bLon) : houseOf(info.b);
    const rA = ch ? rulesOf(info.a, ch) : [], rB = ch ? rulesOf(info.b, ch) : [];
    const moving = info.kind === 'transit';
    // кто задаёт тон: у двух карт — внешняя (транзит, соляр, партнёр), в одной карте — более медленная планета
    const actor = bi ? info.b : (SLOW.indexOf(info.a) > SLOW.indexOf(info.b) ? info.a : info.b);
    const other = actor === info.a ? info.b : info.a;
    const n = natureOf(info.type);
    const tn = n === 'conj' ? tone(actor, 'conj') : n;
    const combo = (X.combo && X.combo[actor] ? X.combo[actor][n] : '') || (X.combo && X.combo[other] ? X.combo[other][n] : '') || '';
    const an = (TX.ASP[info.type] && TX.ASP[info.type].name) || (W.ASP_N[UI.lang()] || W.ASP_N.ru)[info.type] || info.type;
    const aspTxt = (X.aspect || {})[info.type] || '';
    const uniq = (a) => a.filter((x, i) => x && a.indexOf(x) === i).slice(0, 3);
    const and = (list, w) => (list.length > 1 ? list.slice(0, -1).join(', ') + ' ' + w + ' ' + list[list.length - 1] : list[0] || '');
    const fromH = uniq([actor === info.a ? (cuspN(info.a) || hA) : (cuspN(info.b) || hB)].concat(actor === info.a ? rA : rB));
    const toH = uniq([other === info.a ? (cuspN(info.a) || hA) : (cuspN(info.b) || hB)].concat(other === info.a ? rA : rB));
    const kindL = {
      natal: t('ac.k.natal', 'Аспект в карте'), transit: t('ac.k.transit', 'Транзит к наталу'), solar: t('ac.k.solar', 'Соляр / лунар → натал'), own: t('ac.k.own', 'Внутри карты возвращения'),
      synastry: t('ac.k.syn', 'Синастрия'), directions: t('ac.k.dir', 'Дирекция к наталу'), progressions: t('ac.k.prog', 'Прогрессия к наталу'),
    }[info.kind] || '';
    const who = (id, h, r, isB) => {
      const parts = [];
      if (r.length) parts.push(en ? `rules ${r.join(', ')}` : `упр. ${r.join(', ')} д.`);
      if (h) parts.push(en ? `in ${ord(h)}` : (isB && moving ? `идёт по ${h} д.` : `в ${h} д.`));
      const lbl = bi && info.labels ? (isB ? info.labels.out : info.labels.in) : '';
      return `<p class="ac-who">${gl(id)} <b>${esc(nm(id))}</b>${lbl ? ` <span class="muted small">${esc(lbl)}</span>` : ''}${parts.length ? ` <span class="hb">(${esc(parts.join(' · '))})</span>` : ''} — ${esc(area(id))}</p>`;
    };
    let houses = '';
    if (ch && fromH.length && toH.length && fromH.join() !== toH.join()) {
      const verb = tn === 'soft' ? t('ac.vSoft', 'помогают темам') : tn === 'hard' ? t('ac.vHard', 'спорят с темами') : t('ac.vConj', 'сливаются с темами');
      houses = en
        ? `<p class="ac-houses"><b>Through the houses:</b> matters connected ${and(fromH.map((h) => H[h].with), 'and')} ${tn === 'soft' ? 'support' : tn === 'hard' ? 'clash with' : 'merge with'} ${and(toH.map((h) => `“${H[h].area}”`), 'and')}.</p>`
        : `<p class="ac-houses"><b>Через дома:</b> дела, связанные ${esc(and(fromH.map((h) => H[h].with), 'и'))}, ${esc(verb)} ${esc(and(toH.map((h) => `«${H[h].area}»`), 'и'))}.</p>`;
    }
    const orbTxt = info.orb != null ? `${t('orb', 'орбис')} ${info.orb.toFixed(1).replace('.', en ? '.' : ',')}°${info.applying != null ? ' · ' + (info.applying ? t('applying', 'сходящийся') : t('separating', 'расходящийся')) : ''}` : '';
    // что даёт: текст пары планет (или точки и планеты), совет; в синастрии — ещё «между вами»; как работает в этом типе карты
    const nk = n === 'conj' ? 'c' : n === 'soft' ? 's' : 'h';
    const gv = aspectGives(info.a, info.b, nk);
    const synT = info.kind === 'synastry' && TX.syn ? (TX.syn[[info.a, info.b].sort().join('|')] || null) : null;
    const syn = synT ? synT[tn === 'hard' ? 'h' : 's'] : '';
    const K = AX.kind || {};
    const kindTxt = [K[info.kind] || '', info.kind === 'transit' && info.applying != null ? (info.applying ? K.transitA : K.transitS) : ''].filter(Boolean).join(' ');
    card = document.createElement('div');
    card.className = 'asp-card'; card.setAttribute('role', 'dialog');
    card.innerHTML = `<div class="ac-h"><span class="ac-gl ${tn}">${gl(info.a)}<span class="g">${W.ASP_G[info.type] || ''}${VS}</span>${gl(info.b)}</span><div class="ac-t"><b>${esc(nm(info.a))} ${esc(an)} ${esc(nm(info.b))}</b><small>${esc([kindL, orbTxt].filter(Boolean).join(' · '))}</small></div><button class="iconbtn" type="button" data-acx aria-label="${esc(t('close', 'Закрыть'))}">${UI.icon('close', 'sm')}</button></div>
      ${who(info.a, hA, rA, false)}${who(info.b, hB, rB, true)}
      ${gv.g ? `<div class="ac-gives ${tn}"><span class="label">${esc(AL.gives || t('ac.gives', 'Что даёт'))}</span><p>${esc(gv.g)}</p>${gv.t ? `<p class="ac-tip"><b>${esc(AL.tip || t('ac.tip', 'Совет'))}:</b> ${esc(gv.t)}</p>` : ''}</div>` : ''}
      ${syn ? `<p class="ac-syn"><b>${esc(AL.between || t('ac.between', 'Между вами'))}:</b> ${esc(syn)}</p>` : ''}
      <p class="ac-sum ${tn}">${aspTxt ? esc((aspTxt.match(/^.*?[.!?](?:\s|$)/) || [aspTxt])[0].trim()) + ' ' : ''}${combo ? `<b>${esc(cap(combo))}.</b>` : ''}</p>
      ${houses}
      ${kindTxt ? `<p class="ac-kind">${esc(kindTxt)}</p>` : ''}
      ${moving && root.NExplain ? `<button class="btn sm" type="button" data-acmore>${t('ac.more', 'Подробнее о транзите')}</button>` : ''}`;
    document.body.appendChild(card);
    const tw = card.offsetWidth, th = card.offsetHeight;
    let left = at.x - tw / 2, top = at.y + 14;
    if (top + th > window.innerHeight - 8) top = at.y - th - 14;
    top = Math.max(8, Math.min(top, window.innerHeight - th - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    card.style.left = left + 'px'; card.style.top = top + 'px';
    card.querySelector('[data-acx]').addEventListener('click', closeCard);
    const more = card.querySelector('[data-acmore]');
    if (more) more.addEventListener('click', () => { const e = { T: info.b, N: info.a, type: info.type, orb: info.orb, applying: info.applying, at: info.at }; closeCard(); transit(e, { natal: info.chart, person: info.person }); });
    const outside = (e) => { if (card && !card.contains(e.target) && !(e.target.closest && e.target.closest('td[data-ak], .nw-asp'))) closeCard(); };
    const onKey = (e) => { if (e.key === 'Escape' && card) { e.stopPropagation(); closeCard(); } };
    const onScroll = (e) => { if (card && !card.contains(e.target)) closeCard(); };
    document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', onKey, true); document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    cardOff = () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', onKey, true); document.removeEventListener('scroll', onScroll, { capture: true }); };
    return card;
  }
  function $$hide() { document.querySelectorAll('.nw-tip').forEach((x) => { x.hidden = true; }); }

  root.NExplain = { transit, tone, short, phrase, rulesOf, natalHouse, transitHouse, houseLine, houseStory, aspectCard, aspectGives, closeCard, natureOf };
})(window);
