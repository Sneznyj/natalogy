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
      if (angles.has('mc')) s += `<line class="acg-l" data-tip="${tipOf('mc')}" x1="${px(l.mc)}" y1="0" x2="${px(l.mc)}" y2="${H}" stroke="${col}" stroke-width="1.6"/>`;
      if (angles.has('ic')) s += `<line class="acg-l" data-tip="${tipOf('ic')}" x1="${px(l.ic)}" y1="0" x2="${px(l.ic)}" y2="${H}" stroke="${col}" stroke-width="1.2" stroke-dasharray="5 4"/>`;
      for (const ang of ['asc', 'dsc']) {
        if (!angles.has(ang)) continue;
        let d = '', prev = null;
        for (const [lon, lat] of l[ang]) { const x = px(lon), y = py(lat); d += (prev == null || Math.abs(lon - prev) > 180 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1); prev = lon; }
        s += `<path class="acg-l" data-tip="${tipOf(ang)}" d="${d}" fill="none" stroke="${col}" stroke-width="${ang === 'asc' ? 1.6 : 1.2}" ${ang === 'dsc' ? 'stroke-dasharray="2 3"' : ''}/>`;
      }
      // подпись у верхнего края на линии MC
      if (angles.has('mc')) s += `<text x="${(px(l.mc) + 3).toFixed(1)}" y="12" font-family="'Noto Sans Symbols 2','Noto Sans Symbols','Segoe UI Symbol',sans-serif" font-size="12" fill="${col}">${(opts.glyphs || {})[id] || ''}</text>`;
    }
    if (opts.birth) s += `<circle cx="${px(opts.birth.lon)}" cy="${py(opts.birth.lat)}" r="4.5" fill="#F2B062" stroke="#16173A" stroke-width="1.5" data-tip="${opts.birthLabel || ''}"/>`;
    if (opts.here) s += `<circle cx="${px(opts.here.lon)}" cy="${py(opts.here.lat)}" r="4.5" fill="#fff" stroke="#16173A" stroke-width="1.5" data-tip="${opts.hereLabel || ''}"/>`;
    s += '</svg>';
    return s;
  }
  root.NACG = { lines, cityHits, svg, loadWorld, COLORS, equatorOfDate };
})(window);
