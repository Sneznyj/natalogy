/* Профи-режим: карты любых типов, двойные колёса, таблица аспектов (с куспидами), положения, сохранённые карты.
   Вкладка «Карта» (14.10, по просьбе Алины): над картой — окошко данных (дата, время, место рождения), колесо крупное,
   таблица аспектов — справа от него; под картой — «Динамика»: строка внутреннего круга (натал), строка внешнего
   (что наложено: транзиты, соляр, лунар, дирекции, прогрессии, синастрия), ползунки «Дни · Часы · Минуты» и галочки — какую карту двигать.
   «Две карты» — две такие панели рядом. Остальные методы — pro-more.js, ректификация — rectify-page.js. */
(function (root) {
  'use strict';
  const UI = root.NUI, AC = root.AstroCore, PRO = root.ProAstro;
  const { t, esc, icon } = UI;
  const G = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '⯓', node: '☊', chiron: '⚷', lilith: '⚸', fortune: '⊗', asc: 'AC', mc: 'MC' };
  const AG = { conj: '☌', sextile: '⚹', square: '□', trine: '△', opp: '☍', quincunx: '⚻', semisextile: '⚺', semisquare: '∠', sesquisquare: '⚼', quintile: 'Q' };
  const ALL_PTS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'node', 'chiron', 'lilith', 'fortune', 'asc', 'mc'];
  const MAJOR = ['conj', 'sextile', 'square', 'trine', 'opp'], MINOR = ['quincunx', 'semisextile', 'semisquare', 'sesquisquare', 'quintile'];
  // куспиды домов в «Что показывать» и в таблице аспектов (AC и MC — это 1-й и 10-й, они среди точек)
  const CUSP_IDS = ['c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c11', 'c12'];
  const CUSP_LBL = { c2: 'II', c3: 'III', c4: 'IC', c5: 'V', c6: 'VI', c7: 'DC', c8: 'VIII', c9: 'IX', c11: 'XI', c12: 'XII' };
  const isCusp = (id) => /^c\d+$/.test(id);
  // ---------- орбисы аспектов по типам карт: Настройки → «Орбисы аспектов» (по умолчанию — как было: натал × 1, транзиты × 0,35…) ----------
  const ORB_KINDS = [['natal', 1], ['transit', 0.35], ['solar', 0.5], ['synastry', 0.75], ['directions', 0.15], ['progressions', 0.15]];
  const orbDefaults = (kind) => { const k = (ORB_KINDS.find((x) => x[0] === kind) || ORB_KINDS[0])[1]; return Object.fromEntries(AC.ASPECTS.map((a) => [a.id, Math.round(a.orb * k * 10) / 10])); };
  const orbsOf = (kind) => Object.assign(orbDefaults(kind), ((root.NStore.settings().orbTable || {})[kind]) || {});
  root.NOrbs = { KINDS: ORB_KINDS.map((x) => x[0]), ASP: MAJOR.concat(MINOR), defaults: orbDefaults, get: orbsOf };
  const TYPES = ['natal', 'transit', 'solar', 'lunar', 'directions', 'progressions', 'horary', 'synastry', 'composite'];
  // что можно наложить на натал внешним кругом (строка «Внешний круг» в динамике)
  const OVER = ['none', 'transit', 'solar', 'lunar', 'directions', 'progressions', 'synastry'];
  const MIN = 60000, HOUR = 3600000, DAY = 86400000;
  const WHEEL_SCALE = 1.15; // значки и подписи на колесе крупнее — видно издалека
  let tab = 'chart';
  const specs = { main: null, left: null, right: null };
  let workSlot = null; // панель в «рабочем режиме» (на весь экран: колесо, динамика и таблица аспектов крупно)

  const parseLocal = (s, tz) => { if (/Z$/.test(String(s))) { const d = new Date(s); if (!isNaN(d)) return d; } const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/); if (!m) return new Date(); return AC.localToUTC(+m[1], +m[2], +m[3], +m[4], +m[5], tz).date; };
  const fmtLon = (l) => { const TX = UI.TX(); const s = AC.signOf(l); return `${Math.floor(l % 30)}°${UI.pad(Math.floor((l % 1) * 60))}′ ${TX.S[s].name}`; };
  const pName = (id) => (UI.TX().P[id] ? UI.TX().P[id].name : /^c\d+$/.test(id) ? t('cusp', 'Куспид') + ' ' + id.slice(1) : id);
  // по умолчанию в таблице аспектов — и куспиды всех домов (15.10, Алина: «аспекты на дома»)
  const mkView = () => ({ pts: ALL_PTS.filter((x) => x !== 'fortune').concat(CUSP_IDS), asp: MAJOR.slice(), cv2: 1, cosmo: false, orb: 1, hs: root.NStore.settings().houseSystem || 'placidus' });
  /** Старый вид: куспиды включались одной кнопкой (cusps) — теперь каждый дом отдельно в «Точках». */
  function fixView(v) {
    if (!v.cv2) { v.pts = v.pts.filter((x) => !isCusp(x)).concat(CUSP_IDS); delete v.cusps; v.cv2 = 1; }
    return v;
  }

  function defaultSpec(type, p) {
    return { v2: true, type: type || 'transit', a: p.id, custom: null, shiftA: null, shiftB: null, b: (root.NStore.people().find((x) => x.id !== p.id) || {}).id || null, date: new Date().toISOString(), place: 'here', overlay: true, flip: false, ring: false, dir: 'deg', move: null, rotOut: null, edit: false, view: mkView() };
  }
  /** Старые сохранённые карты: «натал + транзиты» стали типом «Транзиты», год соляра — датой. */
  function normSpec(s, p) {
    const d = defaultSpec(s && s.type, p); const out = Object.assign(d, s || {}); out.view = fixView(Object.assign(mkView(), (s && s.view) || {}));
    if (!(s && s.v2)) { if (out.type === 'natal' && s && s.ring !== false) out.type = 'transit'; out.ring = false; if (!/Z$/.test(String(out.date))) out.date = parseLocal(out.date, UI.here().tz).toISOString(); out.v2 = true; }
    out.edit = false;
    return out;
  }

  // ---------- кто на карте: человек из «Людей» или данные, введённые прямо в окошко над картой ----------
  function subjectOf(spec) {
    if (spec.a === 'moment') return Object.assign({ id: 'moment', gender: 'f' }, spec.mom || momentNow(), { name: (spec.mom && spec.mom.name) || t('pro.momentName', 'Карта момента') });
    if (spec.a === 'custom' && spec.custom && spec.custom.place) return Object.assign({ id: 'custom' }, spec.custom);
    return root.NStore.person(spec.a) || root.NStore.active();
  }
  /** Сейчас в городе, где человек живёт («где я сейчас») — начальные данные «Карты момента». */
  function momentNow() {
    const h = UI.here(), q = UI.partsIn(new Date(), h.tz);
    return { y: q.y, mo: q.mo, d: q.d, h: q.h, mi: q.mi, s: 0, timeKnown: true, place: { name: h.name || h.tz, nameEn: h.nameEn, country: h.country, countryEn: h.countryEn, lat: h.lat, lon: h.lon, tz: h.tz } };
  }
  const birthDate = (p) => AC.localToUTC(p.y, p.mo, p.d, p.timeKnown !== false ? p.h : 12, p.timeKnown !== false ? p.mi : 0, p.place.tz).date;
  const cache = new Map();
  function chartFor(p, hs, at) {
    const k = [p.y, p.mo, p.d, p.h, p.mi, p.timeKnown, p.place.lat, p.place.lon, p.place.tz, hs, at ? at.getTime() : ''].join('|');
    if (cache.has(k)) return cache.get(k);
    let c;
    if (at) c = AC.chart({ date: at, timeKnown: true, zone: p.place.tz, lat: p.place.lat, lon: p.place.lon, name: p.name }, { houseSystem: hs });
    else c = AC.chart({ y: p.y, mo: p.mo, d: p.d, h: p.h, mi: p.mi, timeKnown: p.timeKnown !== false, zone: p.place.tz, lat: p.place.lat, lon: p.place.lon, name: p.name }, { houseSystem: hs });
    cache.set(k, c); if (cache.size > 80) cache.delete(cache.keys().next().value);
    return c;
  }
  const natalOf = (spec) => chartFor(subjectOf(spec), spec.view.hs, spec.shiftA ? new Date(spec.shiftA) : null);
  const personB = (spec) => root.NStore.person(spec.b);

  /** Место для транзитов, соляра, лунара, хорара: где человек живёт (его город из «Чья карта») или место рождения. */
  function placeOf(spec, p) {
    const nm = (c) => (UI.lang() === 'en' ? c.nameEn || c.name : c.name) || '';
    if (spec.place === 'birth' || p.id === 'moment') return { lat: p.place.lat, lon: p.place.lon, zone: p.place.tz, name: nm(p.place) };
    const h = UI.homeOf(p.id === 'custom' ? null : p);
    return { lat: h.lat, lon: h.lon, zone: h.tz, name: h.guessed ? '' : nm(h) };
  }
  const cuspPts = (c) => (c && c.houses ? c.houses.cusps.map((lon, i) => ({ id: 'c' + (i + 1), lon })).filter((x) => x.id !== 'c1' && x.id !== 'c10') : []);
  const toWheel = (c) => ({ points: c.points, cusps: c.houses ? c.houses.cusps : null, asc: c.houses ? c.houses.asc : 0, mc: c.houses ? c.houses.mc : null });
  /** Соляр, который действует на дату (начался до неё). */
  function solarAt(natal, date, pl, opt) {
    const y = UI.partsIn(date, pl.zone || 'UTC').y;
    let rc = AC.solarReturn(natal, y, pl, opt);
    if (rc.returnDate > date) rc = AC.solarReturn(natal, y - 1, pl, opt);
    return rc;
  }

  /**
   * Собрать карту по описанию панели. Кроме колеса и аспектов возвращает rings — что стоит во внутреннем и внешнем круге,
   * на какой момент и чем каждую из карт можно двигать: 'A' — время рождения, 'B' — время рождения второго человека, 'date' — дата карты.
   */
  function build(spec) {
    const TX = UI.TX(), v = fixView(spec.view);
    const cosmo = !!v.cosmo; // космограмма: без домов — ни осей, ни куспидов
    const pts = new Set(v.pts), asp = new Set(v.asp);
    const sel = (list) => list.filter((x) => pts.has(x.id) && !(cosmo && (x.id === 'asc' || x.id === 'mc')));
    const keepAsp = (list) => list.filter((x) => asp.has(x.type));
    // орбисы — из таблицы в настройках (по типу карты), ползунок «Орбисы» в «Что показывать» — общий множитель
    const optsAsp = (kind) => ({ minor: v.asp.some((x) => MINOR.includes(x)), orbMult: v.orb, orbs: orbsOf(kind || 'natal') });
    const p = subjectOf(spec);
    const natal = natalOf(spec);
    const pl = placeOf(spec, p);
    const date = parseLocal(spec.date, pl.zone);
    const out = { title: '', sub: '', info: [], inner: null, outer: null, aspects: [], innerChart: natal, labels: null, p, rings: { in: null, out: null }, kind: 'natal', cosmo, at: date };
    const inPts = (c) => sel(c.points).concat(cosmo ? [] : cuspPts(c).filter((x) => pts.has(x.id)));
    const opt = Object.assign({}, natal.opts, { houseSystem: v.hs });
    // у «Карты момента» внутренний круг — сам момент (его и двигаем), а не натал
    const natalName = p.id === 'moment' ? p.name : TX.chartTypes.natal + ' · ' + p.name;
    const natalRing = { label: natalName, date: natal.date, tz: p.place.tz, place: p.place.name, mov: 'A', shifted: !!spec.shiftA };
    const outerOf = (c, drop) => ({ points: sel(c.points.filter((x) => !(drop || ['fortune']).includes(x.id))), cusps: c.houses ? c.houses.cusps : null });
    switch (spec.type) {
      case 'natal': {
        out.inner = toWheel(natal); out.title = natalName;
        out.aspects = keepAsp(AC.aspectsWithin(inPts(natal), optsAsp('natal')));
        out.rings.in = natalRing;
        break;
      }
      case 'transit': {
        const sky = AC.chart({ date, lat: pl.lat, lon: pl.lon, zone: pl.zone, timeKnown: true }, opt); // дома транзита — на город, где человек живёт
        out.inner = toWheel(natal); out.outer = outerOf(sky, ['asc', 'mc', 'fortune', 'lilith']);
        out.kind = 'transit';
        out.aspects = keepAsp(AC.aspectsBetween(inPts(natal), out.outer.points, optsAsp('transit')));
        out.title = (p.id === 'moment' ? p.name : TX.chartTypes.natal) + ' + ' + TX.chartTypes.transit.toLowerCase() + (p.id === 'moment' ? '' : ' · ' + p.name);
        out.labels = { in: p.id === 'moment' ? p.name.toLowerCase() : t('natal', 'натал'), out: t('transit', 'транзит') };
        out.rings.in = natalRing;
        out.rings.out = { label: TX.chartTypes.transit, date, tz: pl.zone, place: pl.name, mov: 'date' };
        break;
      }
      case 'solar': case 'lunar': {
        // лунар — тот, что действует на выбранную дату (начался до неё), а не следующий; соляр — так же
        const rc = spec.type === 'solar' ? solarAt(natal, date, pl, opt) : PRO.lunarReturnAt(natal, date, pl, opt);
        const nextD = spec.type === 'solar' ? AC.solarReturn(natal, UI.partsIn(rc.returnDate, pl.zone).y + 1, pl, opt).returnDate : PRO.lunarReturnDate(natal, AC.addDays(rc.returnDate, 1));
        const nm = TX.chartTypes[spec.type];
        out.title = nm + ' · ' + p.name;
        out.sub = spec.place === 'birth' ? t('placeBirth', 'место рождения') : t('placeHome', 'где живёт') + (pl.name ? ': ' + pl.name : '');
        const retRing = { label: nm, date: rc.returnDate, tz: pl.zone, place: pl.name, mov: 'date', pick: date };
        out.info.push([spec.type === 'solar' ? t('mom.solarEnd', 'Следующий соляр') : t('mom.lunarEnd', 'Следующий лунар'), UI.fmtDay(nextD, pl.zone, { year: true, hour: true })]);
        // все аспекты карты возвращения — и между её планетами, и к наталу (15.10, Алина)
        const own = { title: spec.type === 'solar' ? t('pro.inSolar', 'Аспекты внутри соляра') : t('pro.inLunar', 'Аспекты внутри лунара'), chart: rc, aspects: keepAsp(AC.aspectsWithin(inPts(rc), optsAsp('natal'))) };
        if (spec.overlay || spec.flip) {
          // натал всегда внутри (сиреневый круг), карта возвращения — внешним кругом; главный АС по умолчанию — её (нажатие на круг меняет)
          out.inner = toWheel(natal); out.outer = outerOf(rc);
          out.kind = 'solar'; out.rotDefault = 'out';
          out.aspects = keepAsp(AC.aspectsBetween(inPts(natal), out.outer.points, optsAsp('solar')));
          out.own = own;
          out.labels = { in: t('natal', 'натал'), out: nm.toLowerCase() };
          out.title = TX.chartTypes.natal + ' + ' + nm.toLowerCase() + ' · ' + p.name;
          out.rings.in = natalRing; out.rings.out = retRing;
        } else {
          out.innerChart = rc; out.inner = toWheel(rc);
          out.rings.in = retRing;
          out.aspects = own.aspects;
        }
        if (rc.houses) out.info.push([t('ascOf', 'Асцендент'), fmtLon(rc.houses.asc)], [t('mcOf', 'MC'), fmtLon(rc.houses.mc)]);
        const sunH = rc.byId.sun.house; if (sunH) out.info.push([t('sunHouse', 'Солнце в доме'), String(sunH)]);
        break;
      }
      case 'directions': {
        const years = (date - natal.date) / (365.2422 * DAY);
        const arc = spec.dir === 'deg' ? years : PRO.arcAt(natal, years);
        const dir = natal.points.filter((x) => x.id !== 'fortune').map((x) => ({ id: x.id, lon: AC.norm(x.lon + arc), speed: null }));
        out.inner = toWheel(natal); out.outer = { points: sel(dir), cusps: natal.houses ? natal.houses.cusps.map((c) => AC.norm(c + arc)) : null };
        out.kind = 'directions';
        out.aspects = keepAsp(AC.aspectsBetween(inPts(natal), out.outer.points, optsAsp('directions')));
        const nm = spec.dir === 'deg' ? t('dir.deg', 'Дирекции 1° = 1 год') : t('dir.arc', 'Дирекции солнечной дуги');
        out.title = nm + ' · ' + p.name;
        out.sub = t('arc', 'дуга') + ' ' + arc.toFixed(2) + '°';
        out.labels = { in: t('natal', 'натал'), out: t('directed', 'дирекция') };
        out.rings.in = natalRing; out.rings.out = { label: nm, date, tz: pl.zone, place: '', mov: 'date' };
        break;
      }
      case 'progressions': {
        const pr = AC.progressed(natal, date, opt);
        out.inner = toWheel(natal); out.outer = { points: sel(pr.points), asc: pr.byId.asc ? pr.byId.asc.lon : null, mc: pr.byId.mc ? pr.byId.mc.lon : null };
        out.kind = 'progressions';
        out.aspects = keepAsp(AC.aspectsBetween(inPts(natal), out.outer.points, optsAsp('progressions')));
        out.title = TX.chartTypes.progressions + ' · ' + p.name;
        out.info.push([t('progDate2', 'Прогрессивная дата'), UI.fmtDay(pr.date, p.place.tz, { year: true, hour: true })], [t('progMoon', 'Прогрессивная Луна'), fmtLon(pr.byId.moon.lon)], [t('progPhase', 'Фаза прогрессий'), TX.PHASE8[pr.moonPhase]]);
        out.labels = { in: t('natal', 'натал'), out: t('progressed', 'прогрессии') };
        out.rings.in = natalRing; out.rings.out = { label: TX.chartTypes.progressions, date, tz: pl.zone, place: '', mov: 'date' };
        break;
      }
      case 'horary': {
        const c = AC.chart({ date, lat: pl.lat, lon: pl.lon, zone: pl.zone, timeKnown: true }, opt);
        out.innerChart = c; out.inner = toWheel(c);
        out.aspects = keepAsp(AC.aspectsWithin(inPts(c), optsAsp('natal')));
        out.title = TX.chartTypes.horary;
        out.rings.in = { label: TX.chartTypes.horary, date, tz: pl.zone, place: pl.name, mov: 'date' };
        const ph = PRO.planetaryHours(date, pl.lat, pl.lon, pl.zone);
        const h = PRO.horary(c, ph);
        out.info.push([t('hor.moon', 'Луна'), `${TX.S[h.moonSign].name}${h.voc ? ' · ' + t('voc.short', 'без курса') : ''}`]);
        if (h.last) out.info.push([t('hor.last', 'Последний аспект'), `☽ ${AG[h.last.type]} ${G[h.last.id]} ${pName(h.last.id)}`]);
        if (h.next) out.info.push([t('hor.next', 'Следующий аспект'), `☽ ${AG[h.next.type]} ${G[h.next.id]} ${pName(h.next.id)} · ${UI.fmtTime(h.next.date, pl.zone)}`]);
        if (ph && ph.current) out.info.push([t('hor.hour', 'Час планеты'), pName(ph.current.ruler)]);
        if (h.radical) out.info.push([t('hor.radical', 'Радикальность'), h.radical.ok ? t('yes', 'да') : t('no', 'нет')]);
        for (const s of h.strictures) out.info.push([t('hor.str', 'Ограничение'), TX.horaryStr[s] || s]);
        break;
      }
      case 'synastry': case 'composite': {
        const q = personB(spec);
        if (!q) { out.error = t('needB', 'Добавьте второго человека в «Люди»'); out.inner = toWheel(natal); out.rings.in = natalRing; break; }
        const cb = chartFor(q, v.hs, spec.shiftB ? new Date(spec.shiftB) : null);
        const bRing = { label: TX.chartTypes.natal + ' · ' + q.name, sub: q.name, date: cb.date, tz: q.place.tz, place: q.place.name, mov: 'B', shifted: !!spec.shiftB };
        if (spec.type === 'synastry') {
          out.inner = toWheel(natal); out.outer = outerOf(cb);
          out.kind = 'synastry';
          out.aspects = keepAsp(AC.aspectsBetween(inPts(natal), out.outer.points, optsAsp('synastry')));
          out.title = TX.chartTypes.synastry + ' · ' + p.name + ' + ' + q.name; out.labels = { in: p.name, out: q.name };
          out.rings.in = natalRing; out.rings.out = bRing;
        } else {
          const comp = AC.composite(natal, cb);
          const cpts = comp.points.filter((x) => !['asc', 'mc'].includes(x.id));
          const asc = comp.byId.asc ? comp.byId.asc.lon : 0, mc = comp.byId.mc ? comp.byId.mc.lon : null;
          const cusps = comp.byId.asc ? Array.from({ length: 12 }, (_, i) => AC.norm(Math.floor(asc / 30) * 30 + 30 * i)) : null;
          out.inner = { points: cpts, cusps, asc, mc };
          out.aspects = keepAsp(AC.aspectsWithin(sel(cpts), optsAsp('natal')));
          out.innerChart = { points: comp.points.map((x) => Object.assign({ house: cusps ? Math.floor(AC.norm(x.lon - cusps[0]) / 30) + 1 : null }, x)), houses: null, byId: comp.byId };
          out.title = TX.chartTypes.composite + ' · ' + p.name + ' + ' + q.name; out.sub = t('compNote', 'дома — по знакам от композитного ASC');
          out.rings.in = Object.assign({}, natalRing); out.rings.out = Object.assign({}, bRing, { label: t('pro.compB', 'Вторая карта · {n}', { n: q.name }) });
        }
        break;
      }
    }
    if (spec.shiftA) out.sub = (out.sub ? out.sub + ' · ' : '') + t('pro.trialTime', 'пробное время рождения');
    return out;
  }

  // ---------- таблица аспектов (сетка) ----------
  /**
   * rows/cols — точки; tri — одна карта (треугольник), куспиды тогда — строками внизу под всеми точками.
   * nums: { row(id), col(id) } — маленькая цифра в правом нижнем углу значка (каким домом управляет / в каком доме стоит, по какому идёт);
   * own — таблица аспектов внутри карты возвращения (у её клеток свой ключ, с колесом не связаны).
   */
  function grid(rows, cols, aspects, tri, nums, own) {
    const key = (a, b) => a + '|' + b;
    const map = new Map();
    for (const x of aspects) { map.set(key(x.a, x.b), x); if (tri) map.set(key(x.b, x.a), x); }
    const gl = (id) => G[id] || CUSP_LBL[id] || (/^c(\d+)$/.test(id) ? id.slice(1) : id);
    const txt = (id) => isCusp(id) || id === 'asc' || id === 'mc';
    nums = nums || {};
    const head = (id, n, side) => `<th class="${txt(id) ? 't' : ''}" title="${esc(pName(id) + (n ? ' · ' + (side === 'col' && nums.colNote ? nums.colNote(n) : nums.rowNote ? nums.rowNote(n) : n) : ''))}">${esc(gl(id))}${n ? `<sub class="hn">${side === 'col' ? String(n).split(',').map(esc).join('<br>') : esc(n)}</sub>` : ''}</th>`;
    const pt = tri ? rows.filter((x) => !isCusp(x)) : rows;
    const colsU = tri ? pt : cols;
    const cell = (r, c) => {
      const x = map.get(key(r, c)) || (tri ? map.get(key(c, r)) : null);
      if (!x) return '<td></td>';
      const cls = x.type === 'conj' ? 'conj' : MINOR.includes(x.type) ? 'minor' : x.nature === 'soft' ? 'soft' : 'hard';
      const tip = pName(x.a) + ' ' + AG[x.type] + ' ' + pName(x.b) + ' · ' + t('orb', 'орбис') + ' ' + x.orb.toFixed(2) + '°' + (x.applying != null ? ' · ' + (x.applying ? t('applying', 'сходящийся') : t('separating', 'расходящийся')) : '') + ' · ' + t('pro.clickAsp', 'нажми — что это значит');
      // тот же ключ, что у линии на колесе (NWheel.linkAspects): наведение подсвечивает аспект и там, и тут
      const ak = (own ? 'own:' : '') + (tri ? [x.a, x.b].sort().join('~') : x.a + '>' + x.b);
      return `<td class="${cls}" data-ak="${esc(ak)}" data-pa="${esc(x.a)}" data-pb="${esc(x.b)}"${own ? ' data-own="1"' : ''} data-tip="${esc(tip)}"><span class="a">${AG[x.type]}</span><span class="o">${x.orb.toFixed(0)}°</span></td>`;
    };
    let s = '<div class="tbl-wrap" style="border:0;background:transparent"><table class="asp-grid"><tr><th></th>' + colsU.map((c) => head(c, nums.col ? nums.col(c) : '', 'col')).join('') + '</tr>';
    pt.forEach((r, i) => {
      s += `<tr>${head(r, nums.row ? nums.row(r) : '', 'row')}`;
      colsU.forEach((c, j) => { s += tri && j >= i ? (j === i ? `<td class="d">${esc(gl(r))}</td>` : '<td></td>') : cell(r, c); });
      s += '</tr>';
    });
    // аспекты к куспидам домов — строками под таблицей (куспиды между собой не сравниваем)
    if (tri) for (const r of rows.filter(isCusp)) s += `<tr class="cu">${head(r, '', 'row')}${colsU.map((c) => cell(r, c)).join('')}</tr>`;
    return s + '</table></div>';
  }

  function positions(c, v) {
    const TX = UI.TX(), pts = new Set((v || mkView()).pts);
    const rows = c.points.filter((p) => pts.has(p.id) || ['asc', 'mc'].includes(p.id)).map((p) => `<tr><td><span class="g">${G[p.id] || ''}</span> ${esc(pName(p.id))}</td><td class="mono">${fmtLon(p.lon)}${p.retro ? ' R' : ''}</td><td>${p.house || '—'}</td><td class="mono">${p.speed != null ? p.speed.toFixed(3) + '°' : '—'}</td><td>${p.dignity ? esc((TX.dig || {})[p.dignity] || p.dignity) : ''}</td></tr>`).join('');
    const cusps = c.houses ? c.houses.cusps.map((x, i) => `<tr><td>${t('cusp', 'Куспид')} ${i + 1}</td><td class="mono">${fmtLon(x)}</td><td colspan="3"></td></tr>`).join('') : '';
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('pt', 'Точка')}</th><th>${t('pos', 'Положение')}</th><th>${t('house', 'Дом')}</th><th>${t('speed', 'Скорость')}</th><th>${t('dign', 'Достоинство')}</th></tr></thead><tbody>${rows}${cusps}</tbody></table></div>`;
  }

  // ---------- окошко над картой: свёрнуто в строку (кто, когда, где, тип) — «Изменить» раскрывает поля (15.10, Алина) ----------
  function dataSummary(spec, slot) {
    const TX = UI.TX();
    const p = subjectOf(spec) || {};
    const moment = spec.a === 'moment';
    const when = p.y ? `${UI.pad(p.d)}.${UI.pad(p.mo)}.${p.y}${p.timeKnown !== false && p.h != null ? ' ' + UI.pad(p.h) + ':' + UI.pad(p.mi) : ''}` : '';
    const city = p.place ? (UI.lang() === 'en' ? p.place.nameEn || p.place.name : p.place.name) || '' : '';
    let type = moment && spec.type === 'natal' ? t('pro.momSingle', 'Одинарная — небо на момент') : moment && spec.type === 'transit' ? t('pro.momDouble', 'Двойная — момент + транзиты') : TX.chartTypes[spec.type];
    if (['synastry', 'composite'].includes(spec.type)) { const q = personB(spec); if (q) type += ' · ' + q.name; }
    if (spec.type === 'directions') type += ' · ' + (spec.dir === 'arc' ? t('dir.arcS', 'Солнечная дуга') : t('dir.degS', '1° = 1 год'));
    if (['solar', 'lunar'].includes(spec.type)) type += ' · ' + (spec.overlay || spec.flip ? t('pro.withNatal', 'с наталом') : t('pro.alone', 'отдельно'));
    const place = ['solar', 'lunar', 'horary', 'transit'].includes(spec.type) && !moment ? (spec.place === 'birth' ? t('placeBirth', 'место рождения') : t('placeHome2', 'где живёт сейчас')) : '';
    return `<div class="card pro-data pd-sum" data-psum="${slot}">
      <div class="pd-sum-t"><span class="pd-who-n">${moment ? '☀ ' : ''}<b>${esc(p.name || '')}</b></span>${when ? `<span class="mono">${esc(when)}</span>` : ''}${city ? `<span class="muted">${esc(city)}</span>` : ''}<span class="tag acc">${esc(type)}</span>${place ? `<span class="tag plain">${esc(place)}</span>` : ''}${spec.shiftA ? `<span class="tag">${esc(t('pdy.trial', 'пробное'))}</span>` : ''}</div>
      <span class="spacer"></span>
      <button class="btn sm primary" type="button" data-pedit>${icon('edit', 'sm')} ${t('pro.edit', 'Изменить')}</button>
      <button class="btn sm pd-savebtn" type="button" data-save title="${esc(t('pro.saveChart', 'Сохранить карту'))}">${icon('save', 'sm')} <span class="lbl">${t('pro.saveChart', 'Сохранить карту')}</span></button>
    </div>`;
  }
  function dataBox(spec, slot) {
    if (!spec.edit) return dataSummary(spec, slot);
    const TX = UI.TX();
    const people = root.NStore.people();
    const p = subjectOf(spec);
    const custom = spec.a === 'custom', moment = spec.a === 'moment';
    const src = custom ? (spec.custom || {}) : p;
    const dateStr = src.y ? `${UI.pad(src.d)}.${UI.pad(src.mo)}.${src.y}` : '';
    const timeStr = src.timeKnown !== false && src.h != null ? `${UI.pad(src.h)}:${UI.pad(src.mi)}` : '';
    const opt = (cur) => people.map((x) => `<option value="${x.id}" ${x.id === cur ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
    // «Карта момента»: любой день, время и город без привязки к людям и сохранённым картам (карта дня, событие, хорар)
    return `<form class="card pro-data" data-pdata="${slot}" novalidate>
      <div class="pd-row">
        <div class="field pd-who"><label>${t('pro.who', 'Чья карта')}</label><select class="select" data-k="a">${opt(spec.a)}<option value="moment" ${moment ? 'selected' : ''}>${t('pro.momentOpt', '☀ Карта момента — любой день')}</option><option value="custom" ${custom ? 'selected' : ''}>${t('pro.custom2', '✎ Свои данные')}</option></select></div>
        ${custom || moment ? `<div class="field pd-name"><label>${moment ? t('pro.momentTitle', 'Название') : t('f.name', 'Имя')}</label><input class="input" data-c="name" value="${esc(src.name || '')}" placeholder="${moment ? t('pro.momentPh', 'Например: Карта дня') : t('pro.customName', 'Например: Клиент')}"></div>` : ''}
        <div class="field pd-date"><label>${moment ? t('f.dateM', 'Дата') : t('f.date', 'Дата рождения')}</label>${UI.dateFieldHTML('data-c="date"', dateStr)}</div>
        <div class="field pd-time"><label>${moment ? t('f.timeM', 'Время') : t('f.time', 'Время рождения')}</label><input class="input" data-c="time" inputmode="numeric" autocomplete="off" placeholder="${esc(t('ph.time', 'ЧЧ:ММ'))}" value="${esc(timeStr)}"></div>
        <div class="field ac pd-city"><label>${moment ? t('f.cityM', 'Город') : t('f.city', 'Город рождения')}</label><input class="input" data-c="city" autocomplete="off" placeholder="${t('f.cityPh', 'Начните вводить: Минск, Псков…')}"></div>
        <div class="pd-go"><button class="btn primary" type="submit">${icon('check', 'sm')} ${t('pro.customGo', 'Построить карту')}</button></div>
      </div>
      <p class="err" data-cerr hidden></p>
      <div class="pd-row pd-opts">
        <div class="field"><label>${t('pro.type', 'Тип карты')}</label><select class="select" data-k="type">${TYPES.map((x) => `<option value="${x}" ${x === spec.type ? 'selected' : ''}>${esc(moment && x === 'natal' ? t('pro.momSingle', 'Одинарная — небо на момент') : moment && x === 'transit' ? t('pro.momDouble', 'Двойная — момент + транзиты') : TX.chartTypes[x])}</option>`).join('')}</select></div>
        ${['synastry', 'composite'].includes(spec.type) ? `<div class="field"><label>${t('pro.with', 'С кем')}</label><select class="select" data-k="b">${opt(spec.b)}</select></div>` : ''}
        ${['solar', 'lunar', 'horary', 'transit'].includes(spec.type) ? `<div class="field"><label>${t('pro.place', 'Место')}</label><select class="select" data-k="place"><option value="here" ${spec.place !== 'birth' ? 'selected' : ''}>${t('placeHome2', 'где живёт сейчас')}</option><option value="birth" ${spec.place === 'birth' ? 'selected' : ''}>${t('placeBirth', 'место рождения')}</option></select></div>` : ''}
        ${['solar', 'lunar'].includes(spec.type) ? `<label class="check"><input type="checkbox" data-k="overlay" ${spec.overlay || spec.flip ? 'checked' : ''}> ${t('pro.overlay2', 'Вместе с наталом (натал внутри)')}</label>` : ''}
        ${spec.type === 'directions' ? `<div class="field"><label>${t('pro.dir', 'Метод')}</label><select class="select" data-k="dir"><option value="deg" ${spec.dir !== 'arc' ? 'selected' : ''}>${t('dir.degS', '1° = 1 год')}</option><option value="arc" ${spec.dir === 'arc' ? 'selected' : ''}>${t('dir.arcS', 'Солнечная дуга')}</option></select></div>` : ''}
        <span class="spacer"></span>
        ${custom && spec.custom && spec.custom.place ? `<button class="btn sm" type="button" data-csave>${icon('plus', 'sm')} ${t('pro.customSave', 'Сохранить в «Люди»')}</button>` : ''}
        <button class="btn sm" type="button" data-save>${icon('save', 'sm')} ${t('pro.saveChart', 'Сохранить карту')}</button>
        <button class="btn sm ghost" type="button" data-pfold>${icon('up', 'sm')} ${t('pro.fold', 'Свернуть')}</button>
      </div>
    </form>`;
  }

  /** «Что показывать» — карточкой рядом с таблицей аспектов (на «Карте» открыта сразу, в «Двух картах» — свёрнута). */
  function displayBox(spec, slot, compact) {
    const TX = UI.TX(), v = spec.view, pts = new Set(v.pts), asp = new Set(v.asp);
    // на высоком экране — открыта сразу; на ноутбуке — строкой под таблицей аспектов (нажал — раскрылась), чтобы таблица влезла целиком
    const open = v.dispOpen != null ? v.dispOpen : !compact && window.innerHeight >= 980;
    return `<details class="card pd-disp" data-disp="${slot}"${open ? ' open' : ''}><summary>${icon('filter', 'sm')} <b>${t('pro.display', 'Что показывать')}</b> <span class="tiny muted pd-hint">${t('pro.displayHint', 'точки, аспекты, орбисы, дома')}</span></summary><div class="stack pd-disp-b">
      <span class="label">${t('pro.points', 'Точки')}</span>
      <div class="toggles" role="group" aria-label="${t('pro.points', 'Точки')}">${ALL_PTS.map((id) => `<button class="tg ${['asc', 'mc'].includes(id) ? 't' : ''}" type="button" data-pt="${id}" aria-pressed="${pts.has(id)}" title="${esc(pName(id))}">${G[id]}</button>`).join('')}</div>
      <span class="label">${t('pro.houses2', 'Куспиды домов — аспекты к ним')}</span>
      <div class="toggles" role="group" aria-label="${t('pro.houses2', 'Куспиды домов — аспекты к ним')}">${CUSP_IDS.map((id) => `<button class="tg t" type="button" data-pt="${id}" aria-pressed="${pts.has(id)}" title="${esc(t('pro.cuspN', 'Куспид {n} дома', { n: id.slice(1) }))}">${CUSP_LBL[id]}</button>`).join('')}</div>
      <span class="label">${t('pro.aspects', 'Аспекты')}</span>
      <div class="toggles" role="group" aria-label="${t('pro.aspects', 'Аспекты')}">${MAJOR.concat(MINOR).map((a) => `<button class="tg" type="button" data-as="${a}" aria-pressed="${asp.has(a)}" title="${esc(TX.ASP[a] ? TX.ASP[a].name : root.NWheel.ASP_N[UI.lang()][a] || a)}">${AG[a]}</button>`).join('')}</div>
      <div class="row pd-quick"><button class="btn sm" type="button" data-dq="major">${t('pro.qMajor', 'Только мажорные')}</button><button class="btn sm" type="button" data-dq="all">${t('pro.qAll', 'Все аспекты')}</button><button class="btn sm" type="button" data-dq="planets">${t('pro.qPl', 'Только планеты')}</button><button class="btn sm" type="button" data-dq="houses">${t('pro.qHouses', 'Все дома')}</button><button class="btn sm" type="button" data-dq="nohouses">${t('pro.qNoHouses', 'Без домов')}</button></div>
      <div class="row"><div class="field" style="min-width:150px;flex:1"><label>${t('pro.orb', 'Орбисы')}: <b data-orbv>${Math.round(v.orb * 100)}%</b></label><input data-orb type="range" min="0.5" max="1.5" step="0.1" value="${v.orb}"></div>
        <div class="field" style="flex:1"><label>${t('pro.hs', 'Дома')}</label><select class="select" data-hs>${Object.entries(TX.houseSystems).map(([k, n]) => `<option value="${k}" ${v.hs === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div></div>
      <a class="tiny" href="#settings?orbs=1">${t('pro.orbTable', 'Орбисы по каждому аспекту — в Настройках')} →</a>
    </div></details>`;
  }

  // ---------- «Динамика» прямо под колесом (как в Chronos): две строки кругов с галочкой «двигать», шаг и стрелки ----------
  const overOf = (spec) => (spec.type === 'natal' ? 'none' : ['solar', 'lunar'].includes(spec.type) ? (spec.overlay || spec.flip ? spec.type : null) : OVER.includes(spec.type) ? spec.type : null);
  const UNITS = () => [['mi', t('tb.u.mi', 'мин')], ['h', t('tb.u.h', 'час')], ['d', t('tb.u.d', 'день')], ['mo', t('tb.u.mo', 'мес')], ['y', t('tb.u.y', 'год')]];
  function dynBox(spec, slot) {
    const TX = UI.TX();
    const ov = overOf(spec);
    const overSel = `<select class="select pdy-over" data-over aria-label="${esc(t('pdy.overA', 'Что наложить на натал'))}">${ov == null ? `<option value="" selected>${esc(t('pdy.asType', '{x} — по типу карты', { x: TX.chartTypes[spec.type] }))}</option>` : ''}${OVER.map((k) => `<option value="${k}" ${k === ov ? 'selected' : ''}>${esc(k === 'none' ? t('pdy.none', '— без наложения') : TX.chartTypes[k])}</option>`).join('')}</select>`;
    const row = (side) => `<div class="pdy-row" data-side="${side}">
        <label class="pdy-chk" title="${esc(t('pdy.moveT2', 'Отметь — эту карту двигают стрелки шага'))}"><input type="checkbox" data-mv="${side}" aria-label="${esc(side === 'in' ? t('pdy.mvIn', 'Двигать внутренний круг') : t('pdy.mvOut', 'Двигать внешний круг'))}"></label>
        <span class="pdy-what">${side === 'out' ? overSel : ''}<span class="pdy-sub" data-what="${side}"></span></span>
        <span class="pdy-when" data-when="${side}"></span>
      </div>`;
    const u = spec.unit || 'h';
    return `<div class="pro-dyn" data-pdyn="${slot}">
      <div class="pdy-head"><b>${t('pdy.title', 'Динамика')}</b><span class="tiny muted">${t('pdy.hint3', 'галочка — какой круг двигать, стрелки — на шаг; колесо можно крутить мышью')}</span></div>
      ${row('in')}
      ${row('out')}
      <div class="pdy-steps"><span class="pdy-nav">
        <button type="button" class="btn sm pdy-arr" data-st="-1" aria-label="${esc(t('pdy.back', 'Назад на шаг'))}" title="${esc(t('pdy.back', 'Назад на шаг'))}">${icon('left', 'sm')}</button>
        <div class="seg sm pdy-units" role="group" aria-label="${esc(t('tb.stepA', 'Шаг перемотки'))}">${UNITS().map(([k, n]) => `<button type="button" data-unit="${k}" aria-pressed="${k === u}">${esc(n)}</button>`).join('')}</div>
        <button type="button" class="btn sm pdy-arr" data-st="1" aria-label="${esc(t('pdy.fwd', 'Вперёд на шаг'))}" title="${esc(t('pdy.fwd', 'Вперёд на шаг'))}">${icon('right', 'sm')}</button></span>
        <button class="btn sm tb-play" type="button" data-pplay aria-pressed="false">▶︎ ${t('tb.play', 'Пуск')}</button>
        <button class="btn sm" type="button" data-pnow>${icon('clock', 'sm')} ${t('pdy.now2', 'Сейчас')}</button>
        <span class="pdy-off mono" data-poff></span><button class="btn sm ghost" type="button" data-pz hidden>${icon('refresh', 'sm')} ${t('pdy.zero2', 'Вернуть')}</button>
      </div>
      <div data-dyn="banner"></div>
    </div>`;
  }

  function panelShell(spec, slot, compact, label) {
    const other = slot === 'left' ? 'right' : slot === 'right' ? 'left' : null;
    return `<section class="stack pro-panel${compact ? ' compact' : ''}${workSlot === slot ? ' work' : ''}" data-panel="${slot}">
      ${label ? `<h3 class="pp-label">${esc(label)}</h3>` : ''}
      ${dataBox(spec, slot)}
      <div class="pro-main">
        <div class="wheel-card pro-wheel">
          <div class="ph-head"><div class="ph-t" data-dyn="head"></div>
            <div class="ph-tools">
              <label class="check sm ph-cosmo" title="${esc(t('pro.cosmoT', 'Космограмма — карта без домов: только планеты и аспекты, 0° Овна слева'))}"><input type="checkbox" data-cosmo ${spec.view.cosmo ? 'checked' : ''}> ${t('pro.cosmo', 'Космограмма')}</label>
              ${other ? `<button class="btn sm ghost ph-other" type="button" data-wother="${other}" title="${esc(t('pro.workOther', 'Открыть в рабочем режиме другую карту'))}">${icon('swap', 'sm')} ${other === 'right' ? t('pro.card2', 'Карта 2') : t('pro.card1', 'Карта 1')}</button>` : ''}
              <button class="btn sm ph-work" type="button" data-work aria-pressed="${workSlot === slot}">${workSlot === slot ? `${icon('minimize', 'sm')} ${t('pro.workOff', 'Выйти из рабочего режима')}` : `${icon('maximize', 'sm')} ${t('pro.workOn', 'Рабочий режим')}`}</button>
            </div></div>
          <div class="wheel-box" data-dyn="wheel"></div>
          ${dynBox(spec, slot)}
          <div data-dyn="info"></div>
        </div>
        <div class="pro-side">
          <div class="card stack pro-asp" data-dyn="grid"></div>
          ${displayBox(spec, slot, compact)}
        </div>
      </div>
      <div data-dyn="pos"></div>
    </section>`;
  }

  /** Перерисовать живую часть панели (колесо, таблица, положения, строки динамики) — ползунки не трогаем. */
  function updatePanel(box, spec, slot, compact) {
    const q = (k) => box.querySelector(`[data-dyn="${k}"]`);
    let r;
    try { r = build(spec); } catch (e) { console.error(e); q('wheel').innerHTML = `<p class="err">${esc(t('pro.err', 'Не получилось посчитать'))}: ${esc(e.message)}</p>`; return null; }
    const v = spec.view, pts = new Set(v.pts);
    const ptIds = (c) => (c.points || []).filter((p) => pts.has(p.id) && !(r.cosmo && (p.id === 'asc' || p.id === 'mc'))).map((p) => p.id);
    const cuIds = (c) => (!r.cosmo && c.houses ? cuspPts(c).map((x) => x.id).filter((id) => pts.has(id)) : []);
    const rowsIds = ptIds(r.innerChart).concat(cuIds(r.innerChart));
    const colIds = r.outer ? r.outer.points.map((p) => p.id) : rowsIds;
    // главный АС: внутренней карты (натал) или внешней — нажатие на свободное место внутри круга меняет их местами
    const oAsc = r.outer && !r.cosmo ? (r.outer.cusps ? r.outer.cusps[0] : r.outer.asc != null ? r.outer.asc : null) : null;
    r.rotOut = oAsc != null && (spec.rotOut != null ? spec.rotOut : r.rotDefault === 'out');
    r.canRot = oAsc != null && r.inner && r.inner.cusps != null;
    const rotNote = r.canRot ? t('pro.mainAsc', 'главный АС — {x}', { x: r.rotOut ? (r.labels && r.labels.out) || t('pro.outer', 'внешняя карта') : (r.labels && r.labels.in) || t('natal', 'натал') }) : '';
    const sub = [r.sub, r.cosmo ? t('pro.cosmoSub', 'космограмма — без домов') : rotNote].filter(Boolean).join(' · ');
    q('head').innerHTML = `<div class="ph-title"><h3 title="${esc(r.title)}">${esc(r.title)}</h3><span class="tiny muted"${r.canRot ? ` title="${esc(t('pro.rotHint', 'Нажми на свободное место внутри круга — главный АС поменяется'))}"` : ''}>${sub ? esc(sub) : '&nbsp;'}</span></div>`; // строка есть всегда — колёса двух карт на одном уровне
    q('wheel').innerHTML = (r.error ? `<p class="err">${esc(r.error)}</p>` : '') + root.NWheel.svg(r.inner, { outer: r.outer, aspects: r.aspects.map((x) => Object.assign({}, x)), lang: UI.lang(), labels: r.labels, label: r.title, scale: WHEEL_SCALE, cosmo: r.cosmo, rot: r.rotOut ? oAsc : undefined });
    q('info').innerHTML = r.info.length ? `<div class="facts" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">${r.info.map(([k, val]) => `<span class="chip static">${esc(k)}: <b>${esc(val)}</b></span>`).join('')}</div>` : '';
    // маленькие цифры у значков: у планет внутренней карты — какими её домами управляют; у внешней — в каком доме внутренней стоят (транзит — по какому идёт)
    const hc = r.cosmo ? null : r.innerChart.houses ? r.innerChart.houses.cusps : r.inner && r.inner.cusps ? r.inner.cusps : null;
    const EX = root.NExplain;
    const rules = (c) => (id) => (c && EX ? EX.rulesOf(id, { houses: { cusps: c } }).join(',') : '');
    const outLon = (id) => { const pp = r.outer && r.outer.points.find((x) => x.id === id); return pp ? pp.lon : null; };
    const moving = r.kind === 'transit';
    const nums = hc ? {
      row: rules(hc),
      col: r.outer ? (id) => { const l = outLon(id); return l == null ? '' : String(AC.houseOf(l, hc)); } : rules(hc),
      rowNote: (n) => t('pro.numRule', 'управляет домом: {n}', { n }),
      colNote: r.outer ? (n) => (moving ? t('pro.numGo', 'идёт по {n} дому', { n }) : t('pro.numIn', 'стоит в {n} доме', { n })) : (n) => t('pro.numRule', 'управляет домом: {n}', { n }),
    } : null;
    const inL = (r.labels && r.labels.in) || t('natal', 'натал'), outL = (r.labels && r.labels.out) || '';
    const legend = !nums ? '' : r.outer
      ? (moving ? t('pro.numLegT', 'Маленькие цифры у значков: у натальных планет (слева) — каким домом натала управляет планета; у транзитных (сверху) — по какому дому натала она сейчас идёт.')
        : t('pro.numLegB', 'Маленькие цифры у значков: у планет слева ({a}) — какими домами управляет планета; у планет сверху ({b}) — в каком доме ({a}) она стоит.', { a: inL, b: outL }))
      : t('pro.numLeg1', 'Маленькие цифры у значков — каким домом карты управляет планета (на куспиде дома — её знак).');
    let gh = `<div class="row sb"><h3>${t('pro.grid', 'Таблица аспектов')}</h3><span class="tiny muted">${r.aspects.length} · ${t('pro.gridHint3', 'наведи — загорится на карте, нажми — что значит')}</span></div>${grid(rowsIds, colIds, r.aspects, !r.outer, nums)}`;
    if (r.own) {
      // аспекты внутри соляра / лунара — отдельной таблицей под основной (всё, что есть в карте возвращения)
      const oc = r.own.chart, oIds = ptIds(oc).concat(cuIds(oc)), oh = oc.houses ? oc.houses.cusps : null;
      gh += `<div class="row sb pro-own-h"><h3>${esc(r.own.title)}</h3><span class="tiny muted">${r.own.aspects.length}</span></div>${grid(oIds, oIds, r.own.aspects, true, oh && !r.cosmo ? { row: rules(oh), col: rules(oh), rowNote: (n) => t('pro.numRule', 'управляет домом: {n}', { n }), colNote: (n) => t('pro.numRule', 'управляет домом: {n}', { n }) } : null, true)}`;
    }
    if (legend) gh += `<p class="tiny muted pro-numleg">${esc(legend)}</p>`;
    q('grid').innerHTML = gh;
    q('pos').innerHTML = compact ? `<details class="card"><summary>${icon('table')} ${t('pro.positions', 'Положения')}</summary><div style="margin-top:10px">${positions(r.innerChart, v)}</div></details>` : `<details class="card" open><summary>${icon('table')} ${t('pro.positions', 'Положения')}</summary><div style="margin-top:10px">${positions(r.innerChart, v)}</div></details>`;
    // пробное время рождения
    const bn = q('banner');
    if (spec.shiftA) {
      const p = subjectOf(spec), qq = UI.partsIn(new Date(spec.shiftA), p.place.tz);
      bn.innerHTML = `<div class="rect-banner">${icon('alert', 'sm')}<span>${t('rect.changed', 'Пробное время рождения: {d} {t} (в профиле — {p}).', { d: UI.fmtDMY(qq), t: UI.fmtHMS(qq, qq.s ? true : false), p: p.timeKnown !== false ? `${UI.pad(p.h)}:${UI.pad(p.mi)}` : t('rect.unknown', 'время не указано') })}</span><span class="spacer"></span><button class="btn sm" type="button" data-rreset>${t('rect.reset', 'Вернуть')}</button><button class="btn sm primary" type="button" data-rsave>${spec.a === 'custom' ? t('rect.apply', 'Записать в данные') : t('rect.save', 'Сохранить в профиль')}</button></div>`;
    } else bn.innerHTML = '';
    root.NWheel.bindTips(q('wheel')); root.NWheel.bindTips(q('grid'));
    root.NWheel.linkAspects(box.querySelector('.pro-main'));
    return r;
  }

  function mountPanel(el, slot, compact, label) {
    const host = el.querySelector(`[data-slot-host="${slot}"]`); if (!host) return;
    const spec = specs[slot];
    host.innerHTML = panelShell(spec, slot, compact, label);
    const box = host.querySelector(`[data-panel="${slot}"]`);
    const remount = () => { const y = window.scrollY; mountPanel(el, slot, compact, label); window.scrollTo(0, y); };
    const dyn = box.querySelector('[data-pdyn]');
    let rings = { in: null, out: null };
    let lastR = null; // последний расчёт панели — по нему подсказки аспектов и смена главного АС
    const allAsp = () => { spec.view.asp = MAJOR.concat(MINOR); }; // соляр и лунар — все аспекты сразу (15.10, Алина)

    // ---- что и как двигаем ----
    const valOf = (mov) => {
      if (mov === 'A') return spec.shiftA ? new Date(spec.shiftA) : birthDate(subjectOf(spec));
      if (mov === 'B') { const qb = personB(spec); return spec.shiftB ? new Date(spec.shiftB) : (qb ? birthDate(qb) : new Date()); }
      return parseLocal(spec.date, placeOf(spec, subjectOf(spec)).zone);
    };
    const setVal = (mov, d) => {
      // у «Карты момента» время — это сам момент, а не пробное время рождения
      if (mov === 'A' && spec.a === 'moment') { const pl = subjectOf(spec).place; const qd = UI.partsIn(d, pl.tz); spec.mom = Object.assign({}, spec.mom, { y: qd.y, mo: qd.mo, d: qd.d, h: qd.h, mi: qd.mi, s: qd.s || 0 }); }
      else if (mov === 'A') { const base = birthDate(subjectOf(spec)); spec.shiftA = Math.abs(d - base) < 500 ? null : d.getTime(); }
      else if (mov === 'B') { const qb = personB(spec); if (!qb) return; const base = birthDate(qb); spec.shiftB = Math.abs(d - base) < 500 ? null : d.getTime(); }
      else spec.date = d.toISOString();
    };
    const movOf = (side) => (rings[side] ? rings[side].mov : null);
    const checked = () => ['in', 'out'].filter((s) => movOf(s) && (spec.move ? spec.move[s] : null));
    // сдвиг копится стрелками шага, «Пуском» и колесом мышью; якоря — где карты стояли до сдвига («Вернуть» — назад к ним)
    let anchors = {}, off = 0;
    const fmtOff = (ms) => {
      const a = Math.abs(ms), d = Math.floor(a / DAY), h = Math.floor((a % DAY) / HOUR), mi = Math.round((a % HOUR) / MIN);
      const parts = [];
      if (d >= 365) parts.push((d / 365.2422).toFixed(d >= 3650 ? 0 : 1).replace('.', UI.lang() === 'en' ? '.' : ',') + ' ' + t('tb.yShort', 'г'));
      else if (d) parts.push(d + ' ' + t('tb.dShort', 'д'));
      if (d < 365 && h) parts.push(h + ' ' + t('tb.hShort', 'ч'));
      if (d < 30 && mi) parts.push(mi + ' ' + t('tb.miShort', 'мин'));
      return (ms < 0 ? '−' : '+') + (parts.join(' ') || '0');
    };
    const showOff = () => {
      const o = dyn.querySelector('[data-poff]'), z = dyn.querySelector('[data-pz]');
      o.textContent = Math.abs(off) >= MIN ? t('pdy.off', 'сдвиг {x}', { x: fmtOff(off) }) : '';
      z.hidden = Math.abs(off) < MIN;
    };
    const reanchor = () => { anchors = {}; for (const s of ['in', 'out']) if (movOf(s)) anchors[s] = valOf(movOf(s)).getTime(); off = 0; showOff(); };
    let raf = 0, rafT = 0;
    const live = () => {
      const r = updatePanel(box, spec, slot, compact);
      if (r) { lastR = r; rings = r.rings; drawRows(); }
    };
    // перерисовка в ближайший кадр (стрелки держат и «Пуск» идёт быстро); запасной таймер — если вкладка не рисуется
    const liveSoon = () => { if (raf) return; const go = () => { cancelAnimationFrame(raf); clearTimeout(rafT); raf = 0; live(); }; raf = requestAnimationFrame(go); rafT = setTimeout(go, 80); };
    /** Поставить отмеченные карты на якорь + сдвиг. */
    const applyOff = () => { for (const s of checked()) if (anchors[s] != null) setVal(movOf(s), new Date(anchors[s] + off)); showOff(); liveSoon(); };
    /** Сдвинуть отмеченные карты на ms (стрелки, «Пуск», колесо мышью). */
    const shiftBy = (ms) => { off += ms; applyOff(); };
    const UNIT_MS = { s: 1000, mi: MIN, h: HOUR, d: DAY };
    const primary = () => { const c = checked(); return c.includes('out') ? 'out' : c[0] || (rings.out ? 'out' : 'in'); };
    const tzOf = (side) => (rings[side] ? rings[side].tz : UI.here().tz);
    const stepCal = (k, u) => { // мес/год — по календарю в поясе карты
      const s = primary(), cur = valOf(movOf(s) || 'date');
      if (UNIT_MS[u]) return shiftBy(k * UNIT_MS[u]);
      shiftBy(UI.addUnit(cur, u, k, tzOf(s)) - cur);
    };

    // ---- строки «внутренний / внешний круг» ----
    // у карты «по дате» поля даты и времени можно печатать; у соляра и лунара это дата, на которую он действует
    const selDate = (R) => R.pick || R.date;
    const pickNote = (R) => (R.pick ? t('pdy.start', 'начало: {d}', { d: UI.fmtDay(R.date, R.tz, { year: true, hour: true }) }) + (R.place ? ' · ' + R.place : '') : (R.place || ''));
    const whenHTML = (side, R) => {
      const qd = UI.partsIn(selDate(R), R.tz);
      if (R.mov === 'date') return `<span class="pdy-dt"><span class="dfield sm"><input class="input" data-pd="${side}" inputmode="numeric" autocomplete="off" value="${UI.fmtDMY(qd)}" aria-label="${esc(t('tb.date', 'Дата'))}"><button type="button" class="dcal" data-pdcal="${side}" aria-label="${esc(t('tb.cal', 'Открыть календарь'))}">${icon('calendar', 'sm')}</button></span><input class="input pdy-tm" data-pt2="${side}" inputmode="numeric" autocomplete="off" value="${UI.fmtHMS(qd)}" aria-label="${esc(t('tb.time', 'Время'))}"></span><small class="pdy-pl">${esc(pickNote(R))}</small>`;
      return `<b class="pdy-d mono">${UI.fmtDMY(qd)} <span>${UI.fmtHMS(qd)}</span></b>${R.shifted ? `<span class="tag acc">${t('pdy.trial', 'пробное')}</span>` : ''}${R.place ? `<small class="pdy-pl">${esc(R.place)}</small>` : ''}`;
    };
    const drawRows = () => {
      for (const side of ['in', 'out']) {
        const R = rings[side], rowEl = dyn.querySelector(`.pdy-row[data-side="${side}"]`);
        if (!R) { rowEl.querySelector('[data-mv]').disabled = true; rowEl.querySelector('[data-mv]').checked = false; rowEl.classList.remove('on'); rowEl.querySelector(`[data-what="${side}"]`).textContent = ''; rowEl.querySelector(`[data-when="${side}"]`).innerHTML = ''; continue; }
        const cb = rowEl.querySelector('[data-mv]');
        cb.disabled = !R.mov; cb.checked = !!(R.mov && spec.move && spec.move[side]);
        rowEl.classList.toggle('on', cb.checked);
        rowEl.querySelector(`[data-what="${side}"]`).textContent = side === 'out' ? (R.sub || '') : R.label;
        const w = rowEl.querySelector(`[data-when="${side}"]`);
        const inp = w.querySelector('[data-pd]'), tin = w.querySelector('[data-pt2]');
        const editing = (inp && document.activeElement === inp) || (tin && document.activeElement === tin);
        if (editing) continue;
        if (inp && R.mov === 'date') { const qd = UI.partsIn(selDate(R), R.tz); inp.value = UI.fmtDMY(qd); tin.value = UI.fmtHMS(qd); const pl = w.querySelector('.pdy-pl'); if (pl) pl.textContent = pickNote(R); continue; }
        w.innerHTML = whenHTML(side, R);
        bindWhen(side);
      }
    };
    const bindWhen = (side) => {
      const w = dyn.querySelector(`[data-when="${side}"]`);
      const inp = w.querySelector('[data-pd]'), tin = w.querySelector('[data-pt2]'); if (!inp) return;
      const apply = (final) => {
        const R = rings[side]; if (!R) return;
        const r = UI.parseDate(inp.value), tm = UI.parseTime(tin.value);
        const okD = !r.error && (final || inp.value.length >= 10), okT = tm && (final || /^\d{2}:\d{2}(:\d{2})?$/.test(tin.value));
        inp.classList.toggle('bad', !!r.error && (final || inp.value.length >= 10)); tin.classList.toggle('bad', !tm && (final || tin.value.length >= 5));
        if (!okD || !okT) return;
        setVal(R.mov, UI.fromParts({ y: r.y, mo: r.mo, d: r.d, h: tm.h, mi: tm.mi, s: tm.s }, R.tz)); reanchor(); live();
      };
      inp.addEventListener('input', () => { const nv = UI.autoDate(inp.value); if (nv !== inp.value) inp.value = nv; if (inp.value.length >= 10) apply(false); });
      tin.addEventListener('input', () => { const nv = UI.autoTime(tin.value); if (nv !== tin.value) tin.value = nv; if (/^\d{2}:\d{2}:\d{2}$/.test(tin.value)) apply(false); });
      [inp, tin].forEach((x) => { x.addEventListener('change', () => apply(true)); x.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(true); x.blur(); } }); });
      const cal = w.querySelector('[data-pdcal]');
      if (cal) cal.addEventListener('click', () => { const R = rings[side]; const qd = UI.partsIn(selDate(R), R.tz); UI.calPop(cal.parentElement, qd, (d) => { setVal(R.mov, UI.fromParts(Object.assign({}, qd, d), R.tz)); reanchor(); live(); }); });
    };

    // ---- галочки, шаг, стрелки, кнопки ----
    dyn.querySelectorAll('[data-mv]').forEach((cb) => cb.addEventListener('change', () => {
      spec.move = Object.assign({}, spec.move || {}, { [cb.dataset.mv]: cb.checked });
      dyn.querySelectorAll('.pdy-row').forEach((r) => r.classList.toggle('on', !!(spec.move && spec.move[r.dataset.side] && movOf(r.dataset.side))));
      reanchor(); // новая отмеченная карта поедет с того места, где стоит сейчас
    }));
    let unit = spec.unit || 'h', timer = null;
    dyn.querySelectorAll('[data-unit]').forEach((b) => b.addEventListener('click', () => { unit = spec.unit = b.dataset.unit; dyn.querySelectorAll('[data-unit]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
    // стрелки ‹ › — на один шаг; зажать — идут подряд. Ничего не отмечено — подскажем, что отметить
    const nudge = () => { if (checked().length) return true; UI.toast(t('pdy.pick', 'Отметь галочкой круг, который двигать')); return false; };
    dyn.querySelectorAll('[data-st]').forEach((b) => { const k = +b.dataset.st; UI.holdRepeat(b, () => { if (nudge()) stepCal(k, unit); }); });
    // ← → с клавиатуры, пока фокус в динамике (не в полях ввода)
    dyn.addEventListener('keydown', (e) => { if (e.target.matches('input, select')) return; if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); if (nudge()) stepCal(e.key === 'ArrowRight' ? 1 : -1, unit); } });
    dyn.querySelector('[data-pz]').addEventListener('click', () => { off = 0; applyOff(); });
    dyn.querySelector('[data-pnow]').addEventListener('click', () => {
      const s = ['out', 'in'].find((x) => movOf(x) === 'date') || (spec.a === 'moment' && movOf('in') === 'A' ? 'in' : null);
      if (s) setVal(movOf(s), new Date());
      reanchor(); live();
    });
    const play = dyn.querySelector('[data-pplay]');
    const stop = () => { clearInterval(timer); timer = null; play.setAttribute('aria-pressed', 'false'); play.innerHTML = `▶︎ ${t('tb.play', 'Пуск')}`; };
    play.addEventListener('click', () => {
      if (timer) return stop();
      if (!nudge()) return;
      play.setAttribute('aria-pressed', 'true'); play.innerHTML = `❚❚ ${t('tb.stop', 'Стоп')}`;
      timer = setInterval(() => { if (!document.body.contains(play)) return stop(); stepCal(1, unit); }, 200);
    });
    dyn.querySelector('[data-over]').addEventListener('change', (e) => {
      const k = e.target.value; if (!k) return;
      if (k === 'none') { spec.type = 'natal'; spec.flip = false; }
      else { spec.type = k; spec.flip = false; if (k === 'solar' || k === 'lunar') { spec.overlay = true; allAsp(); } if (k === 'directions') spec.dir = 'deg'; }
      spec.move = null; spec.rotOut = null; remount();
    });
    // колесо крутится мышью — двигает отмеченные карты (как ползунки)
    const scrubApi = {
      get: () => valOf(movOf(primary()) || 'date'),
      go: (d) => { const cur = valOf(movOf(primary()) || 'date'); shiftBy(d - cur); },
      step: (k, u) => stepCal(k, u || unit),
      unit: () => unit, unitName: () => ({ mi: t('tb.u.mi', 'мин'), h: t('tb.u.h', 'час'), d: t('tb.u.d', 'день'), mo: t('tb.u.mo', 'мес'), y: t('tb.u.y', 'год') })[unit],
      get tz() { return tzOf(primary()); }, stop,
    };
    UI.wheelScrub(box.querySelector('[data-dyn="wheel"]'), () => (checked().length ? scrubApi : null));

    // ---- окошко данных: свёрнуто в строку; «Изменить» — чья карта, дата, место, тип ----
    const ed = box.querySelector('[data-pedit]');
    if (ed) ed.addEventListener('click', () => { spec.edit = true; remount(); const f = el.querySelector(`[data-panel="${slot}"] [data-pdata] select`); if (f) f.focus({ preventScroll: true }); });
    const form = box.querySelector('[data-pdata]');
    if (form) {
    form.querySelector('[data-pfold]').addEventListener('click', () => { spec.edit = false; remount(); });
    form.querySelectorAll('[data-k]').forEach((inp) => inp.addEventListener('change', () => {
      const k = inp.dataset.k; spec[k] = inp.type === 'checkbox' ? inp.checked : inp.value;
      if (k === 'a') { spec.shiftA = null; spec.move = null; if (spec.a === 'moment' && !spec.mom) spec.mom = momentNow(); if (spec.a === 'custom' && !spec.custom) { const p0 = root.NStore.active(); spec.custom = p0 ? { name: t('pro.customDefault', 'Карта'), gender: p0.gender, y: p0.y, mo: p0.mo, d: p0.d, h: p0.h, mi: p0.mi, timeKnown: p0.timeKnown, place: p0.place } : null; } }
      if (k === 'b') spec.shiftB = null;
      if (k === 'type') {
        spec.flip = false; spec.ring = false; spec.move = null; spec.rotOut = null;
        if (spec.type === 'solar' || spec.type === 'lunar') allAsp();
        if (spec.type === 'directions') spec.dir = 'deg'; // дирекции сразу открываются методом «1° = 1 год» (15.10, Алина)
      }
      if (k === 'overlay') { spec.flip = false; spec.rotOut = null; }
      remount();
    }));
    const di = UI.bindDateInput(form.querySelector('[data-c="date"]'), () => {});
    di.check();
    UI.bindTimeInput(form.querySelector('[data-c="time"]'), null, false);
    const subj = subjectOf(spec);
    const city = UI.bindCity(form.querySelector('.pd-city'), null, subj && subj.place ? subj.place : null);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = form.querySelector('[data-cerr]');
      const fail = (m) => { err.textContent = m; err.hidden = false; };
      const r = UI.parseDate(form.querySelector('[data-c="date"]').value);
      if (r.error) return fail(r.error);
      const tv = form.querySelector('[data-c="time"]').value.trim(), tm = tv ? UI.parseTime(tv) : null;
      if (tv && !tm) return fail(t('err.time2', 'Время — как ЧЧ:ММ, например 09:32'));
      const pl = city.value; if (!pl) return fail(t('err.city', 'Выберите город из списка'));
      err.hidden = true;
      const cur = subjectOf(spec);
      const nd = { y: r.y, mo: r.mo, d: r.d, h: tm ? tm.h : 12, mi: tm ? tm.mi : 0, timeKnown: !!tm, place: UI.placeData(pl) };
      const same = cur && cur.y === nd.y && cur.mo === nd.mo && cur.d === nd.d && (cur.timeKnown !== false) === nd.timeKnown && (!nd.timeKnown || (cur.h === nd.h && cur.mi === nd.mi)) && cur.place && Math.abs(cur.place.lat - nd.place.lat) < 1e-4 && Math.abs(cur.place.lon - nd.place.lon) < 1e-4;
      if (spec.a === 'moment') {
        // карта момента остаётся картой момента: новые дата, время, город и название
        const nmI = form.querySelector('[data-c="name"]');
        spec.mom = Object.assign({}, nd, { timeKnown: true, s: 0, name: (nmI && nmI.value.trim()) || (spec.mom && spec.mom.name) || '' });
      } else if (!same) {
        const nmI = form.querySelector('[data-c="name"]');
        const name = (nmI && nmI.value.trim()) || (spec.a === 'custom' ? (spec.custom && spec.custom.name) : cur && cur.name) || t('pro.customDefault', 'Карта');
        spec.custom = Object.assign({ name, gender: cur ? cur.gender : 'f' }, nd);
        spec.a = 'custom';
      } else if (spec.a === 'custom') { const nmI = form.querySelector('[data-c="name"]'); if (nmI && nmI.value.trim()) spec.custom = Object.assign({}, spec.custom, { name: nmI.value.trim() }); }
      spec.shiftA = null; spec.move = null; spec.edit = false; remount();
      toChart(el.querySelector(`[data-panel="${slot}"]`));
    });
    const cs = form.querySelector('[data-csave]');
    if (cs) cs.addEventListener('click', () => { if (root.NAccount && !root.NAccount.gateAdd()) return; const id = root.NStore.upsertPerson(Object.assign({}, spec.custom)); spec.a = id; spec.custom = null; UI.toast(t('pro.customSaved', 'Сохранено в «Люди»')); remount(); });
    }
    // что показывать — своё у каждой панели
    const v = spec.view;
    const toggle = (arr, id) => { const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); else arr.push(id); };
    box.querySelectorAll('[data-pt]').forEach((b) => b.addEventListener('click', () => { toggle(v.pts, b.dataset.pt); b.setAttribute('aria-pressed', String(v.pts.includes(b.dataset.pt))); live(); fit(); }));
    box.querySelectorAll('[data-as]').forEach((b) => b.addEventListener('click', () => { toggle(v.asp, b.dataset.as); b.setAttribute('aria-pressed', String(v.asp.includes(b.dataset.as))); live(); }));
    const orb = box.querySelector('[data-orb]'); if (orb) { orb.addEventListener('input', () => { box.querySelector('[data-orbv]').textContent = Math.round(orb.value * 100) + '%'; v.orb = +orb.value; live(); }); }
    const hsS = box.querySelector('[data-hs]'); if (hsS) hsS.addEventListener('change', () => { v.hs = hsS.value; live(); });
    const paint = () => { box.querySelectorAll('[data-pt]').forEach((b) => b.setAttribute('aria-pressed', String(v.pts.includes(b.dataset.pt)))); box.querySelectorAll('[data-as]').forEach((b) => b.setAttribute('aria-pressed', String(v.asp.includes(b.dataset.as)))); };
    box.querySelectorAll('[data-dq]').forEach((b) => b.addEventListener('click', () => {
      const q = b.dataset.dq;
      if (q === 'major') v.asp = MAJOR.slice();
      else if (q === 'all') v.asp = MAJOR.concat(MINOR);
      else if (q === 'planets') v.pts = ALL_PTS.filter((x) => !['node', 'chiron', 'lilith', 'fortune', 'asc', 'mc'].includes(x));
      else if (q === 'houses') v.pts = v.pts.filter((x) => !isCusp(x)).concat(CUSP_IDS);
      else if (q === 'nohouses') v.pts = v.pts.filter((x) => !isCusp(x));
      paint(); live(); fit();
    }));
    const dispD = box.querySelector('[data-disp]'); if (dispD) dispD.addEventListener('toggle', () => { v.dispOpen = dispD.open; fit(); });
    // пробное время: вернуть / сохранить
    box.addEventListener('click', (e) => {
      if (e.target.closest('[data-rreset]')) { spec.shiftA = null; remount(); }
      if (e.target.closest('[data-rsave]')) {
        const pp = subjectOf(spec), qq = UI.partsIn(new Date(spec.shiftA), pp.place.tz);
        const upd = { y: qq.y, mo: qq.mo, d: qq.d, h: qq.h, mi: qq.mi, timeKnown: true };
        if (spec.a === 'custom') spec.custom = Object.assign({}, spec.custom, upd);
        else root.NStore.upsertPerson(Object.assign({}, pp, upd));
        spec.shiftA = null; UI.toast(t('rect.saved', 'Время рождения сохранено')); remount();
      }
    });
    const saveB = box.querySelector('[data-save]');
    if (saveB) saveB.addEventListener('click', () => {
      const r = build(spec);
      root.NStore.saveChart({ title: r.title + (r.sub ? ' · ' + r.sub : ''), spec: Object.assign(JSON.parse(JSON.stringify(spec)), { edit: false }) });
      UI.toast(t('saved', 'Карта сохранена — она в «Сохранённых»'));
    });
    // ---- космограмма, рабочий режим ----
    const cosmoC = box.querySelector('[data-cosmo]');
    cosmoC.addEventListener('change', () => { v.cosmo = cosmoC.checked; live(); fit(); });
    box.querySelector('[data-work]').addEventListener('click', () => setWork(workSlot === slot ? null : slot));
    const wo = box.querySelector('[data-wother]'); if (wo) wo.addEventListener('click', () => setWork(wo.dataset.wother));
    // ---- нажатие на аспект (клетка таблицы или линия на колесе) — короткая подсказка; на свободное место в круге — смена главного АС ----
    box.querySelector('.pro-main').addEventListener('click', (e) => {
      const ae = e.target.closest('td[data-ak], .nw-asp[data-ak]');
      if (ae && lastR) {
        const own = ae.dataset.own === '1', a = ae.getAttribute('data-pa'), b = ae.getAttribute('data-pb');
        const list = own ? (lastR.own ? lastR.own.aspects : []) : lastR.aspects;
        const x = list.find((y) => y.a === a && y.b === b) || list.find((y) => y.a === b && y.b === a);
        if (!x || !root.NExplain) return;
        const bi = !!lastR.outer && !own;
        const ob = bi ? lastR.outer.points.find((y) => y.id === x.b) : null;
        root.NExplain.aspectCard({ a: x.a, b: x.b, type: x.type, orb: x.orb, applying: x.applying, kind: own ? 'own' : bi ? lastR.kind : 'natal', chart: lastR.cosmo ? null : own ? lastR.own.chart : lastR.innerChart, bLon: ob ? ob.lon : null, labels: lastR.labels, at: lastR.at, person: lastR.p }, { x: e.clientX, y: e.clientY });
        return;
      }
      const svg = e.target.closest('svg.nw');
      if (!svg || e.target.closest('[data-tip], .nw-pl') || !lastR) return;
      const m = svg.getScreenCTM(); if (!m) return;
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const sp = pt.matrixTransform(m.inverse());
      if (Math.hypot(sp.x - 360, sp.y - 360) > +svg.dataset.rin) return;
      if (!lastR.canRot) { UI.toast(lastR.cosmo ? t('pro.rotCosmo', 'В космограмме нет домов — менять нечего') : t('pro.rotNo', 'Главный АС меняется, когда есть вторая карта с домами')); return; }
      spec.rotOut = !lastR.rotOut; live();
      UI.toast(t('pro.rotDone', 'Главный АС — {x}', { x: spec.rotOut ? (lastR.labels && lastR.labels.out) || t('pro.outer', 'внешняя карта') : (lastR.labels && lastR.labels.in) || t('natal', 'натал') }));
    });
    // первая отрисовка; галочка по умолчанию — у внешнего круга, если его двигают датой, иначе у внутреннего
    live();
    if (!spec.move) spec.move = rings.out && rings.out.mov === 'date' ? { in: false, out: true } : rings.in && rings.in.mov ? { in: true, out: false } : { in: false, out: !!(rings.out && rings.out.mov) };
    drawRows(); reanchor();
    fit();
  }

  /**
   * Колесо по высоте окна: карта, динамика под ней и таблица аспектов справа видны разом, без прокрутки (просьба Алины).
   * Считаем, сколько места занимает всё, кроме колеса (заголовок, динамика, подписи), и отдаём колесу остаток высоты;
   * клетки таблицы аспектов — тоже по высоте окна (--ag), чтобы влезли все строки и «Что показывать» под ними.
   */
  let fitBound = false;
  function stickyBottom() {
    return Math.max(0, ...[...document.querySelectorAll('.top, .pro-tabs')].map((e) => { const cs = getComputedStyle(e); return cs.position === 'sticky' ? (parseFloat(cs.top) || 0) + e.offsetHeight : 0; }));
  }
  function fit() {
    const stick0 = stickyBottom();
    const fz = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fz')) || 1;
    document.querySelectorAll('.pro-panel:not(.compact), .pro-panel.work').forEach((panel) => {
      const work = panel.classList.contains('work'); // рабочий режим: панель на весь экран, шапки сайта над ней нет, клетки таблицы крупнее
      const stick = work ? 0 : stick0;
      panel.style.setProperty('--pro-stick', stick + 'px');
      const card = panel.querySelector('.pro-wheel'), wb = card && card.querySelector('[data-dyn="wheel"]'); if (!wb) return;
      const asp = panel.querySelector('.pro-asp'), tbl = asp && asp.querySelector('table.asp-grid');
      if (window.innerWidth < 700) { wb.style.width = ''; if (asp) asp.style.removeProperty('--ag'); return; }
      const rest = card.getBoundingClientRect().height - wb.getBoundingClientRect().height;
      const colW = card.clientWidth - 28;
      // строка «чья карта · Изменить» над колесом тоже должна быть видна
      const sum = !work && panel.querySelector('.pd-sum'), sumH = sum ? sum.getBoundingClientRect().height + 12 : 0;
      wb.style.width = Math.round(Math.max(300, Math.min(colW, window.innerHeight - stick - rest - sumH - 16))) + 'px';
      if (tbl && window.innerWidth > 1100) {
        // таблица важнее: если вместе с «Что показывать» клетки выходят мельче 27 px — таблица по высоте окна, а настройки ниже (листаются)
        const disp = panel.querySelector('.pd-disp');
        const head = asp.getBoundingClientRect().height - tbl.getBoundingClientRect().height;
        const avail = window.innerHeight - stick - 16 - head, n = tbl.rows.length;
        let cell = Math.floor((avail - (disp && !work ? disp.getBoundingClientRect().height + 12 : 0)) / n);
        if (cell < 27) cell = Math.floor(avail / n);
        asp.style.setProperty('--ag', Math.max(work ? 30 : 22, Math.min((work ? 50 : 32) * fz, cell)) + 'px');
      } else if (asp) asp.style.removeProperty('--ag');
    });
    if (!fitBound) { fitBound = true; let tm = 0; window.addEventListener('resize', () => { clearTimeout(tm); tm = setTimeout(fit, 120); }); }
  }
  /**
   * «Рабочий режим» (15.10, Алина): панель на весь экран — колесо с динамикой и таблица аспектов крупно, без шапки сайта и меню.
   * Браузер тоже переходит в полноэкранный режим (если разрешает); Esc или кнопка — обратно. slot = null — выйти.
   */
  let fsMine = false, workBound = false;
  function setWork(slot) {
    const prev = workSlot;
    workSlot = slot;
    document.querySelectorAll('.pro-panel').forEach((p) => {
      const on = p.dataset.panel === slot;
      p.classList.toggle('work', on);
      const b = p.querySelector('[data-work]');
      if (b) { b.setAttribute('aria-pressed', String(on)); b.innerHTML = on ? `${icon('minimize', 'sm')} ${t('pro.workOff', 'Выйти из рабочего режима')}` : `${icon('maximize', 'sm')} ${t('pro.workOn', 'Рабочий режим')}`; }
    });
    document.body.classList.toggle('pro-working', !!slot);
    const de = document.documentElement;
    if (slot && !document.fullscreenElement && de.requestFullscreen) { try { de.requestFullscreen().then(() => { fsMine = true; }).catch(() => {}); } catch (er) { /* без полноэкранного — просто окно поверх */ } }
    if (!slot && fsMine && document.fullscreenElement && document.exitFullscreen) { fsMine = false; document.exitFullscreen().catch(() => {}); }
    if (root.NExplain) root.NExplain.closeCard();
    if (!workBound) {
      workBound = true;
      document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && fsMine) { fsMine = false; if (workSlot) setWork(null); } });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && workSlot && !document.querySelector('[data-sheet], .pop[data-pop], .asp-card, .calpop')) setWork(null); });
      window.addEventListener('hashchange', () => { if (workSlot) setWork(null); });
    }
    setTimeout(fit, 30); setTimeout(fit, 260); // после перехода в полноэкранный режим высота окна меняется
    if (!slot && prev) { const p = document.querySelector(`.pro-panel[data-panel="${prev}"]`); if (p) setTimeout(() => toChart(p), 280); }
  }
  /** Прокрутить к карте так, чтобы колесо, динамика и таблица оказались целиком под шапкой и вкладками. */
  function toChart(panel) {
    const m = panel && (panel.querySelector('.pd-sum') || panel.querySelector('.pro-main')); if (!m || window.innerWidth < 700) return;
    const top = m.getBoundingClientRect().top - stickyBottom() - 6;
    if (Math.abs(top) > 4) window.scrollTo({ top: window.scrollY + top, behavior: 'auto' });
  }

  // «Дирекции» убраны из вкладок (тип карты «Дирекции» остался), «Ректификация» — отдельный VIP-раздел в меню слева
  const TABS = () => [['chart', t('pro.t.chart', 'Карта'), 'chart'], ['split', t('pro.t.split', 'Две карты'), 'split'], ['tables', t('pro.t.tables', 'Таблицы'), 'table'], ['firdaria', t('pro.t.fird', 'Фирдарии'), 'timeline'], ['acg', t('pro.t.acg', 'Астрокарта'), 'map'], ['dynamics', t('pro.t.transits', 'Транзиты'), 'chart-line'], ['solar', t('pro.t.solar', 'Соляр'), 'sun'], ['moon', t('pro.t.moon', 'Луна'), 'moon'], ['retro', t('pro.t.retro', 'Ретро'), 'retro'], ['saved', t('pro.t.saved', 'Сохранённые'), 'save']];

  async function page(el, params) {
    const p = params.id ? root.NStore.person(params.id) : root.NStore.active();
    if (!p) { location.hash = '#onboard'; return; }
    if (params.tab === 'rect') { location.replace('#rectify' + (params.id ? '?id=' + params.id : '')); return; }
    if (params.tab === 'directions') { params.tab = 'chart'; params.type = 'directions'; }
    if (params.tab) tab = params.tab;
    if (!TABS().some(([k]) => k === tab)) tab = 'chart';
    const okA = (s) => s && s.v2 && (s.a === 'custom' || s.a === 'moment' ? true : !!root.NStore.person(s.a));
    if (!okA(specs.main)) specs.main = defaultSpec('transit', p);
    if (params.id && tab !== 'split') { specs.main.a = p.id; specs.main.shiftA = null; specs.main.move = null; }
    if (!okA(specs.left)) specs.left = defaultSpec('transit', p);
    // «Карта 2» по умолчанию — карта дня (момент «сейчас» там, где живёшь): слева наложения, справа небо дня
    if (!okA(specs.right)) { specs.right = defaultSpec('natal', p); specs.right.a = 'moment'; specs.right.mom = momentNow(); }
    if (params.type && TYPES.includes(params.type)) { specs.main.type = params.type; specs.main.flip = false; specs.main.move = null; specs.main.rotOut = null; tab = 'chart'; if (params.type === 'solar' || params.type === 'lunar') specs.main.view.asp = MAJOR.concat(MINOR); if (params.type === 'directions') specs.main.dir = 'deg'; }
    if (params.load) { const sv = root.NStore.saved().find((x) => x.id === params.load); if (sv) { specs.main = normSpec(sv.spec, p); specs.main.move = null; tab = 'chart'; } }
    const redraw = (kept) => { // kept — перерисовать на месте, без прокрутки к карте
      const y = window.scrollY;
      el.innerHTML = `<div class="sec-head"><span class="eyebrow">${t('pro.eyebrow', 'Профи-режим')}</span><h1>${t('pro.title', 'Астропроцессор')}</h1></div>
        <div class="pro-tabs hs"><button class="hs-btn" type="button" data-hsl aria-label="${t('scrollL', 'Прокрутить влево')}">${icon('left', 'sm')}</button><div class="hs-track"><div class="chips" role="tablist">${TABS().map(([k, n, ic]) => `<button class="chip" type="button" role="tab" data-tab="${k}" aria-pressed="${tab === k}">${icon(ic)} ${esc(n)}</button>`).join('')}</div></div><button class="hs-btn" type="button" data-hsr aria-label="${t('scrollR', 'Прокрутить вправо')}">${icon('right', 'sm')}</button></div>
        <div id="proBody"></div>`;
      el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { if (workSlot) setWork(null); tab = b.dataset.tab; redraw(); }));
      UI.hscroll(el.querySelector('.pro-tabs'));
      const body = el.querySelector('#proBody');
      try {
        if (tab === 'chart') { body.innerHTML = '<div data-slot-host="main"></div>'; mountPanel(body, 'main', false); if (!kept) requestAnimationFrame(() => toChart(body.querySelector('[data-panel="main"]'))); }
        else if (tab === 'split') {
          body.innerHTML = `<p class="small muted" style="margin-bottom:12px">${t('pro.splitHint3', 'Две полностью независимые карты: у каждой свой человек или свои данные, свой тип, своя динамика и свои настройки показа.')}</p><div class="split"><div data-slot-host="left"></div><div data-slot-host="right"></div></div>`;
          mountPanel(body, 'left', true, t('pro.card1', 'Карта 1')); mountPanel(body, 'right', true, t('pro.card2', 'Карта 2'));
        } else if (tab === 'saved') savedView(body, redraw);
        else if (root.NProMore && root.NProMore[tab]) root.NProMore[tab](body, specs.main.a && specs.main.a !== 'custom' ? root.NStore.person(specs.main.a) || p : p, { redraw, G, AG, pName, fmtLon });
      } catch (e) { console.error(e); body.innerHTML = `<p class="err">${esc(t('pro.err', 'Не получилось посчитать'))}: ${esc(e.message)}</p>`; }
      root.NWheel.bindTips(body);
      window.scrollTo(0, y);
    };
    redraw();
  }

  function savedView(body, redraw) {
    const list = root.NStore.saved();
    body.innerHTML = list.length ? `<div class="card"><div class="items">${list.map((c) => `<div class="item"><span class="gl">${icon('save')}</span><div class="row sb"><div><h4>${esc(c.title)}</h4><p class="tiny">${esc(UI.fmtDay(new Date(c.at), UI.here().tz, { year: 'numeric', hour: '2-digit' }))}</p></div><div class="row"><a class="btn sm" href="#pro?load=${c.id}">${t('open', 'Открыть')}</a><button class="iconbtn" data-del="${c.id}" aria-label="${t('delete', 'Удалить')}">${icon('trash')}</button></div></div></div>`).join('')}</div></div>`
      : `<div class="empty"><h3>${t('saved.empty', 'Пока пусто')}</h3><p class="muted">${t('saved.emptyP', 'Нажми «Сохранить» над любой картой — она появится здесь, и к ней можно вернуться позже.')}</p></div>`;
    body.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { root.NStore.removeChart(b.dataset.del); redraw(); }));
  }

  root.NPro = { build, grid, positions, chartFor };
  (root.NPages = root.NPages || {}).pro = { render: page };
})(window);
