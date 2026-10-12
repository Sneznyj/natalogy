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
    const gend = (s) => (TX.gend ? TX.gend(s, ctx.person && ctx.person.gender) : s);
    const when = [];
    if (e.start && e.end) when.push([t('trx.period', 'В силе'), `${UI.fmtDay(e.start, tz, { year: 'numeric' })} — ${UI.fmtDay(e.end, tz, { year: 'numeric' })}`]);
    if (e.exact && e.exact.length) when.push([t('trx.exact', 'Точно'), e.exact.map((x) => UI.fmtDay(x, tz, { year: 'numeric', hour: '2-digit' })).join(' · ')]);
    if (e.orb != null) when.push([t('orb', 'орбис'), `${e.orb.toFixed(2)}°${e.applying != null ? (e.applying ? ' ↗' : ' ↘') : ''}`]);
    const html = `<div class="stack s18 trx">
      <div class="trx-head"><span class="trx-g ${tn}">${g}</span><div class="stack s6" style="min-width:0"><b class="trx-t">${esc(phrase(e.T, e.N, e.type))}</b><span class="small muted">${esc(cap(an))} · ${pg(e.T)} ${esc(tp.name)} → ${pg(e.N)} ${esc(np.name)}</span>
        ${when.length ? `<div class="tags">${when.map(([k, v]) => `<span class="tag plain">${esc(k)}: <b class="mono" style="font-size:calc(12px*var(--fz))">${esc(v)}</b></span>`).join('')}</div>` : ''}</div></div>
      <div class="trx-sum ${tn}"><span class="label">${t('trx.sum', 'Что это значит')}</span><p><b>${esc(cap(combo))}</b>${np.area ? ` — ${esc(t('trx.inTheme', 'в теме «{a}»', { a: np.area }))}` : ''}.</p><div class="todo">${esc(gend(X.advice[tn === 'conj' ? 'conj' : tn]))}</div></div>
      <div class="grid2">
        <div class="card soft stack s6"><span class="label">${pg(e.T)} ${esc(tp.name)}</span><p class="small">${esc(X.planet[e.T] || '')}</p></div>
        <div class="card soft stack s6"><span class="label">${W.ASP_G[e.type] || ''}${VS} ${esc(cap(an))}</span><p class="small">${esc(X.aspect[e.type] || '')}</p>${phase ? `<p class="small muted">${esc(phase)}</p>` : ''}</div>
      </div>
      <div class="card soft stack s6"><span class="label">${t('trx.touched', 'Что затронуто в твоей карте')}</span><p class="small"><b>${pg(e.N)} ${esc(np.name)}</b> — ${esc(gend(np.short || np.area || ''))}.${nh && TX.H[nh] ? ' ' + esc(t('trx.house', 'В карте — {n} дом: {a}.', { n: nh, a: TX.H[nh].area })) : ''}</p></div>
      <details class="card soft"><summary>${t('trx.whatT', 'Что такое транзит')}</summary><p class="small" style="margin-top:8px">${esc(X.what)}</p></details>
    </div>`;
    UI.modal(html, { title: `${tp.name} ${an} ${np.name}`, eyebrow: t('trx.eyebrow', 'Транзит') });
  }

  root.NExplain = { transit, tone, short, phrase };
})(window);
