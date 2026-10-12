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
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
    const g = (k) => +f.find((x) => x.type === k).value;
    return { y: g('year'), mo: g('month'), d: g('day'), h: g('hour') % 24, mi: g('minute') };
  }
  /**
   * Перемотка времени как в Chronos/Sotis: поле даты и времени, шаги −1д/−1ч/−10м/+10м/+1ч/+1д, «Сейчас», проигрывание.
   * timebar({date, tz, nowLabel}) → {html, bind(root, onChange(date))}
   */
  function timebar(o) {
    const id = 'tb' + Math.random().toString(36).slice(2, 7);
    const p = partsIn(o.date, o.tz);
    const STEPS = [[-1440, t('tb.m1d', '−1 д')], [-60, t('tb.m1h', '−1 ч')], [-10, t('tb.m10', '−10 м')]];
    const STEPS2 = [[10, t('tb.p10', '+10 м')], [60, t('tb.p1h', '+1 ч')], [1440, t('tb.p1d', '+1 д')]];
    const html = `<div class="timebar" id="${id}" role="group" aria-label="${esc(t('tb.aria', 'Дата и время'))}">
      <span class="tb-steps">${STEPS.map(([m, l]) => `<button type="button" data-step="${m}" aria-label="${esc(l)}">${esc(l)}</button>`).join('')}</span>
      <span class="tb-f"><input type="date" data-tbd value="${p.y}-${pad(p.mo)}-${pad(p.d)}" aria-label="${esc(t('tb.date', 'Дата'))}"><input type="time" data-tbt value="${pad(p.h)}:${pad(p.mi)}" aria-label="${esc(t('tb.time', 'Время'))}"></span>
      <span class="tb-steps">${STEPS2.map(([m, l]) => `<button type="button" data-step="${m}" aria-label="${esc(l)}">${esc(l)}</button>`).join('')}</span>
      ${o.nowLabel !== false ? `<button class="btn sm" type="button" data-tbnow>${icon('refresh', 'sm')} ${esc(o.nowLabel || t('tb.now', 'Сейчас'))}</button>` : ''}
      ${o.play !== false ? `<button class="btn sm tb-play" type="button" data-tbplay aria-pressed="false" title="${esc(t('tb.playT', 'Прокрутить время: +1 час каждые доли секунды'))}">▶︎ ${t('tb.play', 'Пуск')}</button>` : ''}
      ${o.slider !== false ? `<div class="tb-sl">
        <label><span>${t('tb.days', 'Дни')}</span><input type="range" data-tbsd min="${-(o.dayRange || 365)}" max="${o.dayRange || 365}" step="1" value="0" aria-label="${esc(t('tb.daysA', 'Сдвиг по дням'))}"><output data-tbod>0</output></label>
        <label><span>${t('tb.hours', 'Часы')}</span><input type="range" data-tbsh min="0" max="1439" step="1" value="${p.h * 60 + p.mi}" aria-label="${esc(t('tb.hoursA', 'Время суток'))}"><output data-tbot>${pad(p.h)}:${pad(p.mi)}</output></label>
      </div>` : ''}
    </div>`;
    return { html, bind(rootEl, onChange) {
      const box = rootEl.querySelector('#' + id); if (!box) return;
      const di = box.querySelector('[data-tbd]'), ti = box.querySelector('[data-tbt]');
      const sd = box.querySelector('[data-tbsd]'), sh = box.querySelector('[data-tbsh]'), od = box.querySelector('[data-tbod]'), ot = box.querySelector('[data-tbot]');
      const range = o.dayRange || 365;
      let cur = o.date, timer = null;
      const dayNum = (q) => Date.UTC(q.y, q.mo - 1, q.d) / 86400000;
      let anchor = partsIn(cur, o.tz);
      const showSliders = () => {
        if (!sd) return;
        const q = partsIn(cur, o.tz);
        let off = dayNum(q) - dayNum(anchor);
        if (Math.abs(off) > range) { anchor = q; off = 0; }
        sd.value = off; sh.value = q.h * 60 + q.mi;
        od.textContent = off === 0 ? '0' : (off > 0 ? '+' : '−') + Math.abs(off) + ' ' + t('tb.dShort', 'д');
        ot.textContent = `${pad(q.h)}:${pad(q.mi)}`;
      };
      const show = () => { const q = partsIn(cur, o.tz); di.value = `${q.y}-${pad(q.mo)}-${pad(q.d)}`; ti.value = `${pad(q.h)}:${pad(q.mi)}`; showSliders(); };
      let raf = 0, pending = null;
      const fire = () => { raf = 0; if (pending) { const d = pending; pending = null; onChange(d); } };
      const set = (d, quiet, viaSlider) => { cur = d; if (viaSlider) { const q = partsIn(cur, o.tz); di.value = `${q.y}-${pad(q.mo)}-${pad(q.d)}`; ti.value = `${pad(q.h)}:${pad(q.mi)}`; showSliders(); } else show(); if (quiet) return; if (viaSlider) { pending = cur; if (!raf) raf = requestAnimationFrame(fire); } else onChange(cur); };
      const read = () => { const m = di.value.match(/^(\d{4})-(\d{2})-(\d{2})$/), n = ti.value.match(/^(\d{1,2}):(\d{2})/); if (!m || !n) return; anchor = { y: +m[1], mo: +m[2], d: +m[3] }; set(root.AstroCore.localToUTC(+m[1], +m[2], +m[3], +n[1], +n[2], o.tz).date); };
      di.addEventListener('change', read); ti.addEventListener('change', read);
      if (sd) {
        const fromSliders = () => {
          const dt = new Date(Date.UTC(anchor.y, anchor.mo - 1, anchor.d + (+sd.value)));
          const mins = +sh.value;
          set(root.AstroCore.localToUTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), Math.floor(mins / 60), mins % 60, o.tz).date, false, true);
        };
        sd.addEventListener('input', fromSliders); sh.addEventListener('input', fromSliders);
      }
      box.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => set(new Date(cur.getTime() + (+b.dataset.step) * 60000))));
      const nowB = box.querySelector('[data-tbnow]'); if (nowB) nowB.addEventListener('click', () => { const d = o.reset ? o.reset() : new Date(); anchor = partsIn(d, o.tz); set(d); });
      const play = box.querySelector('[data-tbplay]');
      const stop = () => { clearInterval(timer); timer = null; if (play) { play.setAttribute('aria-pressed', 'false'); play.innerHTML = `▶︎ ${t('tb.play', 'Пуск')}`; } };
      if (play) play.addEventListener('click', () => {
        if (timer) return stop();
        play.setAttribute('aria-pressed', 'true'); play.innerHTML = `❚❚ ${t('tb.stop', 'Стоп')}`;
        timer = setInterval(() => { if (!document.body.contains(box)) return stop(); set(new Date(cur.getTime() + 3600000)); }, 220);
      });
      return { set: (d) => set(d, true), get: () => cur, stop };
    } };
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
  function fmtDate(y, mo, d, opts) {
    const dt = new Date(Date.UTC(y, mo - 1, d, 12));
    try { return new Intl.DateTimeFormat(lang() === 'en' ? 'en-US' : 'ru-RU', Object.assign({ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }, opts || {})).format(dt); } catch (e) { return `${pad(d)}.${pad(mo)}.${y}`; }
  }
  const fmtTime = (date, tz) => { try { return new Intl.DateTimeFormat(lang() === 'en' ? 'en-US' : 'ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(date); } catch (e) { return date.toISOString().slice(11, 16); } };
  const fmtDay = (date, tz, opts) => { try { return new Intl.DateTimeFormat(lang() === 'en' ? 'en-US' : 'ru-RU', Object.assign({ timeZone: tz, day: 'numeric', month: 'long' }, opts || {})).format(date); } catch (e) { return date.toISOString().slice(0, 10); } };
  function todayIn(tz) { return root.NScore.ymdIn(new Date(), tz); }
  // ---------- поле даты: маска ДД.ММ.ГГГГ ----------
  function bindDateInput(input, onChange) {
    const hint = input.parentElement.querySelector('.hint');
    // точки ставятся сами, пока человек набирает цифры подряд; свой формат («1.6.97») не трогаем
    const auto = (dg) => dg.slice(0, 2) + (dg.length > 2 ? '.' + dg.slice(2, 4) : '') + (dg.length > 4 ? '.' + dg.slice(4, 8) : '');
    input.addEventListener('input', () => {
      const v = input.value.replace(/[^\d.\/\-\s]/g, '');
      const dg = v.replace(/\D/g, '');
      const typedAuto = /^\d{0,2}$/.test(v) || /^\d{2}\.?\d{0,2}$/.test(v) || /^\d{2}\.\d{2}\.?\d{0,4}$/.test(v) || /^\d{3,8}$/.test(v);
      const nv = typedAuto ? auto(dg) : v.slice(0, 10);
      if (nv !== input.value) input.value = nv;
      check();
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
        <div class="field"><label for="pf-date">${t('f.date', 'Дата рождения')}</label><input class="input" id="pf-date" inputmode="numeric" autocomplete="bday" placeholder="ДД.ММ.ГГГГ" value="${esc(dateStr)}"><span class="hint"></span></div>
        <div class="field"><label for="pf-time">${t('f.time', 'Время рождения')}</label><input class="input" id="pf-time" type="time" value="${esc(timeStr)}" ${p.timeKnown === false ? 'disabled' : ''}><label class="check tiny"><input type="checkbox" id="pf-notime" ${p.timeKnown === false ? 'checked' : ''}> ${t('f.noTime', 'Не знаю время')}</label></div>
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
        if (tk) { const m = time.value.match(/^(\d{1,2}):(\d{2})/); if (!m) return fail(t('err.time', 'Укажите время или отметьте «Не знаю время»'), time); h = +m[1]; mi = +m[2]; }
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
  root.NUI = { lang, t, TX, $, $$, esc, icon, toast, sheet, closeSheet, modal, richTip, hideRich, dots, ptsBadge, ringPts, pbar, acc, partsIn, timebar, parseDate, fmtDate, fmtTime, fmtDay, todayIn, bindDateInput, bindCity, personForm, chartOf, here, initials, lvClass, lvCls, moonSVG, reduceMotion, pad, daysIn };
})(window);
