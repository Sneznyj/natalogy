/* «Спросить»: чат с ИИ-помощником по карте и прогнозу — с наглядными блоками.
   Справа — «твой день сейчас», сильные дни по сферам, коротко о карте. Под ответом — график баллов на 30 дней
   по сфере или делу из вопроса (★ — лучшие дни, нажми на столбик — откроется день).
   Перед первым вопросом к серверу — согласие на передачу расчётов ИИ-сервису. */
(function (root) {
  'use strict';
  const UI = root.NUI, NS = root.NScore;
  const { t, esc, icon } = UI;
  let history = [];
  const md = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/^- /gm, '• ');
  const ymd = (d) => `${d.y}-${d.mo}-${d.d}`;

  /** «Думает»: маленькая астролябия крутится, под ней меняются фразы — что сейчас «смотрит» помощник. */
  const THINK = () => [t('think.1', 'Смотрю твою карту…'), t('think.2', 'Сверяю транзиты на эти дни…'), t('think.3', 'Считаю баллы по сферам…'), t('think.4', 'Собираю ответ…')];
  function thinkingHTML() {
    return `<div class="think" role="status"><svg class="think-orb" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="none" stroke="var(--line-strong)" stroke-width="1.4"/><circle cx="20" cy="20" r="9" fill="none" stroke="var(--line)" stroke-dasharray="2 3"/><g class="think-spin"><circle cx="20" cy="4" r="3" fill="var(--lav-strong)"/><circle cx="36" cy="20" r="2" fill="var(--amber-fill)"/></g><g class="think-spin2"><circle cx="20" cy="11" r="2" fill="var(--rose, #E59AAE)"/></g></svg><span class="think-txt">${esc(THINK()[0])}</span><span class="typing"><i></i><i></i><i></i></span></div>`;
  }
  function animateThinking(box) {
    const lines = THINK(); let i = 0;
    const tx = box.querySelector('.think-txt');
    const id = setInterval(() => { i = Math.min(lines.length - 1, i + 1); if (tx) { tx.classList.remove('think-fade'); void tx.offsetWidth; tx.classList.add('think-fade'); tx.textContent = lines[i]; } }, 1100);
    return () => clearInterval(id);
  }

  function qcards(p, days, partner) {
    const TX = UI.TX(), d0 = days[0];
    const bestL = NS.bestBy(days.slice(0, 30), 'act:launch', 1)[0], bestDate = NS.bestBy(days.slice(0, 30), 'act:date', 1)[0];
    const natal = UI.chartOf(p);
    const strong = NS.bestBy(days.slice(0, 30), 'overall', 2);
    return [
      ['month', 'calendar', t('ex.1', 'Что меня ждёт в ближайший месяц?'), t('qc.month', 'сильные дни: {d}', { d: strong.map(({ day }) => TX.monthDay(day.d, day.mo)).join(', ') })],
      ['launch', 'launch', t('ex.2', 'Когда лучше запускать проект?'), t('qc.best', 'лучший день: {d} · {p}/10', { d: TX.monthDay(bestL.day.d, bestL.day.mo), p: bestL.r.pts })],
      ['money', 'money', t('ex.3', 'Как сегодня с деньгами?'), t('qc.today', 'сегодня: {p}/10 · {l}', { p: d0.spheres.money.pts, l: TX.LEVEL[d0.spheres.money.level] })],
      ['date', 'love', t('ex.6', 'Когда лучше пойти на свидание?'), t('qc.best', 'лучший день: {d} · {p}/10', { d: TX.monthDay(bestDate.day.d, bestDate.day.mo), p: bestDate.r.pts })],
      ['natal', 'sun', t('ex.4', 'В чём моя сила по карте?'), `${TX.P.sun.name} ${TX.S[natal.byId.sun.sign].in}`],
      ['pair', 'users', t('ex.5', 'Как нам лучше общаться с партнёром?'), partner ? t('qc.pair', 'с {n}', { n: partner.name }) : t('qc.addPair', 'добавь второго человека')],
    ];
  }

  function sideHTML(p, days) {
    const TX = UI.TX(), d0 = days[0], natal = UI.chartOf(p);
    const mini = `<div class="minisph">${NS.SPHERES.map((s) => { const r = d0.spheres[s]; return `<div data-tip="${esc(TX.SPH[s].name + ': ' + r.pts + '/10 · ' + TX.LEVEL[r.level])}"><span class="mc"><i class="c-${UI.lvCls(r.level)}" style="height:${r.ptsF * 10}%"></i><b>${r.pts}</b></span>${icon(root.NDay.SPH_ICON[s], 'xs')}</div>`; }).join('')}</div>`;
    const next = days.slice(0, 14);
    const strong = NS.SPHERES.map((s) => ({ s, b: NS.bestBy(next, s, 1)[0] }));
    const big = [['sun', natal.byId.sun], ['moon', natal.byId.moon]].concat(natal.byId.asc ? [['asc', natal.byId.asc]] : []);
    return `<div class="card stack"><div class="row sb"><span class="label">${t('ask.now', 'Твой день сейчас')}</span><a class="more" href="#today">${t('open', 'Открыть')}</a></div>
        <div class="dp-head">${UI.ringPts(d0.overall, 64)}<div class="stack s6"><b style="font:600 calc(22px*var(--fz))/1.1 var(--f-display)">${esc(TX.dayTitle(d0))}</b><span class="small muted">${esc(TX.headline(d0))}</span></div></div>${mini}</div>
      <div class="card stack"><span class="label">${t('ask.strong', 'Сильные дни на 2 недели')}</span>
        ${strong.map(({ s, b }) => `<a class="pos" style="grid-template-columns:22px minmax(0,1fr) auto auto;text-decoration:none;color:inherit" href="#calendar?s=${s}&d=${ymd(b.day)}"><span style="color:var(--lav-strong)">${icon(root.NDay.SPH_ICON[s], 'sm')}</span><span class="small">${esc(TX.SPH[s].name)}</span><span class="dg">${esc(TX.monthDay(b.day.d, b.day.mo))}</span>${UI.ptsBadge(b.r, true)}</a>`).join('')}</div>
      <div class="card stack"><div class="row sb"><span class="label">${t('ask.chart', 'Коротко о карте')}</span><a class="more" href="#chart">${t('open', 'Открыть')}</a></div>
        <div class="tags">${big.map(([id, b]) => `<span class="tag acc"><span class="g">${root.NDay.pg(id)}</span> ${esc(TX.S[b.sign].name)}</span>`).join('')}</div>
        <div class="elem-bars">${['fire', 'earth', 'air', 'water'].map((k) => `<div class="eb"><span class="small">${esc(TX.elements ? TX.elements[k] : k)}</span><span class="pbar"><i style="width:${natal.summary.elements[k]}%;background:var(--w-${k})"></i></span><b class="num small">${natal.summary.elements[k]}%</b></div>`).join('')}</div></div>`;
  }

  /** Наглядный блок под ответом: баллы на 30 дней по сфере/делу из вопроса или сферы сегодня. */
  function vizHTML(q, days) {
    const TX = UI.TX();
    const det = root.NAI.detect(q);
    const key = det.act ? 'act:' + det.act : det.sphere || null;
    if (!key) {
      const d0 = days[0];
      const top = NS.bestBy(days.slice(0, 30), 'overall', 3);
      return `<div class="viz"><span class="label">${t('viz.today', 'Сегодня по сферам')}</span><div class="minisph">${NS.SPHERES.map((s) => { const r = d0.spheres[s]; return `<div><span class="mc"><i class="c-${UI.lvCls(r.level)}" style="height:${r.ptsF * 10}%"></i><b>${r.pts}</b></span>${esc(TX.SPH[s].name.slice(0, 5))}</div>`; }).join('')}</div>
        <span class="label">${t('viz.strong', 'Самые сильные дни месяца')}</span><div class="tags">${top.map(({ day, r }) => `<button class="dchip" type="button" data-vday="${ymd(day)}">${esc(TX.monthDay(day.d, day.mo))} ${UI.ptsBadge(r, true)}</button>`).join('')}</div></div>`;
    }
    const name = key.startsWith('act:') ? TX.ACT[key.slice(4)].name : TX.SPH[key].name;
    const list = days.slice(0, 30);
    const top = NS.bestBy(list, key, 3), topSet = new Set(top.map((x) => ymd(x.day)));
    return `<div class="viz"><div class="row sb"><span class="label">${esc(t('viz.title', '{n}: баллы на 30 дней', { n: name }))}</span><span class="tiny muted">★ ${t('viz.best', 'лучшие дни')}</span></div>
      <div class="viz-bars">${list.map((d) => { const r = NS.rateBy(d, key); return `<button class="c-${UI.lvCls(r.level)}${topSet.has(ymd(d)) ? ' top' : ''}" type="button" data-vday="${ymd(d)}" style="height:${Math.max(8, r.ptsF * 10)}%" data-tip="${esc(TX.monthDay(d.d, d.mo) + ': ' + r.pts + '/10 · ' + TX.LEVEL[r.level])}" aria-label="${esc(TX.monthDay(d.d, d.mo) + ': ' + r.pts)}"></button>`; }).join('')}</div>
      <div class="viz-axis">${list.map((d, i) => `<span>${i % 5 === 0 ? d.d : ''}</span>`).join('')}</div>
      <div class="tags">${top.map(({ day, r }) => `<button class="dchip" type="button" data-vday="${ymd(day)}">★ ${esc(TX.monthDay(day.d, day.mo))}, ${esc(TX.WD[new Date(Date.UTC(day.y, day.mo - 1, day.d)).getUTCDay()].toLowerCase())} ${UI.ptsBadge(r, true)}</button>`).join('')}<a class="more" href="#calendar?${key.startsWith('act:') ? 'a=' + key.slice(4) : 's=' + key}">${t('viz.cal', 'В календаре')}</a></div></div>`;
  }

  async function page(el, params) {
    const p = root.NStore.active();
    if (!p) { location.hash = '#onboard'; return; }
    const cfg = root.NCONFIG || {};
    const here = UI.here();
    const day = UI.todayIn(here.tz);
    const dayKey = `${day.y}-${day.mo}-${day.d}`;
    const left = () => Math.max(0, (cfg.freeAskPerDay || 5) - root.NStore.askUsed(dayKey));
    const partner = params.b ? root.NStore.person(params.b) : (root.NStore.people().find((x) => x.id !== p.id) || null);
    const days = await root.NCompute.range(p, day.y, day.mo, day.d, 45, here.tz);
    el.innerHTML = `<div class="sec-head"><span class="eyebrow">${t('ask.eyebrow', 'ИИ-помощник')} · ${esc(p.name)}</span><h1>${t('ask.title2', 'Спроси <em>о себе</em>')}</h1>
      <p>${cfg.aiEndpoint ? t('ask.p', 'ИИ видит только то, что посчитало приложение: твою карту, транзиты и календарь. Он объясняет, а не придумывает.') : t('ask.pLocal', 'Сейчас отвечает встроенный помощник по расчётам приложения. Подробные ответы ИИ включатся, когда подключим сервер.')}</p></div>
      <div class="ask-layout">
        <div class="stack s18" style="min-width:0">
          <div id="starter" ${history.length ? 'hidden' : ''}><div class="row sb" style="margin-bottom:10px"><span class="label">${t('ask.start', 'С чего начать')}</span><span class="hint-click">${icon('info', 'xs')} ${t('ask.startHint', 'нажми на вопрос — ответ придёт с графиком')}</span></div>
            <div class="qcards">${qcards(p, days, partner).map(([k, ic, q, sub]) => `<button class="qcard tap" type="button" data-q="${esc(q)}" data-k="${k}"><span class="ic">${icon(ic)}</span><span><b>${esc(q)}</b><small>${esc(sub)}</small></span></button>`).join('')}</div></div>
          <div class="chat" id="chat" aria-live="polite">${history.map((m) => `<div class="msg ${m.role === 'user' ? 'me' : 'ai'}">${m.role === 'user' ? esc(m.content) : md(m.content) + (m.q ? vizHTML(m.q, days) : '')}</div>`).join('')}</div>
          <div id="consent"></div>
          <form class="composer" id="cmp"><textarea class="input" id="q" rows="1" maxlength="600" placeholder="${t('ask.ph', 'Например: когда лучше подписать договор?')}" aria-label="${t('ask.aria', 'Вопрос')}"></textarea><button class="btn primary" type="submit" aria-label="${t('send', 'Отправить')}">${icon('send')}</button></form>
          <p class="tiny muted" id="quota">${cfg.aiEndpoint ? t('ask.left', 'Сегодня осталось вопросов: {n}', { n: left() }) : ''}</p>
          <p class="tiny muted">${t('ask.disc', 'Ответы — для самопознания и планирования. Это не медицинский, юридический или финансовый совет.')}</p>
        </div>
        <aside class="ask-side">${sideHTML(p, days)}</aside>
      </div>`;
    const chat = el.querySelector('#chat'), q = el.querySelector('#q'), form = el.querySelector('#cmp');
    const consentBox = el.querySelector('#consent');
    const needConsent = () => cfg.aiEndpoint && !root.NStore.settings().aiConsent;
    const openV = (s) => {
      const [y, mo, d] = s.split('-').map(Number);
      root.NCompute.day(p, y, mo, d, here.tz).then((dd) => root.NDay.openDay(dd, { person: p, calLink: true, shift: async (x, k) => { const dt = new Date(Date.UTC(x.y, x.mo - 1, x.d + k)); return root.NCompute.day(p, dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), here.tz); } }));
    };
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-vday]'); if (b) openV(b.dataset.vday); });
    const showConsent = () => {
      consentBox.innerHTML = `<div class="card stack"><h3>${icon('shield')} ${t('consent.t', 'Перед первым вопросом')}</h3><p class="small muted">${t('consent.p', 'Чтобы ответить, приложение отправит ИИ-сервису (Anthropic, Claude) рассчитанные положения планет, дату и время рождения без имени и города, и твой вопрос. Ответы не используются для обучения моделей. Можно отозвать в настройках.')}</p><label class="check"><input type="checkbox" id="cs"> ${t('consent.c', 'Согласен(на) на передачу этих данных ИИ-сервису')}</label><button class="btn dark" type="button" id="csok" disabled>${t('consent.ok', 'Продолжить')}</button></div>`;
      const cb = consentBox.querySelector('#cs'), ok = consentBox.querySelector('#csok');
      cb.addEventListener('change', () => { ok.disabled = !cb.checked; });
      ok.addEventListener('click', () => { root.NStore.set('aiConsent', true); consentBox.innerHTML = ''; if (pending) send(pending); });
    };
    let pending = null, busy = false;
    const push = (role, html) => { const m = document.createElement('div'); m.className = 'msg ' + (role === 'user' ? 'me' : 'ai'); m.innerHTML = html; chat.appendChild(m); m.scrollIntoView({ block: 'end', behavior: UI.reduceMotion() ? 'auto' : 'smooth' }); return m; };
    const send = async (text) => {
      text = String(text || '').trim(); if (!text || busy) return;
      if (needConsent()) { pending = text; showConsent(); return; }
      pending = null; busy = true;
      el.querySelector('#starter').hidden = true;
      if (cfg.aiEndpoint && left() <= 0) { push('ai', md(t('ai.limit', 'На сегодня вопросы закончились. Завтра лимит обновится.'))); busy = false; return; }
      push('user', esc(text)); history.push({ role: 'user', content: text });
      q.value = ''; q.style.height = 'auto';
      const wait = push('ai', thinkingHTML());
      wait.classList.add('thinking-msg');
      const stopThink = animateThinking(wait);
      // ответ приходит не мгновенно: 3–5 секунд «думает» (если сервер дольше — ждём сервер)
      const minWait = new Promise((ok) => setTimeout(ok, 3000 + Math.round(Math.random() * 2000)));
      try {
        const opts = { history: history.slice(0, -1).map((m) => ({ role: m.role, content: m.content })), partner: /партн|пар[аеуы]|вместе|муж|жен|partner|couple/i.test(text) ? partner : null };
        if (params.d) { const [y, mo, d] = params.d.split('-').map(Number); opts.date = { y, mo, d }; }
        const [r] = await Promise.all([root.NAI.ask(text, p, opts), minWait]);
        stopThink(); wait.classList.remove('thinking-msg'); wait.classList.add('msg-in');
        wait.innerHTML = md(r.answer) + vizHTML(text, days) + (r.local ? `<span class="src">${t('ai.localSrc', 'встроенный помощник · по расчётам приложения')}</span>` : '');
        wait.scrollIntoView({ block: 'nearest', behavior: UI.reduceMotion() ? 'auto' : 'smooth' });
        root.NWheel.bindTips(wait);
        history.push({ role: 'assistant', content: r.answer, q: text });
        if (!r.local && !r.limit) root.NStore.askInc(dayKey);
        const qq = el.querySelector('#quota'); if (qq && cfg.aiEndpoint) qq.textContent = t('ask.left', 'Сегодня осталось вопросов: {n}', { n: r.left != null ? r.left : left() });
      } catch (e) { await minWait; stopThink(); wait.classList.remove('thinking-msg'); wait.textContent = t('ai.err', 'Не получилось ответить. Попробуйте ещё раз.'); }
      busy = false;
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); send(q.value); });
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(q.value); } });
    q.addEventListener('input', () => { q.style.height = 'auto'; q.style.height = Math.min(160, q.scrollHeight) + 'px'; });
    el.querySelectorAll('.qcard').forEach((b) => b.addEventListener('click', () => { if (b.dataset.k === 'pair' && !partner) { location.hash = '#people'; return; } send(b.dataset.q); }));
    root.NWheel.bindTips(el);
    if (params.topic && !history.length) {
      const TX = UI.TX();
      const topicQ = params.topic === 'natal' ? t('ex.4', 'В чём моя сила по карте?') : params.topic === 'pair' ? t('ex.5', 'Как нам лучше общаться с партнёром?') : TX.SPH[params.topic] ? t('ask.topic', 'Расскажи подробнее про сферу «{s}» в этот день', { s: TX.SPH[params.topic].name }) : '';
      if (topicQ) { q.value = topicQ; q.focus(); }
    } else if (params.d && !history.length) { q.value = t('ask.dayQ', 'Что важно знать про {d}?', { d: UI.fmtDate(...params.d.split('-').map(Number), { year: undefined }) }); }
  }
  (root.NPages = root.NPages || {}).ask = { render: page };
})(window);
