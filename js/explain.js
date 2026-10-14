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

  root.NExplain = { transit, tone, short, phrase, rulesOf, natalHouse, transitHouse, houseLine, houseStory };
})(window);
