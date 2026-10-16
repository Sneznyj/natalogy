/* Анкета первого входа, «Люди» (свои карты), «Настройки» (язык, тема, где я, ИИ, данные). */
(function (root) {
  'use strict';
  const UI = root.NUI;
  const { t, esc, icon } = UI;

  function conjure(el, done) {
    if (UI.reduceMotion()) return done();
    el.innerHTML = `<div class="conj"><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="86" fill="none" stroke="var(--line)" stroke-width="1"/><circle cx="100" cy="100" r="62" fill="none" stroke="var(--line)" stroke-dasharray="2 4"/>${Array.from({ length: 10 }, (_, i) => { const a = i * 36 * Math.PI / 180; return `<circle cx="${100 + 74 * Math.cos(a)}" cy="${100 + 74 * Math.sin(a)}" r="4" fill="var(--amber-fill)"><animateTransform attributeName="transform" type="rotate" from="0 100 100" to="${360 - i * 12} 100 100" dur="1.6s" fill="freeze"/></circle>`; }).join('')}</svg><p class="muted">${t('conj', 'Считаю твою карту…')}</p></div>`;
    setTimeout(done, 1500);
  }

  function onboard(el, params) {
    params = params || {};
    // дата с витрины (демо «введи дату») подставляется сама: ?d=ГГГГ-ММ-ДД
    const pre = {};
    if (params.d) { const m = String(params.d).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (m) Object.assign(pre, { y: +m[1], mo: +m[2], d: +m[3] }); }
    const next = params.next && /^[a-z]+([?&][\w=&%.-]*)?$/i.test(params.next) ? params.next : 'today';
    const g = root.NGeo.guessHere();
    const form = UI.personForm(pre, { submit: t('onb.go', 'Посмотреть свой день'), note: t('onb.note', 'Данные хранятся только на этом устройстве. Ничего не отправляется на сервер.'),
      homeLabel: t('onb.here', 'Где ты живёшь сейчас'), homeHint: t('onb.hereHint', 'Для времени суток, Луны без курса и лучших часов'), homeDefault: g.guessed ? null : g });
    el.innerHTML = `<div class="onb">
      <section class="night"><span class="eyebrow">${esc(root.NCONFIG.brand)}</span><h1>${t('onb.title', 'Твоя карта — не приговор. Это инструкция к себе.')}</h1><p style="color:#D6D4EC">${t('onb.p', 'Введи дату, время и город рождения — и увидишь, какие дни хороши для любви, денег, работы и запусков. Без астрологических терминов.')}</p></section>
      <section class="card">${form.html}</section>
      <div class="row tiny muted">${icon('lock', 'sm')} <a href="privacy.html">${t('privacy', 'Конфиденциальность')}</a> · <a href="terms.html">${t('terms', 'Условия')}</a></div></div>`;
    form.bind(el, (p) => {
      // город, где живёт, — у карточки; он же — «где я» по умолчанию для этого устройства
      if (!p.home && p.place.tz === g.tz) p.home = UI.placeData(p.place);
      root.NStore.set('here', p.home ? Object.assign({}, p.home) : null);
      const id = root.NStore.upsertPerson(p);
      root.NStore.setActive(id);
      conjure(el.querySelector('.onb') || el, () => { if (location.hash === '#' + next) root.NApp.route(true); else location.hash = '#' + next; });
    });
  }

  function editPerson(p, after) {
    if (!p && root.NAccount && !root.NAccount.gateAdd()) return; // без входа — одна карточка
    const f = UI.personForm(p || {}, { cancel: true, submit: p ? t('f.save', 'Сохранить') : t('people.add', 'Добавить человека') });
    const body = UI.sheet(f.html, { title: p ? t('people.edit', 'Изменить данные') : t('people.new', 'Новый человек') });
    f.bind(body, (np) => { const id = root.NStore.upsertPerson(np); UI.closeSheet(); UI.toast(t('people.saved', 'Сохранено')); after && after(id); }, () => UI.closeSheet());
  }

  function people(el) {
    const list = root.NStore.people(), act = root.NStore.active();
    el.innerHTML = `<div class="sec-head"><span class="eyebrow">${t('people.eyebrow', 'Мои люди')}</span><h1>${t('people.title', 'Чьи карты смотрим')}</h1><p>${t('people.p', 'Добавь себя, партнёра, детей, друзей и коллег — для каждого свой календарь и совместимость.')}</p></div>
      <div class="card"><div class="items">${list.map((p) => `<div class="item"><span class="gl" style="background:var(--night);color:#FFD8A6;font:600 calc(15px*var(--fz)) var(--f-ui)">${esc(UI.initials(p.name))}</span><div class="row sb"><div><h4>${esc(p.name)}${act && act.id === p.id ? ` <span class="lv lv-1">${t('people.active', 'сейчас')}</span>` : ''}</h4><p class="small">${esc(UI.fmtDate(p.y, p.mo, p.d))}${p.timeKnown !== false ? ', ' + UI.pad(p.h) + ':' + UI.pad(p.mi) : ''} · ${esc(p.place ? p.place.name : '')}</p>${UI.homeChipHTML(p.id, { prefix: t('home.lives', 'живёт:') })}</div>
        <div class="row">${act && act.id === p.id ? '' : `<button class="btn sm" data-act="${p.id}">${t('people.choose', 'Выбрать')}</button>`}<button class="iconbtn" data-edit="${p.id}" aria-label="${t('edit', 'Изменить')}">${icon('edit')}</button><button class="iconbtn" data-del="${p.id}" aria-label="${t('delete', 'Удалить')}">${icon('trash')}</button></div></div></div>`).join('')}</div></div>
      <button class="btn primary" data-add>${icon('plus')} ${t('people.add', 'Добавить человека')}</button>`;
    el.querySelector('[data-add]').addEventListener('click', () => editPerson(null, () => people(el)));
    el.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => { root.NStore.setActive(b.dataset.act); people(el); }));
    el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => editPerson(root.NStore.person(b.dataset.edit), () => people(el))));
    UI.bindHomeChips(el, () => people(el));
    el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
      const p = root.NStore.person(b.dataset.del);
      const body = UI.sheet(`<div class="stack"><p>${t('people.delQ', 'Удалить карту «{n}» с этого устройства?', { n: esc(p.name) })}</p><div class="row"><button class="btn" data-no>${t('cancel', 'Отмена')}</button><button class="btn dark" data-yes>${t('delete', 'Удалить')}</button></div></div>`, { title: t('delete', 'Удалить') });
      body.querySelector('[data-no]').addEventListener('click', UI.closeSheet);
      body.querySelector('[data-yes]').addEventListener('click', () => { root.NStore.removePerson(p.id); UI.closeSheet(); if (!root.NStore.people().length) location.hash = '#onboard'; else people(el); });
    }));
  }

  // ---------- орбисы аспектов (15.10, Алина): для каждого аспекта и типа карты — свой наибольший орбис в градусах ----------
  const ORB_KIND_N = () => ({ natal: t('orb.k.natal', 'Натал'), transit: t('orb.k.transit', 'Транзиты'), solar: t('orb.k.solar', 'Соляр, лунар'), synastry: t('orb.k.syn', 'Синастрия'), directions: t('orb.k.dir', 'Дирекции'), progressions: t('orb.k.prog', 'Прогрессии') });
  function orbCard() {
    const O = root.NOrbs, KN = ORB_KIND_N(), TX = UI.TX(), W = root.NWheel;
    const own = root.NStore.settings().orbTable || {};
    const fmt = (x) => String(x).replace('.', UI.lang() === 'en' ? '.' : ',');
    return `<div class="card stack" id="orbCard"><div class="row sb"><h3>${icon('filter')} ${t('orb.title', 'Орбисы аспектов')}</h3><button class="btn sm ghost" type="button" data-orbreset>${icon('refresh', 'sm')} ${t('orb.reset', 'Вернуть как было')}</button></div>
      <p class="small muted">${t('orb.hint', 'Наибольший орбис в градусах — для каждого аспекта и типа карты. У Солнца и Луны орбис на четверть шире, у узлов, Хирона, Лилит и куспидов домов — уже. Ползунок «Орбисы» в Профи ещё умножает эти числа. Изменённые числа выделены.')}</p>
      <div class="tbl-wrap"><table class="tbl orb-tbl"><thead><tr><th>${t('orb.asp', 'Аспект')}</th>${O.KINDS.map((k) => `<th>${esc(KN[k])}</th>`).join('')}</tr></thead><tbody>
      ${O.ASP.map((a) => `<tr><td class="orb-a"><span class="g">${W.ASP_G[a]}</span> ${esc((TX.ASP[a] && TX.ASP[a].name) || (W.ASP_N[UI.lang()] || W.ASP_N.ru)[a])}</td>${O.KINDS.map((k) => { const d = O.defaults(k)[a], v = O.get(k)[a], ch = own[k] && own[k][a] != null; return `<td><input class="input orb-in${ch ? ' ch' : ''}" type="text" inputmode="decimal" data-ok="${k}" data-oa="${a}" value="${fmt(v)}" title="${esc(t('orb.def', 'по умолчанию {d}°', { d: fmt(d) }))}" aria-label="${esc(KN[k] + ' · ' + a)}"></td>`; }).join('')}</tr>`).join('')}
      </tbody></table></div></div>`;
  }
  function bindOrbs(el, redraw) {
    const card = el.querySelector('#orbCard'); if (!card) return;
    const O = root.NOrbs;
    card.querySelectorAll('[data-ok]').forEach((inp) => inp.addEventListener('change', () => {
      const k = inp.dataset.ok, a = inp.dataset.oa;
      const v = parseFloat(String(inp.value).replace(',', '.'));
      const tbl = JSON.parse(JSON.stringify(root.NStore.settings().orbTable || {}));
      if (!isFinite(v) || v < 0 || v > 20) { inp.classList.add('bad'); UI.toast(t('orb.bad', 'Орбис — число от 0 до 20, например 2,5')); return; }
      inp.classList.remove('bad');
      const r = Math.round(v * 100) / 100;
      tbl[k] = tbl[k] || {};
      if (Math.abs(r - O.defaults(k)[a]) < 1e-9) delete tbl[k][a]; else tbl[k][a] = r;
      if (!Object.keys(tbl[k]).length) delete tbl[k];
      root.NStore.set('orbTable', Object.keys(tbl).length ? tbl : null);
      inp.value = String(r).replace('.', UI.lang() === 'en' ? '.' : ',');
      inp.classList.toggle('ch', !!(tbl[k] && tbl[k][a] != null));
      UI.toast(t('orb.saved', 'Орбис сохранён — Профи считает с ним'));
    }));
    card.querySelector('[data-orbreset]').addEventListener('click', () => { root.NStore.set('orbTable', null); UI.toast(t('orb.resetDone', 'Орбисы — как по умолчанию')); redraw(); });
  }

  function settings(el, params) {
    const S = root.NStore.settings(), TX = UI.TX();
    const here = UI.here(), act = root.NStore.active();
    el.innerHTML = `<div class="sec-head"><span class="eyebrow">${t('set.eyebrow', 'Настройки')}</span><h1>${t('set.title', 'Под себя')}</h1></div>
      <div id="acctCard"></div>
      <div class="card stack">
        <div class="field"><span class="lbl">${t('set.lang', 'Язык')}</span><div class="seg"><button data-lang="ru" aria-pressed="${UI.lang() === 'ru'}">Русский</button><button data-lang="en" aria-pressed="${UI.lang() === 'en'}">English</button></div></div>
        <div class="field"><span class="lbl">${t('set.theme', 'Тема')}</span><div class="seg"><button data-th="system" aria-pressed="${S.theme === 'system'}">${t('set.auto', 'Как в системе')}</button><button data-th="light" aria-pressed="${S.theme === 'light'}">${t('set.light', 'Светлая')}</button><button data-th="dark" aria-pressed="${S.theme === 'dark'}">${t('set.dark', 'Тёмная')}</button></div></div>
        <div class="field"><span class="lbl">${act ? esc(t('set.hereP', 'Где живёт сейчас: {n}', { n: act.name })) : t('set.here', 'Где я сейчас')}</span><div>${UI.homeChipHTML(act ? act.id : null)}</div><span class="hint">${t('set.hereHint2', 'От этого зависят границы суток, Луна без курса и лучшие часы. Пояс: {tz}. У каждого человека свой город — его можно поменять и в окне «Чья карта».', { tz: here.tz })}</span></div>
        <div class="field"><label for="hs2">${t('set.hs', 'Система домов')}</label><select class="select" id="hs2">${Object.entries(TX.houseSystems || { placidus: 'Placidus' }).map(([k, v]) => `<option value="${k}" ${S.houseSystem === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>
      </div>
      ${root.NOrbs ? orbCard() : ''}
      <div class="card stack"><h3>${icon('shield')} ${t('set.data', 'Данные и приватность')}</h3>
        <p class="small muted">${root.NAccount && root.NAccount.loggedIn() ? t('set.dataPacc', 'Карты и настройки хранятся в этом браузере и в вашем аккаунте (на сервере — в зашифрованном виде). К ИИ уходит только вопрос с расчётами, без имени и города.') : t('set.dataP', 'Карты и настройки хранятся только в этом браузере. На сервер уходит только вопрос к ИИ — с расчётами, без имени и города.')}</p>
        <label class="check"><input type="checkbox" id="aic" ${S.aiConsent ? 'checked' : ''}> ${t('set.ai', 'Разрешаю отправлять расчёты карты ИИ-сервису для ответов')}</label>
        <div class="row"><button class="btn sm" data-exp>${icon('download')} ${t('set.export', 'Скопировать резервную копию')}</button><button class="btn sm" data-imp>${icon('upload')} ${t('set.import', 'Восстановить из копии')}</button><button class="btn sm" data-wipe>${icon('trash')} ${t('set.wipe', 'Удалить все данные')}</button></div>
        <div class="row tiny"><a href="privacy.html">${t('privacy', 'Конфиденциальность')}</a> · <a href="terms.html">${t('terms', 'Условия')}</a> · <span class="muted">${esc(root.NCONFIG.brand)} ${esc(root.NCONFIG.version)}</span></div>
      </div>`;
    if (root.NAccount) root.NAccount.settingsCard(el.querySelector('#acctCard'));
    bindOrbs(el, () => settings(el, params));
    if (params && params.orbs) requestAnimationFrame(() => { const c = el.querySelector('#orbCard'); if (c) c.scrollIntoView({ block: 'start', behavior: 'auto' }); });
    el.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => { root.NStore.set('lang', b.dataset.lang); location.reload(); }));
    el.querySelectorAll('[data-th]').forEach((b) => b.addEventListener('click', () => { root.NStore.set('theme', b.dataset.th); root.NApp.applyTheme(); settings(el); }));
    UI.bindHomeChips(el, () => settings(el));
    el.querySelector('#hs2').addEventListener('change', (e) => root.NStore.set('houseSystem', e.target.value));
    el.querySelector('#aic').addEventListener('change', (e) => root.NStore.set('aiConsent', e.target.checked));
    el.querySelector('[data-exp]').addEventListener('click', async () => { const txt = root.NStore.exportJSON(); try { await navigator.clipboard.writeText(txt); UI.toast(t('set.copied', 'Копия в буфере обмена — сохрани её в заметки')); } catch (e) { UI.sheet(`<textarea class="input" rows="10" readonly>${esc(txt)}</textarea>`, { title: t('set.exportT', 'Резервная копия') }); } });
    el.querySelector('[data-imp]').addEventListener('click', () => {
      const body = UI.sheet(`<div class="stack"><p class="small muted">${t('set.impP', 'Вставь текст резервной копии:')}</p><textarea class="input" rows="8" id="impt"></textarea><button class="btn primary" data-go>${t('set.importGo', 'Восстановить')}</button></div>`, { title: t('set.import', 'Восстановить из копии') });
      body.querySelector('[data-go]').addEventListener('click', () => { try { const d = JSON.parse(body.querySelector('#impt').value || '{}'); const lim = (root.NCONFIG.account || {}).guestLimit || 1; if (root.NAccount && !root.NAccount.loggedIn() && root.NCONFIG.account && root.NCONFIG.account.api && d && Array.isArray(d.people) && new Set(root.NStore.people().map((x) => x.id).concat(d.people.map((x) => x.id))).size > lim) { UI.closeSheet(); root.NAccount.open({ reason: 'more' }); return; } const n = root.NStore.importJSON(body.querySelector('#impt').value); UI.closeSheet(); UI.toast(t('set.impOk', 'Добавлено карт: {n}', { n })); } catch (e) { UI.toast(t('set.impErr', 'Это не похоже на резервную копию')); } });
    });
    el.querySelector('[data-wipe]').addEventListener('click', () => {
      if (root.NAccount && root.NAccount.loggedIn()) { root.NAccount.logout(); return; }
      const body = UI.sheet(`<div class="stack"><p>${t('set.wipeQ', 'Удалить все карты и настройки с этого устройства? Это нельзя отменить.')}</p><div class="row"><button class="btn" data-no>${t('cancel', 'Отмена')}</button><button class="btn dark" data-yes>${t('delete', 'Удалить')}</button></div></div>`, { title: t('set.wipe', 'Удалить все данные') });
      body.querySelector('[data-no]').addEventListener('click', UI.closeSheet);
      body.querySelector('[data-yes]').addEventListener('click', () => { root.NStore.wipe(); UI.closeSheet(); location.hash = '#onboard'; });
    });
  }

  Object.assign(root.NPages = root.NPages || {}, { onboard: { render: onboard, bare: true }, people: { render: people }, settings: { render: settings } });
  root.NPeople = { editPerson };
})(window);
