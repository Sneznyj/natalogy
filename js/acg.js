/* Астрокартография (линии «in mundo», как у Джима Льюиса): где на Земле планета рождения стояла на ASC, DSC, MC, IC.
   Считается по настоящим экваториальным координатам планет (с широтой), звёздное время — Гринвич. */
(function (root) {
  'use strict';
  const A = root.Astronomy;
  const BODIES = { sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto' };
  const n180 = (x) => { x = ((x + 180) % 360 + 360) % 360 - 180; return x; };
  const D = Math.PI / 180;

  function equatorOfDate(id, date) {
    const t = A.MakeTime(date);
    const v = A.GeoVector(A.Body[BODIES[id]], t, true);
    const rot = A.Rotation_EQJ_EQD(t);
    const eq = A.EquatorFromVector(A.RotateVector(rot, v));
    return { ra: eq.ra * 15, dec: eq.dec };
  }

  /** Линии: { id: { mc: λ, ic: λ, asc: [[λ, φ]...], dsc: [...] , ra, dec } } */
  function lines(date, ids) {
    const gst = A.SiderealTime(A.MakeTime(date)) * 15;
    const out = {};
    for (const id of ids || Object.keys(BODIES)) {
      const { ra, dec } = equatorOfDate(id, date);
      const mc = n180(ra - gst), ic = n180(mc + 180);
      const asc = [], dsc = [];
      for (let lat = -78; lat <= 78; lat += 1) {
        const x = -Math.tan(lat * D) * Math.tan(dec * D);
        if (Math.abs(x) > 1) continue;
        const H = Math.acos(x) / D;
        asc.push([n180(ra - H - gst), lat]);
        dsc.push([n180(ra + H - gst), lat]);
      }
      out[id] = { mc, ic, asc, dsc, ra, dec };
    }
    return out;
  }

  /** Насколько город близко к линии: разница долгот на его широте (в градусах дуги по параллели ≈ км/111). */
  function cityHits(L, cities, orbDeg) {
    orbDeg = orbDeg || 2.5;
    const out = [];
    for (const c of cities) {
      for (const [id, l] of Object.entries(L)) {
        const k = Math.cos(c.lat * D);
        const test = (ang, lon) => { const d = Math.abs(n180(c.lon - lon)) * k; if (d <= orbDeg) out.push({ city: c, planet: id, angle: ang, dist: d, km: Math.round(d * 111) }); };
        test('mc', l.mc); test('ic', l.ic);
        // ASC/DSC на широте города
        const x = -Math.tan(c.lat * D) * Math.tan(l.dec * D);
        if (Math.abs(x) <= 1) {
          const H = Math.acos(x) / D, gst = n180(l.ra - l.mc);
          test('asc', n180(l.ra - H - gst)); test('dsc', n180(l.ra + H - gst));
        }
      }
    }
    return out.sort((a, b) => a.dist - b.dist);
  }

  // ---------- карта мира ----------
  let world = null, worldTried = false;
  async function loadWorld() {
    if (world || worldTried) return world;
    worldTried = true;
    const cfg = root.NCONFIG || {};
    try {
      if (!root.topojson) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = cfg.topojson; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      const ctl = new AbortController(); setTimeout(() => ctl.abort(), 6000);
      const topo = await (await fetch(cfg.worldMap, { signal: ctl.signal })).json();
      const land = root.topojson.feature(topo, topo.objects.land || topo.objects.countries);
      world = land;
    } catch (e) { world = null; }
    return world;
  }
  const W = 720, H = 360;
  const px = (lon) => ((lon + 180) / 360) * W, py = (lat) => ((90 - lat) / 180) * H;
  function geoPath(geo) {
    let d = '';
    const ring = (r) => { let prev = null; r.forEach(([lon, lat], i) => { const x = px(lon), y = py(lat); if (i === 0 || (prev != null && Math.abs(lon - prev) > 180)) d += `M${x.toFixed(1)} ${y.toFixed(1)}`; else d += `L${x.toFixed(1)} ${y.toFixed(1)}`; prev = lon; }); d += 'Z'; };
    const feats = geo.type === 'FeatureCollection' ? geo.features : [geo];
    for (const f of feats) {
      const g = f.geometry || f;
      if (g.type === 'Polygon') g.coordinates.forEach(ring);
      else if (g.type === 'MultiPolygon') g.coordinates.forEach((p) => p.forEach(ring));
    }
    return d;
  }
  const COLORS = { sun: '#F2B062', moon: '#E7E3FF', mercury: '#9FD6C8', venus: '#F2A3BF', mars: '#F2776B', jupiter: '#8FB4F7', saturn: '#C7B07A', uranus: '#6FD0E6', neptune: '#9B8CF0', pluto: '#C68AD9' };
  /** SVG-карта. opts: { show:[ids], angles:[...], birth:{lat,lon}, here:{lat,lon}, cities:[...], names } */
  function svg(L, opts) {
    opts = opts || {};
    const show = opts.show || Object.keys(L), angles = new Set(opts.angles || ['asc', 'dsc', 'mc', 'ic']);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.label || 'Astrocartography'}"><rect width="${W}" height="${H}" fill="#0F1736"/>`;
    for (let lon = -180; lon <= 180; lon += 30) s += `<line x1="${px(lon)}" y1="0" x2="${px(lon)}" y2="${H}" stroke="rgba(255,255,255,.07)"/>`;
    for (let lat = -60; lat <= 60; lat += 30) s += `<line x1="0" y1="${py(lat)}" x2="${W}" y2="${py(lat)}" stroke="rgba(255,255,255,${lat === 0 ? 0.14 : 0.07})"/>`;
    if (world) s += `<path d="${geoPath(world)}" fill="#24305E" stroke="#3A4A85" stroke-width=".5"/>`;
    for (const c of (opts.cities || [])) s += `<circle cx="${px(c.lon).toFixed(1)}" cy="${py(c.lat).toFixed(1)}" r="1.6" fill="rgba(255,255,255,.45)"><title>${c.name}</title></circle>`;
    const nm = opts.names || {};
    for (const id of show) {
      const l = L[id]; if (!l) continue;
      const col = COLORS[id];
      const tipOf = (ang) => `${(nm[id] || id)} — ${(opts.angleNames || {})[ang] || ang}`;
      if (angles.has('mc')) s += `<line class="acg-l" data-acg="${id}|mc" data-tip="${tipOf('mc')}" x1="${px(l.mc)}" y1="0" x2="${px(l.mc)}" y2="${H}" stroke="${col}" stroke-width="1.6"/>`;
      if (angles.has('ic')) s += `<line class="acg-l" data-acg="${id}|ic" data-tip="${tipOf('ic')}" x1="${px(l.ic)}" y1="0" x2="${px(l.ic)}" y2="${H}" stroke="${col}" stroke-width="1.2" stroke-dasharray="5 4"/>`;
      for (const ang of ['asc', 'dsc']) {
        if (!angles.has(ang)) continue;
        let d = '', prev = null;
        for (const [lon, lat] of l[ang]) { const x = px(lon), y = py(lat); d += (prev == null || Math.abs(lon - prev) > 180 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1); prev = lon; }
        s += `<path class="acg-l" data-acg="${id}|${ang}" data-tip="${tipOf(ang)}" d="${d}" fill="none" stroke="${col}" stroke-width="${ang === 'asc' ? 1.6 : 1.2}" ${ang === 'dsc' ? 'stroke-dasharray="2 3"' : ''}/>`;
      }
      // подпись у верхнего края на линии MC
      if (angles.has('mc')) s += `<text x="${(px(l.mc) + 3).toFixed(1)}" y="12" font-family="'Noto Sans Symbols 2','Noto Sans Symbols','Segoe UI Symbol',sans-serif" font-size="12" fill="${col}">${(opts.glyphs || {})[id] || ''}</text>`;
    }
    if (opts.birth) s += `<circle cx="${px(opts.birth.lon)}" cy="${py(opts.birth.lat)}" r="4.5" fill="#F2B062" stroke="#16173A" stroke-width="1.5" data-tip="${opts.birthLabel || ''}"/>`;
    if (opts.here) s += `<circle cx="${px(opts.here.lon)}" cy="${py(opts.here.lat)}" r="4.5" fill="#fff" stroke="#16173A" stroke-width="1.5" data-tip="${opts.hereLabel || ''}"/>`;
    s += '</svg>';
    return s;
  }
  // ---------- обычная карта мира (Leaflet + тайлы с названиями всех мест), зум, линии по нажатию ----------
  // насыщенные цвета линий — видны и на светлой, и на тёмной карте
  const MAP_COL = { sun: '#E07A00', moon: '#5B6EB0', mercury: '#108C77', venus: '#D23C86', mars: '#D7263D', jupiter: '#1F63D6', saturn: '#7A5A14', uranus: '#0096A8', neptune: '#6440D8', pluto: '#9A2FB0' };
  const MAP_COL_D = { sun: '#FFB347', moon: '#C9CCFF', mercury: '#5FE0C4', venus: '#FF8CC0', mars: '#FF6B6B', jupiter: '#7FB0FF', saturn: '#E3C27A', uranus: '#5FE3F2', neptune: '#B49BFF', pluto: '#E38BF5' };
  const mapColor = (id, dark) => (dark ? MAP_COL_D : MAP_COL)[id] || '#888';
  let LP = null;
  function loadLeaflet() {
    if (root.L && root.L.map) return Promise.resolve(root.L);
    if (LP) return LP;
    const cfg = (root.NCONFIG || {}).leaflet || {};
    if (!cfg.js) return Promise.reject(new Error('no leaflet'));
    LP = new Promise((res, rej) => {
      if (!document.querySelector('link[data-leaflet]')) { const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = cfg.css; css.setAttribute('data-leaflet', '1'); document.head.appendChild(css); }
      const s = document.createElement('script'); s.src = cfg.js; s.async = true;
      const to = setTimeout(() => rej(new Error('timeout')), 9000);
      s.onload = () => { clearTimeout(to); root.L && root.L.map ? res(root.L) : rej(new Error('no L')); };
      s.onerror = () => { clearTimeout(to); rej(new Error('load')); };
      document.head.appendChild(s);
    }).catch((e) => { LP = null; throw e; });
    return LP;
  }
  function tileLayer(dark) {
    const cfg = (root.NCONFIG || {}).tiles || {};
    return root.L.tileLayer(dark ? cfg.dark : cfg.light, { subdomains: cfg.subdomains || 'abc', maxZoom: 19, attribution: cfg.attribution || '' });
  }
  /** Долготы подряд без скачка ±360 — чтобы линия шла непрерывно, и её копии на соседних «мирах». */
  function unwrap(pts) { const out = []; let prev = null, off = 0; for (const [lon, lat] of pts) { if (prev != null) { if (lon + off - prev > 180) off -= 360; else if (lon + off - prev < -180) off += 360; } const x = lon + off; out.push([lat, x]); prev = x; } return out; }
  function drawLeafletLines(layer, Ls, o) {
    const Lf = root.L; layer.clearLayers();
    const angles = new Set(o.angles), copies = [-360, 0, 360];
    for (const id of o.show) {
      const l = Ls[id]; if (!l) continue;
      const col = mapColor(id, o.dark);
      const tip = (ang) => `${o.glyphs[id] || ''} ${(o.names || {})[id] || id} — ${(o.angleNames || {})[ang] || ang}`;
      const add = (latlngs, ang, style) => {
        for (const k of copies) {
          const ll = latlngs.map(([a, b]) => [a, b + k]);
          // широкая прозрачная линия поверх — легко попасть пальцем
          const hit = Lf.polyline(ll, { color: col, weight: 16, opacity: 0, interactive: true });
          const line = Lf.polyline(ll, Object.assign({ color: col, weight: 3, opacity: 0.95, interactive: false, lineCap: 'round' }, style));
          hit.bindTooltip(tip(ang), { sticky: true, className: 'acg-tt' });
          hit.on('click', (e) => o.onClick(id, ang, e.latlng));
          hit.on('mouseover', () => line.setStyle({ weight: 5.5 })); hit.on('mouseout', () => line.setStyle({ weight: style && style.weight ? style.weight : 3 }));
          line.addTo(layer); hit.addTo(layer);
        }
      };
      if (angles.has('mc')) add([[-85, l.mc], [85, l.mc]], 'mc', {});
      if (angles.has('ic')) add([[-85, l.ic], [85, l.ic]], 'ic', { dashArray: '8 7', weight: 2.6 });
      if (angles.has('asc') && l.asc.length) add(unwrap(l.asc), 'asc', {});
      if (angles.has('dsc') && l.dsc.length) add(unwrap(l.dsc), 'dsc', { dashArray: '3 7', weight: 2.8 });
      // подписи: значок планеты и угол прямо на линии
      const lab = (lat, lon, ang) => { for (const k of copies) { const m = Lf.marker([lat, lon + k], { icon: Lf.divIcon({ className: 'acg-lab', html: `<span style="background:${col}">${o.glyphs[id] || ''}<small>${ang.toUpperCase()}</small></span>`, iconSize: null }), keyboard: false }); m.on('click', (e) => o.onClick(id, ang, e.latlng)); m.addTo(layer); } };
      if (angles.has('mc')) lab(62, l.mc, 'mc');
      if (angles.has('ic')) lab(-48, l.ic, 'ic');
      const mid = (arr) => arr[Math.floor(arr.length * 0.62)];
      if (angles.has('asc') && l.asc.length) { const q = mid(l.asc); lab(q[1], q[0], 'asc'); }
      if (angles.has('dsc') && l.dsc.length) { const q = mid(l.dsc); lab(q[1], q[0], 'dsc'); }
    }
    const dot = (pt, cls, label) => { if (!pt) return; for (const k of copies) Lf.marker([pt.lat, pt.lon + k], { icon: Lf.divIcon({ className: 'acg-pt ' + cls, html: '<i></i>', iconSize: [18, 18] }), zIndexOffset: 500 }).bindTooltip(label, { direction: 'top', offset: [0, -8] }).addTo(layer); };
    dot(o.birth, 'birth', o.birthLabel); dot(o.here, 'here', o.hereLabel);
  }

  root.NACG = { lines, cityHits, svg, loadWorld, COLORS, equatorOfDate, loadLeaflet, tileLayer, drawLeafletLines, mapColor };
})(window);
