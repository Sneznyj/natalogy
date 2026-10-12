/* Общие элементы интерфейса: перевод t(), иконки, шторка, тост, подсказки, поля даты/времени/города, форма человека. */
(function (root) {
  'use strict';
  const Store = root.NStore;
  // ---------- язык ----------
  function lang() { const s = Store.settings().lang; if (s) return s; const n = (navigator.language || 'ru').toLowerCase(); return n.startsWith('ru') || n.startsWith('be') || n.startsWith('uk') || n.startsWith('kk') ? 'ru' : 'en'; }
  /** t('ключ', 'русский текст', {vars}) — русский всегда в коде, английский в NI18N.en */
  function t(key, ru, vars) {
    let s = lang() === 'en' && root.NI18N && root.NI18N.en[key] != null ? root.NI18N.en[key] : ru;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  }
  const TX = () => root.NTexts[lang()] || root.NTexts.ru;
  // ---------- DOM ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const icon = (name, cls) => `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${(root.NICONS || {})[name] || ''}</svg>`;
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ---------- тост ----------
  let toastT = null;
  function toast(msg) {
    let el = $('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2800);
  }
  // ---------- шторка (снизу на телефоне, справа на компьютере) ----------
  function sheet(html, opts) {
    opts = opts || {};
    closeSheet();
    $$('.nw-tip').forEach((x) => { x.hidden = true; });
    const scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.dataset.sheet = '1';
    const el = document.createElement('div'); el.className = 'sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.dataset.sheet = '1';
    el.innerHTML = `<div class="sheet-head"><div style="flex:1;display:grid;gap:4px">${opts.eyebrow ? `<span class="eyebrow">${esc(opts.eyebrow)}</span>` : ''}<h2>${esc(opts.title || '')}</h2></div><button class="iconbtn" type="button" data-close aria-label="${esc(t('close', 'Закрыть'))}">${icon('close')}</button></div><div class="sheet-body">${html}</div>`;
    document.body.append(scrim, el);
    document.body.style.overflow = 'hidden';
    scrim.addEventListener('click', closeSheet);
    el.querySelector('[data-close]').addEventListener('click', closeSheet);
    const onKey = (e) => { if (!document.body.contains(el)) { document.removeEventListener('keydown', onKey); return; } if (e.key === 'Escape') closeSheet(); };
    document.addEventListener('keydown', onKey);
    setTimeout(() => { const f = el.querySelector('[autofocus],input,button:not([data-close])'); if (f && opts.focus !== false) f.focus({ preventScroll: true }); }, 60);
    if (root.NWheel) root.NWheel.bindTips(el);
    return el.querySelector('.sheet-body');
  }
  function closeSheet() { $$('[data-sheet]').forEach((x) => x.remove()); document.body.style.overflow = ''; hideRich(); }
  /** Окно по центру (на телефоне — снизу). opts.prev/next — стрелки «соседний день» в шапке; ←/→ на клавиатуре. */
  function modal(html, opts) {
    opts = opts || {};
    const body = sheet(html, Object.assign({}, opts, { focus: false }));
    const el = body.parentElement; el.classList.add('modal');
    if (opts.prev || opts.next) {
      const nav = document.createElement('div'); nav.className = 'sheet-nav';
      nav.innerHTML = `${opts.prev ? `<button class="iconbtn bd" type="button" data-mprev aria-label="${esc(opts.prevLabel || t('prev', 'Назад'))}">${icon('left')}</button>` : ''}${opts.next ? `<button class="iconbtn bd" type="button" data-mnext aria-label="${esc(opts.nextLabel || t('next', 'Вперёд'))}">${icon('right')}</button>` : ''}`;
      el.querySelector('.sheet-head').insertBefore(nav, el.querySelector('[data-close]'));
      if (opts.prev) nav.querySelector('[data-mprev]').addEventListener('click', opts.prev);
      if (opts.next) nav.querySelector('[data-mnext]').addEventListener('click', opts.next);
      const onKey = (e) => { if (!document.body.contains(el)) { document.removeEventListener('keydown', onKey); return; } if (e.target.closest && e.target.closest('input,textarea,select')) return; if (e.key === 'ArrowLeft' && opts.prev) { e.preventDefault(); opts.prev(); } if (e.key === 'ArrowRight' && opts.next) { e.preventDefault(); opts.next(); } };
      document.addEventListener('keydown', onKey);
    }
    setTimeout(() => { const c = el.querySelector('[data-close]'); if (c) c.focus({ preventScroll: true }); }, 60);
    return body;
  }
  // ---------- богатая подсказка при наведении (мышь); на касании — ничего, там сразу окно ----------
  let rich = null;
  function hideRich() { if (rich) { rich.remove(); rich = null; } }
  function richTip(container, selector, htmlFn) {
    let cur = null;
    container.addEventListener('pointerover', (e) => {
      if (e.pointerType !== 'mouse') return;
      const el = e.target.closest && e.target.closest(selector);
      if (!el || !container.contains(el) || el === cur) return;
      cur = el;
      const html = htmlFn(el); if (!html) return;
      hideRich();
      rich = document.createElement('div'); rich.className = 'rtip'; rich.setAttribute('role', 'tooltip'); rich.innerHTML = html;
      document.body.appendChild(rich);
      const r = el.getBoundingClientRect(), tw = rich.offsetWidth, th = rich.offsetHeight;
      let left = r.left + r.width / 2 - tw / 2, top = r.bottom + 8;
      if (top + th > window.innerHeight - 8) top = r.top - th - 8;
      if (top < 8) top = Math.max(8, Math.min(window.innerHeight - th - 8, r.top));
      left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
      rich.style.left = left + 'px'; rich.style.top = top + 'px';
    });
    container.addEventListener('pointerout', (e) => {
      if (e.pointerType !== 'mouse' || !cur) return;
      if (e.relatedTarget && cur.contains(e.relatedTarget)) return;
      cur = null; hideRich();
    });
    container.addEventListener('pointerdown', () => { cur = null; hideRich(); });
  }
  if (typeof document !== 'undefined') document.addEventListener('scroll', hideRich, { passive: true, capture: true });
  // ---------- баллы ----------
  const LVK = (l) => ({ 2: 'l2', 1: 'l1', 0: 'l0', '-1': 'lm1', '-2': 'lm2' })[l];
  function dots(level) { const n = level + 3; return `<span class="dots ${LVK(level)}" aria-hidden="true">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`; }
  function ptsBadge(r, noMax) { return `<span class="pts ${LVK(r.level)}" title="${esc(t('pts.of', '{n} из 10', { n: r.pts }))}">${r.pts}${noMax ? '' : '<small>/10</small>'}</span>`; }
  const LV_COL = { 2: 'var(--dot-p2)', 1: 'var(--dot-p1)', 0: 'var(--dot-0)', '-1': 'var(--dot-m1)', '-2': 'var(--dot-m2)' };
  function ringPts(r, size) {
    size = size || 74;
    const rr = size / 2 - 5, c = size / 2, len = 2 * Math.PI * rr, off = len * (1 - Math.max(0.04, (r.ptsF != null ? r.ptsF : r.pts) / 10));
    return `<span class="ring-pts" style="width:${size}px;height:${size}px" role="img" aria-label="${esc(t('pts.of', '{n} из 10', { n: r.pts }))}"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${c}" cy="${c}" r="${rr}" fill="none" stroke="var(--line-soft)" stroke-width="7"/><circle cx="${c}" cy="${c}" r="${rr}" fill="none" stroke="${LV_COL[r.level]}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${c} ${c})"/></svg><b style="font-size:${Math.round(size * 0.34)}px">${r.pts}<small>/10</small></b></span>`;
  }
  function pbar(r) { return `<span class="pbar"><i class="c-${LVK(r.level)}" style="width:${Math.max(6, (r.ptsF != null ? r.ptsF : r.pts) * 10)}%"></i></span>`; }
  // ---------- аккордеон: подробности свёрнуты ----------
  function acc(o) {
    return `<details class="acc"${o.open ? ' open' : ''}${o.id ? ` data-acc="${esc(o.id)}"` : ''}><summary><span class="ac-ic">${o.icon || '✦'}</span><span style="min-width:0"><h3>${esc(o.title)}</h3>${o.sub ? `<div class="ac-sub">${esc(o.sub)}</div>` : ''}</span><span class="ac-tw"><span class="ac-closed">${esc(o.more || t('acc.open', 'Подробнее'))}</span><span class="ac-open">${t('acc.close', 'Свернуть')}</span>${icon('down', 'sm')}</span></summary><div class="acc-body">${o.body}</div></details>`;
  }
  // ---------- время в поясе ----------
  function partsIn(date, tz) {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
    const g = (k) => +f.find((x) => x.type === k).value;
    return { y: g('year'), mo: g('month'), d: g('day'), h: g('hour') % 24, mi: g('minute'), s: g('second') };
  }
  /** Местное время в поясе → Date (с секундами). */
  const fromParts = (q, tz) => new Date(root.AstroCore.localToUTC(q.y, q.mo, q.d, q.h || 0, q.mi || 0, tz).date.getTime() + (q.s || 0) * 1000);
  /** Сдвиг на k единиц: s, mi, h — по часам; d, mo, y — по календарю в поясе (переход на летнее время учитывается). */
  function addUnit(date, unit, k, tz) {
    if (unit === 's') return new Date(date.getTime() + k * 1000);
    if (unit === 'mi') return new Date(date.getTime() + k * 60000);
    if (unit === 'h') return new Date(date.getTime() + k * 3600000);
    const q = partsIn(date, tz);
    if (unit === 'd') { const dt = new Date(Date.UTC(q.y, q.mo - 1, q.d + k)); q.y = dt.getUTCFullYear(); q.mo = dt.getUTCMonth() + 1; q.d = dt.getUTCDate(); }
    else if (unit === 'mo') { const m0 = q.y * 12 + (q.mo - 1) + k; q.y = Math.floor(m0 / 12); q.mo = (m0 % 12 + 12) % 12 + 1; q.d = Math.min(q.d, daysIn(q.y, q.mo)); }
    else if (unit === 'y') { q.y += k; q.d = Math.min(q.d, daysIn(q.y, q.mo)); }
    return fromParts(q, tz);
  }
  const fmtDMY = (q) => `${pad(q.d)}.${pad(q.mo)}.${q.y}`;
  const fmtHMS = (q, sec) => `${pad(q.h)}:${pad(q.mi)}${sec === false ? '' : ':' + pad(q.s || 0)}`;

  // ---------- ввод даты и времени цифрами: «18061998» → 18.06.1998, «093215» → 09:32:15 ----------
  function autoDate(v) {
    const raw = String(v).replace(/[^\d.\/\-\s]/g, '');
    const dg = raw.replace(/\D/g, '');
    const typedAuto = /^\d{0,2}$/.test(raw) || /^\d{2}\.?\d{0,2}$/.test(raw) || /^\d{2}\.\d{2}\.?\d{0,4}$/.test(raw) || /^\d{3,8}$/.test(raw);
    return typedAuto ? dg.slice(0, 2) + (dg.length > 2 ? '.' + dg.slice(2, 4) : '') + (dg.length > 4 ? '.' + dg.slice(4, 8) : '') : raw.replace(/[\/\-\s]/g, '.').slice(0, 10);
  }
  function autoTime(v, sec) {
    const raw = String(v).replace(/[^\d:]/g, '');
    const dg = raw.replace(/\D/g, '');
    if (/^\d+$/.test(raw)) return dg.slice(0, 2) + (dg.length > 2 ? ':' + dg.slice(2, 4) : '') + (sec !== false && dg.length > 4 ? ':' + dg.slice(4, 6) : '');
    return raw.slice(0, sec === false ? 5 : 8);
  }
  /** «9», «9:5», «09:32», «09:32:15» → {h, mi, s} или null */
  function parseTime(s) {
    const m = String(s || '').trim().match(/^(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?$/);
    if (!m) return null;
    const h = +m[1], mi = +(m[2] || 0), sec = +(m[3] || 0);
    if (h > 23 || mi > 59 || sec > 59) return null;
    return { h, mi, s: sec };
  }
  /** Поле времени с маской (вместо неудобного type=time). */
  function bindTimeInput(input, onChange, sec) {
    input.addEventListener('input', () => { const nv = autoTime(input.value, sec); if (nv !== input.value) input.value = nv; });
    input.addEventListener('blur', () => { const r = parseTime(input.value); if (r) input.value = fmtHMS(r, sec); if (onChange) onChange(r); });
  }
  // число под курсором: какой сегмент «ДД.ММ.ГГГГ» / «ЧЧ:ММ:СС» под мышью или кареткой
  const SEG_D = [[0, 2, 'd'], [3, 5, 'mo'], [6, 10, 'y']], SEG_T = [[0, 2, 'h'], [3, 5, 'mi'], [6, 8, 's']];
  let measureCtx = null;
  function segUnder(input, segs, clientX) {
    let i;
    if (clientX == null) i = input.selectionStart || 0;
    else {
      measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
      const cs = getComputedStyle(input); measureCtx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const cw = measureCtx.measureText('0').width || 8;
      i = Math.floor((clientX - input.getBoundingClientRect().left - parseFloat(cs.paddingLeft) - parseFloat(cs.borderLeftWidth || 0) + input.scrollLeft) / cw);
    }
    return (segs.find(([, b]) => i <= b) || segs[segs.length - 1])[2];
  }

  // ---------- календарь-всплывашка: месяц списком, год печатается, «Сегодня» ----------
  let calEl = null;
  function closeCal() { if (calEl) { calEl.remove(); calEl = null; } }
  function calPop(anchor, cur, onPick) {
    closeCal();
    const TXX = TX();
    const today = todayIn((Store.settings().here || {}).tz || Intl.DateTimeFormat().resolvedOptions().timeZone);
    let y = cur && cur.y ? cur.y : today.y, mo = cur && cur.mo ? cur.mo : today.mo;
    const el = document.createElement('div'); el.className = 'calpop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', t('cal.pick', 'Выбор даты'));
    document.body.appendChild(el); calEl = el;
    const wdOrder = [1, 2, 3, 4, 5, 6, 0];
    const draw = () => {
      const first = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7, n = daysIn(y, mo);
      let cells = '';
      for (let i = 0; i < first; i++) cells += '<span></span>';
      for (let d = 1; d <= n; d++) {
        const sel = cur && cur.y === y && cur.mo === mo && cur.d === d, td = today.y === y && today.mo === mo && today.d === d;
        cells += `<button type="button" data-cpd="${d}" class="${sel ? 'sel' : ''}${td ? ' td' : ''}">${d}</button>`;
      }
      el.innerHTML = `<div class="cp-head"><button type="button" class="iconbtn" data-cpm="-1" aria-label="${esc(t('cal.prevM', 'Предыдущий месяц'))}">${icon('left', 'sm')}</button>
        <select class="select" data-cpmo aria-label="${esc(t('cal.month', 'Месяц'))}">${TXX.MONTHS_N.map((m, i) => `<option value="${i + 1}" ${i + 1 === mo ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>
        <input class="input" data-cpy type="number" min="1800" max="2100" value="${y}" aria-label="${esc(t('cal.year', 'Год'))}">
        <button type="button" class="iconbtn" data-cpm="1" aria-label="${esc(t('cal.nextM', 'Следующий месяц'))}">${icon('right', 'sm')}</button></div>
        <div class="cp-grid">${wdOrder.map((w) => `<b>${esc(TXX.WD[w])}</b>`).join('')}${cells}</div>
        <div class="cp-foot"><button type="button" class="btn xs" data-cptd>${t('today', 'Сегодня')}</button><span class="tiny muted">${t('cal.typeHint', 'Можно просто печатать цифры: 18061998')}</span></div>`;
      el.querySelectorAll('[data-cpm]').forEach((b) => b.addEventListener('click', () => { mo += +b.dataset.cpm; if (mo < 1) { mo = 12; y--; } if (mo > 12) { mo = 1; y++; } draw(); }));
      el.querySelector('[data-cpmo]').addEventListener('change', (e) => { mo = +e.target.value; draw(); });
      const yi = el.querySelector('[data-cpy]');
      yi.addEventListener('change', () => { const v = +yi.value; if (v >= 1800 && v <= 2100) { y = v; draw(); el.querySelector('[data-cpy]').focus(); } });
      yi.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); yi.dispatchEvent(new Event('change')); } });
      el.querySelectorAll('[data-cpd]').forEach((b) => b.addEventListener('click', () => { onPick({ y, mo, d: +b.dataset.cpd }); closeCal(); }));
      el.querySelector('[data-cptd]').addEventListener('click', () => { onPick(today); closeCal(); });
    };
    draw();
    const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    let left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)), top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    el.style.left = left + 'px'; el.style.top = top + 'px';
    setTimeout(() => { const s = el.querySelector('.sel') || el.querySelector('.td') || el.querySelector('[data-cpd]'); if (s) s.focus({ preventScroll: true }); }, 0);
    const off = (e) => { if (!calEl) { document.removeEventListener('pointerdown', off, true); return; } if (!el.contains(e.target) && !anchor.contains(e.target)) { closeCal(); document.removeEventListener('pointerdown', off, true); } };
    document.addEventListener('pointerdown', off, true);
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeCal(); anchor.focus(); } });
  }
  if (typeof document !== 'undefined') document.addEventListener('scroll', (e) => { if (calEl && !calEl.contains(e.target)) closeCal(); }, { passive: true, capture: true });

  /**
   * Машина времени для любого колеса: дату и время можно напечатать цифрами (с секундами), открыть календарь,
   * листать колёсиком мыши или ↑↓ число под курсором, шагать ‹ › на секунду/минуту/час/день/месяц/год (зажать — быстро),
   * ползунки лет, дней, часов, минут и секунд; «Сейчас», «Пуск».
   * timebar({date, tz, nowLabel, reset, play, dayRange, years, unit}) → {html, bind(root, onChange(date))}
   */
  function timebar(o) {
    const id = 'tb' + Math.random().toString(36).slice(2, 7);
    const p = partsIn(o.date, o.tz);
    const years = o.years != null ? o.years : o.play !== false;
    const dayRange = o.dayRange || 365, yearRange = o.yearRange || 60;
    const UNITS = [['s', t('tb.u.s', 'сек')], ['mi', t('tb.u.mi', 'мин')], ['h', t('tb.u.h', 'час')], ['d', t('tb.u.d', 'день')], ['mo', t('tb.u.mo', 'мес')], ['y', t('tb.u.y', 'год')]];
    const unit0 = o.unit || (o.play !== false ? 'h' : 'mi');
    const sl = (k, label, min, max, val, out, aria) => `<label><span>${label}</span><input type="range" data-tbs="${k}" min="${min}" max="${max}" step="1" value="${val}" aria-label="${esc(aria)}"><output data-tbo="${k}">${out}</output></label>`;
    const html = `<div class="timebar" id="${id}" role="group" aria-label="${esc(t('tb.aria', 'Дата и время'))}">
      <div class="tb-main">
        <div class="tb-dt">
          <span class="tb-fld"><input class="tb-in tb-date" data-tbd inputmode="numeric" autocomplete="off" spellcheck="false" value="${fmtDMY(p)}" aria-label="${esc(t('tb.date', 'Дата'))}" title="${esc(t('tb.dateT', 'Печатай цифры подряд: 18061998. Колёсико мыши или ↑↓ над числом — листать его'))}"><button type="button" class="tb-cal" data-tbcal aria-label="${esc(t('tb.cal', 'Открыть календарь'))}">${icon('calendar', 'sm')}</button></span>
          <input class="tb-in tb-time" data-tbt inputmode="numeric" autocomplete="off" spellcheck="false" value="${fmtHMS(p)}" aria-label="${esc(t('tb.time', 'Время'))}" title="${esc(t('tb.timeT', 'Часы:минуты:секунды. Печатай подряд: 093215. Колёсико или ↑↓ над числом — листать'))}">
        </div>
        <div class="tb-step" role="group" aria-label="${esc(t('tb.stepA', 'Шаг перемотки'))}">
          <button type="button" class="tb-arrow" data-tbstep="-1" aria-label="${esc(t('tb.back', 'Назад'))}">${icon('left', 'sm')}</button>
          <span class="tb-units">${UNITS.map(([k, l]) => `<button type="button" data-tbu="${k}" aria-pressed="${k === unit0}">${esc(l)}</button>`).join('')}</span>
          <button type="button" class="tb-arrow" data-tbstep="1" aria-label="${esc(t('tb.fwd', 'Вперёд'))}">${icon('right', 'sm')}</button>
        </div>
        <span class="tb-acts">${o.nowLabel !== false ? `<button class="btn sm" type="button" data-tbnow>${icon('refresh', 'sm')} ${esc(o.nowLabel || t('tb.now', 'Сейчас'))}</button>` : ''}${o.play !== false ? `<button class="btn sm tb-play" type="button" data-tbplay aria-pressed="false" title="${esc(t('tb.playT2', 'Прокручивать время выбранным шагом'))}">▶︎ ${t('tb.play', 'Пуск')}</button>` : ''}</span>
      </div>
      ${o.slider !== false ? `<div class="tb-sl">
        ${years ? sl('y', t('tb.years', 'Годы'), -yearRange, yearRange, 0, '0', t('tb.yearsA', 'Сдвиг по годам')) : ''}
        ${sl('d', t('tb.days', 'Дни'), -dayRange, dayRange, 0, '0', t('tb.daysA', 'Сдвиг по дням'))}
        ${sl('h', t('tb.hours', 'Часы'), 0, 1439, p.h * 60 + p.mi, `${pad(p.h)}:${pad(p.mi)}`, t('tb.hoursA', 'Время суток'))}
        ${sl('mi', t('tb.mins', 'Минуты'), 0, 59, p.mi, pad(p.mi), t('tb.minsA', 'Минуты'))}
        ${sl('s', t('tb.secs', 'Секунды'), 0, 59, p.s, pad(p.s), t('tb.secsA', 'Секунды'))}
      </div>` : ''}
    </div>`;
    return { html, bind(rootEl, onChange) {
      const box = rootEl.querySelector('#' + id); if (!box) return;
      const tz = o.tz;
      const di = box.querySelector('[data-tbd]'), ti = box.querySelector('[data-tbt]');
      const S = (k) => box.querySelector(`[data-tbs="${k}"]`), O = (k) => box.querySelector(`[data-tbo="${k}"]`);
      let cur = o.date, timer = null, unit = unit0;
      let anchor = partsIn(cur, tz);
      const dayNum = (q) => Date.UTC(q.y, q.mo - 1, q.d) / 86400000;
      const sgn = (n, u) => (n === 0 ? '0' : (n > 0 ? '+' : '−') + Math.abs(n) + ' ' + u);
      const showSliders = () => {
        if (!S('d')) return;
        const q = partsIn(cur, tz);
        let yOff = years ? q.y - anchor.y : 0;
        if (Math.abs(yOff) > yearRange) { anchor = q; yOff = 0; }
        const base = { y: anchor.y + yOff, mo: anchor.mo, d: Math.min(anchor.d, daysIn(anchor.y + yOff, anchor.mo)) };
        let dOff = dayNum(q) - dayNum(base);
        if (Math.abs(dOff) > dayRange) { anchor = { y: q.y - yOff, mo: q.mo, d: q.d }; dOff = 0; }
        if (years) { S('y').value = yOff; O('y').textContent = sgn(yOff, t('tb.yShort', 'г')); }
        S('d').value = dOff; O('d').textContent = sgn(dOff, t('tb.dShort', 'д'));
        S('h').value = q.h * 60 + q.mi; O('h').textContent = `${pad(q.h)}:${pad(q.mi)}`;
        S('mi').value = q.mi; O('mi').textContent = pad(q.mi);
        S('s').value = q.s; O('s').textContent = pad(q.s);
      };
      const show = (keepFocus) => { const q = partsIn(cur, tz); if (keepFocus !== di) di.value = fmtDMY(q); if (keepFocus !== ti) ti.value = fmtHMS(q); showSliders(); };
      let raf = 0, pending = null;
      const fire = () => { raf = 0; if (pending) { const d = pending; pending = null; onChange(d); } };
      /** quiet — только показать; smooth — отдать в кадр (ползунки, зажатая кнопка, колёсико) */
      const set = (d, quiet, smooth, keepFocus) => {
        if (!(d instanceof Date) || isNaN(d)) return;
        cur = d; show(keepFocus);
        if (quiet) return;
        if (smooth) { pending = cur; if (!raf) raf = requestAnimationFrame(fire); } else onChange(cur);
      };
      // ручной ввод: применяем, как только дата/время набраны полностью; Enter и уход из поля — тоже
      const applyTyped = (final) => {
        const r = parseDate(di.value), tm = parseTime(ti.value);
        const okD = !r.error && (final || di.value.length >= 10), okT = tm && (final || /^\d{2}:\d{2}(:\d{2})?$/.test(ti.value));
        di.classList.toggle('bad', !!r.error && (final || di.value.length >= 10));
        ti.classList.toggle('bad', !tm && (final || ti.value.length >= 5));
        if (!okD || !okT) { if (final) show(); return; }
        anchor = { y: r.y, mo: r.mo, d: r.d };
        set(fromParts({ y: r.y, mo: r.mo, d: r.d, h: tm.h, mi: tm.mi, s: tm.s }, tz), false, false, final ? null : document.activeElement);
      };
      di.addEventListener('input', () => { const nv = autoDate(di.value); if (nv !== di.value) di.value = nv; if (di.value.length >= 10) applyTyped(false); });
      ti.addEventListener('input', () => { const nv = autoTime(ti.value); if (nv !== ti.value) ti.value = nv; if (/^\d{2}:\d{2}:\d{2}$/.test(ti.value)) applyTyped(false); });
      [di, ti].forEach((inp) => {
        inp.addEventListener('focus', () => setTimeout(() => { try { inp.select(); } catch (e) { /* */ } }, 0));
        inp.addEventListener('change', () => applyTyped(true));
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); applyTyped(true); inp.blur(); return; }
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const pos = inp.selectionStart, u = segUnder(inp, inp === di ? SEG_D : SEG_T);
            set(addUnit(cur, u, e.key === 'ArrowUp' ? 1 : -1, tz), false, true, inp);
            inp.value = inp === di ? fmtDMY(partsIn(cur, tz)) : fmtHMS(partsIn(cur, tz)); inp.setSelectionRange(pos, pos);
          }
        });
        // колёсико над числом: листает именно его (день, месяц, год, час, минуту, секунду)
        inp.addEventListener('wheel', (e) => {
          if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
          e.preventDefault();
          const u = segUnder(inp, inp === di ? SEG_D : SEG_T, e.clientX);
          set(addUnit(cur, u, e.deltaY < 0 ? 1 : -1, tz), false, true);
        }, { passive: false });
      });
      const cal = box.querySelector('[data-tbcal]');
      cal.addEventListener('click', () => {
        if (calEl) { closeCal(); return; }
        const q = partsIn(cur, tz);
        calPop(box.querySelector('.tb-fld'), q, (r) => { anchor = { y: r.y, mo: r.mo, d: r.d }; set(fromParts(Object.assign({}, q, { y: r.y, mo: r.mo, d: r.d }), tz)); });
      });
      // шаг: единица и стрелки (зажать — повтор с ускорением)
      box.querySelectorAll('[data-tbu]').forEach((b) => b.addEventListener('click', () => { unit = b.dataset.tbu; box.querySelectorAll('[data-tbu]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
      box.querySelectorAll('[data-tbstep]').forEach((b) => {
        const k = +b.dataset.tbstep;
        let hold = null, rep = null, n = 0;
        const step = (smooth) => set(addUnit(cur, unit, k, tz), false, smooth);
        const end = () => { clearTimeout(hold); clearInterval(rep); hold = rep = null; };
        b.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault(); step(true); n = 0;
          hold = setTimeout(() => { rep = setInterval(() => { n++; step(true); if (n === 12 || n === 40) { clearInterval(rep); rep = setInterval(() => step(true), n === 12 ? 60 : 30); } }, 110); }, 380);
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, end));
        b.addEventListener('click', (e) => { if (e.detail === 0) step(false); }); // клавиатура
      });
      // ползунки
      if (S('d')) {
        const fromSliders = (k) => {
          const q = partsIn(cur, tz);
          let h = q.h, mi = q.mi, s = q.s;
          if (k === 'h') { const m = +S('h').value; h = Math.floor(m / 60); mi = m % 60; }
          if (k === 'mi') mi = +S('mi').value;
          if (k === 's') s = +S('s').value;
          const yOff = years ? +S('y').value : 0;
          const by = anchor.y + yOff, bd = Math.min(anchor.d, daysIn(by, anchor.mo));
          const dt = new Date(Date.UTC(by, anchor.mo - 1, bd + (+S('d').value)));
          set(fromParts({ y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(), h, mi, s }, tz), false, true);
        };
        box.querySelectorAll('[data-tbs]').forEach((r) => r.addEventListener('input', () => fromSliders(r.dataset.tbs)));
      }
      const nowB = box.querySelector('[data-tbnow]'); if (nowB) nowB.addEventListener('click', () => { const d = o.reset ? o.reset() : new Date(); anchor = partsIn(d, tz); set(d); });
      const play = box.querySelector('[data-tbplay]');
      const stop = () => { clearInterval(timer); timer = null; if (play) { play.setAttribute('aria-pressed', 'false'); play.innerHTML = `▶︎ ${t('tb.play', 'Пуск')}`; } };
      if (play) play.addEventListener('click', () => {
        if (timer) return stop();
        play.setAttribute('aria-pressed', 'true'); play.innerHTML = `❚❚ ${t('tb.stop', 'Стоп')}`;
        timer = setInterval(() => { if (!document.body.contains(box)) return stop(); set(addUnit(cur, unit, 1, tz), false, true); }, 200);
      });
      showSliders();
      return { set: (d) => { anchor = partsIn(d, tz); set(d, true); }, get: () => cur, stop };
    } };
  }

  // ---------- горизонтальная лента со стрелками: тянуть мышью, колёсико листает вбок ----------
  /** wrap: .hs с .hs-track внутри и кнопками [data-hsl]/[data-hsr]. Активный элемент (aria-pressed/aria-current/.sel) — в центр. */
  function hscroll(wrap, opts) {
    opts = opts || {};
    const tr = wrap.querySelector('.hs-track'), L = wrap.querySelector('[data-hsl]'), R = wrap.querySelector('[data-hsr]');
    if (!tr) return {};
    const upd = () => {
      const max = tr.scrollWidth - tr.clientWidth - 2;
      const atL = tr.scrollLeft <= 2, atR = tr.scrollLeft >= max;
      if (L) L.disabled = atL; if (R) R.disabled = atR;
      wrap.classList.toggle('fl', !atL); wrap.classList.toggle('fr', !atR);
      wrap.classList.toggle('noov', max <= 0);
    };
    const by = (k) => tr.scrollBy({ left: k * Math.max(160, tr.clientWidth * (opts.page || 0.7)), behavior: reduceMotion() ? 'auto' : 'smooth' });
    if (L) L.addEventListener('click', () => by(-1));
    if (R) R.addEventListener('click', () => by(1));
    tr.addEventListener('scroll', upd, { passive: true });
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => { if (!tr.isConnected) { ro.disconnect(); return; } upd(); }); ro.observe(tr); }
    tr.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || tr.scrollWidth <= tr.clientWidth) return;
      const max = tr.scrollWidth - tr.clientWidth;
      if ((e.deltaY < 0 && tr.scrollLeft <= 0) || (e.deltaY > 0 && tr.scrollLeft >= max - 1)) return; // у края — листаем страницу
      e.preventDefault(); tr.scrollLeft += e.deltaY;
    }, { passive: false });
    // перетаскивание мышью (на телефоне лента и так листается пальцем)
    let sx = 0, sl = 0, drag = false;
    const move = (e) => { const dx = e.clientX - sx; if (!drag && Math.abs(dx) > 6) { drag = true; tr.classList.add('dragging'); } if (drag) tr.scrollLeft = sl - dx; };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (drag) { tr.classList.remove('dragging'); setTimeout(() => { drag = false; }, 0); } };
    tr.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; drag = false; sx = e.clientX; sl = tr.scrollLeft; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); });
    tr.addEventListener('click', (e) => { if (drag) { e.stopPropagation(); e.preventDefault(); } }, true);
    const center = (smooth) => { const a = tr.querySelector(opts.active || '[aria-pressed="true"],[aria-current="page"],.sel'); if (a) tr.scrollTo({ left: a.offsetLeft - tr.clientWidth / 2 + a.offsetWidth / 2, behavior: smooth && !reduceMotion() ? 'smooth' : 'auto' }); upd(); };
    requestAnimationFrame(() => center(false));
    upd();
    return { center, upd };
  }
  // ---------- даты ----------
  const pad = (n) => String(n).padStart(2, '0');
  const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  /** «31.07.1997», «31/7/97», «1997-07-31» → {y, mo, d} или {error} */
  function parseDate(s) {
    s = String(s || '').trim();
    let y, mo, d;
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; } else {
      m = s.match(/^(\d{1,2})[.\/\-\s](\d{1,2})[.\/\-\s](\d{2,4})$/);
      if (!m) return { error: t('err.dateFormat', 'Введите дату как ДД.ММ.ГГГГ') };
      d = +m[1]; mo = +m[2]; y = +m[3];
      if (y < 100) y += y > 30 ? 1900 : 2000;
    }
    if (mo < 1 || mo > 12) return { error: t('err.month', 'Месяца {m} нет — проверьте дату', { m: mo }) };
    const dim = daysIn(y, mo);
    if (d < 1 || d > dim) return { error: t('err.day', 'Такой даты нет: в этом месяце {n} дней', { n: dim }) };
    if (y < 1800 || y > 2100) return { error: t('err.year', 'Год должен быть от 1800 до 2100') };
    return { y, mo, d };
  }
  /**
   * Даты всегда цифрами: 12.10.2026. opts.year: undefined (ключ есть) — без года «12.10»; opts.weekday 'long'|'short' — день недели впереди.
   */
  function fmtDate(y, mo, d, opts) {
    opts = opts || {};
    let s = `${pad(d)}.${pad(mo)}` + ('year' in opts && opts.year === undefined ? '' : '.' + y);
    if (opts.weekday) { const wd = new Date(Date.UTC(y, mo - 1, d)).getUTCDay(), X = TX(); s = (opts.weekday === 'long' ? X.WD_FULL[wd] : X.WD[wd]) + ', ' + s; }
    return s;
  }
  const fmtTime = (date, tz) => { try { const q = partsIn(date, tz); return `${pad(q.h)}:${pad(q.mi)}`; } catch (e) { return date.toISOString().slice(11, 16); } };
  /** Момент в поясе цифрами: «12.10» / «12.10.2026» (opts.year) / «12.10.2026 14:05» (opts.hour) / «:05:33» (opts.second); { day: undefined } — «10.2026». */
  function fmtDay(date, tz, opts) {
    opts = opts || {};
    let q; try { q = partsIn(date, tz || 'UTC'); } catch (e) { q = partsIn(date, 'UTC'); }
    const yy = opts.year === '2-digit' ? String(q.y).slice(2) : String(q.y);
    if ('day' in opts && opts.day === undefined) return `${pad(q.mo)}.${yy}`;
    let s = `${pad(q.d)}.${pad(q.mo)}` + (opts.year ? '.' + yy : '');
    if (opts.weekday) { const wd = new Date(Date.UTC(q.y, q.mo - 1, q.d)).getUTCDay(), X = TX(); s = (opts.weekday === 'long' ? X.WD_FULL[wd] : X.WD[wd]) + ', ' + s; }
    if (opts.hour) s += ' ' + `${pad(q.h)}:${pad(q.mi)}` + (opts.second ? ':' + pad(q.s) : '');
    return s;
  }
  function todayIn(tz) { return root.NScore.ymdIn(new Date(), tz); }
  // ---------- поле даты: маска ДД.ММ.ГГГГ ----------
  /** Поле даты с кнопкой календаря рядом: dateFieldHTML(attrs, value) — attrs вставляются в <input>. */
  function dateFieldHTML(attrs, value) {
    return `<span class="dfield"><input class="input" ${attrs || ''} inputmode="numeric" autocomplete="off" placeholder="${esc(t('ph.date', 'ДД.ММ.ГГГГ'))}" value="${esc(value || '')}"><button type="button" class="dcal" data-dcal aria-label="${esc(t('tb.cal', 'Открыть календарь'))}">${icon('calendar', 'sm')}</button></span>`;
  }
  function bindDateInput(input, onChange) {
    const wrap = input.closest('.dfield');
    const hint = (wrap || input).parentElement.querySelector('.hint');
    // точки ставятся сами, пока человек набирает цифры подряд; свой формат («1.6.97») не трогаем
    input.addEventListener('input', () => {
      const nv = autoDate(input.value);
      if (nv !== input.value) input.value = nv;
      check();
    });
    const cb = wrap && wrap.querySelector('[data-dcal]');
    if (cb) cb.addEventListener('click', () => {
      if (calEl) { closeCal(); return; }
      const r = parseDate(input.value);
      calPop(wrap, r.error ? null : r, (q) => { input.value = fmtDMY(q); check(); input.dispatchEvent(new Event('change', { bubbles: true })); });
    });
    function check() {
      const v = input.value.trim();
      if (v.length < 8) { if (hint) { hint.textContent = ''; hint.className = 'hint'; } return onChange && onChange(null); }
      const r = parseDate(v);
      if (r.error) { if (hint) { hint.textContent = r.error; hint.className = 'err'; } return onChange && onChange(null); }
      if (hint) { hint.textContent = fmtDate(r.y, r.mo, r.d, { weekday: 'long' }); hint.className = 'hint'; }
      onChange && onChange(r);
    }
    input.addEventListener('blur', check);
    return { check };
  }
  // ---------- поле города: поиск с подсказками ----------
  function bindCity(wrap, onPick, initial) {
    const input = wrap.querySelector('input');
    const list = document.createElement('div'); list.className = 'ac-list'; list.hidden = true; list.setAttribute('role', 'listbox');
    wrap.appendChild(list);
    let picked = initial || null, items = [], sel = -1, timer = null, seq = 0;
    if (picked) input.value = root.NGeo.label(picked, lang());
    input.addEventListener('focus', () => { if (picked) setTimeout(() => input.select(), 0); });
    const render = () => {
      if (!items.length) { list.hidden = true; return; }
      list.innerHTML = items.map((c, i) => `<button type="button" role="option" data-i="${i}" aria-selected="${i === sel}">${esc(lang() === 'en' ? (c.nameEn || c.name) : c.name)}<small>${esc(lang() === 'en' ? (c.countryEn || c.country) : c.country)} · ${esc(c.tz)}</small></button>`).join('');
      list.hidden = false;
    };
    const pick = (c) => { picked = c; input.value = root.NGeo.label(c, lang()); list.hidden = true; items = []; onPick && onPick(c); };
    input.addEventListener('input', () => {
      picked = null; onPick && onPick(null);
      clearTimeout(timer);
      const q = input.value; const my = ++seq;
      timer = setTimeout(async () => { const r = await root.NGeo.search(q, lang()); if (my !== seq) return; items = r; sel = r.length ? 0 : -1; render(); }, 160);
    });
    input.addEventListener('keydown', (e) => {
      if (list.hidden) return;
      if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); render(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); render(); e.preventDefault(); }
      if (e.key === 'Enter' && sel >= 0) { pick(items[sel]); e.preventDefault(); }
      if (e.key === 'Escape') { list.hidden = true; }
    });
    list.addEventListener('mousedown', (e) => e.preventDefault());
    list.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) pick(items[+b.dataset.i]); });
    input.addEventListener('blur', () => setTimeout(() => { list.hidden = true; if (!picked && items.length && root.NGeo.label(items[0], lang()).toLowerCase().startsWith(input.value.trim().toLowerCase()) && input.value.trim().length > 2) pick(items[0]); }, 120));
    return { get value() { return picked; }, set(c) { pick(c); } };
  }
  // ---------- форма человека ----------
  function personForm(p, opts) {
    opts = opts || {};
    p = p || {};
    const dateStr = p.y ? `${pad(p.d)}.${pad(p.mo)}.${p.y}` : '';
    const timeStr = p.timeKnown !== false && p.h != null ? `${pad(p.h)}:${pad(p.mi)}` : '';
    const html = `<form class="form" novalidate>
      <div class="field"><label for="pf-name">${t('f.name', 'Имя')}</label><input class="input" id="pf-name" name="name" autocomplete="given-name" value="${esc(p.name || '')}" placeholder="${t('f.namePh', 'Как вас зовут')}" required></div>
      <div class="field"><span class="lbl">${t('f.gender', 'Обращение в текстах')}</span><div class="seg" role="group" aria-label="${t('f.gender', 'Обращение в текстах')}"><button type="button" data-g="m" aria-pressed="${p.gender !== 'f'}">${t('f.he', 'Он')}</button><button type="button" data-g="f" aria-pressed="${p.gender === 'f'}">${t('f.she', 'Она')}</button></div></div>
      <div class="two">
        <div class="field"><label for="pf-date">${t('f.date', 'Дата рождения')}</label>${dateFieldHTML('id="pf-date"', dateStr)}<span class="hint"></span></div>
        <div class="field"><label for="pf-time">${t('f.time', 'Время рождения')}</label><input class="input" id="pf-time" inputmode="numeric" autocomplete="off" placeholder="${esc(t('ph.time', 'ЧЧ:ММ'))}" value="${esc(timeStr)}" ${p.timeKnown === false ? 'disabled' : ''}><label class="check tiny"><input type="checkbox" id="pf-notime" ${p.timeKnown === false ? 'checked' : ''}> ${t('f.noTime', 'Не знаю время')}</label></div>
      </div>
      <div class="field ac"><label for="pf-city">${t('f.city', 'Город рождения')}</label><input class="input" id="pf-city" autocomplete="off" placeholder="${t('f.cityPh', 'Начните вводить: Минск, Псков…')}"><span class="hint">${t('f.cityHint', 'Нужен для домов и Асцендента; часовой пояс подставится сам')}</span></div>
      ${opts.extraHTML || ''}
      <p class="err" data-err hidden></p>
      <div class="row">${opts.cancel ? `<button class="btn" type="button" data-cancel>${t('cancel', 'Отмена')}</button>` : ''}<button class="btn primary" type="submit" style="flex:1">${esc(opts.submit || t('f.save', 'Сохранить'))}</button></div>
      ${opts.note ? `<p class="hint">${opts.note}</p>` : ''}
    </form>`;
    return { html, bind(rootEl, onSave, onCancel) {
      const f = rootEl.querySelector('form');
      let gender = p.gender === 'f' ? 'f' : 'm', date = p.y ? { y: p.y, mo: p.mo, d: p.d } : null;
      $$('[data-g]', f).forEach((b) => b.addEventListener('click', () => { gender = b.dataset.g; $$('[data-g]', f).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
      const di = bindDateInput(f.querySelector('#pf-date'), (r) => { date = r; });
      if (dateStr) di.check();
      const noTime = f.querySelector('#pf-notime'), time = f.querySelector('#pf-time');
      bindTimeInput(time, null, false);
      noTime.addEventListener('change', () => { time.disabled = noTime.checked; });
      const city = bindCity(f.querySelector('.ac'), null, p.place || null);
      const cancel = f.querySelector('[data-cancel]'); if (cancel) cancel.addEventListener('click', () => onCancel && onCancel());
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const err = f.querySelector('[data-err]');
        const name = f.querySelector('#pf-name').value.trim();
        const r = parseDate(f.querySelector('#pf-date').value);
        const fail = (msg, el) => { err.textContent = msg; err.hidden = false; if (el) el.focus(); };
        if (!name) return fail(t('err.name', 'Введите имя'), f.querySelector('#pf-name'));
        if (r.error) return fail(r.error, f.querySelector('#pf-date'));
        const tk = !noTime.checked;
        let h = 12, mi = 0;
        if (tk) { const m = parseTime(time.value); if (!m) return fail(t('err.time', 'Укажите время или отметьте «Не знаю время»'), time); h = m.h; mi = m.mi; }
        const pl = city.value;
        if (!pl) return fail(t('err.city', 'Выберите город из списка'), f.querySelector('#pf-city'));
        err.hidden = true;
        onSave(Object.assign({}, p, { name, gender, y: r.y, mo: r.mo, d: r.d, h, mi, timeKnown: tk, place: { name: pl.name, nameEn: pl.nameEn, country: pl.country, countryEn: pl.countryEn, lat: pl.lat, lon: pl.lon, tz: pl.tz } }));
      });
    } };
  }
  // ---------- карта человека (кэш) ----------
  const chartCache = new Map();
  function chartOf(p, extra) {
    if (!p) return null;
    const hs = Store.settings().houseSystem || 'placidus';
    const key = [p.id, p.y, p.mo, p.d, p.h, p.mi, p.timeKnown, p.place && p.place.lat, p.place && p.place.lon, hs, extra ? JSON.stringify(extra) : ''].join('|');
    if (chartCache.has(key)) return chartCache.get(key);
    const c = root.AstroCore.chart({ y: p.y, mo: p.mo, d: p.d, h: p.h, mi: p.mi, timeKnown: p.timeKnown !== false, zone: p.place.tz, lat: p.place.lat, lon: p.place.lon, name: p.name }, Object.assign({ houseSystem: hs }, extra || {}));
    chartCache.set(key, c);
    if (chartCache.size > 60) chartCache.delete(chartCache.keys().next().value);
    return c;
  }
  /** Где пользователь сейчас (для границ дня и часов): из настроек или по поясу браузера. */
  function here() { return Store.settings().here || (Store.active() && Store.active().home) || root.NGeo.guessHere(); }
  const initials = (n) => String(n || '?').trim().slice(0, 1).toUpperCase();
  const lvClass = (l) => ({ 2: 'lv-2', 1: 'lv-1', 0: 'lv0', '-1': 'lv-m1', '-2': 'lv-m2' })[l];
  const lvCls = (l) => ({ 2: 'l2', 1: 'l1', 0: 'l0', '-1': 'lm1', '-2': 'lm2' })[l];
  function moonSVG(angle, size) {
    // диск Луны по фазовому углу (0 — новолуние, 180 — полнолуние)
    const r = 26, c = 29, k = Math.cos(angle * Math.PI / 180);
    const waxing = angle < 180;
    const rx = Math.abs(k) * r;
    const lit = 'var(--moon-lit,#F6E6BE)', dark = 'var(--moon-dark,#D9CFEE)';
    const sweep1 = waxing ? 1 : 0;
    const path = `M${c} ${c - r} A${r} ${r} 0 0 ${sweep1} ${c} ${c + r} A${rx} ${r} 0 0 ${k > 0 ? (waxing ? 0 : 1) : (waxing ? 1 : 0)} ${c} ${c - r}Z`;
    return `<svg class="moon-disc" viewBox="0 0 58 58" width="${size || 58}" height="${size || 58}" style="width:${size || 58}px;height:${size || 58}px" aria-hidden="true"><circle cx="${c}" cy="${c}" r="${r}" fill="${dark}"/><path d="${path}" fill="${lit}"/><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--moon-ring,rgba(161,114,42,.45))" stroke-width="${size && size < 30 ? 3 : 1.5}"/></svg>`;
  }
  /** Тема: светлая ↔ тёмная (кнопка в шапке). */
  function isDark() { const th = Store.settings().theme; return th === 'dark' || (th !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); }

  root.NUI = { lang, t, TX, $, $$, esc, icon, toast, sheet, closeSheet, modal, richTip, hideRich, dots, ptsBadge, ringPts, pbar, acc, partsIn, fromParts, addUnit, timebar, hscroll, calPop, closeCal, parseDate, parseTime, autoDate, autoTime, bindTimeInput, dateFieldHTML, fmtDate, fmtTime, fmtDay, fmtDMY, fmtHMS, todayIn, bindDateInput, bindCity, personForm, chartOf, here, initials, lvClass, lvCls, moonSVG, reduceMotion, pad, daysIn, isDark };
})(window);
