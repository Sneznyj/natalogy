/* Тарифы Saliastro (17.10.2026): Бесплатно → Плюс → Профи → VIP (VIP — с ректификацией).
   Что где закрыто (NEED), страница #plans (карточки, сравнение, коды, вопросы), окно оплаты (lava.top — рубли, Gumroad — доллары),
   возврат с оплаты (#plans?paid=…) и замки на платных разделах. Пока NCONFIG.plans.enforce = false — всё открыто (бета), а купить уже можно.
   Проверка замков у себя: app.html?plan=free (только на localhost) — как будто тариф «Бесплатно» и замки включены. */
(function (root) {
  'use strict';
  const UI = root.NUI;
  const { t, esc, icon } = UI;
  const CFG = () => (root.NCONFIG && root.NCONFIG.plans) || {};
  const RANK = { free: 0, plus: 1, pro: 2, vip: 3 };
  const ORDER = ['free', 'plus', 'pro', 'vip'];
  // что открывает какой тариф (минимальный)
  const NEED = { calYear: 'plus', horoLong: 'plus', numFull: 'plus', pair: 'plus', people: 'plus', pro: 'pro', rectify: 'vip' };
  const PAGE = { pair: 'pair', pro: 'pro' }; // разделы, закрытые целиком; ректификация показывает свой экран VIP
  const BUY = 'saliastro:buy', CUR = 'saliastro:cur', TEST = 'saliastro:planTest';
  const st = { period: 'year' };

  const NAME = (p) => ({ free: t('pl.free', 'Бесплатно'), plus: t('pl.plus', 'Плюс'), pro: t('pl.pro', 'Профи'), vip: 'VIP' })[p] || p;
  const isLocal = () => /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  function testPlan() {
    if (!isLocal()) return null;
    try { const q = new URLSearchParams(location.search).get('plan'); if (q && RANK[q] != null) sessionStorage.setItem(TEST, q); return sessionStorage.getItem(TEST); } catch (e) { return null; }
  }
  const acct = () => root.NAccount;
  const loggedIn = () => !!(acct() && acct().loggedIn());
  function plan() { const u = acct() && acct().user(); return (u && u.plan) || { id: 'free' }; }
  function effId() { const tp = testPlan(); return tp || plan().id || 'free'; }
  const enforce = () => !!CFG().enforce || !!testPlan();
  const need = (f) => NEED[f] || 'free';
  /** Открыта ли функция при текущем тарифе. Пока замки выключены (бета) — всё открыто. */
  function can(f) { return !enforce() || (RANK[effId()] || 0) >= RANK[need(f)]; }
  const canPage = (page) => !PAGE[page] || can(PAGE[page]);
  /** Сколько карточек можно сохранить в аккаунте */
  const peopleLimit = () => (can('people') ? Infinity : CFG().freeAccountPeople || 3);

  // ---------- цены ----------
  function cur() { try { const c = localStorage.getItem(CUR); if (c === 'RUB' || c === 'USD') return c; } catch (e) { /* пусто */ } return UI.lang() === 'en' ? 'USD' : 'RUB'; }
  function setCur(c) { try { localStorage.setItem(CUR, c); } catch (e) { /* пусто */ } }
  function price(p, period, c) { const pr = ((CFG().prices || {})[c || cur()] || {})[p]; return pr ? (period === 'year' ? pr[1] : pr[0]) : null; }
  function money(v, c) {
    c = c || cur();
    if (v == null) return '';
    if (c === 'RUB') return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
    return '$' + (Math.abs(v - Math.round(v)) < 0.001 ? String(Math.round(v)) : v.toFixed(2));
  }
  const perMonth = (p, c) => { c = c || cur(); const y = price(p, 'year', c); return y == null ? null : c === 'RUB' ? Math.round(y / 12) : Math.round((y / 12) * 100) / 100; };
  const saving = (p, c) => { const m = price(p, 'month', c), y = price(p, 'year', c); return m && y ? Math.round((1 - y / (m * 12)) * 100) : 0; };
  const maxSaving = () => Math.max(...['plus', 'pro', 'vip'].map((p) => saving(p)));

  // ---------- тексты ----------
  const TAG = () => ({ free: t('pl.freeTag', 'Для знакомства'), plus: t('pl.plusTag', 'Для себя и близких'), pro: t('pl.proTag', 'Для тех, кто знает астрологию'), vip: t('pl.vipTag', 'Всё, что есть, и ректификация') });
  const FEAT = () => ({
    free: [t('pf.f1', 'Гороскоп по знаку: день, неделя, месяц'), t('pf.f2', '«Сегодня»: баллы семи сфер и лучшие часы'), t('pf.f3', 'Календарь на этот и следующий месяц'), t('pf.f4', 'Натальная карта простым языком'), t('pf.f5', 'Нумерология: главные числа'), t('pf.f6', 'Небо и Луна, ретро и затмения'), t('pf.f7', '1 карточка без входа, до 3 — с аккаунтом')],
    plus: [t('pf.p1', 'Календарь на год вперёд: когда что делать'), t('pf.p2', 'Совместимость пары полностью'), t('pf.p3', 'Гороскоп на год и важные периоды'), t('pf.p4', 'Вся нумерология: квадрат, матрица, чакры, личный год'), t('pf.p5', 'Сколько угодно людей и карт')],
    pro: [t('pf.r1', 'Профи-режим: 9 типов карт и две карты рядом'), t('pf.r2', 'Транзиты, соляр, лунар, прогрессии, дирекции'), t('pf.r3', 'Фирдарии, диспозиторы, астрокартография'), t('pf.r4', 'Рабочий режим на весь экран, свои орбисы и дома'), t('pf.r5', 'Таблицы аспектов с куспидами')],
    vip: [t('pf.v1', 'Ректификация: точное время рождения по событиям жизни'), t('pf.v2', 'Перебор по минутам, лучшие варианты и проверка на случайность'), t('pf.v3', 'Без ограничений по людям и событиям'), t('pf.v4', 'Новые инструменты — первыми'), t('pf.v5', 'Ответ поддержки — в первую очередь')],
  });
  const INC = () => ({ plus: t('pl.incPlus', 'Всё из «Бесплатно», и ещё:'), pro: t('pl.incPro', 'Всё из «Плюса», и ещё:'), vip: t('pl.incVip', 'Всё из «Профи», и ещё:') });
  const LOCK = () => ({
    calYear: [t('lk.calT', 'Календарь на год вперёд'), t('lk.calP', 'Бесплатно — этот и следующий месяц. С «Плюсом» листай календарь на любой месяц и планируй заранее: отпуск, переезд, свадьбу, запуск.')],
    horoLong: [t('lk.horoT', 'Гороскоп на год и важные периоды'), t('lk.horoP', 'День, неделя и месяц — бесплатно. Год и периоды (ретро, затмения, коридоры) для твоего знака — в «Плюсе».')],
    numFull: [t('lk.numT', 'Вся нумерология'), t('lk.numP', 'Главные числа — бесплатно. Квадрат Пифагора, матрица судьбы, чакры, личный год и совместимость по числам — в «Плюсе».')],
    pair: [t('lk.pairT', 'Совместимость пары'), t('lk.pairP', 'Что вас связывает, где искрит и как договориться: разбор пары по двум картам, баллы по темам и двойное колесо.')],
    people: [t('lk.pplT', 'Больше людей'), t('lk.pplP', 'В бесплатном аккаунте — до {n} карточек. С «Плюсом» — сколько угодно: семья, друзья, клиенты.')],
    pro: [t('lk.proT', 'Профи-режим'), t('lk.proP', 'Рабочее место астролога: 9 типов карт, две карты рядом, транзиты, соляр, дирекции, фирдарии, астрокартография и таблицы аспектов с куспидами.')],
    rectify: [t('lk.rectT', 'Ректификация — в VIP'), t('lk.rectP', 'Программа сверяет время рождения с событиями жизни и находит минуту, при которой они объясняются лучше всего.')],
  });
  const ROWS = () => [
    [t('cmp.horo', 'Гороскоп: день, неделя, месяц'), 'free'], [t('cmp.horo2', 'Гороскоп: год и важные периоды'), 'plus'],
    [t('cmp.today', '«Сегодня»: баллы сфер и лучшие часы'), 'free'], [t('cmp.cal', 'Календарь: этот и следующий месяц'), 'free'], [t('cmp.cal2', 'Календарь на любой месяц вперёд'), 'plus'],
    [t('cmp.chart', 'Натальная карта простым языком'), 'free'], [t('cmp.sky', 'Небо и Луна'), 'free'], [t('cmp.num', 'Нумерология: главные числа'), 'free'], [t('cmp.num2', 'Нумерология целиком'), 'plus'],
    [t('cmp.pair', 'Совместимость пары'), 'plus'], [t('cmp.people', 'Карточки людей в аккаунте'), { free: '3', plus: '∞', pro: '∞', vip: '∞' }],
    [t('cmp.pro', 'Профи-режим: 9 типов карт, две карты'), 'pro'], [t('cmp.fird', 'Фирдарии, дирекции, астрокартография'), 'pro'],
    [t('cmp.rect', 'Ректификация времени рождения'), 'vip'],
  ];
  const fmtD = (ms) => { const d = new Date(ms); return UI.fmtDate(d.getFullYear(), d.getMonth() + 1, d.getDate()); };

  // ---------- замки ----------
  function lockHTML(f, o) {
    o = o || {};
    const p = need(f), L = LOCK()[f] || [NAME(p), ''], pm = perMonth(p);
    return `<div class="card pad-lg stack pl-lock pl-lock-${p}${o.compact ? ' compact' : ''}" data-lock="${f}">
      <div class="pl-lock-h"><span class="pl-lock-ic">${icon('lock')}</span><span class="pl-badge pl-b-${p}">${esc(NAME(p))}</span></div>
      <h3>${esc(L[0])}</h3><p class="muted">${esc(L[1].replace('{n}', String(CFG().freeAccountPeople || 3)))}</p>
      ${o.compact ? '' : `<ul class="pl-feat">${FEAT()[p].slice(0, 4).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`}
      <div class="row"><a class="btn primary" href="#plans?want=${p}">${icon(p === 'vip' ? 'crown' : 'diamond', 'sm')} ${esc(t('pl.openWith', 'Открыть с тарифом «{p}»', { p: NAME(p) }))}</a>${pm != null ? `<span class="small muted">${esc(t('pl.fromM', 'от {m} в месяц', { m: money(pm) }))}</span>` : ''}</div>
    </div>`;
  }
  /** Раздел закрыт целиком: заголовок + замок */
  function paywall(el, page) {
    const f = PAGE[page] || page, L = LOCK()[f] || ['', ''];
    el.innerHTML = `<div class="sec-head"><span class="eyebrow">${esc(t('pl.inPlan', 'В тарифе «{p}»', { p: NAME(need(f)) }))}</span><h1>${esc(L[0])}</h1></div>${lockHTML(f)}`;
  }
  /** Перед действием: true — можно; иначе окно с замком */
  function gate(f) {
    if (can(f)) return true;
    const body = UI.sheet(lockHTML(f, { compact: true }), { title: t('pl.locked', 'Нужен тариф «{p}»', { p: NAME(need(f)) }) });
    body.querySelectorAll('a').forEach((a) => a.addEventListener('click', UI.closeSheet));
    return false;
  }

  // ---------- покупка ----------
  function savePending(o) { try { sessionStorage.setItem(BUY, JSON.stringify(Object.assign({ at: Date.now() }, o))); } catch (e) { /* пусто */ } }
  function readPending() { try { const o = JSON.parse(sessionStorage.getItem(BUY) || 'null'); return o && Date.now() - o.at < 3 * 3600000 ? o : null; } catch (e) { return null; } }
  function clearPending() { try { sessionStorage.removeItem(BUY); } catch (e) { /* пусто */ } }
  async function billingCfg() { const info = acct() && acct().info ? await acct().info() : null; return (info && info.billing) || { lava: false, gumroad: false }; }

  function buy(p, period) {
    period = period || st.period;
    if (!acct() || !acct().enabled()) { UI.toast(t('pay.off', 'Оплата пока не подключена')); return; }
    if (!loggedIn()) { savePending({ plan: p, period, step: 'login' }); acct().open({ reason: 'buy', plan: NAME(p) }); return; }
    payDialog(p, period);
  }
  /** После входа: если человек шёл покупать — сразу окно оплаты */
  function resume() { const o = readPending(); if (o && o.step === 'login' && loggedIn()) { savePending(Object.assign(o, { step: 'pay' })); setTimeout(() => payDialog(o.plan, o.period), 250); } }

  async function payDialog(p, period) {
    const cfg = await billingCfg(), u = (acct() && acct().user()) || {};
    const methods = [];
    if (cfg.lava) methods.push({ id: 'lava', provider: 'lava', cur: 'RUB', ic: 'card', title: t('pay.ru', 'Карта российского банка'), sub: t('pay.ruS', 'Мир, Visa, Mastercard банков России · в рублях'), via: 'lava.top' });
    if (cfg.gumroad) methods.push({ id: 'gumroad', provider: 'gumroad', cur: 'USD', ic: 'world', title: t('pay.world', 'Карта любой другой страны, PayPal'), sub: t('pay.worldS', 'Visa, Mastercard, Apple Pay, Google Pay · в долларах'), via: 'Gumroad' });
    else if (cfg.lava) methods.push({ id: 'lava-usd', provider: 'lava', cur: 'USD', ic: 'world', title: t('pay.intl', 'Иностранная карта'), sub: t('pay.intlS', 'Visa, Mastercard · в долларах'), via: 'lava.top' });
    if (!methods.length) {
      const body = UI.sheet(`<div class="stack"><p>${esc(t('pay.soon', 'Оплата подключается. Пока всё открыто бесплатно — пользуйтесь!'))}</p>${CFG().betaUntil ? `<p class="small muted">${esc(t('pay.soonP', 'Бета-версия: все тарифы открыты до {d}.', { d: UI.fmtDate(...CFG().betaUntil.split('-').map(Number)) }))}</p>` : ''}<div class="row"><button class="btn primary" data-ok>${esc(t('ok', 'Понятно'))}</button></div></div>`, { title: NAME(p) });
      body.querySelector('[data-ok]').addEventListener('click', UI.closeSheet);
      return;
    }
    let m = methods.find((x) => x.cur === cur()) || methods[0];
    const body = UI.sheet(`<div class="stack pay">
      <div class="pay-top"><span class="pl-badge pl-b-${p}">${esc(NAME(p))}</span><div class="seg" role="group" aria-label="${esc(t('pl.period', 'Период'))}"><button type="button" data-pp="month">${esc(t('pl.month', 'Месяц'))}</button><button type="button" data-pp="year">${esc(t('pl.year', 'Год'))} <b class="pl-save">−${saving(p, 'RUB')}%</b></button></div></div>
      <div class="pay-price" data-price></div>
      <div class="pay-methods" role="radiogroup" aria-label="${esc(t('pay.how', 'Как оплатить'))}">${methods.map((x) => `<label class="pay-m"><input type="radio" name="pm" value="${x.id}"${x === m ? ' checked' : ''}><span class="pay-ic">${icon(x.ic)}</span><span class="pay-t"><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></span><span class="pay-via">${esc(x.via)}</span></label>`).join('')}</div>
      ${u.email ? '' : `<div class="field" data-mailf><label for="payMail">${esc(t('pay.mail', 'Почта для чека'))}</label><input class="input" id="payMail" type="email" inputmode="email" autocomplete="email" placeholder="name@mail.ru"></div>`}
      <label class="check"><input type="checkbox" id="payOk"><span>${t('pay.agree', 'Подписка продлевается автоматически, пока вы её не отмените. Отменить можно в любой момент: «Настройки → Тариф». Доступ остаётся до конца оплаченного срока.')} <a href="terms.html#subs" target="_blank" rel="noopener">${esc(t('terms', 'Условия'))}</a></span></label>
      <p class="lg-err small" role="alert" hidden></p>
      <button class="btn primary pay-go" type="button" data-pay>${icon('card', 'sm')} <span data-pbtn></span></button>
      <p class="tiny muted pay-safe">${icon('shield', 'xs')} <span data-safe></span></p>
    </div>`, { title: t('pay.title', 'Оформить «{p}»', { p: NAME(p) }), cls: 'pay-dlg' });
    const err = body.querySelector('.lg-err'), mailF = body.querySelector('[data-mailf]');
    const paint = () => {
      body.querySelectorAll('[data-pp]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pp === period)));
      const v = price(p, period, m.cur), eq = period === 'year' ? perMonth(p, m.cur) : null;
      body.querySelector('[data-price]').innerHTML = `<b>${money(v, m.cur)}</b> <span>${esc(period === 'year' ? t('pl.perYear', 'в год') : t('pl.perMonth', 'в месяц'))}</span>${eq != null ? `<small>${esc(t('pl.eqM', '≈ {m} в месяц · выгода {s}%', { m: money(eq, m.cur), s: saving(p, m.cur) }))}</small>` : ''}`;
      body.querySelector('[data-pbtn]').textContent = t('pay.go', 'Перейти к оплате · {v}', { v: money(v, m.cur) });
      body.querySelector('[data-safe]').textContent = t('pay.safe', 'Оплата — на защищённой странице {v}. Данные карты мы не видим и не храним.', { v: m.via });
      if (mailF) mailF.hidden = m.provider !== 'lava';
    };
    body.querySelectorAll('[data-pp]').forEach((b) => b.addEventListener('click', () => { period = b.dataset.pp; paint(); }));
    body.querySelectorAll('input[name="pm"]').forEach((r) => r.addEventListener('change', () => { m = methods.find((x) => x.id === r.value) || m; setCur(m.cur); paint(); }));
    paint();
    const go = body.querySelector('[data-pay]');
    go.addEventListener('click', async () => {
      err.hidden = true;
      if (!body.querySelector('#payOk').checked) { err.textContent = t('pay.needOk', 'Отметьте, что согласны с автопродлением — без этого касса не откроется.'); err.hidden = false; return; }
      const mail = body.querySelector('#payMail');
      const email = mail && !mailF.hidden ? mail.value.trim() : '';
      if (mail && !mailF.hidden && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err.textContent = t('pay.needMail', 'Укажите почту — туда придёт чек.'); err.hidden = false; mail.focus(); return; }
      go.disabled = true; go.classList.add('busy');
      try {
        const r = await acct().api('/billing/checkout', { method: 'POST', body: { plan: p, period, provider: m.provider, currency: m.cur, email, lang: UI.lang(), return: location.origin + location.pathname } });
        savePending({ plan: p, period, step: 'paying', provider: m.provider });
        location.href = r.url;
      } catch (x) {
        err.textContent = ({ need_email: t('pay.needMail', 'Укажите почту — туда придёт чек.'), unavailable: t('pay.unavail', 'Этот способ оплаты сейчас недоступен — выберите другой.'), pay_provider: t('pay.provErr', 'Касса не ответила. Попробуйте ещё раз через минуту или другой способ.'), rate: t('acc.e.rate', 'Слишком много попыток. Подождите 15 минут.'), offline: t('acc.e.offline', 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.') })[x.code || x.message] || t('acc.e.other', 'Что-то пошло не так. Попробуйте ещё раз.');
        err.hidden = false; go.disabled = false; go.classList.remove('busy');
      }
    });
  }

  // ---------- отмена и коды ----------
  async function cancelSub(subId, provider) {
    if (provider === 'gumroad') {
      try { const r = await acct().api('/billing/cancel', { method: 'POST', body: { subId } }); if (r.manage) window.open(r.manage, '_blank', 'noopener'); } catch (e) { UI.toast(t('acc.e.other', 'Что-то пошло не так. Попробуйте ещё раз.')); }
      return;
    }
    const body = UI.sheet(`<div class="stack"><p>${esc(t('sub.cancelQ', 'Отменить автопродление? Тариф останется открытым до конца оплаченного срока, новых списаний не будет.'))}</p><div class="row"><button class="btn" data-no>${esc(t('sub.keep', 'Оставить'))}</button><button class="btn dark" data-yes>${esc(t('sub.cancel', 'Отменить продление'))}</button></div></div>`, { title: t('sub.cancel', 'Отменить продление') });
    body.querySelector('[data-no]').addEventListener('click', UI.closeSheet);
    body.querySelector('[data-yes]').addEventListener('click', async () => {
      try { await acct().api('/billing/cancel', { method: 'POST', body: { subId } }); await acct().refresh(); UI.closeSheet(); UI.toast(t('sub.cancelled', 'Продление отменено. Доступ — до конца оплаченного срока')); if (root.NApp) root.NApp.route(true); }
      catch (e) { UI.toast(t('pay.provErr', 'Касса не ответила. Попробуйте ещё раз через минуту или другой способ.')); }
    });
  }
  async function redeem(code, after) {
    if (!loggedIn()) { acct().open({ reason: 'code' }); return; }
    try {
      const r = await acct().api('/billing/redeem', { method: 'POST', body: { code } });
      await acct().refresh();
      UI.toast(t('code.ok', 'Готово: тариф «{p}» открыт до {d}', { p: NAME(r.plan), d: fmtD(r.until) }));
      if (after) after();
    } catch (e) {
      UI.toast(({ bad_code: t('code.bad', 'Такого кода нет. Проверьте, нет ли опечатки.'), code_used: t('code.used', 'Этот код уже использован.'), not_active: t('code.inactive', 'Эта подписка Gumroad уже не действует.'), rate: t('acc.e.rate', 'Слишком много попыток. Подождите 15 минут.') })[e.code] || t('acc.e.other', 'Что-то пошло не так. Попробуйте ещё раз.'));
    }
  }

  /** Строка «ваш тариф» для страницы тарифов и настроек */
  function nowHTML() {
    const pl = plan();
    if (!loggedIn() || pl.id === 'free') return '';
    const when = pl.until ? (pl.renews ? t('sub.renews', 'продлится {d}', { d: fmtD(pl.until) }) : t('sub.until', 'открыт до {d}', { d: fmtD(pl.until) })) : t('sub.forever', 'без срока');
    const how = pl.provider === 'gift' ? t('sub.gift', 'по коду') : pl.provider === 'comp' ? t('sub.comp', 'подарок от команды') : pl.provider === 'gumroad' ? 'Gumroad' : pl.provider === 'lava' ? 'lava.top' : '';
    const btn = pl.renews ? `<button class="btn sm" type="button" data-cancel="${esc(pl.subId || '')}" data-prov="${esc(pl.provider || '')}">${esc(pl.provider === 'gumroad' ? t('sub.manage', 'Управлять в Gumroad') : t('sub.cancel', 'Отменить продление'))}</button>` : '';
    return `<div class="pl-now pl-b-${pl.id}"><span class="pl-now-ic">${icon(pl.id === 'vip' ? 'crown' : 'diamond')}</span><div class="stack s6" style="min-width:0"><b>${esc(t('sub.your', 'Ваш тариф: {p}', { p: NAME(pl.id) }))}</b><span class="small muted">${esc(when)}${how ? ' · ' + esc(how) : ''}${pl.status === 'failed' ? ' · ' + esc(t('sub.failed', 'продление не прошло — касса попробует ещё раз')) : ''}</span></div>${btn}</div>`;
  }
  function bind(box) {
    box.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => cancelSub(b.dataset.cancel, b.dataset.prov)));
    box.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => buy(b.dataset.buy)));
  }

  // ---------- страница «Тарифы» ----------
  function cardHTML(p) {
    const mine = loggedIn() && effId() === p;
    const lower = loggedIn() && RANK[p] < RANK[effId()];
    const y = st.period === 'year';
    const main = p === 'free' ? money(0) : money(price(p, y ? 'year' : 'month'));
    const per = p === 'free' ? t('pl.forever', 'навсегда') : y ? t('pl.perYear', 'в год') : t('pl.perMonth', 'в месяц');
    const sub = p === 'free' ? t('pl.noCard', 'без карты и подписки') : y ? t('pl.eqM', '≈ {m} в месяц · выгода {s}%', { m: money(perMonth(p)), s: saving(p) }) : t('pl.orYear', 'или {v} в год', { v: money(price(p, 'year')) });
    const btn = mine ? `<span class="btn pl-mine" aria-disabled="true">${icon('check', 'sm')} ${esc(t('pl.mine', 'Ваш тариф'))}</span>`
      : lower ? `<span class="small muted pl-incl">${icon('check', 'xs')} ${esc(t('pl.included', 'Входит в ваш тариф'))}</span>`
        : p === 'free' ? `<a class="btn" href="#today">${esc(t('pl.startFree', 'Пользоваться бесплатно'))}</a>`
          : `<button class="btn ${p === 'vip' ? 'pl-vip-go' : 'primary'}" type="button" data-buy="${p}">${icon(p === 'vip' ? 'crown' : 'diamond', 'sm')} ${esc(t('pl.choose', 'Выбрать «{p}»', { p: NAME(p) }))}</button>`;
    return `<article class="card pl-card pl-${p}${mine ? ' pl-cur' : ''}" data-plan="${p}">
      ${p === 'pro' ? `<span class="pl-ribbon">${esc(t('pl.popular', 'Популярный'))}</span>` : p === 'vip' ? `<span class="pl-ribbon gold">${esc(t('pl.top', 'Максимум'))}</span>` : ''}
      <div class="pl-name">${p === 'vip' ? '<span class="vip-badge lg">VIP</span>' : `<b>${esc(NAME(p))}</b>`}</div>
      <p class="small pl-tag">${esc(TAG()[p])}</p>
      <div class="pl-price"><b>${main}</b><span>${esc(per)}</span></div>
      <p class="tiny pl-sub">${esc(sub)}</p>
      ${INC()[p] ? `<p class="small pl-inc">${esc(INC()[p])}</p>` : ''}
      <ul class="pl-feat">${FEAT()[p].map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="pl-act">${btn}</div>
    </article>`;
  }
  function tableHTML() {
    const cell = (v, p) => (typeof v === 'object' ? `<b>${esc(v[p])}</b>` : RANK[p] >= RANK[v] ? `<span class="pl-yes" aria-label="${esc(t('yes', 'да'))}">${icon('check', 'sm')}</span>` : '<span class="pl-no" aria-label="—">—</span>');
    return `<table class="pl-table"><thead><tr><th></th>${ORDER.map((p) => `<th class="pl-th-${p}">${p === 'vip' ? '<span class="vip-badge">VIP</span>' : esc(NAME(p))}</th>`).join('')}</tr></thead>
      <tbody>${ROWS().map(([n, v]) => `<tr><th scope="row">${esc(n)}</th>${ORDER.map((p) => `<td>${cell(v, p)}</td>`).join('')}</tr>`).join('')}
      <tr class="pl-trow-price"><th scope="row">${esc(st.period === 'year' ? t('pl.priceY', 'Цена за год') : t('pl.priceM', 'Цена в месяц'))}</th>${ORDER.map((p) => `<td><b>${p === 'free' ? money(0) : money(price(p, st.period))}</b></td>`).join('')}</tr></tbody></table>`;
  }
  const FAQ = () => [
    [t('pq.1', 'Как отменить подписку?'), t('pa.1', 'В «Настройки → Тариф» — кнопка «Отменить продление» (оплата в рублях) или «Управлять в Gumroad» (оплата в долларах; та же ссылка есть в письме от Gumroad). Доступ остаётся до конца оплаченного срока.')],
    [t('pq.2', 'Как оплатить из России?'), t('pa.2', 'Картой российского банка — «Мир», Visa или Mastercard — через платёжный сервис lava.top, в рублях.')],
    [t('pq.3', 'А из других стран?'), t('pa.3', 'Картой любого банка, PayPal, Apple Pay или Google Pay через Gumroad, в долларах. Налоги вашей страны Gumroad посчитает сам.')],
    [t('pq.4', 'Можно вернуть деньги?'), t('pa.4', 'Да: в течение 14 дней после первой оплаты, если тариф почти не использовался, — напишите нам. Подробно — в «Условиях».')],
    [t('pq.5', 'Безопасно ли это?'), t('pa.5', 'Номер карты вы вводите на странице платёжного сервиса. Мы видим только, что оплата прошла, и почту для чека.')],
    [t('pq.6', 'Что будет, если не продлить?'), t('pa.6', 'Тариф станет бесплатным, но ничего не пропадёт: карточки, сохранённые карты и события для ректификации останутся в аккаунте.')],
  ];

  async function render(el, params) {
    if (params.cur === 'RUB' || params.cur === 'USD') setCur(params.cur);
    if (params.period === 'month' || params.period === 'year') st.period = params.period;
    const beta = !CFG().enforce && CFG().betaUntil;
    el.innerHTML = `<div class="sec-head pl-head"><span class="eyebrow">${esc(t('pl.eyebrow', 'Тарифы'))}</span><h1>${t('pl.h1', 'Выбери, <em>насколько глубоко</em> смотреть')}</h1>
        <p>${esc(t('pl.lead', 'Бесплатно — гороскоп, твой день, календарь на месяц и карта простым языком. Платные тарифы открывают год вперёд, инструменты астролога и ректификацию.'))}</p></div>
      ${beta ? `<div class="pl-beta">${icon('gift')} <span>${esc(t('pl.beta', 'Бета-версия: до {d} все тарифы открыты бесплатно. Оформить подписку уже можно — она начнёт работать сразу.', { d: UI.fmtDate(...CFG().betaUntil.split('-').map(Number)) }))}</span></div>` : ''}
      <div id="plStatus"></div>
      <div class="pl-ctrl"><div class="seg" role="group" aria-label="${esc(t('pl.period', 'Период'))}"><button type="button" data-per="month">${esc(t('pl.month', 'Месяц'))}</button><button type="button" data-per="year">${esc(t('pl.year', 'Год'))} <b class="pl-save">−${maxSaving()}%</b></button></div>
        <div class="seg" role="group" aria-label="${esc(t('pl.cur', 'Валюта'))}"><button type="button" data-cur="RUB">₽</button><button type="button" data-cur="USD">$</button></div></div>
      <div class="pl-grid" id="plGrid"></div>
      <section class="card stack pl-cmp"><h2>${esc(t('pl.cmp', 'Сравнить тарифы'))}</h2><div class="scrollx" id="plTable"></div></section>
      <div class="grid2 pl-bottom">
        <section class="card stack" id="plCode"><h3>${icon('gift')} ${esc(t('code.h', 'Есть код?'))}</h3><p class="small muted">${esc(t('code.p', 'Подарочный код SAL-XXXX-XXXX или ключ лицензии из письма Gumroad.'))}</p>
          <form class="row pl-code" novalidate><input class="input" id="plCodeIn" placeholder="SAL-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="${esc(t('code.h', 'Есть код?'))}"><button class="btn" type="submit">${esc(t('code.go', 'Активировать'))}</button></form></section>
        <section class="card stack pl-faq"><h3>${esc(t('pl.faq', 'Вопросы об оплате'))}</h3>${FAQ().map(([q, a]) => `<details><summary>${esc(q)}</summary><p class="small">${esc(a)}</p></details>`).join('')}</section>
      </div>`;
    const draw = () => {
      el.querySelectorAll('[data-per]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.per === st.period)));
      el.querySelectorAll('[data-cur]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cur === cur())));
      el.querySelector('#plGrid').innerHTML = ORDER.map(cardHTML).join('');
      el.querySelector('#plTable').innerHTML = tableHTML();
      const want = params.want && el.querySelector(`[data-plan="${params.want}"]`);
      el.querySelectorAll('.pl-card.pl-want').forEach((x) => x.classList.remove('pl-want'));
      if (want) want.classList.add('pl-want');
      bind(el.querySelector('#plGrid'));
    };
    const status = () => { const s = el.querySelector('#plStatus'); s.innerHTML = nowHTML(); bind(s); };
    el.querySelectorAll('[data-per]').forEach((b) => b.addEventListener('click', () => { st.period = b.dataset.per; draw(); }));
    el.querySelectorAll('[data-cur]').forEach((b) => b.addEventListener('click', () => { setCur(b.dataset.cur); draw(); }));
    el.querySelector('.pl-code').addEventListener('submit', (e) => { e.preventDefault(); const v = el.querySelector('#plCodeIn').value.trim(); if (v) redeem(v, () => { status(); draw(); }); });
    draw(); status();
    if (params.want) { const w = el.querySelector('.pl-want'); if (w) setTimeout(() => w.scrollIntoView({ block: 'center', behavior: UI.reduceMotion() ? 'auto' : 'smooth' }), 80); }
    if (params.paid) await waitPaid(el.querySelector('#plStatus'), () => { status(); draw(); });
    else if (params.pay === 'fail' || params.pay === 'cancel') el.querySelector('#plStatus').innerHTML = `<div class="pl-wait bad">${icon('alert-circle')} <span>${esc(params.pay === 'fail' ? t('paid.fail', 'Оплата не прошла — деньги не списаны. Можно попробовать ещё раз или выбрать другой способ.') : t('paid.cancel', 'Оплата отменена. Тариф не менялся.'))}</span></div>`;
    else if (loggedIn()) acct().refresh().then(() => { status(); draw(); }).catch(() => {});
  }

  /** Вернулись с оплаты: ждём, пока касса сообщит серверу (обычно 5–30 секунд) */
  async function waitPaid(box, done) {
    const o = readPending(), want = (o && o.plan) || 'plus';
    box.innerHTML = `<div class="pl-wait"><span class="pl-spin" aria-hidden="true"></span><span>${esc(t('paid.wait', 'Проверяю оплату… Обычно это 10–30 секунд.'))}</span></div>`;
    for (let i = 0; i < 40; i++) {
      let u = null; try { u = await acct().refresh(); } catch (e) { u = null; }
      if (u && u.plan && RANK[u.plan.id] >= RANK[want]) {
        clearPending();
        box.innerHTML = `<div class="pl-wait ok">${icon('check-circle')} <span><b>${esc(t('paid.ok', 'Готово! Тариф «{p}» подключён.', { p: NAME(u.plan.id) }))}</b> ${esc(t('paid.okP', 'Чек придёт на почту. Спасибо, что поддерживаете Saliastro!'))}</span>${u.plan.id === 'vip' ? `<a class="btn sm vip-btn" href="#rectify">${icon('crown', 'sm')} ${esc(t('nav.rect', 'Ректификация'))}</a>` : u.plan.id === 'pro' ? `<a class="btn sm" href="#pro">${icon('pro', 'sm')} ${esc(t('nav.pro', 'Профи'))}</a>` : `<a class="btn sm" href="#calendar">${icon('calendar', 'sm')} ${esc(t('nav.calendar', 'Календарь'))}</a>`}</div>`;
        if (root.NAccount) root.NAccount.paintHeader();
        if (done) { const keep = box.innerHTML; done(); box.innerHTML = keep; }
        return;
      }
      await new Promise((r) => setTimeout(r, 3000));
      if (!document.body.contains(box)) return;
    }
    box.innerHTML = `<div class="pl-wait bad">${icon('clock')} <span>${esc(t('paid.late', 'Оплата ещё не дошла. Если деньги списались, тариф включится в течение нескольких минут — обновите страницу. Не включился за час — напишите нам, разберёмся.'))}</span></div>`;
  }

  // ---------- карточка «Тариф» в настройках ----------
  function settingsHTML() {
    const pl = plan();
    return `<div class="card stack pl-set"><h3>${icon('diamond')} ${esc(t('sub.h', 'Тариф'))}</h3>
      ${pl.id === 'free' || !loggedIn() ? `<p class="small muted">${esc(enforce() ? t('sub.freeNow', 'Сейчас бесплатный тариф.') : t('sub.betaNow', 'Сейчас бета: всё открыто бесплатно.'))}</p>` : nowHTML()}
      <div class="row"><a class="btn sm primary" href="#plans">${icon('diamond', 'sm')} ${esc(pl.id === 'free' ? t('sub.choose', 'Выбрать тариф') : t('sub.change', 'Сменить тариф'))}</a><a class="btn sm" href="#plans" data-tocode>${icon('gift', 'sm')} ${esc(t('code.enter', 'Ввести код'))}</a></div></div>`;
  }
  function settingsCard(box) {
    if (!box) return;
    box.innerHTML = settingsHTML(); bind(box);
    const tc = box.querySelector('[data-tocode]');
    if (tc) tc.addEventListener('click', () => setTimeout(() => { const i = document.getElementById('plCodeIn'); if (i) { i.scrollIntoView({ block: 'center' }); i.focus(); } }, 300));
  }

  root.NPlans = { can, canPage, need, gate, paywall, lockHTML, bind, peopleLimit, enforce, plan, effId, NAME, buy, resume, payDialog, redeem, settingsCard, nowHTML, money, price, RANK };
  (root.NPages = root.NPages || {}).plans = { render, open: true };
})(window);
