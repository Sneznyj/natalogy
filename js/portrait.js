/* Портрет по натальной карте простым языком: разделы с «+» (сила), «−» (зона роста) и «→» (что делать).
   NPortrait.build(chart, lang, gender) → { sections:[{id, title, items:[{title, text, tone, why, glyph}]}] }
   Все фразы — из NTexts[lang] (texts-*-natal.js → T.ptr), поэтому работает на русском и английском. */
(function (root) {
  'use strict';
  const AC = root.AstroCore;
  const G = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '⯓', node: '☊', chiron: '⚷', lilith: '⚸', fortune: '⊗', asc: 'AC', mc: 'MC' };
  const SIGN_G = { aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓' };
  const PL = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const ASPG = { conj: '☌', sextile: '⚹', trine: '△', square: '□', opp: '☍' };
  const BENEFIC = ['venus', 'jupiter', 'sun', 'moon', 'mercury'];

  function build(chart, lang, gender) {
    const T = root.NTexts[lang] || root.NTexts.ru, R = T.ptr;
    const g = (s) => T.gend(s, gender);
    const by = chart.byId, time = !!chart.houses;
    const posWhy = (id) => R.posWhy(T.P[id].name, T.S[by[id].sign].in, time ? by[id].house : null);
    const sections = [];

    // 1. Главное: Солнце, Луна, Асцендент
    const big = [];
    const sun = T.sun[by.sun.sign], moon = T.moon[by.moon.sign];
    big.push({ id: 'sun', glyph: G.sun, sign: SIGN_G[by.sun.sign], label: R.core, title: sun.t, text: sun.p, minus: sun.m, todo: sun.do, why: posWhy('sun') + (time ? ' — ' + T.H[by.sun.house].where : '') });
    big.push({ id: 'moon', glyph: G.moon, sign: SIGN_G[by.moon.sign], label: R.feelings, title: moon.t, text: moon.p, minus: moon.m, todo: moon.do, why: posWhy('moon') });
    if (time) { const a = T.asc[by.asc.sign]; big.push({ id: 'asc', glyph: G.asc, sign: SIGN_G[by.asc.sign], label: R.image, title: a.t, text: a.p, minus: a.m, todo: a.do, why: R.ascWhy(T.S[by.asc.sign].in) }); }
    sections.push({ id: 'big3', title: R.big3, items: big });

    // 2. Сферы жизни
    const life = [];
    life.push({ id: 'mind', glyph: G.mercury, title: R.mind, text: T.mercury[by.mercury.sign], why: posWhy('mercury'), tone: 'neutral' });
    let love = T.venus[by.venus.sign];
    if (time) { const dsc = AC.signOf(chart.houses.cusps[6]); love += R.loveDsc(T.S[dsc].partner, T.S[dsc].name); }
    life.push({ id: 'love', glyph: G.venus, title: R.love, text: love, why: posWhy('venus'), tone: 'neutral' });
    life.push({ id: 'drive', glyph: G.mars, title: R.drive, text: T.mars[by.mars.sign], why: posWhy('mars'), tone: 'neutral' });
    if (time) {
      const c2 = AC.signOf(chart.houses.cusps[1]), r2 = AC.RULER[c2];
      let money = R.moneyText(T.S[c2], T.P[r2].name, T.S[by[r2].sign].in, by[r2].house, T.H[by[r2].house].with);
      if (by.fortune) money += R.fortune(T.H[by.fortune.house].where);
      life.push({ id: 'money', glyph: '⊗', title: R.money, text: money, why: R.h2Why(T.S[c2].in), tone: 'neutral' });
      const mc = by.mc.sign, rmc = AC.RULER[mc];
      life.push({ id: 'career', glyph: 'MC', title: R.career, text: T.mc[mc] + R.careerKey(T.P[rmc].name, T.S[by[rmc].sign].in, T.H[by[rmc].house].where), why: R.mcWhy(T.S[mc].in), tone: 'neutral' });
    }
    life.push({ id: 'path', glyph: G.node, title: R.path, text: T.node[by.node.sign] + (time ? R.pathHouse(T.H[by.node.house].area) : ''), why: posWhy('node'), tone: 'neutral' });
    sections.push({ id: 'life', title: R.life, items: life });

    // 3. Как тебя видят: маска, второй слой, код притяжения, искажения образа, близкий круг
    if (time) {
      const img = [];
      const ar = AC.RULER[by.asc.sign];
      img.push({ title: R.mask, text: T.asc[by.asc.sign].t + '. ' + T.asc[by.asc.sign].p, why: R.ascWhy(T.S[by.asc.sign].in), glyph: 'AC' });
      img.push({ title: R.second, text: R.secondText(T.P[ar].name, T.S[by[ar].sign].in, T.S[by[ar].sign].essence, T.H[by[ar].house].to), why: posWhy(ar), glyph: G[ar] });
      img.push({ title: R.attract, text: R.attractText(T.S[by.venus.sign].style), why: posWhy('venus'), glyph: G.venus });
      const asc = by.asc.lon, dists = [];
      for (const id of Object.keys(R.dist)) {
        if (!by[id]) continue;
        const sep = Math.abs(AC.d180(by[id].lon - asc));
        for (const [ang, nm] of [[0, '☌'], [180, '☍'], [90, '□'], [120, '△'], [60, '⚹']]) {
          const orb = Math.abs(sep - ang), lim = ang === 0 || ang === 180 ? 6 : ang === 90 ? 5 : 4;
          if (orb <= lim) dists.push({ id, nm, orb });
        }
      }
      dists.sort((a, b) => a.orb - b.orb);
      for (const x of dists.slice(0, 3)) img.push({ title: R.distTitle(T.P[x.id].name, x.nm), text: R.distText(R.dist[x.id]), why: R.orbWhy(x.orb.toFixed(1)), glyph: G[x.id] });
      img.push({ title: R.close, text: R.closeText(T.S[by.moon.sign].style), why: posWhy('moon'), glyph: G.moon });
      sections.push({ id: 'image', title: R.seen, items: img });
    }

    // 4. Сильные стороны и зоны роста
    const plus = [], minus = [];
    for (const p of chart.points) {
      if (!PL.includes(p.id) || !p.dignity) continue;
      const [dShort, dLong] = T.dignity[p.dignity].split(' — ');
      const good = p.dignity === 'domicile' || p.dignity === 'exaltation';
      (good ? plus : minus).push({ glyph: G[p.id], title: R.dignTitle(T.P[p.id].name, dShort), text: R.dignText(T.P[p.id].name, T.P[p.id].short, dLong), why: posWhy(p.id), tone: good ? 'plus' : 'minus' });
    }
    const major = chart.aspects.filter((a) => ASPG[a.type] && PL.includes(a.a) && PL.includes(a.b)).sort((a, b) => b.strength - a.strength);
    const pairText = (a, b, soft) => { const t = T.pairs[[a, b].sort().join('|')]; return t ? (soft ? t.s : t.h) : T.pairGeneric(a, b, soft); };
    for (const x of major) {
      const soft = x.type === 'trine' || x.type === 'sextile' || (x.type === 'conj' && BENEFIC.includes(x.a) && BENEFIC.includes(x.b));
      (soft ? plus : minus).push({ glyph: `${G[x.a]}${ASPG[x.type]}${G[x.b]}`, title: `${T.P[x.a].name} ${ASPG[x.type]} ${T.P[x.b].name}`, text: pairText(x.a, x.b, soft), why: R.aspWhy(T.ASP[x.type].name, x.orb.toFixed(1)), tone: soft ? 'plus' : 'minus' });
    }
    const sm = chart.summary;
    plus.unshift({ glyph: '✦', title: T.elements[sm.topElement], text: T.elementTip[sm.topElement], why: R.pct(sm.elements[sm.topElement]), tone: 'plus' });
    if (sm.elements[sm.lowElement] <= 15) minus.push({ glyph: '○', title: R.low(T.elements[sm.lowElement].toLowerCase()), text: T.lowElementTip[sm.lowElement], why: R.pct(sm.elements[sm.lowElement]), tone: 'minus' });
    for (const st of sm.stelliums) {
      const list = st.planets.map((p) => T.P[p].name).join(', ');
      plus.push(st.kind === 'house'
        ? { glyph: '✶', title: R.stH(st.where), text: R.stHText(list, T.H[st.where].area), why: R.stellium, tone: 'plus' }
        : { glyph: '✶', title: R.stS(T.S[st.where].in), text: R.stSText(list, T.S[st.where].style), why: R.stellium, tone: 'plus' });
    }
    sections.push({ id: 'plus', title: R.plus, items: plus.slice(0, 7) });
    sections.push({ id: 'minus', title: R.minus, items: minus.slice(0, 6) });
    for (const sec of sections) for (const it of sec.items) for (const k of ['title', 'text', 'minus', 'todo']) if (it[k]) it[k] = g(it[k]);
    return { sections };
  }

  root.NPortrait = { build, G, SIGN_G };
})(typeof window !== 'undefined' ? window : globalThis);
