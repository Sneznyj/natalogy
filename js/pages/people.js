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
    const form = UI.personForm(pre, { submit: t('onb.go', 'Посмотреть свой день'), note: t('onb.note', 'Данные хранятся только на этом устройстве. Ничего не отправляется на сервер.'),
      extraHTML: `<div class="field ac" id="hereF"><label for="pf-here">${t('onb.here', 'Где ты живёшь сейчас')}</label><input class="input" id="pf-here" autocomplete="off"><span class="hint">${t('onb.hereHint', 'Для времени суток, Луны без курса и лучших часов')}</span></div>` });
    el.innerHTML = `<div class="onb">
      <section class="night"><span class="eyebrow">${esc(root.NCONFIG.brand)}</span><h1>${t('onb.title', 'Твоя карта — не приговор. Это инструкция к себе.')}</h1><p style="color:#D6D4EC">${t('onb.p', 'Введи дату, время и город рождения — и увидишь, какие дни хороши для любви, денег, работы и запусков. Без астрологических терминов.')}</p></section>
      <section class="card">${form.html}</section>
      <div class="row tiny muted">${icon('lock', 'sm')} <a href="privacy.html">${t('privacy', 'Конфиденциальность')}</a> · <a href="terms.html">${t('terms', 'Условия')}</a></div></div>`;
    const g = root.NGeo.guessHere();
    let hereC = g.guessed ? null : g;
    UI.bindCity(el.querySelector('#hereF'), (c) => { hereC = c; }, hereC);
    form.bind(el, (p) => {
      root.NStore.set('here', hereC ? Object.assign({}, hereC) : (p.place.tz === UI.here().tz ? Object.assign({}, p.place) : null));
      const id = root.NStore.upsertPerson(p);
      root.NStore.setActive(id);
      conjure(el.querySelector('.onb') || el, () => { if (location.hash === '#' + next) root.NApp.route(true); else location.hash = '#' + next; });
    });
  }

  function editPerson(p, after) {
    const f = UI.personForm(p || {}, { cancel: true, submit: p ? t('f.save', 'Сохранить') : t('people.add', 'Добавить человека') });
    const body = UI.sheet(f.html, { title: p ? t('people.edit', 'Изменить данные') : t('people.new', 'Новый человек') });
    f.bind(body, (np) => { const id = root.NStore.upsertPerson(np); UI.closeSheet(); UI.toast(t('people.saved', 'Сохранено')); after && after(id); }, () => UI.closeSheet());
  }

  function people(el) {
    const list = root.NStore.people(), act = root.NStore.active();
    el.innerHTML = `<div class="sec-head"><span class="eyebrow">${t('people.eyebrow', 'Мои люди')}</span><h1>${t('people.title', 'Чьи карты смотрим')}</h1><p>${t('people.p', 'Добавь себя, партнёра, детей, друзей и коллег — для каждого свой календарь и совместимость.')}</p></div>
      <div class="card"><div class="items">${list.map((p) => `<div class="item"><span class="gl" style="background:var(--night);color:#FFD8A6;font:600 15px var(--f-ui)">${esc(UI.initials(p.name))}</span><div class="row sb"><div><h4>${esc(p.name)}${act && act.id === p.id ? ` <span class="lv lv-1">${t('people.active', 'сейчас')}</span>` : ''}</h4><p class="small">${esc(UI.fmtDate(p.y, p.mo, p.d))}${p.timeKnown !== false ? ', ' + UI.pad(p.h) + ':' + UI.pad(p.mi) : ''} · ${esc(p.place ? p.place.name : '')}</p></div>
        <div class="row">${act && act.id === p.id ? '' : `<button class="btn sm" data-act="${p.id}">${t('people.choose', 'Выбрать')}</button>`}<button class="iconbtn" data-edit="${p.id}" aria-label="${t('edit', 'Изменить')}">${icon('edit')}</button><button class="iconbtn" data-del="${p.id}" aria-label="${t('delete', 'Удалить')}">${icon('trash')}</button></div></div></div>`).join('')}</div></div>
      <button class="btn primary" data-add>${icon('plus')} ${t('people.add', 'Добавить человека')}</button>`;
    el.querySelector('[data-add]').addEventListener('click', () => editPerson(null, () => people(el)));
    el.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => { root.NStore.setActive(b.dataset.act); people(el); }));
    el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => editPerson(root.NStore.person(b.dataset.edit), () => people(el))));
    el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
      const p = root.NStore.person(b.dataset.del);
      const body = UI.sheet(`<div class="stack"><p>${t('people.delQ', 'Удалить карту «{n}» с этого устройства?', { n: esc(p.name) })}</p><div class="row"><button class="btn" data-no>${t('cancel', 'Отмена')}</button><button class="btn dark" data-yes>${t('delete', 'Удалить')}</button></div></div>`, { title: t('delete', 'Удалить') });
      body.querySelector('[data-no]').addEventListener('click', UI.closeSheet);
      body.querySelector('[data-yes]').addEventListener('click', () => { root.NStore.removePerson(p.id); UI.closeSheet(); if (!root.NStore.people().length) location.hash = '#onboard'; else people(el); });
    }));
  }

  function settings(el) {
    const S = root.NStore.settings(), TX = UI.TX();
    const here = UI.here();
    el.innerHTML = `<div class="sec-head"><span class="eyebrow">${t('set.eyebrow', 'Настройки')}</span><h1>${t('set.title', 'Под себя')}</h1></div>
      <div class="card stack">
        <div class="field"><span class="lbl">${t('set.lang', 'Язык')}</span><div class="seg"><button data-lang="ru" aria-pressed="${UI.lang() === 'ru'}">Русский</button><button data-lang="en" aria-pressed="${UI.lang() === 'en'}">English</button></div></div>
        <div class="field"><span class="lbl">${t('set.theme', 'Тема')}</span><div class="seg"><button data-th="system" aria-pressed="${S.theme === 'system'}">${t('set.auto', 'Как в системе')}</button><button data-th="light" aria-pressed="${S.theme === 'light'}">${t('set.light', 'Светлая')}</button><button data-th="dark" aria-pressed="${S.theme === 'dark'}">${t('set.dark', 'Тёмная')}</button></div></div>
        <div class="field ac"><label for="here">${t('set.here', 'Где я сейчас')}</label><input class="input" id="here" autocomplete="off"><span class="hint">${t('set.hereHint', 'От этого зависят границы суток, Луна без курса и лучшие часы. Сейчас: {tz}', { tz: here.tz })}</span></div>
        <div class="field"><label for="hs2">${t('set.hs', 'Система домов')}</label><select class="select" id="hs2">${Object.entries(TX.houseSystems || { placidus: 'Placidus' }).map(([k, v]) => `<option value="${k}" ${S.houseSystem === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>
      </div>
      <div class="card stack"><h3>${icon('shield')} ${t('set.data', 'Данные и приватность')}</h3>
        <p class="small muted">${t('set.dataP', 'Карты и настройки хранятся только в этом браузере. На сервер уходит только вопрос к ИИ — с расчётами, без имени и города.')}</p>
        <label class="check"><input type="checkbox" id="aic" ${S.aiConsent ? 'checked' : ''}> ${t('set.ai', 'Разрешаю отправлять расчёты карты ИИ-сервису для ответов')}</label>
        <div class="row"><button class="btn sm" data-exp>${icon('download')} ${t('set.export', 'Скопировать резервную копию')}</button><button class="btn sm" data-imp>${icon('upload')} ${t('set.import', 'Восстановить из копии')}</button><button class="btn sm" data-wipe>${icon('trash')} ${t('set.wipe', 'Удалить все данные')}</button></div>
        <div class="row tiny"><a href="privacy.html">${t('privacy', 'Конфиденциальность')}</a> · <a href="terms.html">${t('terms', 'Условия')}</a> · <span class="muted">${esc(root.NCONFIG.brand)} ${esc(root.NCONFIG.version)}</span></div>
      </div>`;
    el.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => { root.NStore.set('lang', b.dataset.lang); location.reload(); }));
    el.querySelectorAll('[data-th]').forEach((b) => b.addEventListener('click', () => { root.NStore.set('theme', b.dataset.th); root.NApp.applyTheme(); settings(el); }));
    UI.bindCity(el.querySelector('.ac'), (c) => { if (c) { root.NStore.set('here', c); UI.toast(t('set.hereSaved', 'Теперь считаю для: {c}', { c: c.name })); } }, S.here || null);
    el.querySelector('#hs2').addEventListener('change', (e) => root.NStore.set('houseSystem', e.target.value));
    el.querySelector('#aic').addEventListener('change', (e) => root.NStore.set('aiConsent', e.target.checked));
    el.querySelector('[data-exp]').addEventListener('click', async () => { const txt = root.NStore.exportJSON(); try { await navigator.clipboard.writeText(txt); UI.toast(t('set.copied', 'Копия в буфере обмена — сохрани её в заметки')); } catch (e) { UI.sheet(`<textarea class="input" rows="10" readonly>${esc(txt)}</textarea>`, { title: t('set.exportT', 'Резервная копия') }); } });
    el.querySelector('[data-imp]').addEventListener('click', () => {
      const body = UI.sheet(`<div class="stack"><p class="small muted">${t('set.impP', 'Вставь текст резервной копии:')}</p><textarea class="input" rows="8" id="impt"></textarea><button class="btn primary" data-go>${t('set.importGo', 'Восстановить')}</button></div>`, { title: t('set.import', 'Восстановить из копии') });
      body.querySelector('[data-go]').addEventListener('click', () => { try { const n = root.NStore.importJSON(body.querySelector('#impt').value); UI.closeSheet(); UI.toast(t('set.impOk', 'Добавлено карт: {n}', { n })); } catch (e) { UI.toast(t('set.impErr', 'Это не похоже на резервную копию')); } });
    });
    el.querySelector('[data-wipe]').addEventListener('click', () => {
      const body = UI.sheet(`<div class="stack"><p>${t('set.wipeQ', 'Удалить все карты и настройки с этого устройства? Это нельзя отменить.')}</p><div class="row"><button class="btn" data-no>${t('cancel', 'Отмена')}</button><button class="btn dark" data-yes>${t('delete', 'Удалить')}</button></div></div>`, { title: t('set.wipe', 'Удалить все данные') });
      body.querySelector('[data-no]').addEventListener('click', UI.closeSheet);
      body.querySelector('[data-yes]').addEventListener('click', () => { root.NStore.wipe(); UI.closeSheet(); location.hash = '#onboard'; });
    });
  }

  Object.assign(root.NPages = root.NPages || {}, { onboard: { render: onboard, bare: true }, people: { render: people }, settings: { render: settings } });
  root.NPeople = { editPerson };
})(window);
