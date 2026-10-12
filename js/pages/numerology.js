/* «Нумерология»: главные числа (путь, день рождения, судьба, душа, личность), квадрат Пифагора, личный год с месяцами и днями,
   совместимость по числам. Работает и без карты: дату и имя можно ввести прямо здесь (ничего не сохраняется). */
(function (root) {
  'use strict';
  const UI = root.NUI, N = root.NNum;
  const { t, esc, icon } = UI;
  const NT = () => root.NNumTexts[UI.lang()] || root.NNumTexts.ru;
  let st = { tab: 'main', who: null, manual: null, pairWith: null };

  const pad = UI.pad;
  const numCls = (n) => 'nn-' + (n > 9 ? 'm' : n);
  const chainTxt = (c) => c.chain.join(' → ');

  function input(p) {
    if (st.manual) return st.manual.pending ? null : st.manual;
    const q = (st.who && root.NStore.person(st.who)) || p;
    if (!q) return null;
    return { y: q.y, mo: q.mo, d: q.d, name: q.fullName || q.name || '', id: q.id };
  }

  // ---------- главные числа ----------
  function tile(type, num, calc, big) {
    const T = NT(), d = T.numbers[num] || T.numbers[N.base(num)];
    const [title, sub] = T.types[type];
    const extra = type === 'soul' ? T.desire[num] : type === 'personality' ? T.image[num] : type === 'expression' ? T.talent[num] : type === 'birthday' ? T.day[num] || T.day[N.base(num)] : '';
    return `<button class="ntile${big ? ' big' : ''}" type="button" data-num="${num}" data-type="${type}">
      <span class="nbadge ${numCls(num)}">${num}</span>
      <span class="ntxt"><span class="label">${esc(title)}</span><b>${esc(d.name)}</b><small>${esc(big ? d.essence : extra ? extra[0].toUpperCase() + extra.slice(1) : d.keys)}</small>${big ? `<span class="tags">${d.keys.split(' · ').map((k) => `<span class="tag acc">${esc(k)}</span>`).join('')}</span>` : ''}<span class="tiny muted">${esc(sub)} · ${esc(calc)}</span></span></button>`;
  }
  function openNum(type, num, calc) {
    const T = NT(), d = T.numbers[num] || T.numbers[N.base(num)];
    const [title] = T.types[type] || [t('num.number', 'Число')];
    const frame = type === 'soul' ? t('num.fSoul', 'Внутри тебе важно: {x}.', { x: T.desire[num] }) : type === 'personality' ? t('num.fPers', 'Люди видят тебя как {x}.', { x: T.image[num] }) : type === 'expression' ? t('num.fExpr', 'Твой талант — {x}.', { x: T.talent[num] }) : type === 'birthday' ? t('num.fDay', 'Дар дня рождения — {x}.', { x: T.day[num] || T.day[N.base(num)] }) : '';
    UI.popup(`<div class="stack s18">
      <div class="row" style="gap:14px;flex-wrap:nowrap"><span class="nbadge lg ${numCls(num)}">${num}</span><div class="stack s6"><b style="font:600 calc(24px*var(--fz))/1.1 var(--f-display)">${esc(d.name)}</b><span class="small muted">${esc(d.keys)}</span></div></div>
      ${frame ? `<p class="lead">${esc(frame)}</p>` : ''}<p>${esc(d.essence)}</p>
      <div class="grid2"><div class="stack s6"><span class="label ok">${esc(t('num.str', 'Сильные стороны'))}</span><div class="tags">${d.strengths.map((x) => `<span class="tag ok">${esc(x)}</span>`).join('')}</div></div>
        <div class="stack s6"><span class="label bad">${esc(t('num.grow', 'Над чем расти'))}</span><div class="tags">${d.growth.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div></div></div>
      <div class="stack s6"><p><b>${icon('love', 'xs')} ${esc(t('num.love', 'Любовь'))}.</b> ${esc(d.love)}</p><p><b>${icon('career', 'xs')} ${esc(t('num.work', 'Работа'))}.</b> ${esc(d.work)}</p><p><b>${icon('bulb', 'xs')} ${esc(t('num.adv', 'Совет'))}.</b> ${esc(d.advice)}</p></div>
      ${calc ? `<p class="tiny muted">${esc(t('num.how', 'Как посчитано'))}: ${esc(calc)}</p>` : ''}</div>`, { title, eyebrow: t('nav.num', 'Нумерология') });
  }
  function mainView(x) {
    const lp = N.lifePath(x.y, x.mo, x.d), bd = N.birthday(x.d), nm = N.nameNumbers(x.name);
    const lpCalc = `${pad(x.d)}.${pad(x.mo)}.${x.y}: ${chainTxt(lp.day)} · ${chainTxt(lp.month)} · ${chainTxt(lp.year)} → ${lp.day.value}+${lp.month.value}+${lp.year.value} = ${chainTxt(lp)}`;
    const calcs = { life: lpCalc, birthday: chainTxt(bd) };
    let html = `<div class="nmain">${tile('life', lp.value, lpCalc, true)}<div class="ngrid">${tile('birthday', bd.value, chainTxt(bd))}`;
    if (nm) {
      calcs.expression = `${nm.words.map((w) => w.letters.map((l) => l.v).join('+') + ' = ' + w.sum).join(' · ')} → ${chainTxt(nm.expression)}`;
      html += tile('expression', nm.expression.value, chainTxt(nm.expression));
      if (nm.soul) { calcs.soul = chainTxt(nm.soul); html += tile('soul', nm.soul.value, chainTxt(nm.soul)); }
      if (nm.personality) { calcs.personality = chainTxt(nm.personality); html += tile('personality', nm.personality.value, chainTxt(nm.personality)); }
    } else html += `<div class="ntile ghost"><span class="nbadge">?</span><span class="ntxt"><b>${esc(t('num.needName', 'Числа имени'))}</b><small>${esc(t('num.needNameP', 'Впиши полное имя (лучше как в документах) — посчитаю числа судьбы, души и личности.'))}</small></span></div>`;
    html += `</div></div>`;
    if (nm) html += `<div class="card stack"><span class="label">${esc(t('num.letters', 'Буквы имени'))}</span><div class="nletters">${nm.words.map((w) => `<div class="nword">${w.letters.map((l) => `<span class="${l.vowel ? 'v' : ''}"><b>${esc(l.ch.toUpperCase())}</b><i>${l.v}</i></span>`).join('')}<em>= ${w.sum}</em></div>`).join('')}</div><p class="tiny muted">${esc(t('num.lettersHint', 'Гласные (подсвечены) дают число души, согласные — число личности.'))}</p></div>`;
    return { html, calcs };
  }

  // ---------- квадрат Пифагора ----------
  function squareView(x) {
    const T = NT(), q = N.pythagoras(x.y, x.mo, x.d);
    const lv = (c) => Math.min(4, c);
    const order = [1, 4, 7, 2, 5, 8, 3, 6, 9];
    const lineLv = (v) => (v <= 2 ? 0 : v <= 4 ? 1 : 2);
    return `<div class="sq-wrap"><div class="sq">${order.map((n) => { const c = q.counts[n]; return `<button type="button" class="sqc l${lv(c)}" data-cell="${n}"><span class="dg">${c ? String(n).repeat(c) : '—'}</span><b>${esc(T.cells[n].name)}</b><small>${esc(T.cells[n].l[lv(c)])}</small></button>`; }).join('')}</div>
      <div class="stack s6"><span class="label">${esc(t('num.lines', 'Линии квадрата'))}</span>${Object.entries(N.LINES).map(([k, cells]) => { const v = q.lines[k]; return `<div class="sbar nline"><span>${esc(T.lines[k].name)} <small class="muted">${cells.join('-')}</small></span><div class="bar"><i style="width:${Math.min(100, v * 12)}%"></i></div><b class="num">${v}</b><small class="nl-t">${esc(T.lines[k].l[lineLv(v)])}</small></div>`; }).join('')}
        <p class="tiny muted">${esc(t('num.work4', 'Рабочие числа: {a}. Квадрат строится из цифр даты и этих чисел (метод Александрова).', { a: q.work.join(' · ') }))}</p></div></div>`;
  }

  // ---------- личный год ----------
  function yearView(x, tz) {
    const T = NT(), TX = UI.TX();
    const today = UI.todayIn(tz);
    const py = N.personalYear(x.mo, x.d, today.y), Y = T.years[py.value];
    const pm = N.personalMonth(py.value, today.mo), pd = N.personalDay(pm, today.d), ud = N.universalDay(today.y, today.mo, today.d);
    const days = UI.daysIn(today.y, today.mo), lead = (new Date(Date.UTC(today.y, today.mo - 1, 1)).getUTCDay() + 6) % 7;
    const MN = TX.MONTHS_N || TX.MONTHS;
    return `<div class="nyear"><div class="ntile big static"><span class="nbadge lg ${numCls(py.value)}">${py.value}</span><span class="ntxt"><span class="label">${esc(t('num.py', 'Личный год {y}', { y: today.y }))}</span><b>${esc(Y.title)}</b><small>${esc(Y.text)}</small>
        <span class="tags">${Y.do.map((z) => `<span class="tag ok">✓ ${esc(z)}</span>`).join('')}${Y.avoid.map((z) => `<span class="tag bad">✕ ${esc(z)}</span>`).join('')}</span></span></div>
      <div class="card stack"><div class="row sb"><span class="label">${esc(t('num.today', 'Сегодня, {d}', { d: UI.fmtDate(today.y, today.mo, today.d) }))}</span></div>
        <div class="row" style="gap:18px"><div class="row" style="gap:10px;flex-wrap:nowrap"><span class="nbadge ${numCls(pd)}">${pd}</span><div class="stack s6"><b>${esc(t('num.pd', 'Твой личный день: {k}', { k: T.dayKey[pd][0] }))}</b><span class="small muted">${esc(T.dayKey[pd][1])}</span></div></div>
        <div class="row" style="gap:10px;flex-wrap:nowrap"><span class="nbadge sm ${numCls(ud)}">${ud}</span><div class="stack s6"><b class="small">${esc(t('num.ud', 'Число дня для всех: {k}', { k: T.dayKey[ud][0] }))}</b><span class="tiny muted">${esc(T.dayKey[ud][1])}</span></div></div></div></div>
      <div class="card stack"><span class="label">${esc(t('num.months', 'Личные месяцы'))}</span><div class="nmonths">${Array.from({ length: 12 }, (_, i) => { const n = N.personalMonth(py.value, i + 1); return `<div class="nm${i + 1 === today.mo ? ' now' : ''}" data-tip="${esc(MN[i] + ': ' + T.years[n].title)}"><span>${esc(MN[i].slice(0, 3))}</span><b class="${numCls(n)}">${n}</b><small>${esc(T.dayKey[n][0])}</small></div>`; }).join('')}</div></div>
      <div class="card stack"><span class="label">${esc(t('num.days', 'Личные дни — {m}', { m: MN[today.mo - 1] }))}</span><div class="ndays">${[1, 2, 3, 4, 5, 6, 0].map((i) => `<span class="wdh">${esc(TX.WD[i])}</span>`).join('')}${'<span></span>'.repeat(lead)}${Array.from({ length: days }, (_, i) => { const n = N.personalDay(pm, i + 1); return `<div class="nd ${numCls(n)}${i + 1 === today.d ? ' now' : ''}" data-tip="${esc(pad(i + 1) + '.' + pad(today.mo) + ' · ' + T.dayKey[n][0] + ': ' + T.dayKey[n][1])}"><span>${i + 1}</span><b>${n}</b></div>`; }).join('')}</div>
        <p class="tiny muted">${esc(t('num.daysHint', 'Наведи на день — подсказка. 1 — начинать, 4 и 8 — работа и деньги, 7 и 9 — отдых и завершение.'))}</p></div></div>`;
  }

  // ---------- совместимость ----------
  function pairView(x, el) {
    const people = root.NStore.people();
    const other = st.pairWith && people.find((q) => q.id === st.pairWith) || people.find((q) => !(q.y === x.y && q.mo === x.mo && q.d === x.d)) || null;
    const T = NT();
    if (!other) return `<div class="empty"><h3>${esc(t('num.pairNeed', 'Нужен второй человек'))}</h3><p class="muted">${esc(t('num.pairNeedP', 'Добавь партнёра в «Люди» — и сравню ваши числа.'))}</p><a class="btn primary" href="#people">${icon('plus')} ${esc(t('people.add', 'Добавить человека'))}</a></div>`;
    const a = N.lifePath(x.y, x.mo, x.d).value, b = N.lifePath(other.y, other.mo, other.d).value;
    const sc = N.pairScore(a, b), lev = sc <= 2 ? -2 : sc <= 4 ? -1 : sc <= 6 ? 0 : sc <= 8 ? 1 : 2;
    const msg = sc >= 9 ? t('num.p9', 'Числа хорошо дополняют друг друга: вам легко понять и поддержать друг друга.') : sc >= 7 ? t('num.p7', 'Хорошая пара: общего больше, чем различий, а различия интересны.') : sc >= 5 ? t('num.p5', 'Разные ритмы: нужно договариваться, зато вы многому учите друг друга.') : t('num.p3', 'Непростое сочетание: много трения, но и сильный рост — если вы готовы слышать друг друга.');
    const opt = people.filter((q) => q.id !== other.id || true).map((q) => `<option value="${q.id}" ${q.id === other.id ? 'selected' : ''}>${esc(q.name)}</option>`).join('');
    return `<div class="card stack"><div class="field"><label for="npair">${esc(t('num.pairWith', 'С кем сравнить'))}</label><select class="select" id="npair">${opt}</select></div>
      <div class="npair"><div class="ntile static"><span class="nbadge lg ${numCls(a)}">${a}</span><span class="ntxt"><span class="label">${esc(x.name || t('num.you', 'Ты'))}</span><b>${esc((T.numbers[a] || T.numbers[N.base(a)]).name)}</b><small>${esc((T.numbers[a] || T.numbers[N.base(a)]).love)}</small></span></div>
        <div class="np-mid">${UI.ringPts({ pts: sc, ptsF: sc, level: lev }, 92)}<b>${esc(t('num.pairScore', 'совместимость по числам'))}</b></div>
        <div class="ntile static"><span class="nbadge lg ${numCls(b)}">${b}</span><span class="ntxt"><span class="label">${esc(other.name)}</span><b>${esc((T.numbers[b] || T.numbers[N.base(b)]).name)}</b><small>${esc((T.numbers[b] || T.numbers[N.base(b)]).love)}</small></span></div></div>
      <p class="lead">${esc(msg)}</p><a class="more" href="#pair">${esc(t('num.pairAstro', 'Подробная совместимость по картам — в разделе «Пара»'))} ${icon('arrow', 'xs')}</a></div>`;
  }

  async function page(el, params) {
    const p = root.NStore.active();
    const tz = UI.here().tz;
    const people = root.NStore.people();
    if (params.tab && ['main', 'square', 'year', 'pair'].includes(params.tab)) st.tab = params.tab;
    if (st.who && !root.NStore.person(st.who)) st.who = null;
    const cur = (st.who && root.NStore.person(st.who)) || p;
    const x0 = input(p);
    el.innerHTML = `<div class="sec-head"><span class="eyebrow">${esc(t('nav.num', 'Нумерология'))}</span><h1>${t('num.title', 'Числа <em>твоей даты и имени</em>')}</h1><p>${esc(t('num.p', 'Пифагорейская нумерология: число пути, судьбы, души и личности, квадрат Пифагора и личный год. Числа показывают склонности, а не приговор.'))}</p></div>
      <div class="card stack nform">
        ${people.length ? `<div class="row"><span class="small muted">${esc(t('num.whose', 'Чьи числа:'))}</span>${people.map((q) => `<button class="chip" type="button" data-pp="${q.id}" aria-pressed="${!st.manual && cur && q.id === cur.id}">${esc(q.name)}</button>`).join('')}<button class="chip" type="button" data-pp="manual" aria-pressed="${!!st.manual}">${icon('edit', 'xs')} ${esc(t('num.manual', 'Другая дата'))}</button></div>` : ''}
        <div class="nf-grid"><div class="field"><label for="nd">${esc(t('f.dob', 'Дата рождения'))}</label>${UI.dateFieldHTML('id="nd"', x0 ? UI.fmtDMY({ y: x0.y, mo: x0.mo, d: x0.d }) : '')}<span class="hint"></span></div>
          <div class="field"><label for="nn">${esc(t('num.fullName', 'Полное имя'))}</label><input class="input" id="nn" autocomplete="name" placeholder="${esc(t('num.namePh', 'Имя Отчество Фамилия'))}" value="${esc(x0 ? x0.name : '')}"><span class="hint">${esc(t('num.nameHint', 'Для чисел судьбы, души и личности — как в паспорте'))}</span></div>
          <button class="btn primary" type="button" data-go>${icon('calc')} ${esc(t('num.go', 'Посчитать'))}</button></div></div>
      <div class="seg ntabs" role="tablist">${[['main', t('num.tMain', 'Главные числа')], ['square', t('num.tSquare', 'Квадрат Пифагора')], ['year', t('num.tYear', 'Личный год')], ['pair', t('num.tPair', 'Совместимость')]].map(([k, n]) => `<button type="button" data-tab="${k}" aria-pressed="${st.tab === k}">${esc(n)}</button>`).join('')}</div>
      <div id="numBody" class="numbody"></div>`;
    const body = el.querySelector('#numBody');
    const dIn = el.querySelector('#nd'), nIn = el.querySelector('#nn');
    UI.bindDateInput(dIn, () => {});
    let calcs = {};
    const draw = () => {
      const x = input(root.NStore.active());
      if (!x) { body.innerHTML = `<div class="empty"><h3>${esc(t('num.enter', 'Введи дату рождения'))}</h3><p class="muted">${esc(t('num.enterP', 'Имя — по желанию: без него посчитаю числа по дате.'))}</p></div>`; return; }
      if (st.tab === 'main') { const r = mainView(x); calcs = r.calcs; body.innerHTML = r.html; }
      else if (st.tab === 'square') body.innerHTML = squareView(x);
      else if (st.tab === 'year') body.innerHTML = yearView(x, tz);
      else body.innerHTML = pairView(x, el);
      body.classList.remove('fade-in'); void body.offsetWidth; body.classList.add('fade-in');
      root.NWheel.bindTips(body);
      body.querySelectorAll('[data-num]').forEach((b) => b.addEventListener('click', () => openNum(b.dataset.type, +b.dataset.num, calcs[b.dataset.type])));
      body.querySelectorAll('[data-cell]').forEach((b) => b.addEventListener('click', () => {
        const T = NT(), n = +b.dataset.cell, q = N.pythagoras(x.y, x.mo, x.d), c = q.counts[n];
        UI.popup(`<div class="stack"><p class="lead">${esc(c ? String(n).repeat(c) : '—')} · ${esc(T.cells[n].l[Math.min(4, c)])}</p><div class="stack s6">${T.cells[n].l.map((z, i) => `<p class="small${Math.min(4, c) === i ? '' : ' muted'}"><b>${i === 0 ? '—' : String(n).repeat(i)}${i === 4 ? '+' : ''}</b> · ${esc(z)}</p>`).join('')}</div></div>`, { title: T.cells[n].name, eyebrow: t('num.tSquare', 'Квадрат Пифагора') });
      }));
      const ps = body.querySelector('#npair'); if (ps) ps.addEventListener('change', () => { st.pairWith = ps.value; draw(); });
    };
    const mark = (k) => el.querySelectorAll('[data-pp]').forEach((z) => z.setAttribute('aria-pressed', String(z.dataset.pp === k)));
    const go = () => {
      const r = UI.parseDate(dIn.value);
      if (r.error) { UI.toast(r.error); dIn.focus(); return; }
      const name = nIn.value.trim();
      const q = !st.manual && ((st.who && root.NStore.person(st.who)) || root.NStore.active());
      if (q && q.y === r.y && q.mo === r.mo && q.d === r.d) { if (name && name !== (q.fullName || q.name)) root.NStore.upsertPerson({ id: q.id, fullName: name }); st.manual = null; mark(q.id); }
      else { st.manual = { y: r.y, mo: r.mo, d: r.d, name }; mark('manual'); }
      draw();
    };
    el.querySelector('[data-go]').addEventListener('click', go);
    [dIn, nIn].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } }));
    el.querySelectorAll('[data-pp]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.pp === 'manual') { st.manual = { pending: true }; dIn.value = ''; nIn.value = ''; dIn.focus(); mark('manual'); draw(); return; }
      st.manual = null; st.who = b.dataset.pp;
      const q = root.NStore.person(b.dataset.pp);
      dIn.value = UI.fmtDMY({ y: q.y, mo: q.mo, d: q.d }); nIn.value = q.fullName || q.name || '';
      mark(q.id); draw();
    }));
    el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.tab; el.querySelectorAll('[data-tab]').forEach((z) => z.setAttribute('aria-pressed', String(z === b))); draw(); }));
    draw();
  }

  (root.NPages = root.NPages || {}).numerology = { render: page, open: true };
})(window);
